// @vitest-environment jsdom
/** Back Office Menu Settings: session hours shown plainly (owner, 2026-11-12: the old HH:MM:SS + AM/PM inputs were confusing). */
import { createElement } from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  crossesMidnight, daySegments, durationMinutes, formatSessionHours, formatTime12, isAllDay, sessionsOverlap, toApiTime, toMinutes,
} from "../features/general/menuSettings/utils/sessionTime";
import MenuSettingsForm from "../features/general/menuSettings/components/MenuSettingsForm";

afterEach(() => cleanup());

describe("session hours", () => {
  it("formats the sessions set up on 8060", () => {
    expect(formatSessionHours("06:00:00", "23:59:00")).toBe("6:00 AM – 11:59 PM");
    expect(formatSessionHours("12:00:00", "03:00:00")).toBe("12:00 PM – 3:00 AM (next day)");
    expect(formatSessionHours("19:00:00", "00:00:00")).toBe("7:00 PM – 12:00 AM (next day)");
    expect(formatSessionHours("00:00:00", "00:00:00")).toBe("All day");
  });

  it("midnight, all day, duration and the day bar pieces", () => {
    expect(crossesMidnight("12:00:00", "03:00:00")).toBe(true);
    expect(crossesMidnight("15:00:00", "19:00:00")).toBe(false);
    expect(isAllDay("00:00:00", "00:00:00")).toBe(true);
    expect(durationMinutes("12:00:00", "03:00:00")).toBe(15 * 60);
    expect(daySegments("12:00:00", "03:00:00")).toEqual([[720, 1440], [0, 180]]);
    expect(daySegments("00:00:00", "00:00:00")).toEqual([[0, 1440]]);
  });

  it("overlap: Lunch 12:00–03:00 overlaps Evening Snacks 15:00–19:00; Snacks and Dinner 19:00–00:00 only touch", () => {
    expect(sessionsOverlap(["12:00:00", "03:00:00"], ["15:00:00", "19:00:00"])).toBe(true);
    expect(sessionsOverlap(["15:00:00", "19:00:00"], ["19:00:00", "00:00:00"])).toBe(false);
  });

  it("time conversions", () => {
    expect(toMinutes("07:30")).toBe(450);
    expect(toApiTime(450)).toBe("07:30:00");
    expect(formatTime12("00:05:00")).toBe("12:05 AM");
    expect(toMinutes("25:00")).toBeNull();
  });
});

describe("Menu Settings form", () => {
  const lunch = { menuId: 2, code: "2", name: "Lunch", arabicName: "", isActive: true, createdAt: "", updatedAt: "", startTime: "12:00:00", endTime: "03:00:00" };
  const others = [
    { key: 1, name: "Breakfast", start: "06:00:00", end: "23:59:00" },
    { key: 2, name: "Lunch", start: "12:00:00", end: "03:00:00" },
    { key: 3, name: "Evening Snacks", start: "15:00:00", end: "19:00:00" },
  ];
  const open = (props: Record<string, unknown> = {}) => {
    const onSubmit = vi.fn();
    render(createElement(MenuSettingsForm, { initialData: lunch, detailLoading: false, saving: false, onSubmit, otherSessions: others, ...props } as never));
    return onSubmit;
  };

  it("an overnight session says so plainly and warns", () => {
    open();
    expect(screen.getByText(/next day/)).toBeTruthy();
    expect(screen.getByText(/after midnight/)).toBeTruthy();
    expect(screen.getByText(/Overlaps with Breakfast/)).toBeTruthy();
  });

  it("fixing the hours saves HH:mm:00, and the warning goes away", async () => {
    const onSubmit = open();
    fireEvent.change(document.getElementById("endTime")!, { target: { value: "15:00" } });
    expect(screen.queryByText(/after midnight/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ startTime: "12:00:00", endTime: "15:00:00", name: "Lunch" });
  });

  it("All day saves 00:00:00 – 00:00:00", async () => {
    const onSubmit = open();
    fireEvent.click(screen.getByRole("radio", { name: "All day" }));
    expect(screen.getByText(/Runs all day/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ startTime: "00:00:00", endTime: "00:00:00" });
  });

  it("a preset fills both times", async () => {
    const onSubmit = open();
    fireEvent.click(screen.getByRole("button", { name: /^Dinner/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ startTime: "19:00:00", endTime: "23:00:00" });
  });
});
