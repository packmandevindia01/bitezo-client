import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeKotRouting } from "../features/pos/utils/printerRouting";
import cartActionsSource from "../features/pos/terminal/hooks/usePosCartActions.ts?raw";

const items = [{ uniqueId: "a", productId: 1, quantity: 1, price: 5, product: { id: 1, name: "Burger", categoryId: 1 } }] as never;

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

const printed = async (
  config: Record<string, string>,
  options: { isUpdate?: boolean; headerTitle?: string; forcedPrint?: boolean } = {}
) => {
  localStorage.setItem("posConfigs", JSON.stringify({ configs: config }));
  const out: string[] = [];
  const generate = async (_lines: unknown, o: { headerTitle?: string; isMaster?: boolean }) =>
    `${o.isMaster ? "master" : "station"}:${o.headerTitle}`;
  await executeKotRouting(
    items,
    { orderNo: "1", headerTitle: options.headerTitle, forcedPrint: options.forcedPrint },
    undefined,
    undefined,
    async (kot: string) => { out.push(kot); },
    generate,
    Boolean(options.isUpdate)
  );
  return out;
};

const ON = { kotPrint: "Enable", masterKot: "Disable" };
const OFF = { kotPrint: "Disable", masterKot: "Disable" };

describe("Standard KOT Print decides every order", () => {
  it("new order", async () => {
    expect(await printed(ON)).toEqual(["station:KOT"]);
    expect(await printed(OFF)).toEqual([]);
  });

  it("edited order", async () => {
    expect(await printed(ON, { isUpdate: true })).toEqual(["station:UPDATE KOT"]);
    expect(await printed(OFF, { isUpdate: true })).toEqual([]);
  });

  it("re-order", async () => {
    expect(await printed(ON, { isUpdate: true, headerTitle: "RE-ORDER" })).toEqual(["station:RE-ORDER"]);
    expect(await printed(OFF, { isUpdate: true, headerTitle: "RE-ORDER" })).toEqual([]);
  });

  it("void items", async () => {
    expect(await printed(ON, { isUpdate: true, headerTitle: "VOID ITEMS" })).toEqual(["station:VOID ITEMS"]);
    expect(await printed(OFF, { isUpdate: true, headerTitle: "VOID ITEMS" })).toEqual([]);
  });

  it("no saved setting prints, the POS default", async () => {
    expect(await printed({})).toEqual(["station:KOT"]);
  });

  it("the Order button does not force the print, so the setting is reached", () => {
    expect(cartActionsSource).not.toContain("forcedPrint");
  });
});

describe("what the setting leaves alone", () => {
  it("Master KOT follows its own setting", async () => {
    const masterOnly = { kotPrint: "Disable", masterKot: "Enable" };
    expect(await printed(masterOnly)).toEqual(["master:MASTER KOT"]);
    expect(await printed(masterOnly, { isUpdate: true })).toEqual(["master:UPDATE MASTER KOT"]);
  });

  it("a manual KOT reprint from Recall still prints", async () => {
    expect(await printed(OFF, { forcedPrint: true })).toEqual(["station:KOT"]);
  });
});
