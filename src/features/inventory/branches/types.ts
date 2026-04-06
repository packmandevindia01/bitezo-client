export interface FontAlignSettings {
  fontSize: string;
  alignment: "left" | "center" | "right";
}

export interface BranchFormData {
  branchName: string;

  headerLine1: string;
  headerLine2: string;
  headerLine3: string;
  headerLine4: string;
  headerLine5: string;
  headerLine6: string;
  headerLine7: string;

  footerLine1: string;
  footerLine2: string;
  footerLine3: string;
  footerLine4: string;
  footerLine5: string;
  footerLine6: string;
  footerLine7: string;

  headerFontAlign: FontAlignSettings[];
}


export interface LineItem {
  id: string;
  value: string;
  fontFamily: string;
  fontStyle: string;
  fontSize: string;
   offsetX: number; 
  section: "header" | "footer";
}

export interface FontSettings {
  fontFamily: string;
  fontStyle: string;
  fontSize: string;
}

export interface FontModalState {
  open: boolean;
  lineId: string;
  temp: FontSettings;
}

export interface BranchPayload {
  branchName: string;
  lines: LineItem[];
}

export interface BranchRecord {
  id: number;
  branchName: string;
  lines: LineItem[];
}
