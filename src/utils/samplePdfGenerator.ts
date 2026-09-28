import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface UploadedPdfItem {
  id: string;
  name: string;
  sizeMb: number;
  blobUrl: string;
  file?: File;
  uploadedAt: string;
  stage: 'PD' | 'RD' | 'ID';
  pageCount?: number;
}

// Helper to draw standard GOST 21.101-2020 border & stamp on any page
function drawArchitecturalFrameAndStamp(
  page: any,
  fontBold: any,
  fontReg: any,
  docTitle: string,
  sheetTitle: string,
  sheetNum: number,
  totalSheets: number,
  stage: string,
  objectName: string
) {
  const { width, height } = page.getSize();
  const marginL = 50; // 20mm on left for binding
  const marginR = 20;
  const marginT = 20;
  const marginB = 20;
  const frameW = width - marginL - marginR;
  const frameH = height - marginT - marginB;

  // Outer border
  page.drawRectangle({
    x: marginL,
    y: marginB,
    width: frameW,
    height: frameH,
    borderColor: rgb(0.12, 0.16, 0.22),
    borderWidth: 1.5,
    color: rgb(0.99, 0.99, 0.99),
  });

  // Stamp Box at bottom right (185mm x 55mm in standard ГОСТ, ~360x110pt)
  const stampW = 380;
  const stampH = 100;
  const stampX = width - marginR - stampW;
  const stampY = marginB;

  page.drawRectangle({
    x: stampX,
    y: stampY,
    width: stampW,
    height: stampH,
    borderColor: rgb(0.12, 0.16, 0.22),
    borderWidth: 1.2,
    color: rgb(0.97, 0.98, 1.0),
  });

  // Stamp header lines
  page.drawLine({
    start: { x: stampX, y: stampY + stampH - 22 },
    end: { x: stampX + stampW, y: stampY + stampH - 22 },
    thickness: 0.8,
    color: rgb(0.2, 0.25, 0.35),
  });

  page.drawText('GOVERNMENT OF MOSCOW - MOSGOSSTROY NADZOR AI CONTROL', {
    x: stampX + 8,
    y: stampY + stampH - 16,
    size: 8,
    font: fontBold,
    color: rgb(0.15, 0.2, 0.45),
  });

  page.drawText(`OBJECT: ${objectName.substring(0, 50)}`, {
    x: stampX + 8,
    y: stampY + stampH - 34,
    size: 7.5,
    font: fontReg,
    color: rgb(0.15, 0.15, 0.15),
  });

  page.drawText(`CODE: ${docTitle.substring(0, 52)}`, {
    x: stampX + 8,
    y: stampY + stampH - 48,
    size: 7.5,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText(`SHEET: ${sheetTitle.substring(0, 52)}`, {
    x: stampX + 8,
    y: stampY + stampH - 62,
    size: 7.5,
    font: fontReg,
    color: rgb(0.25, 0.25, 0.25),
  });

  page.drawText(`STAGE: ${stage}  |  SHEET ${sheetNum} OF ${totalSheets}  |  REV: 2  |  DATE: 2025-2026`, {
    x: stampX + 8,
    y: stampY + stampH - 76,
    size: 7,
    font: fontBold,
    color: rgb(0.2, 0.35, 0.55),
  });

  page.drawText('CHIEF ARCHITECT: SHIRINOV Z.V.  |  EXPERT: MOSGOSSEXPERTIZA #77-1-1-3', {
    x: stampX + 8,
    y: stampY + 10,
    size: 6.5,
    font: fontReg,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Top Title Bar
  page.drawText('MOSGOSSTROY NADZOR - OFFICIAL VERIFIED INSPECTION FILE', {
    x: marginL + 15,
    y: height - marginT - 22,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.35),
  });

  page.drawText(`${docTitle} • ${sheetTitle}`, {
    x: marginL + 15,
    y: height - marginT - 36,
    size: 8.5,
    font: fontReg,
    color: rgb(0.35, 0.35, 0.4),
  });
}

// Generate realistic authentic multi-page architectural PDF document
export async function generateProjectDocumentPdf(
  docKey: 'RD-AR1' | 'RD-AR2' | 'RD-OV' | 'RD-KJ' | 'PD-AR' | 'PD-PZU' | 'ID-NVF' | 'DEFAULT',
  objectName: string
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  if (docKey === 'RD-AR1') {
    // Document 1: РД-2025-04.266-АР1 (5 pages)
    // Page 1: Title Cover
    const p1 = pdfDoc.addPage([842, 595]);
    drawArchitecturalFrameAndStamp(p1, fontBold, fontReg, 'RD-2025-04.266-AR1', 'TITLE SHEET', 1, 5, 'RD', objectName);
    p1.drawText('MOSCOW ARCHITECTURAL COMPLEX LLC', { x: 260, y: 380, size: 14, font: fontBold, color: rgb(0.1, 0.15, 0.3) });
    p1.drawText('WORKING DOCUMENTATION (STAGE RD)', { x: 280, y: 350, size: 12, font: fontBold, color: rgb(0.8, 0.1, 0.1) });
    p1.drawText(`OBJECT: ${objectName}`, { x: 160, y: 310, size: 10, font: fontBold, color: rgb(0.15, 0.15, 0.15) });
    p1.drawText('VOLUME 1: ARCHITECTURAL SOLUTIONS (AR1) - PLANS, DETAILS, SPECIFICATIONS', { x: 140, y: 280, size: 9, font: fontReg, color: rgb(0.3, 0.3, 0.3) });
    p1.drawText('Registration: 77-14/2026-MGN  |  Mosgosstroynadzor Inspection Case #07-2026', { x: 200, y: 220, size: 8, font: fontReg, color: rgb(0.4, 0.4, 0.4) });

    // Page 2: Sheet 1 - General Notes (Contains AR-01 Violation)
    const p2 = pdfDoc.addPage([842, 595]);
    drawArchitecturalFrameAndStamp(p2, fontBold, fontReg, 'RD-2025-04.266-AR1', 'SHEET 1: GENERAL NOTES & ELEVATIONS', 2, 5, 'RD', objectName);
    
    // Notes block
    p2.drawText('GENERAL PROJECT NOTES AND REGULATORY FRAMEWORK:', { x: 80, y: 510, size: 10, font: fontBold, color: rgb(0.1, 0.15, 0.3) });
    p2.drawText('1. Working drawings are developed pursuant to the approved architectural concept and SP 118.13330.2022.', { x: 80, y: 490, size: 8, font: fontReg, color: rgb(0.2, 0.2, 0.2) });
    
    // Exact Box for AR-01 in Notes (Normalized x: 0.15, y: 0.48 / ~x: 120, y: 380, w: 260, h: 50)
    p2.drawRectangle({
      x: 120,
      y: 380,
      width: 280,
      height: 60,
      borderColor: rgb(0.85, 0.15, 0.15),
      borderWidth: 1.5,
      color: rgb(1, 0.96, 0.96),
    });
    p2.drawText('NOTE 2: VERTICAL ELEVATION ASSIGNMENT (DISCREPANCY DETECTED):', { x: 126, y: 425, size: 7.5, font: fontBold, color: rgb(0.8, 0.1, 0.1) });
    p2.drawText('2. Level 0.000 corresponds to the finished floor of the 1st floor,', { x: 126, y: 410, size: 7.5, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    p2.drawText('which is set to absolute elevation 164.180 m (Baltic Height System).', { x: 126, y: 396, size: 7.5, font: fontBold, color: rgb(0.8, 0.1, 0.1) });
    p2.drawText('[EXPERT NOTE: In approved PD level is 165.000 m. Variance is -820 mm!]', { x: 126, y: 384, size: 6.5, font: fontReg, color: rgb(0.5, 0.1, 0.1) });

    p2.drawText('3. Climatic construction region: I-B, estimated winter outdoor temp -28 C.', { x: 80, y: 350, size: 8, font: fontReg, color: rgb(0.2, 0.2, 0.2) });
    p2.drawText('4. Foundation: reinforced concrete pile field, monolithic grillage.', { x: 80, y: 335, size: 8, font: fontReg, color: rgb(0.2, 0.2, 0.2) });
    p2.drawText('5. Wall structures: insulated steel sandwich panels with mineral wool core.', { x: 80, y: 320, size: 8, font: fontReg, color: rgb(0.2, 0.2, 0.2) });
    p2.drawText('6. Fire resistance class: II, functional hazard class: F3.1 (Trade).', { x: 80, y: 305, size: 8, font: fontReg, color: rgb(0.2, 0.2, 0.2) });

    // Page 3: Sheet 2 - 1st Floor Plan
    const p3 = pdfDoc.addPage([842, 595]);
    drawArchitecturalFrameAndStamp(p3, fontBold, fontReg, 'RD-2025-04.266-AR1', 'SHEET 2: 1ST FLOOR PLAN (SCALE 1:100)', 3, 5, 'RD', objectName);
    // Draw building grid
    p3.drawRectangle({ x: 100, y: 180, width: 320, height: 280, borderColor: rgb(0.2, 0.2, 0.2), borderWidth: 2 });
    p3.drawLine({ start: { x: 260, y: 180 }, end: { x: 260, y: 460 }, thickness: 1.5, color: rgb(0.3, 0.3, 0.3) });
    p3.drawText('TRADE HALL 577 m2 (+0.000)', { x: 120, y: 360, size: 9, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
    p3.drawText('LOADING SERVICE DOCK (+0.000)', { x: 275, y: 360, size: 8, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
    p3.drawText('ELEVATION MARK: +0.000 = 164.180', { x: 130, y: 320, size: 7.5, font: fontBold, color: rgb(0.8, 0.1, 0.1) });

    // Page 4: Sheet 15 - Gates Scheme (Contains AR-18)
    const p4 = pdfDoc.addPage([842, 595]);
    drawArchitecturalFrameAndStamp(p4, fontBold, fontReg, 'RD-2025-04.266-AR1', 'SHEET 15: GATES OPENING SCHEMES (Vr-1..Vr-4)', 4, 5, 'RD', objectName);
    // Box for AR-18
    p4.drawRectangle({
      x: 580,
      y: 380,
      width: 210,
      height: 65,
      borderColor: rgb(0.85, 0.15, 0.15),
      borderWidth: 1.5,
      color: rgb(1, 0.96, 0.96),
    });
    p4.drawText('INDUSTRIAL GATES Vr-1..Vr-4:', { x: 586, y: 430, size: 8, font: fontBold, color: rgb(0.8, 0.1, 0.1) });
    p4.drawText('Size: 3300 x 3600(h) mm (Sectional overhead)', { x: 586, y: 415, size: 7.5, font: fontBold, color: rgb(0.8, 0.1, 0.1) });
    p4.drawText('PD Requirement: 3000 x 3000 mm (Delta: +300x+600mm)', { x: 586, y: 400, size: 7, font: fontReg, color: rgb(0.2, 0.2, 0.2) });
    p4.drawText('Notice: Wind load pulse recalculation missing!', { x: 586, y: 388, size: 6.5, font: fontBold, color: rgb(0.8, 0.1, 0.1) });

    // Page 5: Sheet 16 - Doors Spec (Contains AR-41)
    const p5 = pdfDoc.addPage([842, 595]);
    drawArchitecturalFrameAndStamp(p5, fontBold, fontReg, 'RD-2025-04.266-AR1', 'SHEET 16: DOORS SPECIFICATION', 5, 5, 'RD', objectName);
    // Box for AR-41
    p5.drawRectangle({
      x: 460,
      y: 190,
      width: 220,
      height: 60,
      borderColor: rgb(0.85, 0.15, 0.15),
      borderWidth: 1.5,
      color: rgb(1, 0.96, 0.96),
    });
    p5.drawText('EVACUATION DOOR D-12 (TRADE HALL):', { x: 466, y: 236, size: 8, font: fontBold, color: rgb(0.8, 0.1, 0.1) });
    p5.drawText('Frame Dimension: 800 x 2100 mm (Clear width: 790 mm)', { x: 466, y: 222, size: 7.5, font: fontBold, color: rgb(0.8, 0.1, 0.1) });
    p5.drawText('SP 1.13130 Requirement: Clear width >= 900 mm (Frame 1000mm)', { x: 466, y: 208, size: 7, font: fontReg, color: rgb(0.2, 0.2, 0.2) });
    p5.drawText('VIOLATION: Evacuation bottleneck in crowd room!', { x: 466, y: 196, size: 6.5, font: fontBold, color: rgb(0.8, 0.1, 0.1) });
  } else if (docKey === 'RD-AR2') {
    // Document 2: РД-2025-04.266-АР2 (3 pages, Contains AR-12)
    const p1 = pdfDoc.addPage([842, 595]);
    drawArchitecturalFrameAndStamp(p1, fontBold, fontReg, 'RD-2025-04.266-AR2', 'TITLE SHEET - FACADES', 1, 3, 'RD', objectName);
    p1.drawText('VOLUME 2: EXTERNAL CLADDING AND SANDWICH PANELS', { x: 180, y: 320, size: 12, font: fontBold, color: rgb(0.1, 0.2, 0.4) });

    const p2 = pdfDoc.addPage([842, 595]);
    drawArchitecturalFrameAndStamp(p2, fontBold, fontReg, 'RD-2025-04.266-AR2', 'SHEET 4: FACADE SECTION 1-1', 2, 3, 'RD', objectName);
    p2.drawText('SECTION 1-1 ELEVATION', { x: 120, y: 460, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });

    const p3 = pdfDoc.addPage([842, 595]);
    drawArchitecturalFrameAndStamp(p3, fontBold, fontReg, 'RD-2025-04.266-AR2', 'SHEET 9: SANDWICH PANELS SPECIFICATION', 3, 3, 'RD', objectName);
    // Box for AR-12
    p3.drawRectangle({
      x: 380,
      y: 350,
      width: 250,
      height: 65,
      borderColor: rgb(0.85, 0.15, 0.15),
      borderWidth: 1.5,
      color: rgb(1, 0.96, 0.96),
    });
    p3.drawText('WALL SANDWICH PANELS SP-01, SP-02:', { x: 386, y: 400, size: 8, font: fontBold, color: rgb(0.8, 0.1, 0.1) });
    p3.drawText('Type: Ventall-C3, Thickness: 150 mm (Density 115 kg/m3)', { x: 386, y: 385, size: 7.5, font: fontBold, color: rgb(0.8, 0.1, 0.1) });
    p3.drawText('Approved PD: Rukki Rus 120 mm (Delta: +30 mm, +25% mass load)', { x: 386, y: 370, size: 7, font: fontReg, color: rgb(0.2, 0.2, 0.2) });
    p3.drawText('VIOLATION: Steel frame capacity calculation not provided!', { x: 386, y: 358, size: 6.5, font: fontBold, color: rgb(0.8, 0.1, 0.1) });
  } else if (docKey === 'RD-OV') {
    // Document 3: РД-2025-04.266-ОВ (2 pages, Contains OV-08)
    const p1 = pdfDoc.addPage([842, 595]);
    drawArchitecturalFrameAndStamp(p1, fontBold, fontReg, 'RD-2025-04.266-OV', 'TITLE SHEET - HVAC', 1, 2, 'RD', objectName);
    p1.drawText('HVAC AND HEATING WORKING SCHEMES', { x: 220, y: 320, size: 12, font: fontBold, color: rgb(0.1, 0.2, 0.4) });

    const p2 = pdfDoc.addPage([842, 595]);
    drawArchitecturalFrameAndStamp(p2, fontBold, fontReg, 'RD-2025-04.266-OV', 'SHEET 1: GENERAL NOTES & SPECIFICATION', 2, 2, 'RD', objectName);
    // Box for OV-08
    p2.drawRectangle({
      x: 180,
      y: 130,
      width: 270,
      height: 55,
      borderColor: rgb(0.85, 0.15, 0.15),
      borderWidth: 1.5,
      color: rgb(1, 0.96, 0.96),
    });
    p2.drawText('SERVER ROOM 104 HEATING:', { x: 186, y: 170, size: 8, font: fontBold, color: rgb(0.8, 0.1, 0.1) });
    p2.drawText('Heating by NOBO Electric Convector 2.0 kW (Water system excluded)', { x: 186, y: 156, size: 7.5, font: fontBold, color: rgb(0.8, 0.1, 0.1) });
    p2.drawText('Approved PD: Water heating from central substation Purmo', { x: 186, y: 142, size: 7, font: fontReg, color: rgb(0.2, 0.2, 0.2) });
    p2.drawText('VIOLATION: Electric power utility permit not approved!', { x: 186, y: 132, size: 6.5, font: fontBold, color: rgb(0.8, 0.1, 0.1) });
  } else if (docKey === 'RD-KJ') {
    // Document 4: П-2025-04-266-КЖ01 (2 pages, Contains KJ-02)
    const p1 = pdfDoc.addPage([842, 595]);
    drawArchitecturalFrameAndStamp(p1, fontBold, fontReg, 'P-2025-04-266-KJ01', 'TITLE SHEET - FOUNDATION', 1, 2, 'RD', objectName);
    p1.drawText('REINFORCED CONCRETE PILE FOUNDATION FIELD (364 PILES)', { x: 180, y: 320, size: 12, font: fontBold, color: rgb(0.1, 0.2, 0.4) });

    const p2 = pdfDoc.addPage([842, 595]);
    drawArchitecturalFrameAndStamp(p2, fontBold, fontReg, 'P-2025-04-266-KJ01', 'SHEET 4: PILES SPECIFICATION', 2, 2, 'RD', objectName);
    // Box for KJ-02
    p2.drawRectangle({
      x: 320,
      y: 450,
      width: 240,
      height: 55,
      borderColor: rgb(0.85, 0.15, 0.15),
      borderWidth: 1.5,
      color: rgb(1, 0.96, 0.96),
    });
    p2.drawText('PILE HEAD CUTOFF ELEVATION (364 PILES C90.40-8):', { x: 326, y: 490, size: 8, font: fontBold, color: rgb(0.8, 0.1, 0.1) });
    p2.drawText('Specified Head Cutoff Elevation: -1.830 m', { x: 326, y: 476, size: 7.5, font: fontBold, color: rgb(0.8, 0.1, 0.1) });
    p2.drawText('Approved PD: -1.500 m (Delta: -330 mm vertical shift)', { x: 326, y: 462, size: 7, font: fontReg, color: rgb(0.2, 0.2, 0.2) });
    p2.drawText('VIOLATION: Rebar punching shear verification required!', { x: 326, y: 452, size: 6.5, font: fontBold, color: rgb(0.8, 0.1, 0.1) });
  } else if (docKey === 'PD-AR') {
    // Document 5: ЖС-РЛ-270121-АР (3 pages, Approved PD Reference)
    const p1 = pdfDoc.addPage([842, 595]);
    drawArchitecturalFrameAndStamp(p1, fontBold, fontReg, 'ZS-RL-270121-AR', 'APPROVED PROJECT DOCUMENTATION', 1, 3, 'PD', objectName);
    p1.drawText('STATE EXPERTISE POSITIVE APPROVAL #77-1-1-3-024567', { x: 200, y: 330, size: 11, font: fontBold, color: rgb(0.1, 0.5, 0.2) });

    const p2 = pdfDoc.addPage([842, 595]);
    drawArchitecturalFrameAndStamp(p2, fontBold, fontReg, 'ZS-RL-270121-AR', 'SHEET 3: APPROVED GENERAL DATA & LEVEL 0.000', 2, 3, 'PD', objectName);
    p2.drawRectangle({
      x: 100,
      y: 280,
      width: 250,
      height: 50,
      borderColor: rgb(0.1, 0.5, 0.2),
      borderWidth: 1.5,
      color: rgb(0.95, 1, 0.95),
    });
    p2.drawText('APPROVED ELEVATION 0.000 REFERENCE:', { x: 106, y: 316, size: 8, font: fontBold, color: rgb(0.1, 0.5, 0.2) });
    p2.drawText('Level 0.000 = Absolute Elevation 165.000 m (BSH)', { x: 106, y: 300, size: 8, font: fontBold, color: rgb(0.1, 0.4, 0.1) });
    p2.drawText('Confirmed by City Planning Boundary Protocol #77-14/2024', { x: 106, y: 288, size: 7, font: fontReg, color: rgb(0.3, 0.3, 0.3) });

    const p3 = pdfDoc.addPage([842, 595]);
    drawArchitecturalFrameAndStamp(p3, fontBold, fontReg, 'ZS-RL-270121-AR', 'SHEET 8: APPROVED WALLS & OPENINGS', 3, 3, 'PD', objectName);
    p3.drawText('Approved Wall Panels: Rukki Rus 120 mm thickness', { x: 120, y: 380, size: 8.5, font: fontBold, color: rgb(0.1, 0.4, 0.1) });
    p3.drawText('Approved Door D-12: 1000 x 2100 mm (Clear width 900 mm)', { x: 120, y: 230, size: 8.5, font: fontBold, color: rgb(0.1, 0.4, 0.1) });
    p3.drawText('Approved Gates Vr-1..4: 3000 x 3000 mm (Industrial sectional)', { x: 120, y: 480, size: 8.5, font: fontBold, color: rgb(0.1, 0.4, 0.1) });
  } else if (docKey === 'PD-PZU') {
    // Document 6: ЖС-РД-270121-ПЗУ (2 pages, Approved Site Plan)
    const p1 = pdfDoc.addPage([842, 595]);
    drawArchitecturalFrameAndStamp(p1, fontBold, fontReg, 'ZS-RD-270121-PZU', 'APPROVED SITE MASTER PLAN', 1, 2, 'PD', objectName);

    const p2 = pdfDoc.addPage([842, 595]);
    drawArchitecturalFrameAndStamp(p2, fontBold, fontReg, 'ZS-RD-270121-PZU', 'SHEET 5: PILE FOUNDATION BENCHMARKS', 2, 2, 'PD', objectName);
    p2.drawRectangle({
      x: 290,
      y: 470,
      width: 220,
      height: 45,
      borderColor: rgb(0.1, 0.5, 0.2),
      borderWidth: 1.5,
      color: rgb(0.95, 1, 0.95),
    });
    p2.drawText('APPROVED PILE CUTOFF ELEVATION:', { x: 296, y: 500, size: 8, font: fontBold, color: rgb(0.1, 0.5, 0.2) });
    p2.drawText('Design pile cutoff head level: -1.500 m', { x: 296, y: 485, size: 8, font: fontBold, color: rgb(0.1, 0.4, 0.1) });
  } else if (docKey === 'ID-NVF') {
    // Document 7: ИД_№1-НВФ7.7.2-Кр (2 pages, Contains NVF-03)
    const p1 = pdfDoc.addPage([842, 595]);
    drawArchitecturalFrameAndStamp(p1, fontBold, fontReg, 'ID-NVF-01', 'EXECUTIVE GEODETIC SURVEY', 1, 2, 'ID', objectName);
    p1.drawText('EXECUTIVE DOCUMENTATION: VENTILATED FACADE BRACKETS', { x: 180, y: 320, size: 12, font: fontBold, color: rgb(0.1, 0.2, 0.4) });

    const p2 = pdfDoc.addPage([842, 595]);
    drawArchitecturalFrameAndStamp(p2, fontBold, fontReg, 'ID-NVF-01', 'SHEET 1: GEODETIC BRACKET DEVIATION MATRIX', 2, 2, 'ID', objectName);
    // Box for NVF-03
    p2.drawRectangle({
      x: 180,
      y: 190,
      width: 250,
      height: 55,
      borderColor: rgb(0.85, 0.15, 0.15),
      borderWidth: 1.5,
      color: rgb(1, 0.96, 0.96),
    });
    p2.drawText('POINT #14 (AXIS 3, ELEVATION +20.750):', { x: 186, y: 230, size: 8, font: fontBold, color: rgb(0.8, 0.1, 0.1) });
    p2.drawText('Actual Out-of-Plane Deviation: +18 mm', { x: 186, y: 216, size: 7.5, font: fontBold, color: rgb(0.8, 0.1, 0.1) });
    p2.drawText('GOST R 58154 Max Permissible Tolerance: +/- 10 mm', { x: 186, y: 202, size: 7, font: fontReg, color: rgb(0.2, 0.2, 0.2) });
    p2.drawText('VIOLATION: Exceeds standard limit by +8 mm!', { x: 186, y: 192, size: 6.5, font: fontBold, color: rgb(0.8, 0.1, 0.1) });
  } else {
    // Default fallback single page
    const p1 = pdfDoc.addPage([842, 595]);
    drawArchitecturalFrameAndStamp(p1, fontBold, fontReg, 'DOC-DEFAULT', 'GENERAL ARCHITECTURAL SHEET', 1, 1, 'RD', objectName);
    p1.drawText('MOSGOSSTROY NADZOR OFFICIAL INSPECTION SYSTEM', { x: 220, y: 320, size: 12, font: fontBold, color: rgb(0.1, 0.2, 0.4) });
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

// Backward-compatible wrapper
export async function generateSampleArchitecturalPdf(
  title: string,
  objectName: string,
  defectType: 'AR-01' | 'AR-12' | 'AR-41' | 'AR-18' | 'DEFAULT'
): Promise<Blob> {
  let docKey: 'RD-AR1' | 'RD-AR2' | 'RD-OV' | 'RD-KJ' | 'PD-AR' | 'PD-PZU' | 'ID-NVF' | 'DEFAULT' = 'RD-AR1';
  if (defectType === 'AR-12') docKey = 'RD-AR2';
  else if (defectType === 'AR-41' || defectType === 'AR-18' || defectType === 'AR-01') docKey = 'RD-AR1';
  else if (defectType === 'DEFAULT') docKey = 'PD-AR';
  return generateProjectDocumentPdf(docKey, objectName);
}

export interface ProjectDocumentSeed {
  id: string;
  name: string;
  docKey: 'RD-AR1' | 'RD-AR2' | 'RD-OV' | 'RD-KJ' | 'PD-AR' | 'PD-PZU' | 'ID-NVF';
  sizeMb: number;
  stage: string;
  uploadedAt: string;
}

export const PROJECT_DOCUMENTS_SEEDS: ProjectDocumentSeed[] = [
  {
    id: 'pdf-seed-rd-ar1',
    name: 'РД-2025-04.266-АР1_Планы_Узлы_Спецификации_Разрезы.pdf',
    docKey: 'RD-AR1',
    sizeMb: 18.4,
    stage: 'RD',
    uploadedAt: 'Сегодня, 10:14',
  },
  {
    id: 'pdf-seed-rd-ar2',
    name: 'РД-2025-04.266-АР2_Фасады_Раскладка_панелей_Витражи.pdf',
    docKey: 'RD-AR2',
    sizeMb: 14.8,
    stage: 'RD',
    uploadedAt: 'Сегодня, 10:15',
  },
  {
    id: 'pdf-seed-rd-ov',
    name: 'РД-2025-04.266-ОВ_Отопление_и_вентиляция_Схемы.pdf',
    docKey: 'RD-OV',
    sizeMb: 11.2,
    stage: 'RD',
    uploadedAt: 'Сегодня, 10:18',
  },
  {
    id: 'pdf-seed-rd-kj',
    name: 'П-2025-04-266-КЖ01_Свайное_поле_364_сваи_Ростверки.pdf',
    docKey: 'RD-KJ',
    sizeMb: 22.6,
    stage: 'RD',
    uploadedAt: 'Сегодня, 10:20',
  },
  {
    id: 'pdf-seed-id-nvf',
    name: 'ИД_№1-НВФ7.7.2-Кр_Исполнительная_геодезическая_схема.pdf',
    docKey: 'ID-NVF',
    sizeMb: 8.5,
    stage: 'ID',
    uploadedAt: 'Сегодня, 10:25',
  },
  {
    id: 'pdf-seed-pd-ar',
    name: 'ЖС-РЛ-270121-АР_Утвержденная_стадия_ПД.pdf',
    docKey: 'PD-AR',
    sizeMb: 24.1,
    stage: 'PD',
    uploadedAt: 'Вчера, 16:30',
  },
  {
    id: 'pdf-seed-pd-pzu',
    name: 'ЖС-РД-270121-ПЗУ_Схема_планировочной_организации.pdf',
    docKey: 'PD-PZU',
    sizeMb: 16.3,
    stage: 'PD',
    uploadedAt: 'Вчера, 16:32',
  },
];

export async function generateAllInitialProjectPdfs(objectName: string) {
  const results = await Promise.all(
    PROJECT_DOCUMENTS_SEEDS.map(async (seed) => {
      const blob = await generateProjectDocumentPdf(seed.docKey, objectName);
      return {
        id: seed.id,
        name: seed.name,
        blobUrl: URL.createObjectURL(blob),
        sizeMb: seed.sizeMb,
        stage: seed.stage,
        uploadedAt: seed.uploadedAt,
      };
    })
  );
  return results;
}

