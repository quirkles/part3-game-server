import { Logger } from "winston";

import { findGameById } from "../firestore/games";

import { EventEmitter } from "./EventEmitter";
import { Game } from "./Game";

type GamePoolEvents = {
  gameAdded: [gameId: string];
};

export class GamePool extends EventEmitter<GamePoolEvents> {
  private games: Map<string, Game> = new Map();
  private usersToGames: Map<string, string> = new Map();

  constructor(logger: Logger) {
    super(
      logger.child({
        labels: {
          ...logger.defaultMeta,
          loggerName: "GamePool",
        },
      }),
    );
    logger.info("Instance Created");
  }

  addUserToGame(userId: string, gameId: string) {
    this.logger.info("addUserToGame begin", { userId, gameId });
    const currentGame = this.usersToGames.get(userId);
    const newGame = this.games.get(gameId);
    if (!newGame) {
      this.logger.info("Failed to find game to add user, exiting", { gameId });
      return;
    }
    if (currentGame) {
      this.logger.info("Removing user from their current game", {
        userId,
        currentGame,
      });
      this.games.get(currentGame)?.removeUser(userId);
    }
    this.usersToGames.set(userId, gameId);
    newGame.addUser(userId);
  }

  async getGameById(gameId: string): Promise<Game | null> {
    this.logger.info("getGameById begin", { gameId });
    if (this.games.has(gameId)) {
      this.logger.info("Found game in cache", { gameId });
      return this.games.get(gameId) || null;
    }
    this.logger.info("Game not found in cache, fetching from firestore");
    return findGameById(gameId)
      .then((g) => {
        if (!g) {
          this.logger.info("Game not found in firestore", { gameId });
          return null;
        }
        const game = new Game(g, this.logger);
        this.logger.info("Game found in firestore", {
          gameId,
          game: game.modelDump(),
        });
        this.games.set(gameId, game);
        return game;
      })
      .catch(() => null);
  }
  modelDump(): {
    games: string[];
    usersToGames: {
      [userId: string]: string;
    };
  } {
    return {
      games: Array.from(this.games.keys()),
      usersToGames: Object.fromEntries(this.usersToGames.entries()),
    };
  }
}
