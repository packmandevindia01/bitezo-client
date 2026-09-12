import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs';

const outputPathArtifact = 'C:/Users/DELL/.gemini/antigravity/brain/2eb04737-c57f-4676-8a63-2f903010ccef/Branch_Customized_Header_Footer_Proposal.pdf';
const outputPathWorkspace = 'd:/client-bitezo/Branch_Customized_Header_Footer_Proposal.pdf';

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

const primaryColor = [73, 41, 62];     // #49293E (Dark Plum)
const secondaryColor = [130, 70, 110]; // #82466E (Medium Plum)
const accentColor = [217, 83, 79];     // Red / Coral Highlight
const darkTextColor = [30, 41, 59];    // Slate 800
const lightBgColor = [248, 250, 252];   // Slate 50
const borderColor = [226, 232, 240];   // Slate 200

function addHeaderFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Top Banner Bar
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 8, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('BITEZO CLOUD POS & .NET BACKEND ARCHITECTURE', 14, 5.5);
    doc.text('BACKEND & PRINTER TEXT POSITIONING SPECIFICATION', 196, 5.5, { align: 'right' });

    // Bottom Footer Line
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.5);
    doc.line(14, 282, 196, 282);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Confidential — Prepared for Engineering & Management Review', 14, 287);
    doc.text(`Page ${i} of ${pageCount}`, 196, 287, { align: 'right' });
  }
}

// --- PAGE 1: TITLE & EXECUTIVE SUMMARY ---
let y = 16;

doc.setFillColor(...lightBgColor);
doc.roundedRect(14, y, 182, 42, 3, 3, 'F');
doc.setDrawColor(...primaryColor);
doc.setLineWidth(1);
doc.roundedRect(14, y, 182, 42, 3, 3, 'D');

// Pillar Accent
doc.setFillColor(...primaryColor);
doc.rect(14, y, 5, 42, 'F');

doc.setFont('helvetica', 'bold');
doc.setFontSize(15);
doc.setTextColor(...primaryColor);
doc.text('Backend & Printer Text Positioning Architecture', 24, y + 11);

doc.setFont('helvetica', 'bold');
doc.setFontSize(10.5);
doc.setTextColor(...secondaryColor);
doc.text('21-Line Thermal Header/Footer & Horizontal Alignment Engine (offsetX % & ESC/POS)', 24, y + 19);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(...darkTextColor);
doc.text('Target Framework: .NET API (EF Core DB, DTO Contracts, ESC/POS Thermal Commands & CSS)', 24, y + 27);
doc.text('Date: September 2026  |  Document Version: 3.1 (Fixed JSON Formatting & Layout)', 24, y + 34);

y += 50;

// SECTION 1: SYSTEM OVERVIEW & BACKEND REQUIREMENTS
doc.setFillColor(...primaryColor);
doc.rect(14, y, 182, 7, 'F');
doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(255, 255, 255);
doc.text('1. BACKEND CORE OBJECTIVES & DATA FLOW', 18, y + 5);

y += 12;

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(...darkTextColor);

const summaryText = [
  "To support multi-branch restaurant and retail operations, the .NET Backend API must manage and persist 21 dynamic line items per branch (7 Header lines H1..H7, 7 Footer lines F1..F7, and 7 End-of-Day Report Header lines EH1..EH7).",
  "",
  "The backend is responsible for receiving JSON payloads from the Backoffice UI, validating line constraints and text positioning attributes (offsetX percentage, alignments, font styling), storing them in relational database tables via EF Core, and delivering them inside the POS Session initialization API GET /api/v1/pos/session."
];

let splitSummary = doc.splitTextToSize(summaryText.join('\n'), 182);
doc.text(splitSummary, 14, y);

y += splitSummary.length * 4.8 + 4;

// Overview Table
autoTable(doc, {
  startY: y,
  margin: { left: 14, right: 14 },
  head: [['API Endpoint', 'HTTP Method', 'Payload / Return Data', 'Backend Responsibility']],
  body: [
    ['/api/v1/branches', 'POST / PUT', 'BranchPayload DTO', 'Validates & saves branch info + 21 BranchLines to DB'],
    ['/api/v1/branches/{id}', 'GET', 'BranchRecord DTO', 'Returns branch metadata with eagerly loaded BranchLines'],
    ['/api/v1/pos/session', 'GET', 'PosSessionResponse DTO', 'Includes ActiveBranch with its 21 BranchLines for POS caching']
  ],
  headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
  bodyStyles: { fontSize: 8, textColor: darkTextColor },
  alternateRowStyles: { fillColor: lightBgColor },
  theme: 'grid'
});

y = doc.lastAutoTable.finalY + 10;

// SECTION 2: TEXT POSITIONING & ALIGNMENT SPECIFICATION
doc.setFillColor(...primaryColor);
doc.rect(14, y, 182, 7, 'F');
doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(255, 255, 255);
doc.text('2. TEXT POSITIONING & HORIZONTAL ALIGNMENT ARCHITECTURE', 18, y + 5);

y += 12;

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.8);
doc.setTextColor(...darkTextColor);

const posExplanation = [
  "Text positioning across thermal receipt paper (80mm/58mm) and web HTML thermal templates is driven by an integer property `offsetX` ranging from 0 to 100:",
  "• offsetX = 0 (0%): Hard Left-aligned text.",
  "• offsetX = 50 (50%): Centered text across thermal paper line width.",
  "• offsetX = 100 (100%): Hard Right-aligned text.",
  "• Intermediate values (e.g. 15, 30): Custom percentage-based left indentation margin for indented text or visual hierarchy."
];

let splitPos = doc.splitTextToSize(posExplanation.join('\n'), 182);
doc.text(splitPos, 14, y);

y += splitPos.length * 4.6 + 4;

autoTable(doc, {
  startY: y,
  margin: { left: 14, right: 14 },
  head: [['Position Slot', 'offsetX %', 'Target Alignment', 'ESC/POS Thermal Command', 'HTML Web Print CSS']],
  body: [
    ['Left Aligned', '0%', 'Left', '0x1B 0x61 0x00 (ESC a 0)', 'text-align: left; padding-left: 0;'],
    ['Centered', '50%', 'Center', '0x1B 0x61 0x01 (ESC a 1)', 'text-align: center; margin: 0 auto;'],
    ['Right Aligned', '100%', 'Right', '0x1B 0x61 0x02 (ESC a 2)', 'text-align: right; padding-right: 0;'],
    ['Custom Indented', '1% to 49%', 'Left Indent', '0x1B 0x61 0x00 + Space Pad', 'text-align: left; margin-left: [offsetX]%;']
  ],
  headStyles: { fillColor: secondaryColor, textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
  bodyStyles: { fontSize: 8, textColor: darkTextColor, cellPadding: 1.8 },
  columnStyles: {
    0: { cellWidth: 28, fontStyle: 'bold', textColor: primaryColor },
    1: { cellWidth: 22, fontStyle: 'bold' },
    2: { cellWidth: 28 },
    3: { cellWidth: 50 },
    4: { cellWidth: 54 }
  },
  alternateRowStyles: { fillColor: lightBgColor },
  theme: 'grid'
});

// --- PAGE 2: DATABASE SCHEMA & C# DTO CONTRACTS ---
doc.addPage();
y = 16;

doc.setFillColor(...primaryColor);
doc.rect(14, y, 182, 7, 'F');
doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(255, 255, 255);
doc.text('3. DATABASE SCHEMA & EF CORE ENTITY DEFINITION (.NET)', 18, y + 5);

y += 12;

autoTable(doc, {
  startY: y,
  margin: { left: 14, right: 14 },
  head: [['Column Name', 'SQL Data Type', 'EF Core Type', 'Constraints & Positioning Role']],
  body: [
    ['Id', 'INT (PK, Identity)', 'int', 'Primary Key for BranchLine record'],
    ['BranchId', 'INT (FK)', 'int', 'Foreign Key -> Branches.Id (ON DELETE CASCADE)'],
    ['Code', 'NVARCHAR(10)', 'string', 'Line identifier: H1..H7, F1..F7, EH1..EH7'],
    ['Section', 'NVARCHAR(20)', 'string', 'Allowed: "header", "footer", "dayEndHeader"'],
    ['LineValue', 'NVARCHAR(255)', 'string', 'Text content printed on thermal paper'],
    ['FontFamily', 'NVARCHAR(50)', 'string', 'e.g., "Courier", "FontA", "FontB"'],
    ['FontStyle', 'NVARCHAR(50)', 'string', 'Allowed: "Bold", "Regular"'],
    ['FontSize', 'NVARCHAR(50)', 'string', 'Allowed: "Small", "Medium", "Large"'],
    ['OffsetX', 'INT', 'int', 'Horizontal offset % (0=Left, 50=Center, 100=Right)']
  ],
  headStyles: { fillColor: secondaryColor, textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
  bodyStyles: { fontSize: 8, textColor: darkTextColor, cellPadding: 1.8 },
  columnStyles: {
    0: { cellWidth: 32, fontStyle: 'bold', textColor: primaryColor },
    1: { cellWidth: 35 },
    2: { cellWidth: 28 },
    3: { cellWidth: 87 }
  },
  alternateRowStyles: { fillColor: lightBgColor },
  theme: 'grid'
});

y = doc.lastAutoTable.finalY + 10;

// SECTION 4: C# DTO CONTRACTS
doc.setFillColor(...primaryColor);
doc.rect(14, y, 182, 7, 'F');
doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(255, 255, 255);
doc.text('4. C# DATA TRANSFER OBJECTS (DTOs)', 18, y + 5);

y += 12;

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(...darkTextColor);
doc.text('The .NET API Controller requires strong typing and explicit JSON serialization attributes:', 14, y);

y += 5;

// Code Block for C# DTO
doc.setFillColor(30, 41, 59); // Dark Terminal Style
doc.roundedRect(14, y, 182, 70, 2, 2, 'F');

doc.setFont('courier', 'bold');
doc.setFontSize(7.3);
doc.setTextColor(147, 197, 253); // Light Blue

const csharpCode = [
  "// C# Request / Response DTOs for Branch Management",
  "public class BranchPayloadDto",
  "{",
  "    public string BranchName { get; set; }",
  "    public bool IsActive { get; set; }",
  "    public List<BranchLineDto> Lines { get; set; } = new();",
  "}",
  "",
  "public class BranchLineDto",
  "{",
  "    public string Id { get; set; }        // \"H1\"..\"H7\", \"F1\"..\"F7\", \"EH1\"..\"EH7\"",
  "    public string Value { get; set; }     // Line text content",
  "    public string Section { get; set; }   // \"header\" | \"footer\" | \"dayEndHeader\"",
  "    public string FontFamily { get; set; } // Font family name",
  "    public string FontStyle { get; set; }  // \"Bold\" | \"Regular\"",
  "    public string FontSize { get; set; }   // \"Small\" | \"Medium\" | \"Large\"",
  "    public int OffsetX { get; set; }       // Horizontal position % (0=Left, 50=Center, 100=Right)",
  "}"
];

doc.text(csharpCode.join('\n'), 18, y + 6);

y += 76;

// SECTION 5: JSON REQUEST PAYLOAD EXAMPLE (PROPERLY FORMATTED & WRAPPED)
doc.setFont('helvetica', 'bold');
doc.setFontSize(9.5);
doc.setTextColor(...primaryColor);
doc.text('JSON Request Payload Example (PUT /api/v1/branches/2):', 14, y);

y += 5;

// Properly formatted, multi-line structured JSON that easily fits inside the box
const jsonLinesFormatted = [
  "{",
  '  "branchName": "BITEZO CAFE — SEEF MALL",',
  '  "isActive": true,',
  '  "lines": [',
  '    {',
  '      "id": "H1", "section": "header",',
  '      "value": "BITEZO CAFE — SEEF MALL BRANCH",',
  '      "fontFamily": "Courier", "fontStyle": "Bold", "fontSize": "Large", "offsetX": 50',
  '    },',
  '    {',
  '      "id": "H2", "section": "header",',
  '      "value": "CR No: 102030-4 | VAT: 30099887711",',
  '      "fontFamily": "Courier", "fontStyle": "Regular", "fontSize": "Small", "offsetX": 50',
  '    },',
  '    {',
  '      "id": "F1", "section": "footer",',
  '      "value": "Thank you for dining with Bitezo!",',
  '      "fontFamily": "Courier", "fontStyle": "Bold", "fontSize": "Medium", "offsetX": 50',
  '    },',
  '    {',
  '      "id": "EH1", "section": "dayEndHeader",',
  '      "value": "DAILY BRANCH FINANCIAL AUDIT REPORT",',
  '      "fontFamily": "Courier", "fontStyle": "Bold", "fontSize": "Large", "offsetX": 50',
  '    }',
  '  ]',
  "}"
];

const boxHeight = jsonLinesFormatted.length * 3.4 + 6;

doc.setFillColor(241, 245, 249);
doc.roundedRect(14, y, 182, boxHeight, 2, 2, 'F');
doc.setDrawColor(...borderColor);
doc.roundedRect(14, y, 182, boxHeight, 2, 2, 'D');

doc.setFont('courier', 'normal');
doc.setFontSize(7.2);
doc.setTextColor(15, 23, 42);
doc.text(jsonLinesFormatted.join('\n'), 18, y + 5);

// --- PAGE 3: BACKEND VALIDATION & POS SESSION CACHING ---
doc.addPage();
y = 16;

doc.setFillColor(...primaryColor);
doc.rect(14, y, 182, 7, 'F');
doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(255, 255, 255);
doc.text('6. BACKEND VALIDATION RULES & BUSINESS LOGIC', 18, y + 5);

y += 12;

autoTable(doc, {
  startY: y,
  margin: { left: 14, right: 14 },
  head: [['Rule Area', 'Validation Constraint', 'Error Handling / Action']],
  body: [
    ['Line Count Limit', 'Max 21 lines total per branch (7 Header, 7 Footer, 7 DayEndHeader)', 'Reject with 400 Bad Request if line count exceeds limit'],
    ['OffsetX Range', 'Integer between 0 and 100 inclusive (0=Left, 50=Center, 100=Right)', 'Clamp or reject values outside [0..100] range'],
    ['Section Enum', 'Must be strictly "header", "footer", or "dayEndHeader"', 'FluentValidation check returning "Invalid Section name"'],
    ['Line Code Format', 'Regex pattern validation: ^(H[1-7]|F[1-7]|EH[1-7])$', 'Ensures line IDs conform to expected template slots'],
    ['Text Length', 'LineValue string length <= 255 characters', 'Truncate or reject to prevent printer text buffer overflow']
  ],
  headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
  bodyStyles: { fontSize: 8, textColor: darkTextColor },
  columnStyles: {
    0: { cellWidth: 32, fontStyle: 'bold' },
    1: { cellWidth: 70 },
    2: { cellWidth: 80 }
  },
  alternateRowStyles: { fillColor: lightBgColor },
  theme: 'grid'
});

y = doc.lastAutoTable.finalY + 10;

// SECTION 7: POS SESSION INITIALIZATION INTEGRATION
doc.setFillColor(...primaryColor);
doc.rect(14, y, 182, 7, 'F');
doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(255, 255, 255);
doc.text('7. POS SESSION API & CASHIER LOGIN INTEGRATION', 18, y + 5);

y += 12;

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.8);
doc.setTextColor(...darkTextColor);

const sessionExplanation = [
  "When a cashier logs into the POS system, the frontend invokes GET /api/v1/pos/session to retrieve user roles, branch info, active session settings, and tax parameters.",
  "",
  "Backend Requirement:",
  "• The session controller query MUST include .Include(b => b.Lines) on the ActiveBranch entity.",
  "• The response JSON payload must populate activeBranch.lines array with all 21 lines including their positioning attributes (offsetX, fontFamily, fontStyle, fontSize).",
  "• Benefit: POS frontend caches these lines in Redux/localStorage upon login. Zero API network overhead during live printing!"
];

let splitSession = doc.splitTextToSize(sessionExplanation.join('\n'), 182);
doc.text(splitSession, 14, y);

y += splitSession.length * 4.6 + 6;

// Add Headers and Footers
addHeaderFooter(doc);

// Write output files safely
const pdfBuffer = doc.output('arraybuffer');
try {
  fs.writeFileSync(outputPathArtifact, Buffer.from(pdfBuffer));
  console.log('Artifact PDF generated successfully at:', outputPathArtifact);
} catch (e) {
  console.error('Artifact write warning:', e.message);
}

try {
  fs.writeFileSync(outputPathWorkspace, Buffer.from(pdfBuffer));
  console.log('Workspace PDF generated successfully at:', outputPathWorkspace);
} catch (e) {
  const altPath = 'd:/client-bitezo/Branch_Customized_Header_Footer_Proposal_v31.pdf';
  fs.writeFileSync(altPath, Buffer.from(pdfBuffer));
  console.log('Workspace PDF written to alternate path:', altPath);
}
