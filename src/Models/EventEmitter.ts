import { nanoid } from "nanoid";
import { Logger } from "winston";
import { WebSocket } from "ws";

type EventName = string;

export type EventHandlerArgsMap = Record<EventName, unknown>;

export class EventEmitter<
  Events extends EventHandlerArgsMap,
  EventName extends keyof Events & string = keyof Events & string,
> {
  private readonly handlers: {
    [E in keyof Events]?: ((args: Events[E]) => void)[];
  } = {};

  subscribers: {
    [uuid: string]: WebSocket;
  } = {};

  constructor(protected readonly logger: Logger) {}

  emit<T extends EventName>(type: T, data: Events[T]): void {
    this.logger.debug(`EventEmitter.${this.constructor.name}.emit`, {
      eventName: type,
      data,
    });
    this.handlers[type]?.forEach((h) => h(data));
    Object.keys(this.subscribers).forEach((uuid) =>
      this.subscribers[uuid].send(JSON.stringify({ type, data })),
    );
  }

  on(
    ...[event, handler]: EventName extends keyof Events
      ? [EventName, (args: Events[EventName]) => void]
      : never
  ): () => void {
    if (!this.handlers[event]) {
      this.handlers[event] = [handler];
    } else {
      this.handlers[event].push(handler);
    }
    // Return the unsubscribe
    return () => {
      this.handlers[event] = this.handlers[event]?.filter((h) => h !== handler);
    };
  }

  addListener(webSocket: WebSocket): () => void {
    const uuid = nanoid();
    this.subscribers[uuid] = webSocket;
    return () => {
      delete this.subscribers[uuid];
    };
  }
}
