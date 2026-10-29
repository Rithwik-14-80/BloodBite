/**
 * /services/reportClient.ts
 * Dedicated client-side HTTP service to communicate with the backend API routes
 * (/api/analyze and /api/tts) without mixing fetch calls into UI components.
 * Supports both PDF (application/pdf) and Image (image/*) medical reports.
 */

export interface DietRecommendationItem {
  titleEn: string;
  adviceEn: string;
  titleTe: string;
  adviceTe: string;
  dishExamplesEn: string;
  dishExamplesTe: string;
  mlMatchScore?: string;
  datasetSource?: string;
  nutrientMetricEn?: string;
  nutrientMetricTe?: string;
  targetedBiomarkers?: string[];
}

export interface MLInsightsData {
  modelName: string;
  datasetsUsed: string[];
  overallWellnessScore: number;
  organScores: {
    hematology: number;
    glycemic: number;
    lipid: number;
    renalHepatic: number;
  };
}

export interface ReportMetadata {
  lab_name: string | null;
  lab_id: string | null;
  patient_name: string | null;
  age_gender: string | null;
  referring_physician: string | null;
  sample_collected: string | null;
  report_date: string | null;
  barcode_no: string | null;
  fasting_status: string | null;
  authorized_signatory: string | null;
}

export interface ExtractedBloodTestItem {
  category: string;
  category_te: string;
  test_name: string;
  test_name_te: string;
  value: string;
  unit: string;
  reference_range: string;
  status: 'Normal' | 'High' | 'Low';
  arrow: '⬆️' | '⬇️' | '✅';
  explanation_en: string;
  explanation_te: string;
}

export interface ReportAnalysisResult {
  patientName: string | null;
  reportDate: string | null;
  reportMetadata?: ReportMetadata;
  mlInsights?: MLInsightsData;
  extracted_results: ExtractedBloodTestItem[];
  needsAttention: ExtractedBloodTestItem[];
  allGood: ExtractedBloodTestItem[];
  dietRecommendations: DietRecommendationItem[];
  spokenSummary: {
    en: string;
    te: string;
  };
  whatsappText: {
    en: string;
    te: string;
  };
}

export interface UploadedReportFile {
  base64: string;
  mimeType: string;
  fileName: string;
  previewUrl: string;
  syntheticText?: string;
  structuredHint?: any;
}

export interface PlateFoodItem {
  id?: string;
  csvName?: string;
  nameEn: string;
  nameTe: string;
  portionEn: string;
  portionTe: string;
  calories: number;
  carbsG: number;
  proteinG: number;
  fiberG: number;
  glycemicIndex: number;
  giCategory?: string;
  status: 'Good' | 'Moderate' | 'Limit';
  ingredients?: string;
  diet?: string;
  flavorProfile?: string;
  course?: string;
  state?: string;
  region?: string;
  prepTime?: number;
  cookTime?: number;
  imgUrl?: string;
  noteEn: string;
  noteTe: string;
}

export interface IfoodCatalogDish {
  id: string;
  csvName: string;
  nameEn: string;
  nameTe: string;
  ingredients: string;
  diet: string;
  flavorProfile: string;
  course: string;
  state: string;
  region: string;
  calories: number;
  carbsG: number;
  proteinG: number;
  fiberG: number;
  glycemicIndex: number;
  status: 'Good' | 'Moderate' | 'Limit';
}

export interface PlateAnalysisResult {
  plateScore: number;
  plateGrade: 'Green' | 'Yellow' | 'Red';
  verdictTitleEn: string;
  verdictTitleTe: string;
  totalCalories: number;
  totalCarbsG: number;
  totalProteinG: number;
  totalFiberG: number;
  avgGlycemicIndex: number;
  datasetSource: string;
  detectedItems: PlateFoodItem[];
  reportCrossChecks: { en: string; te: string }[];
  improvementTips: { en: string; te: string }[];
  spokenSummary: { en: string; te: string };
}

export interface PlateVisualStats {
  meanBrightness: number;
  meanSaturation: number;
  darkRatio: number;
  skinToneRatio: number;
  centerDarkSilhouette: boolean;
  warmRedBrownRatio: number;
  yellowTurmericRatio: number;
  greenVegRatio: number;
  whiteRiceRatio: number;
  centerWhiteCreamRatio: number;
  centerWarmRedBrownRatio: number;
  centerYellowTurmericRatio: number;
  centerGreenVegRatio: number;
  hasDetectedFace: boolean;
}

export interface AnalyzeApiError {
  isUnreadable?: boolean;
  isNotFoodPlate?: boolean;
  messageEn: string;
  messageTe: string;
}

/**
 * Computes visual color/brightness/silhouette statistics (both whole-frame and central dish region)
 * and checks browser FaceDetector so dark webcam silhouettes, faces, and non-food frames are caught
 * immediately and background tables never confuse dish classification.
 */
export async function extractImageVisualStats(dataUrl: string): Promise<PlateVisualStats | null> {
  if (typeof window === 'undefined' || !dataUrl || !dataUrl.startsWith('data:image/')) {
    return null;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = async () => {
      try {
        const sampleSize = 96;
        const canvas = document.createElement('canvas');
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
        const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);

        let totalBrightness = 0;
        let totalSaturation = 0;
        let darkCount = 0;
        let skinCount = 0;
        let warmRedBrownCount = 0;
        let yellowTurmericCount = 0;
        let greenVegCount = 0;
        let whiteRiceCount = 0;

        let centerBrightnessSum = 0;
        let centerCount = 0;
        let borderBrightnessSum = 0;
        let borderCount = 0;

        let centerWhiteCreamCount = 0;
        let centerWarmRedBrownCount = 0;
        let centerYellowTurmericCount = 0;
        let centerGreenVegCount = 0;

        const totalPixels = sampleSize * sampleSize;

        for (let y = 0; y < sampleSize; y++) {
          for (let x = 0; x < sampleSize; x++) {
            const idx = (y * sampleSize + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            totalBrightness += lum;

            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            const delta = maxC - minC;
            const sat = maxC === 0 ? 0 : delta / maxC;
            totalSaturation += sat;

            if (lum < 45) darkCount++;

            const isCenter = x >= 24 && x < 72 && y >= 20 && y < 76;

            // Warm reddish-brown / dark masala curry
            const isWarmRedBrown =
              r > 75 &&
              r < 225 &&
              g > 25 &&
              g < 155 &&
              b < 110 &&
              r - b > 35 &&
              r > g * 1.15 &&
              sat > 0.28;

            // Yellow / Turmeric / Dal / Sambar
            const isYellowTurmeric =
              r > 150 && g > 115 && b < 105 && r - b > 60 && Math.abs(r - g) < 65;

            // Green vegetable / leafy greens
            const isGreenVeg = g > 60 && g > r * 1.06 && g > b * 1.15 && sat > 0.18;

            // White / cream / ivory semolina upma, idli, curd rice, or rice
            const isWhiteCream = lum > 155 && sat < 0.28 && r >= g * 0.92;

            if (isWarmRedBrown) warmRedBrownCount++;
            if (isYellowTurmeric) yellowTurmericCount++;
            if (isGreenVeg) greenVegCount++;
            if (isWhiteCream) whiteRiceCount++;

            if (isCenter) {
              centerBrightnessSum += lum;
              centerCount++;
              if (isWhiteCream) centerWhiteCreamCount++;
              if (isWarmRedBrown) centerWarmRedBrownCount++;
              if (isYellowTurmeric) centerYellowTurmericCount++;
              if (isGreenVeg) centerGreenVegCount++;
            } else {
              borderBrightnessSum += lum;
              borderCount++;
            }

            // Typical human skin tone cluster in RGB
            if (
              r > 95 &&
              g > 40 &&
              b > 20 &&
              maxC - minC > 15 &&
              Math.abs(r - g) > 15 &&
              r > g &&
              g > b &&
              sat >= 0.15 &&
              sat <= 0.55
            ) {
              skinCount++;
            }
          }
        }

        const meanBrightness = Number((totalBrightness / totalPixels).toFixed(1));
        const meanSaturation = Number((totalSaturation / totalPixels).toFixed(3));
        const centerAvg = centerCount > 0 ? centerBrightnessSum / centerCount : meanBrightness;
        const borderAvg = borderCount > 0 ? borderBrightnessSum / borderCount : meanBrightness;
        const centerDarkSilhouette = centerAvg < 38 && borderAvg > centerAvg + 10;

        let hasDetectedFace = false;
        const AnyWin = window as any;
        if (typeof AnyWin.FaceDetector === 'function') {
          try {
            const detector = new AnyWin.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
            const faces = await detector.detect(img);
            if (Array.isArray(faces) && faces.length > 0) {
              hasDetectedFace = true;
            }
          } catch {
            // Browser FaceDetector not supported on this platform; ignore
          }
        }

        const cDenom = Math.max(1, centerCount);

        resolve({
          meanBrightness,
          meanSaturation,
          darkRatio: Number((darkCount / totalPixels).toFixed(3)),
          skinToneRatio: Number((skinCount / totalPixels).toFixed(3)),
          centerDarkSilhouette,
          warmRedBrownRatio: Number((warmRedBrownCount / totalPixels).toFixed(3)),
          yellowTurmericRatio: Number((yellowTurmericCount / totalPixels).toFixed(3)),
          greenVegRatio: Number((greenVegCount / totalPixels).toFixed(3)),
          whiteRiceRatio: Number((whiteRiceCount / totalPixels).toFixed(3)),
          centerWhiteCreamRatio: Number((centerWhiteCreamCount / cDenom).toFixed(3)),
          centerWarmRedBrownRatio: Number((centerWarmRedBrownCount / cDenom).toFixed(3)),
          centerYellowTurmericRatio: Number((centerYellowTurmericCount / cDenom).toFixed(3)),
          centerGreenVegRatio: Number((centerGreenVegCount / cDenom).toFixed(3)),
          hasDetectedFace,
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/**
 * Converts a browser File object (PDF or Image) into a base64 payload.
 */
export async function fileToReportPayload(file: File): Promise<UploadedReportFile> {
  const isPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.onload = () => {
      const dataUrl = reader.result as string;

      if (isPdf) {
        resolve({
          base64: dataUrl,
          mimeType: 'application/pdf',
          fileName: file.name,
          previewUrl: '',
        });
        return;
      }

      const img = new Image();
      img.onload = () => {
        const maxDim = 1800;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            base64: dataUrl,
            mimeType: file.type || 'image/jpeg',
            fileName: file.name,
            previewUrl: dataUrl,
          });
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
        resolve({
          base64: compressedDataUrl,
          mimeType: 'image/jpeg',
          fileName: file.name,
          previewUrl: compressedDataUrl,
        });
      };
      img.onerror = () => {
        reject(new Error('Selected file is not a valid image or PDF.'));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Fetches a local PDF or Image asset URL (such as the attached NovaCare Diagnostics PDF)
 * and converts it into an UploadedReportFile payload.
 */
export async function urlToReportPayload(
  url: string,
  fileName: string,
  mimeType = 'application/pdf'
): Promise<UploadedReportFile> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch report from ${url}`);
  }
  const blob = await response.blob();
  const file = new File([blob], fileName, { type: mimeType });
  return fileToReportPayload(file);
}

/**
 * Sends the uploaded Blood Test Report (PDF or Image) to `/api/analyze`.
 */
export async function analyzeReportsRequest(params: {
  todayReport: UploadedReportFile;
}): Promise<{ ok: true; data: ReportAnalysisResult } | { ok: false; error: AnalyzeApiError }> {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        todayImage: {
          base64: params.todayReport.base64,
          mimeType: params.todayReport.mimeType,
          syntheticText: params.todayReport.syntheticText || null,
        },
      }),
    });

    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      return {
        ok: false,
        error: {
          isUnreadable: Boolean(payload.isUnreadable),
          messageEn:
            payload.messageEn ||
            'We could not read the numbers on this file. Please upload a clearer photo or PDF.',
          messageTe:
            payload.messageTe ||
            'ఈ రిపోర్ట్‌లోని వివరాలు స్పష్టంగా కనిపించడం లేదు. దయచేసి స్పష్టమైన ఫోటో లేదా PDF అప్‌లోడ్ చేయండి.',
        },
      };
    }

    return {
      ok: true,
      data: payload.data as ReportAnalysisResult,
    };
  } catch {
    return {
      ok: false,
      error: {
        isUnreadable: false,
        messageEn:
          'Connection issue while analyzing your report. Please check your internet and try again.',
        messageTe:
          'రిపోర్ట్ పరిశీలించడంలో అంతరాయం కలిగింది. దయచేసి మళ్ళీ ప్రయత్నించండి.',
      },
    };
  }
}

/**
 * Requests server-side Gemini TTS audio when browser speechSynthesis lacks a local voice.
 */
export async function fetchSpokenAudioBase64(
  text: string,
  lang: 'en' | 'te'
): Promise<string | null> {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.audioBase64 || null;
  } catch {
    return null;
  }
}

/**
 * Fetches the 255-dish Ifood_new_023ce684.csv catalog from `/api/ifood-dataset`.
 */
export async function fetchIfoodDatasetCatalog(): Promise<IfoodCatalogDish[]> {
  try {
    const response = await fetch('/api/ifood-dataset');
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data.dishes) ? data.dishes : [];
  } catch {
    return [];
  }
}

/**
 * Sends a camera-captured plate photo (or sample preset / selected Ifood_new dish IDs) to `/api/analyze-plate`.
 */
export async function analyzePlateRequest(params: {
  base64?: string;
  mimeType?: string;
  presetId?: string;
  selectedDishIds?: string[];
  visualStats?: PlateVisualStats | null;
  bloodReportResults?: ExtractedBloodTestItem[];
}): Promise<{ ok: true; data: PlateAnalysisResult } | { ok: false; error: AnalyzeApiError }> {
  try {
    const response = await fetch('/api/analyze-plate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plateImage: {
          base64: params.base64 || '',
          mimeType: params.mimeType || 'image/jpeg',
          presetId: params.presetId || '',
          selectedDishIds: params.selectedDishIds || [],
          visualStats: params.visualStats || null,
        },
        bloodReportResults: params.bloodReportResults || [],
      }),
    });

    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      return {
        ok: false,
        error: {
          isNotFoodPlate: Boolean(payload.isNotFoodPlate),
          messageEn:
            payload.messageEn ||
            'Could not analyze the plate photo right now. Please try again.',
          messageTe:
            payload.messageTe ||
            'ప్రస్తుతం ప్లేట్ ఫోటోను విశ్లేషించలేకపోయాము. దయచేసి మళ్ళీ ప్రయత్నించండి.',
        },
      };
    }

    return {
      ok: true,
      data: payload.data as PlateAnalysisResult,
    };
  } catch {
    return {
      ok: false,
      error: {
        messageEn: 'Connection error while analyzing your plate. Please try again.',
        messageTe: 'ప్లేట్ విశ్లేషణలో అంతరాయం కలిగింది. దయచేసి మళ్ళీ ప్రయత్నించండి.',
      },
    };
  }
}



