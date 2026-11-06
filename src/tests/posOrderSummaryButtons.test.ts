import { createElement, Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { PosOrderSummary } from "../features/pos/terminal/components/cart/PosOrderSummary";

vi.mock("../hooks/useCurrency", () => ({
  useCurrency: () => ({ formatAmount: (v: number) => String(v), decimalPart: 3 }),
}));

type ButtonProps = { onClick?: () => void; disabled?: boolean; children?: ReactNode };

const textOf = (node: ReactNode): string => {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return isValidElement(node) ? textOf((node.props as ButtonProps).children) : "";
};

const buttonsIn = (node: ReactNode): ReactElement<ButtonProps>[] => {
  const found: ReactElement<ButtonProps>[] = [];
  Children.forEach(node, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === "button") found.push(child as ReactElement<ButtonProps>);
    found.push(...buttonsIn((child.props as ButtonProps).children));
  });
  return found;
};

const setup = (extra: Record<string, unknown> = {}) => {
  const onOrder = vi.fn();
  const onSettle = vi.fn();
  const props = {
    subtotal: 10, discount: 0, tax: 1, charges: 0, total: 11, totalExtras: 0, baseSubtotal: 10, selectedTender: "1",
    onSelectTender: () => {}, tenderOptions: [{ id: "1", label: "Cash" }], onOrder, onSettle, ...extra,
  };
  let tree: ReactNode = null;
  const Capture = () => {
    tree = (PosOrderSummary as unknown as (p: typeof props) => ReactNode)(props);
    return tree;
  };
  const html = renderToString(createElement(Capture));
  const button = (label: string) => buttonsIn(tree).find((b) => textOf(b).toLowerCase() === label.toLowerCase());
  return { html, button, onOrder, onSettle };
};

describe("POS footer: one Order and one Settle button", () => {
  it("has no Order & Print or Settle & Print buttons", () => {
    const { html, button } = setup();
    expect(button("Order")).toBeDefined();
    expect(button("Settle")).toBeDefined();
    expect(html).not.toMatch(/&amp;|Print/);
  });

  it("Order prints", () => {
    const { button, onOrder } = setup();
    button("Order")!.props.onClick!();
    expect(onOrder).toHaveBeenCalledWith(true);
  });

  it("Settle prints", () => {
    const { button, onSettle } = setup();
    button("Settle")!.props.onClick!();
    expect(onSettle).toHaveBeenCalledWith(true);
  });

  it("editing a settled bill: Update prints, Order stays disabled", () => {
    const { html, button, onSettle } = setup({ isSettledEdit: true });
    expect(html).not.toMatch(/&amp;|Print/);
    button("Update")!.props.onClick!();
    expect(onSettle).toHaveBeenCalledWith(true);
    expect(button("Order")!.props.disabled).toBe(true);
  });

  it("an empty cart disables both", () => {
    const { button } = setup({ subtotal: 0 });
    expect(button("Order")!.props.disabled).toBe(true);
    expect(button("Settle")!.props.disabled).toBe(true);
  });
});
