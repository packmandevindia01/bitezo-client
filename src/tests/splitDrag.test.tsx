// @vitest-environment jsdom
/** Split screen drag and drop: a drop moves the whole line (owner's request 2026-11-12). */
import { createElement, useEffect } from "react";
import { render, fireEvent, act, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useSplitDrag, splitDropCheck, SPLIT_BUCKET_ATTR, type DropBucket } from "../features/pos/terminal/hooks/useSplitDrag";

const buckets = (): DropBucket[] => [
  { id: "base", isBase: true, items: [{ mapId: 1, currentQty: 10 }, { mapId: 2, currentQty: 8 }] },
  { id: "split-1", isBase: false, items: [] },
  { id: "split-2", isBase: false, items: [{ mapId: 3, currentQty: 2 }] },
];

describe("splitDropCheck", () => {
  it("moves a line to another bill", () => {
    expect(splitDropCheck(buckets(), "base", "split-1", 2)).toEqual({ move: true });
    expect(splitDropCheck(buckets(), "split-2", "base", 3)).toEqual({ move: true });
    expect(splitDropCheck(buckets(), "split-2", "split-1", 3)).toEqual({ move: true });
  });

  it("dropped on its own bill or on nothing: no move, no message", () => {
    expect(splitDropCheck(buckets(), "base", "base", 1)).toEqual({ move: false });
    expect(splitDropCheck(buckets(), "base", null, 1)).toEqual({ move: false });
  });

  it("the original order keeps at least one item", () => {
    const b = buckets();
    b[0].items = [{ mapId: 1, currentQty: 10 }];
    expect(splitDropCheck(b, "base", "split-1", 1)).toEqual({ move: false, message: "Original order must have at least one item." });
  });
});

describe("useSplitDrag", () => {
  let onDrop: ReturnType<typeof vi.fn>;
  const hook: { api?: ReturnType<typeof useSplitDrag> } = {};
  const Harness = () => {
    const api = useSplitDrag(onDrop as never);
    useEffect(() => { hook.api = api; });
    return createElement("div", null,
      createElement("div", { [SPLIT_BUCKET_ATTR]: "base" }, createElement("div", { "data-testid": "row", onPointerDown: api.onPointerDown("base", 2, "8 × Tea") })),
      createElement("div", { [SPLIT_BUCKET_ATTR]: "split-1", "data-testid": "target" }),
    );
  };
  const pointer = (type: string, x: number, y: number, pointerType = "mouse") => {
    const ev = new Event(type, { bubbles: true }) as Event & Record<string, unknown>;
    Object.assign(ev, { clientX: x, clientY: y, pointerId: 1, pointerType, button: 0 });
    act(() => { window.dispatchEvent(ev); });
  };

  beforeEach(() => {
    onDrop = vi.fn();
    vi.useFakeTimers();
    document.elementFromPoint = vi.fn((x: number) => document.querySelector(`[${SPLIT_BUCKET_ATTR}="${x > 100 ? "split-1" : "base"}"]`)) as never;
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("mouse: press, move, release over another bill → drop there with the line", () => {
    const { getByTestId } = render(createElement(Harness));
    fireEvent.pointerDown(getByTestId("row"), { clientX: 10, clientY: 10, pointerId: 1, pointerType: "mouse", button: 0 });
    pointer("pointermove", 200, 10);
    expect(hook.api!.drag).toMatchObject({ fromBucketId: "base", mapId: 2, label: "8 × Tea", overBucketId: "split-1" });
    pointer("pointerup", 200, 10);
    expect(onDrop).toHaveBeenCalledWith("base", "split-1", 2);
    expect(hook.api!.drag).toBeNull();
    expect(hook.api!.isDragClick()).toBe(true);
  });

  it("mouse: a click (no movement) is not a drag", () => {
    const { getByTestId } = render(createElement(Harness));
    fireEvent.pointerDown(getByTestId("row"), { clientX: 10, clientY: 10, pointerId: 1, pointerType: "mouse", button: 0 });
    pointer("pointermove", 12, 11);
    pointer("pointerup", 12, 11);
    expect(onDrop).not.toHaveBeenCalled();
    expect(hook.api!.isDragClick()).toBe(false);
  });

  it("touch: hold, then move → drag; moving straight away is a scroll", () => {
    const { getByTestId } = render(createElement(Harness));
    fireEvent.pointerDown(getByTestId("row"), { clientX: 10, clientY: 10, pointerId: 1, pointerType: "touch" });
    pointer("pointermove", 10, 60, "touch"); // scroll
    act(() => { vi.advanceTimersByTime(400); });
    expect(hook.api!.drag).toBeNull();

    fireEvent.pointerDown(getByTestId("row"), { clientX: 10, clientY: 10, pointerId: 1, pointerType: "touch" });
    act(() => { vi.advanceTimersByTime(350); });
    expect(hook.api!.drag).not.toBeNull();
    pointer("pointermove", 220, 10, "touch");
    pointer("pointerup", 220, 10, "touch");
    expect(onDrop).toHaveBeenCalledWith("base", "split-1", 2);
  });

  it("Escape cancels a drag", () => {
    const { getByTestId } = render(createElement(Harness));
    fireEvent.pointerDown(getByTestId("row"), { clientX: 10, clientY: 10, pointerId: 1, pointerType: "mouse", button: 0 });
    pointer("pointermove", 200, 10);
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); });
    expect(hook.api!.drag).toBeNull();
    pointer("pointerup", 200, 10);
    expect(onDrop).not.toHaveBeenCalled();
  });
});
