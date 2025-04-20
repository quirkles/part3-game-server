export interface Event {
    [key: string]: (...args: unknown[]) => void;
}

export class EventEmitter<T extends Event> {
    private readonly handlers: { [eventName in keyof T]?: ((value: T[eventName]) => void)[] } = {}

    constructor() {}

    emit<K extends keyof T>(event: K, value: T[K]): void {
        this.handlers[event]?.forEach(h => h(value));
    }

    on<K extends keyof T>(event: K, handler: (value: T[K]) => void): () => void  {
        if(!this.handlers[event]) {
            this.handlers[event] = [handler];
        } else {
            this.handlers[event].push(handler);
        }
        return () => {
            this.handlers[event] = this.handlers[event]?.filter(h => h !== handler);
        };

    }
}