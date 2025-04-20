import {Round} from "./Rounds/Round";
import {nanoid} from "nanoid";

import {EventEmitter, type Event} from "../utils/EventEmitter";

const GameStatus = {
    NOT_STARTED: "NOT_STARTED",
    IN_PROGRESS: "IN_PROGRESS",
    FINISHED: "FINISHED",
    CANCELLED: "CANCELLED"
} as const

type GameStatus = keyof typeof GameStatus

interface GameEvents extends Event {

}

export class Game extends EventEmitter<GameEvents>{
    private readonly id: string;
    private createdAt: Date = new Date();
    private createdBy: string;
    private rounds: Round[] = [];
    private status: GameStatus = GameStatus.NOT_STARTED;

    constructor(createdBy: string) {
        super();
        this.id = nanoid();
        this.createdBy = createdBy;
    }

    get Id() {
        return this.id;
    }
}