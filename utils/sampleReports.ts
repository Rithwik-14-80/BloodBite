/**
 * /utils/sampleReports.ts
 * Provides direct access to the attached NovaCare Diagnostics PDF report
 * (/assets/aistudio/Normal_Blood_Test_Report_1aa30bdd.pdf) as well as realistic
 * multi-panel canvas report generators covering all 4 clinical categories and 16 test fields.
 */

import { UploadedReportFile } from '../services/reportClient';

export const ATTACHED_NOVACARE_PDF_URL =
  '/assets/aistudio/Normal_Blood_Test_Report_1aa30bdd.pdf';

export interface SampleTestSection {
  sectionTitle: string;
  rows: {
    testName: string;
    value: string;
    unit: string;
    refRange: string;
  }[];
}

export interface SampleLabPreset {
  id: string;
  titleEn: string;
  titleTe: string;
  subtitleEn: string;
  subtitleTe: string;
  labName: string;
  labId: string;
  patientName: string;
  ageGender: string;
  referringPhysician: string;
  sampleCollected: string;
  reportDate: string;
  barcodeNo: string;
  fastingStatus: string;
  signatory: string;
  fileName: string;
  sections: SampleTestSection[];
}

export const SAMPLE_LAB_PRESETS: Record<string, SampleLabPreset> = {
  novacareAbnormalPanel: {
    id: 'novacareAbnormalPanel',
    titleEn: '📋 Full 16-Test Clinical Panel (5 Out-of-Range + 11 Normal)',
    titleTe: '📋 16 పరీక్షల పూర్తి రిపోర్ట్ (5 హెచ్చుతగ్గులు + 11 సాధారణం)',
    subtitleEn:
      'Hematology, Diabetology, Lipid Profile & Organ Function — High FBS (146 ⬆️), High HbA1c (7.4% ⬆️), High Cholesterol (228 ⬆️), High LDL (158 ⬆️), Low Hb (11.2 ⬇️)',
    subtitleTe:
      'CBC, షుగర్, లిపిడ్ ప్రొఫైల్ & లివర్/కిడ్నీ — ఫాస్టింగ్ షుగర్ (146 ⬆️), HbA1c (7.4% ⬆️), LDL (158 ⬆️), హిమోగ్లోబిన్ (11.2 ⬇️)',
    labName: 'NovaCare Diagnostics',
    labId: 'NCD-9104-A2',
    patientName: 'Sri K. Narayana Rao',
    ageGender: '68 Yrs / Male',
    referringPhysician: 'Dr. Sarah Jenkins',
    sampleCollected: 'Oct 24, 2026 08:30 AM',
    reportDate: 'Oct 25, 2026',
    barcodeNo: '100984812',
    fastingStatus: 'Fasting (12 Hours)',
    signatory: 'Dr. A. Mercer, MD Path.',
    fileName: 'NovaCare_16_Test_Abnormal_Panel.jpg',
    sections: [
      {
        sectionTitle: 'Hematology (Complete Blood Count)',
        rows: [
          { testName: 'Hemoglobin (Hb)', value: '11.2', unit: 'g/dL', refRange: '13.0 – 17.0' },
          { testName: 'Total RBC Count', value: '4.80', unit: 'mill/cumm', refRange: '4.50 – 5.50' },
          { testName: 'Total WBC Count', value: '6,800', unit: 'cells/cumm', refRange: '4,000 – 10,000' },
          { testName: 'Platelet Count', value: '250,000', unit: 'cells/cumm', refRange: '150,000 – 410,000' },
          { testName: 'Hematocrit (PCV)', value: '42.5', unit: '%', refRange: '40.0 – 50.0' },
        ],
      },
      {
        sectionTitle: 'Diabetology & Biochemistry',
        rows: [
          { testName: 'Fasting Blood Sugar (FBS)', value: '146', unit: 'mg/dL', refRange: '70 – 99 (Normal)' },
          { testName: 'HbA1c (Glycosylated Hb)', value: '7.4', unit: '%', refRange: '< 5.7 (Normal)' },
        ],
      },
      {
        sectionTitle: 'Lipid Profile',
        rows: [
          { testName: 'Total Cholesterol', value: '228', unit: 'mg/dL', refRange: '< 200 (Desirable)' },
          { testName: 'Triglycerides', value: '142', unit: 'mg/dL', refRange: '< 150 (Normal)' },
          { testName: 'HDL Cholesterol', value: '48', unit: 'mg/dL', refRange: '> 40 (Desirable)' },
          { testName: 'LDL Cholesterol (Calculated)', value: '158', unit: 'mg/dL', refRange: '< 130 (Optimal)' },
        ],
      },
      {
        sectionTitle: 'Organ Function (Renal & Hepatic)',
        rows: [
          { testName: 'Serum Creatinine', value: '0.95', unit: 'mg/dL', refRange: '0.70 – 1.30' },
          { testName: 'Blood Urea Nitrogen (BUN)', value: '15.2', unit: 'mg/dL', refRange: '8.0 – 20.0' },
          { testName: 'Bilirubin (Total)', value: '0.9', unit: 'mg/dL', refRange: '0.2 – 1.2' },
          { testName: 'AST (SGOT)', value: '26', unit: 'U/L', refRange: '< 40' },
          { testName: 'ALT (SGPT)', value: '30', unit: 'U/L', refRange: '< 41' },
        ],
      },
    ],
  },
};

export function generateSampleReportImage(preset: SampleLabPreset): UploadedReportFile {
  const totalRows = preset.sections.reduce((acc, s) => acc + s.rows.length, 0);
  const canvas = document.createElement('canvas');
  canvas.width = 1120;
  canvas.height = 360 + preset.sections.length * 90 + totalRows * 48 + 80;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header
  ctx.fillStyle = '#0284C7';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText(preset.labName, 56, 68);
  ctx.fillStyle = '#64748B';
  ctx.font = '15px sans-serif';
  ctx.fillText('COMPREHENSIVE CLINICAL LABORATORY', 56, 94);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#334155';
  ctx.font = '15px sans-serif';
  ctx.fillText(`Report Generated: ${preset.reportDate}`, 1064, 54);
  ctx.fillText(`Lab ID: ${preset.labId}`, 1064, 76);
  ctx.fillText(`Authorized Signatory: ${preset.signatory}`, 1064, 98);
  ctx.textAlign = 'left';

  ctx.strokeStyle = '#0284C7';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(56, 114);
  ctx.lineTo(1064, 114);
  ctx.stroke();

  // Patient Metadata Box
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(56, 132, 1008, 126);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(56, 132, 1008, 126);

  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('PATIENT NAME', 76, 158);
  ctx.fillText('AGE / GENDER', 410, 158);
  ctx.fillText('SAMPLE COLLECTED', 730, 158);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 19px sans-serif';
  ctx.fillText(preset.patientName, 76, 182);
  ctx.fillText(preset.ageGender, 410, 182);
  ctx.fillText(preset.sampleCollected, 730, 182);

  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('REFERRING PHYSICIAN', 76, 214);
  ctx.fillText('BARCODE NO.', 410, 214);
  ctx.fillText('FASTING STATUS', 730, 214);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 19px sans-serif';
  ctx.fillText(preset.referringPhysician, 76, 238);
  ctx.fillText(preset.barcodeNo, 410, 238);
  ctx.fillText(preset.fastingStatus, 730, 238);

  let yCursor = 290;

  const textLines: string[] = [
    `${preset.labName} COMPREHENSIVE CLINICAL LABORATORY`,
    `Report Generated: ${preset.reportDate} Lab ID: ${preset.labId} Authorized Signatory: ${preset.signatory}`,
    `PATIENT NAME [${preset.patientName}] AGE / GENDER ${preset.ageGender} SAMPLE COLLECTED ${preset.sampleCollected}`,
    `REFERRING PHYSICIAN ${preset.referringPhysician} BARCODE NO. ${preset.barcodeNo} FASTING STATUS ${preset.fastingStatus}`,
  ];

  preset.sections.forEach((sec) => {
    textLines.push(sec.sectionTitle);
    ctx.fillStyle = '#0284C7';
    ctx.font = 'bold 21px sans-serif';
    ctx.fillText(sec.sectionTitle, 56, yCursor);
    yCursor += 18;

    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(56, yCursor, 1008, 40);
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('TEST DESCRIPTION', 72, yCursor + 25);
    ctx.fillText('RESULT', 430, yCursor + 25);
    ctx.fillText('UNITS', 580, yCursor + 25);
    ctx.fillText('BIOLOGICAL REFERENCE INTERVAL', 730, yCursor + 25);
    yCursor += 40;

    sec.rows.forEach((row) => {
      textLines.push(`${row.testName} ${row.value} ${row.unit} ${row.refRange}`);
      ctx.strokeStyle = '#E2E8F0';
      ctx.strokeRect(56, yCursor, 1008, 46);
      ctx.fillStyle = '#0F172A';
      ctx.font = '18px sans-serif';
      ctx.fillText(row.testName, 72, yCursor + 30);

      ctx.font = 'bold 19px monospace';
      ctx.fillText(row.value, 430, yCursor + 30);

      ctx.font = '17px sans-serif';
      ctx.fillStyle = '#334155';
      ctx.fillText(row.unit, 580, yCursor + 30);

      ctx.fillText(row.refRange, 730, yCursor + 30);
      yCursor += 46;
    });

    yCursor += 30;
  });

  const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
  return {
    base64: dataUrl,
    mimeType: 'image/jpeg',
    fileName: preset.fileName,
    previewUrl: dataUrl,
    syntheticText: textLines.join('  '),
  };
}
