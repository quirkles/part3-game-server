import {Game} from "./Game";

export class GamePool {
    private games: Map<string, Game> = new Map();
    constructor() {}
}