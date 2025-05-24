export function isPrimitive(
  val: unknown,
): val is string | number | boolean | null | undefined {
  return (
    val === undefined ||
    val === null ||
    typeof val === "string" ||
    typeof val === "number" ||
    typeof val === "boolean"
  );
}
