import { describe, it, expect } from "vitest";
import { allocate } from "../features/pos/terminal/utils/pos-calc";

describe("allocate", () => {
  it("shares an amount by weight, and the parts add up exactly", () => {
    const parts = allocate(10, [1, 1, 1]);
    expect(parts).toEqual([3.333, 3.333, 3.334]);
    expect(Math.round(parts.reduce((a, b) => a + b, 0) * 1000)).toBe(10000);
  });

  it("follows the weights", () => {
    expect(allocate(9, [1, 2])).toEqual([3, 6]);
  });

  it("no weight gets nothing", () => {
    expect(allocate(5, [0, 0])).toEqual([0, 0]);
  });
});
