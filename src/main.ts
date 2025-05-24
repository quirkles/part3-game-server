/* eslint-disable import/order */
import { apmClient } from "./utils/winston/es/apm";
// Needs to be the first thing imported by main

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
import { serialize } from "./utils/serialize";
import { baseFormat } from "./utils/winston/formats/baseFormat";
import { recursivelyRemoveFields } from "./utils/winston/formats/recursivelyStripFields";
import { ecsFormat } from "@elastic/ecs-winston-format";
import { join } from "path";
import { esFormatter } from "./utils/winston/es/elasticsearchTemplate";
import { Transaction } from "elastic-apm-node";

const { combine, prettyPrint, colorize, printf } = format;

const now = new Date();
const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

const LOG_DIR = join(__dirname, "..", "logs");

const LOG_FILE = join(LOG_DIR, `app-${date}.log`);

async function main() {
  const config = await getConfig();
  const loggingWinston = new LoggingWinston({
    format: combine(recursivelyRemoveFields({ fieldsToStrip: ["logger"] })),
  });

  const consoleLogFormat = combine(
    colorize(),
    prettyPrint(),
    baseFormat,
    printf((info) => {
      const { level, message, ...data } = info;
      return `${level}: ${message}\n${JSON.stringify(serialize(data), null, 2)}`;
    }),
  );

  const ts: Transport[] = [
    new transports.Console({
      format: consoleLogFormat,
    }),
    // Add Cloud Logging
  ];
  if (config.ENV === "CLOUD") {
    ts.push(loggingWinston);
  }

  ts.push(
    new transports.File({
      filename: LOG_FILE,
      level: "debug",
      format: combine(esFormatter(), ecsFormat()),
    }),
  );

  const appLogger = createLogger({
    level: "info",
    defaultMeta: {
      labels: {
        loggerName: "app-logger",
        appInstanceId: nanoid(),
      },
    },
    transports: ts,
  });

  appLogger.info("Server started", {
    host: "localhost",
    port: config.PORT,
    env: config.ENV,
  });

  appLogger.debug("Creating game pool");
  const appGamePool = new GamePool(appLogger);
  appLogger.debug("Creating connection token manager");
  const connectionTokenManager = new ConnectionTokenManager(appLogger);
  appLogger.debug("Creating server instance");
  const server = createServer();

  server.on("error", apmClient.captureError);

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
      childLabels: {
        requestUid,
        url: req.url,
        loggerName: "request-logger",
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
      req.logger.info("OnRequest");
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
        apmClient.setTransactionName("Request:getToken");
        const urlParams = new URLSearchParams(req.url.split("?")[1] || "");
        const userId = urlParams.get("userId");
        req.logger.info("GetUserRequest: Parsed userid", {
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
        apmClient.endTransaction("TokenReturned");
        return;
      } else {
        res.writeHead(404, {
          "Content-Type": "application/json",
        });
        res.end({ error: "Not found" });
        apmClient.endTransaction("UserNotFound");
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
      const connectionTransaction: Transaction = apmClient.startTransaction(
        "UserConnection",
        "websocket",
      );
      const connectionLogger = req.logger.child({
        connectionLogger: true,
      });
      const urlParams = new URLSearchParams(req.url?.split("?")[1] || "");
      const gameId = urlParams.get("gameId");
      connectionTransaction.addLabels({
        gameId: gameId || "MISSING",
      });
      const connectionToken = urlParams.get("connectionToken");
      if (!connectionToken) {
        connectionTransaction.addLabels({
          connectionToken: "missing",
        });
        connectionLogger.warn("Request missing connection token");
        ws.send(
          JSON.stringify({
            type: "error",
            error: "connection token is required",
          }),
        );
        connectionTransaction.end();
        ws.close();
        return;
      }
      const decodedToken = await connectionTokenManager.verify(connectionToken);

      if (!decodedToken) {
        connectionTransaction.addLabels({
          connectionToken: "invalid",
        });
        connectionLogger.warn("Invalid connection token");
        ws.send(
          JSON.stringify({
            type: "error",
            error: "invalid connection token",
          }),
        );
        connectionTransaction.end();
        ws.close();
        return;
      }

      connectionTransaction.addLabels({
        connectionToken: "valid",
        userId: decodedToken.userId,
      });

      if (!gameId) {
        connectionLogger.warn("Request missing game id");
        ws.send(
          JSON.stringify({
            type: "error",
            error: "game id is required",
          }),
        );
        ws.close();
        return;
      }

      connectionLogger.info("Connection verified", {
        gameId,
        decodedToken,
      });

      const game = await appGamePool.getGameById(gameId);

      if (!game) {
        connectionLogger.warn("Game not found");
        connectionTransaction.end();
        ws.send(
          JSON.stringify({
            type: "error",
            error: "game not found",
          }),
        );
        ws.close();
        return;
      }

      const gamePoolListener = appGamePool.addListener(ws);
      const gameListener = game.addListener(ws);

      ws.send(
        JSON.stringify({
          type: "initGameData",
          data: game.modelDump(),
        }),
      );

      connectionLogger.info("Game found", {
        game,
      });

      appGamePool.addUserToGame(decodedToken.userId, gameId);

      ws.on("error", connectionLogger.error);

      ws.on("message", function message(data) {
        connectionLogger.info("message recieved", data);
      });

      ws.on("close", function close() {
        if (game) {
          game.removeUser(decodedToken.userId);
        }
        gamePoolListener();
        gameListener();
        connectionLogger.info("Connection closed", {
          gameId,
          userId: decodedToken.userId,
        });
        connectionTransaction.end();
      });

      while (ws.readyState === ws.OPEN) {
        connectionLogger.info("Connection tick", {
          game: game.modelDump(),
          ws: {
            userId: decodedToken.userId,
            readyState: ws.readyState,
          },
        });
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
    },
  );

  server.on("error", appLogger.error);

  server.listen(config.PORT, () => {
    appLogger.info(`Server listening on port: ${config.PORT}`);
  });
  return {
    appLogger,
  };
}

main()
  .then(({ appLogger }) => {
    appLogger.info("Server started");
  })
  .catch(console.error);
