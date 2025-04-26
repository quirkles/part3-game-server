import { Logger } from "winston";

import { EventEmitter } from "../utils/EventEmitter";

import { Round } from "./Rounds/Round";

const GameStatus = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  FINISHED: "FINISHED",
  CANCELLED: "CANCELLED",
} as const;

type GameStatus = keyof typeof GameStatus;

type GameEvents = {
  playerJoined: [userId: string];
  playerLeft: [userId: string];
};

export class Game extends EventEmitter<GameEvents> {
  private readonly id: string;
  private createdBy: string;
  private rounds: Round[] = [];
  private status: GameStatus = GameStatus.NOT_STARTED;
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
    super(logger);
    this.id = params.id;
    this.createdBy = params.createdBy;
    this.status = params.status;
  }

  removeUser(userId: string) {
    this.players = this.players.filter((p) => p !== userId);
    this.emit("playerLeft", userId);
  }

  addUser(userId: string) {
    this.players.push(userId);
    this.emit("playerJoined", userId);
  }
}
