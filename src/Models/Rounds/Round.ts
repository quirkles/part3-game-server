import {nanoid} from "nanoid";

import {EventEmitter, type Event} from "../../utils/EventEmitter"

interface RoundEvents extends Event {
    roundStart: () => void
}


export class Round extends EventEmitter<RoundEvents>{
    private readonly id: string
    private team1Users: string[]
    private team2Users: string[]

    constructor(team1Users: string[], team2Users: string[]) {
        super();
        this.team1Users = team1Users;
        this.team2Users = team2Users;
        this.id = nanoid();
    }

    get Id() {
        return this.id;
    }
}