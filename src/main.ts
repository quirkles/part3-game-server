import { createServer, IncomingMessage } from "http";

import { LoggingWinston } from "@google-cloud/logging-winston";

import { nanoid } from "nanoid";
import { createLogger, type Logger, transports, format } from "winston";
import Transport from "winston-transport";
import { WebSocketServer } from "ws";

import { GamePool } from "./Models/GamePool";
import { ConnectionTokenManager } from "./utils/ConnectionTokenManager";
import { createToken } from "./utils/createToken";
import { getConfig } from "./utils/getConfig";

const { combine, timestamp, prettyPrint, colorize, printf } = format;

const logFormat = combine(
  timestamp(),
  prettyPrint(),
  colorize(),
  printf((info) => {
    const { level, message, ...data } = info;
    return `${level}: ${message}\n${JSON.stringify(data, null, 2)}`;
  }),
);

async function main() {
  const config = await getConfig();
  const loggingWinston = new LoggingWinston();
  const ts: Transport[] = [
    new transports.Console({
      format: logFormat,
    }),
    // Add Cloud Logging
  ];
  if (config.ENV === "CLOUD") {
    ts.push(loggingWinston);
  }
  const appLogger = createLogger({
    level: "info",
    transports: ts,
  });

  const appGamePool = new GamePool(appLogger);
  const connectionTokenManager = new ConnectionTokenManager(appLogger);

  const server = createServer();
  const addReqLogger = (
    req: IncomingMessage & {
      logger?: Logger;
    },
  ) => {
    if (req.logger) {
      return;
    }
    const requestUid = nanoid();
    req.logger = appLogger.child({
      defaultMeta: {
        requestUid,
      },
    });
  };
  server.on("request", addReqLogger);
  server.on("upgrade", addReqLogger);
  server.on(
    "request",
    async (
      req: IncomingMessage & {
        logger: Logger;
      },
      res,
    ) => {
      // Create a Winston logger that streams to Cloud Logging
      // Logs will be written to: "projects/YOUR_PROJECT_ID/logs/winston_log"
      req.logger.info("Request received:", {
        url: req.url,
      });
      // Set CORS headers
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Request-Method", "*");
      res.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET");
      res.setHeader("Access-Control-Allow-Headers", "*");

      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.url?.match(/.*getToken.*/)) {
        const urlParams = new URLSearchParams(req.url.split("?")[1] || "");
        const userId = urlParams.get("userId");
        req.logger.info("Parsed userid:", {
          userId,
        });
        if (!userId) {
          res.writeHead(400, {
            "Content-Type": "application/json",
          });
          res.end({ error: "Missing userId" });
          return;
        }
        const codeVerifier = nanoid();
        const token = await createToken({ id: userId, codeVerifier });

        connectionTokenManager.addToken(token, codeVerifier);
        res.writeHead(200, {
          "Content-Type": "application/json",
        });
        res.end(
          JSON.stringify({
            token,
          }),
        );
        return;
      } else {
        res.writeHead(404, {
          "Content-Type": "application/json",
        });
        res.end({ error: "Not found" });
        return;
      }
    },
  );

  const wss = new WebSocketServer({
    server,
    path: "/ws",
  });

  wss.on(
    "connection",
    async function connection(ws, req: IncomingMessage & { logger: Logger }) {
      const urlParams = new URLSearchParams(req.url?.split("?")[1] || "");
      const gameId = urlParams.get("gameId");
      const connectionToken = urlParams.get("connectionToken");
      if (!connectionToken) {
        req.logger.warn("Request missing connection token");
        ws.send(
          JSON.stringify({
            type: "error",
            error: "connection token is required",
          }),
        );
        ws.close();
        return;
      }
      const decodedToken = await connectionTokenManager.verify(connectionToken);
      if (!decodedToken) {
        ws.send(
          JSON.stringify({
            type: "error",
            error: "invalid connection token",
          }),
        );
        ws.close();
        return;
      }

      if (!gameId) {
        ws.send(
          JSON.stringify({
            type: "error",
            error: "game id is required",
          }),
        );
        ws.close();
        return;
      }

      req.logger.info("Connection verified:", {
        gameId,
        decodedToken,
      });

      const game = await appGamePool.getGameById(gameId);

      if (!game) {
        req.logger.warn("Game not found:");
        ws.send(
          JSON.stringify({
            type: "error",
            error: "game not found",
          }),
        );
        ws.close();
        return;
      }

      req.logger.info("Game found:", {
        game,
      });

      appGamePool.addUserToGame(decodedToken.userId, gameId);

      ws.on("error", console.error);

      ws.on("message", function message(data) {
        console.log("received: %s", data);
      });

      ws.send(
        JSON.stringify({
          type: "welcome",
          message: `Welcome to game: ${gameId}`,
        }),
      );
    },
  );

  server.on("error", console.error);

  server.listen(config.PORT, () => {
    console.log(`Server listening on port: ${config.PORT}`);
  });
}

main()
  .then(() => {
    console.log("Server started");
  })
  .catch(console.error);
