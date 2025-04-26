import { describe, expect, test } from "@jest/globals";

// Simple utility function to test
function sum(a: number, b: number): number {
  return a + b;
}

describe("Utility Functions", () => {
  test("sum adds two numbers correctly", () => {
    expect(sum(1, 2)).toBe(3);
    expect(sum(-1, 1)).toBe(0);
    expect(sum(0, 0)).toBe(0);
  });
});
