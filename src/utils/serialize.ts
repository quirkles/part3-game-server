import { isPrimitive } from "./duck";

const MAX_DEPTH_REACHED = Symbol("MAX_DEPTH_REACHED");

export function serialize(
  obj: Record<string, unknown>,
  depthRemaining: number = 5,
): Record<string, unknown> | typeof MAX_DEPTH_REACHED {
  if (depthRemaining <= 0) {
    return MAX_DEPTH_REACHED;
  }
  const returnObj: Record<string, unknown> = {};
  for (const key in obj) {
    const val = obj[key];
    if (typeof val === "function") {
      returnObj[key] = `fn.${val.name || "anonymous"}`;
      continue;
    }
    if (isPrimitive(val)) {
      returnObj[key] = val;
      continue;
    }
    if (Array.isArray(val)) {
      returnObj[key] = val.map((v) =>
        isPrimitive(v) ? v : serialize(v, depthRemaining - 1),
      );
    }
    if (typeof val === "object") {
      returnObj[key] = serialize(
        val as Record<string, unknown>,
        depthRemaining - 1,
      );
    }
  }
  return returnObj;
}
