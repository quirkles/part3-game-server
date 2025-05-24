import { nanoid } from "nanoid";
import { Logger } from "winston";

import { EventEmitter } from "../EventEmitter";

type RoundEvents = {
  roundStart: [];
};

export class Round extends EventEmitter<RoundEvents> {
  private readonly _id: string;
  private team1Users: string[];
  private team2Users: string[];

  constructor(team1Users: string[], team2Users: string[], logger: Logger) {
    super(logger);
    this.team1Users = team1Users;
    this.team2Users = team2Users;
    this._id = nanoid();
  }

  get id() {
    return this._id;
  }

  modelDump(): {
    id: string;
    team1Users: string[];
    team2Users: string[];
  } {
    return {
      id: this.id,
      team1Users: this.team1Users,
      team2Users: this.team2Users,
    };
  }
}
