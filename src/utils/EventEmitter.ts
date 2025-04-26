import { Logger } from "winston";

type EventName = string;

export type EventHandlerArgsMap = Record<EventName, readonly unknown[]>;

export class EventEmitter<
  Events extends EventHandlerArgsMap,
  EventName extends keyof Events & string = keyof Events & string,
> {
  private readonly handlers: {
    [E in keyof Events]?: ((...args: Events[E]) => void)[];
  } = {};

  constructor(protected readonly logger: Logger) {}

  emit(
    ...[event, ...values]: EventName extends keyof Events
      ? [EventName, ...Events[EventName]]
      : never
  ): void {
    this.logger.debug(`EventEmitter.${this.constructor.name}.emit`, {
      event,
      values,
    });
    this.handlers[event]?.forEach((h) => h(...values));
  }

  on(
    ...[event, handler]: EventName extends keyof Events
      ? [EventName, (...args: Events[EventName]) => void]
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
}
