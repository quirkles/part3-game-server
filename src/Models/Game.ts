import { Logger } from "winston";

import { EventEmitter } from "./EventEmitter";
import { Round } from "./Rounds/Round";

const GameStatus = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  FINISHED: "FINISHED",
  CANCELLED: "CANCELLED",
} as const;

type GameStatus = keyof typeof GameStatus;

type GameEvents = {
  playerJoined: string;
  playerLeft: string;
};

export class Game extends EventEmitter<GameEvents> {
  private readonly id: string;
  private readonly name: string;
  private readonly createdBy: string;
  private status: GameStatus = GameStatus.NOT_STARTED;
  private rounds: Round[] = [];
  private players: string[] = [];

  constructor(
    params: {
      id: string;
      name: string;
      createdBy: string;
      status: "NOT_STARTED" | "IN_PROGRESS" | "FINISHED" | "CANCELLED";
    },
    logger: Logger,
  ) {
    super(
      logger.child({
        labels: {
          ...logger.defaultMeta,
          loggerName: "Game",
          gameLoggerGameId: params.id,
        },
      }),
    );
    this.id = params.id;
    this.createdBy = params.createdBy;
    this.status = params.status;
    this.logger.info("Game Instance Created");
    this.name = params.name;
  }

  removeUser(userId: string) {
    this.logger.info("removeUser begin", { userId });
    this.players = this.players.reduce((p: string[], pId: string) => {
      if (pId === userId) {
        this.logger.info("Removing user from game", { userId });
        return p;
      }
      return p.concat(pId);
    }, []);
    this.emit("playerLeft", userId);
  }

  addUser(userId: string) {
    this.logger.info("addUser begin", { userId, playersBefore: this.players });
    this.players.push(userId);
    this.emit("playerJoined", userId);
    this.logger.info("addUser end", { userId, playersAfter: this.players });
  }

  modelDump(): {
    id: string;
    name: string;
    createdBy: string;
    status: GameStatus;
    players: string[];
    rounds: string[];
  } {
    return {
      id: this.id,
      name: this.name,
      createdBy: this.createdBy,
      status: this.status,
      players: this.players,
      rounds: this.rounds.map((r) => r.id),
    };
  }
}
