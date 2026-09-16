import type { BranchPayload, BranchRecord, LineItem } from "../types";

export interface BranchLineDto {
  id: string;
  code?: string;
  value: string;
  section: "header" | "footer" | "dayEndHeader";
  fontFamily: string;
  fontStyle: string;
  fontSize: string;
  offsetX: number;
}

export interface BranchRequestBody {
  branchId?: number;
  branchName: string;
  isActive: boolean | string;
  createdAt?: string;
  updatedAt?: string;
  lines?: BranchLineDto[];
  header1?: string; headerLeftAlign1?: number; headerFont1?: string;
  header2?: string; headerLeftAlign2?: number; headerFont2?: string;
  header3?: string; headerLeftAlign3?: number; headerFont3?: string;
  header4?: string; headerLeftAlign4?: number; headerFont4?: string;
  header5?: string; headerLeftAlign5?: number; headerFont5?: string;
  header6?: string; headerLeftAlign6?: number; headerFont6?: string;
  header7?: string; headerLeftAlign7?: number; headerFont7?: string;
  footer1?: string; footerLeftAlign1?: number; footerFont1?: string;
  footer2?: string; footerLeftAlign2?: number; footerFont2?: string;
  footer3?: string; footerLeftAlign3?: number; footerFont3?: string;
  footer4?: string; footerLeftAlign4?: number; footerFont4?: string;
  footer5?: string; footerLeftAlign5?: number; footerFont5?: string;
  footer6?: string; footerLeftAlign6?: number; footerFont6?: string;
  footer7?: string; footerLeftAlign7?: number; footerFont7?: string;

  dayEndHeader1?: string; dayEndHeaderLeftAlign1?: number; dayEndHeaderFont1?: string;
  dayEndHeader2?: string; dayEndHeaderLeftAlign2?: number; dayEndHeaderFont2?: string;
  dayEndHeader3?: string; dayEndHeaderLeftAlign3?: number; dayEndHeaderFont3?: string;
  dayEndHeader4?: string; dayEndHeaderLeftAlign4?: number; dayEndHeaderFont4?: string;
  dayEndHeader5?: string; dayEndHeaderLeftAlign5?: number; dayEndHeaderFont5?: string;
  dayEndHeader6?: string; dayEndHeaderLeftAlign6?: number; dayEndHeaderFont6?: string;
  dayEndHeader7?: string; dayEndHeaderLeftAlign7?: number; dayEndHeaderFont7?: string;
}

export const serializeFont = (line?: LineItem): string =>
  JSON.stringify({
    fontFamily: line?.fontFamily ?? "Courier",
    fontStyle: line?.fontStyle ?? "Regular",
    fontSize: line?.fontSize ?? "Medium",
  });

export const parseFont = (fontStr?: string) => {
  try {
    if (!fontStr) return { fontFamily: "Courier", fontStyle: "Regular", fontSize: "Medium" };
    const parsed = JSON.parse(fontStr);
    return {
      fontFamily: parsed.fontFamily || "Courier",
      fontStyle: parsed.fontStyle || "Regular",
      fontSize: parsed.fontSize || "Medium",
    };
  } catch {
    return { fontFamily: "Courier", fontStyle: "Regular", fontSize: "Medium" };
  }
};

export const buildRequestBody = (payload: BranchPayload, branchId?: number): BranchRequestBody => {
  const h = payload.lines.filter((l) => l.section === "header");
  const f = payload.lines.filter((l) => l.section === "footer");
  const eh = payload.lines.filter((l) => l.section === "dayEndHeader");

  const formattedLines: BranchLineDto[] = payload.lines.map((l, index) => {
    let id = l.id || l.code;
    if (!id || (!id.startsWith("H") && !id.startsWith("F") && !id.startsWith("EH"))) {
      const prefix = l.section === "header" ? "H" : l.section === "footer" ? "F" : "EH";
      const sectionLines = payload.lines.filter((item) => item.section === l.section);
      const sectionIndex = sectionLines.indexOf(l);
      id = `${prefix}${sectionIndex >= 0 ? sectionIndex + 1 : index + 1}`;
    }
    return {
      id,
      code: id,
      value: l.value || "",
      section: l.section,
      fontFamily: l.fontFamily || "Courier",
      fontStyle: l.fontStyle || "Regular",
      fontSize: l.fontSize || "Medium",
      offsetX: Math.round(Math.max(0, Math.min(100, l.offsetX ?? 0))),
    };
  });

  return {
    ...(branchId !== undefined ? { branchId } : { branchId: 0 }),
    branchName: payload.branchName,
    isActive: payload.isActive,
    ...(branchId !== undefined
      ? { updatedAt: new Date().toISOString() }
      : { createdAt: new Date().toISOString() }),
    lines: formattedLines,
    header1: h[0]?.value ?? "", headerLeftAlign1: Math.round(h[0]?.offsetX ?? 0), headerFont1: serializeFont(h[0]),
    header2: h[1]?.value ?? "", headerLeftAlign2: Math.round(h[1]?.offsetX ?? 0), headerFont2: serializeFont(h[1]),
    header3: h[2]?.value ?? "", headerLeftAlign3: Math.round(h[2]?.offsetX ?? 0), headerFont3: serializeFont(h[2]),
    header4: h[3]?.value ?? "", headerLeftAlign4: Math.round(h[3]?.offsetX ?? 0), headerFont4: serializeFont(h[3]),
    header5: h[4]?.value ?? "", headerLeftAlign5: Math.round(h[4]?.offsetX ?? 0), headerFont5: serializeFont(h[4]),
    header6: h[5]?.value ?? "", headerLeftAlign6: Math.round(h[5]?.offsetX ?? 0), headerFont6: serializeFont(h[5]),
    header7: h[6]?.value ?? "", headerLeftAlign7: Math.round(h[6]?.offsetX ?? 0), headerFont7: serializeFont(h[6]),
    footer1: f[0]?.value ?? "", footerLeftAlign1: Math.round(f[0]?.offsetX ?? 0), footerFont1: serializeFont(f[0]),
    footer2: f[1]?.value ?? "", footerLeftAlign2: Math.round(f[1]?.offsetX ?? 0), footerFont2: serializeFont(f[1]),
    footer3: f[2]?.value ?? "", footerLeftAlign3: Math.round(f[2]?.offsetX ?? 0), footerFont3: serializeFont(f[2]),
    footer4: f[3]?.value ?? "", footerLeftAlign4: Math.round(f[3]?.offsetX ?? 0), footerFont4: serializeFont(f[3]),
    footer5: f[4]?.value ?? "", footerLeftAlign5: Math.round(f[4]?.offsetX ?? 0), footerFont5: serializeFont(f[4]),
    footer6: f[5]?.value ?? "", footerLeftAlign6: Math.round(f[5]?.offsetX ?? 0), footerFont6: serializeFont(f[5]),
    footer7: f[6]?.value ?? "", footerLeftAlign7: Math.round(f[6]?.offsetX ?? 0), footerFont7: serializeFont(f[6]),

    dayEndHeader1: eh[0]?.value ?? "", dayEndHeaderLeftAlign1: Math.round(eh[0]?.offsetX ?? 0), dayEndHeaderFont1: serializeFont(eh[0]),
    dayEndHeader2: eh[1]?.value ?? "", dayEndHeaderLeftAlign2: Math.round(eh[1]?.offsetX ?? 0), dayEndHeaderFont2: serializeFont(eh[1]),
    dayEndHeader3: eh[2]?.value ?? "", dayEndHeaderLeftAlign3: Math.round(eh[2]?.offsetX ?? 0), dayEndHeaderFont3: serializeFont(eh[2]),
    dayEndHeader4: eh[3]?.value ?? "", dayEndHeaderLeftAlign4: Math.round(eh[3]?.offsetX ?? 0), dayEndHeaderFont4: serializeFont(eh[3]),
    dayEndHeader5: eh[4]?.value ?? "", dayEndHeaderLeftAlign5: Math.round(eh[4]?.offsetX ?? 0), dayEndHeaderFont5: serializeFont(eh[4]),
    dayEndHeader6: eh[5]?.value ?? "", dayEndHeaderLeftAlign6: Math.round(eh[5]?.offsetX ?? 0), dayEndHeaderFont6: serializeFont(eh[5]),
    dayEndHeader7: eh[6]?.value ?? "", dayEndHeaderLeftAlign7: Math.round(eh[6]?.offsetX ?? 0), dayEndHeaderFont7: serializeFont(eh[6]),
  };
};

export const mapResponseToBranch = (branchId: number, b: any): BranchRecord => {
  let lines: LineItem[] = [];

  // Check if server returned modern lines array
  if (Array.isArray(b.lines) && b.lines.length > 0) {
    lines = b.lines.map((l: any) => {
      const code = String(l.code || l.id || "");
      const section = (l.section || (code.startsWith("H") ? "header" : code.startsWith("F") ? "footer" : "dayEndHeader")) as "header" | "footer" | "dayEndHeader";
      return {
        id: code || l.id,
        code: code || undefined,
        section,
        value: String(l.value ?? l.lineValue ?? ""),
        fontFamily: l.fontFamily || "Courier",
        fontStyle: l.fontStyle || "Regular",
        fontSize: l.fontSize || "Medium",
        offsetX: typeof l.offsetX === "number" ? l.offsetX : 0,
      };
    });
  } else {
    // Map header fields back to LineItem array
    for (let i = 1; i <= 7; i++) {
      const raw = b as unknown as Record<string, unknown>;
      const val = raw[`header${i}`];
      if (val !== undefined && val !== null) {
        lines.push({
          id: `H${i}`,
          code: `H${i}`,
          section: "header",
          value: String(val),
          offsetX: Number(raw[`headerLeftAlign${i}`] ?? 0),
          ...parseFont(raw[`headerFont${i}`] as string | undefined),
        });
      }
    }

    // Map footer fields back to LineItem array
    for (let i = 1; i <= 7; i++) {
      const raw = b as unknown as Record<string, unknown>;
      const val = raw[`footer${i}`];
      if (val !== undefined && val !== null) {
        lines.push({
          id: `F${i}`,
          code: `F${i}`,
          section: "footer",
          value: String(val),
          offsetX: Number(raw[`footerLeftAlign${i}`] ?? 0),
          ...parseFont(raw[`footerFont${i}`] as string | undefined),
        });
      }
    }

    // Map day end header fields back to LineItem array (7 lines)
    for (let i = 1; i <= 7; i++) {
      const raw = b as unknown as Record<string, unknown>;
      const val = raw[`dayEndHeader${i}`];
      if (val !== undefined && val !== null) {
        lines.push({
          id: `EH${i}`,
          code: `EH${i}`,
          section: "dayEndHeader",
          value: String(val),
          offsetX: Number(raw[`dayEndHeaderLeftAlign${i}`] ?? 0),
          ...parseFont(raw[`dayEndHeaderFont${i}`] as string | undefined),
        });
      }
    }
  }

  return {
    id: branchId,
    branchName: b.branchName || "",
    isActive: typeof b.isActive === "boolean" 
      ? b.isActive 
      : String(b.isActive).toLowerCase() === "active",
    lines,
    detailsLoaded: true,
  };
};

