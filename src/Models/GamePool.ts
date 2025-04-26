import { Logger } from "winston";

import { findGameById } from "../firestore/games";
import { EventEmitter } from "../utils/EventEmitter";

import { Game } from "./Game";

type GamePoolEvents = {
  gameAdded: [gameId: string];
};

export class GamePool extends EventEmitter<GamePoolEvents> {
  private games: Map<string, Game> = new Map();
  private usersToGames: Map<string, string> = new Map();

  constructor(logger: Logger) {
    super(logger);
  }

  addUserToGame(userId: string, gameId: string) {
    const currentGame = this.usersToGames.get(userId);
    if (currentGame) {
      this.games.get(currentGame)?.removeUser(userId);
    }
    this.usersToGames.set(userId, gameId);
    this.games.get(gameId)?.addUser(userId);
  }

  async getGameById(gameId: string): Promise<Game | null> {
    if (this.games.has(gameId)) {
      return this.games.get(gameId) || null;
    }
    return findGameById(gameId)
      .then((g) => {
        if (!g) {
          return null;
        }
        const game = new Game(g, this.logger);
        this.games.set(gameId, game);
        return game;
      })
      .catch(() => null);
  }
}
