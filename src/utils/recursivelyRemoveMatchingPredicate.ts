import { isPrimitive } from "./duck";

export function recursivelyRemoveMatchingPredicate<
  T extends Record<string, unknown>,
>(obj: T, predicate: (key: string, value?: unknown) => boolean): Partial<T> {
  const returnObj: Partial<T> = {};
  for (const key in obj) {
    if (predicate(key, obj[key])) {
      continue;
    }
    const val = obj[key];
    if (isPrimitive(obj[key])) {
      returnObj[key] = val;
    } else if (Array.isArray(val)) {
      returnObj[key] = val.map((x: T[keyof T]) =>
        typeof x === "object"
          ? recursivelyRemoveMatchingPredicate(
              x as Record<string, unknown>,
              predicate,
            )
          : x,
      ) as unknown as T[Extract<keyof T, string>] | undefined;
    } else if (typeof val === "object") {
      returnObj[key] = recursivelyRemoveMatchingPredicate(
        val as Record<string, unknown>,
        predicate,
      ) as unknown as T[Extract<keyof T, string>] | undefined;
    } else {
      obj[key] = val;
    }
  }
  return returnObj;
}
