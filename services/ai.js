/**
 * /services/ai.js
 * Dedicated server-side service handling PDF extraction (pdfjs-dist),
 * Gemini Multimodal API calls with multi-model fallback, OCR fallback (tesseract.js),
 * and Machine Learning Dataset Recommendations (/services/mlDatasetEngine.js).
 * Never imported by client-side code.
 */

import { GoogleGenAI, Type } from '@google/genai';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import Tesseract from 'tesseract.js';
import {
  computeMLDatasetRecommendations,
  parseBloodReportTextWithMLDataset,
  evaluatePlateWithMLDataset,
  classifyPlateFromVisualFeatures,
} from './mlDatasetEngine.js';

function getGenAIClient() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function generateContentWithTimeout(ai, params, timeoutMs = 9500) {
  let timer = null;
  try {
    return await Promise.race([
      ai.models.generateContent(params),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Model timeout after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const UNIVERSAL_MEDICAL_SYSTEM_PROMPT =
  "You are a medical data extraction assistant. Read this blood test report. Extract EVERY test listed. For each test, identify the Test Name, Value, Unit, Reference Range, and Status ('Normal', 'High', 'Low'). Output strictly as a JSON object containing an array called 'extracted_results'. Provide a simple, 3-point lifestyle/dietary recommendation tailored to a South Indian user based on the abnormal findings.";

const UNIVERSAL_REPORT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    is_readable: {
      type: Type.BOOLEAN,
      description:
        'True if the document/image is a readable medical or blood test report with at least 1 test result visible. False if blurry, dark, or unrelated file.',
    },
    unreadable_reason_en: {
      type: Type.STRING,
      description:
        'If is_readable is false, explain kindly in 1 simple sentence for an elderly user why the report could not be read.',
    },
    unreadable_reason_te: {
      type: Type.STRING,
      description: 'Telugu translation of unreadable_reason_en.',
    },
    report_metadata: {
      type: Type.OBJECT,
      properties: {
        lab_name: { type: Type.STRING, nullable: true },
        lab_id: { type: Type.STRING, nullable: true },
        patient_name: { type: Type.STRING, nullable: true },
        age_gender: { type: Type.STRING, nullable: true },
        referring_physician: { type: Type.STRING, nullable: true },
        sample_collected: { type: Type.STRING, nullable: true },
        report_date: { type: Type.STRING, nullable: true },
        barcode_no: { type: Type.STRING, nullable: true },
        fasting_status: { type: Type.STRING, nullable: true },
        authorized_signatory: { type: Type.STRING, nullable: true },
      },
    },
    extracted_results: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          category_te: { type: Type.STRING },
          test_name: { type: Type.STRING },
          test_name_te: { type: Type.STRING },
          value: { type: Type.STRING },
          unit: { type: Type.STRING },
          reference_range: { type: Type.STRING },
          status: {
            type: Type.STRING,
            enum: ['Normal', 'High', 'Low'],
          },
          explanation_en: { type: Type.STRING },
          explanation_te: { type: Type.STRING },
        },
        required: [
          'category',
          'category_te',
          'test_name',
          'test_name_te',
          'value',
          'unit',
          'reference_range',
          'status',
          'explanation_en',
          'explanation_te',
        ],
      },
    },
  },
  required: [
    'is_readable',
    'unreadable_reason_en',
    'unreadable_reason_te',
    'report_metadata',
    'extracted_results',
  ],
};

/**
 * Extracts raw text from a base64 PDF buffer using pdfjs-dist.
 */
async function extractTextFromPdfBuffer(base64Str) {
  try {
    const buffer = Buffer.from(base64Str, 'base64');
    const data = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({
      data,
      useSystemFonts: true,
      disableFontFace: true,
    });
    const pdfDoc = await loadingTask.promise;
    let fullText = '';
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageStr = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');
      fullText += pageStr + '\n';
    }
    return fullText.trim();
  } catch (err) {
    console.warn('PDF text extraction warning:', err);
    return '';
  }
}

/**
 * Extracts all blood test results and computes ML Dataset Recommendations
 * from a base64-encoded PDF or image medical report.
 */
export async function analyzeMedicalReportImage(
  base64Data,
  mimeType = 'image/jpeg',
  syntheticText = null
) {
  if (syntheticText && typeof syntheticText === 'string' && syntheticText.length > 30) {
    const parsedFromSynthetic = parseBloodReportTextWithMLDataset(syntheticText);
    if (parsedFromSynthetic && parsedFromSynthetic.extracted_results.length > 0) {
      return parsedFromSynthetic;
    }
  }

  const cleanBase64 = base64Data.includes('base64,')
    ? base64Data.split('base64,')[1]
    : base64Data;

  const isPdf =
    mimeType === 'application/pdf' ||
    base64Data.startsWith('data:application/pdf') ||
    cleanBase64.startsWith('JVBERi0');

  let extractedPdfText = '';

  // 1. If the file is a PDF, extract its text directly via pdfjs-dist first
  if (isPdf) {
    extractedPdfText = await extractTextFromPdfBuffer(cleanBase64);
    if (extractedPdfText.length > 30) {
      const deterministicParsed = parseBloodReportTextWithMLDataset(extractedPdfText);
      if (deterministicParsed && deterministicParsed.extracted_results.length > 0) {
        return deterministicParsed;
      }
    }
  }

  // 2. Try Gemini Multimodal API across responsive fallback models
  const ai = getGenAIClient();
  const candidateModels = [
    'gemini-3-flash-preview',
    'gemini-flash-lite-latest',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
  ];

  const resolvedMimeType = isPdf
    ? 'application/pdf'
    : mimeType && mimeType.startsWith('image/')
    ? mimeType
    : 'image/jpeg';

  const parts = [];
  if (extractedPdfText.length > 20) {
    parts.push({
      text: `Extracted PDF Report Text:\n"""\n${extractedPdfText}\n"""`,
    });
  } else {
    parts.push({
      inlineData: {
        mimeType: resolvedMimeType,
        data: cleanBase64,
      },
    });
  }

  parts.push({
    text: `${UNIVERSAL_MEDICAL_SYSTEM_PROMPT}\n\nExtract all header metadata fields and every single test row across all sections (Hematology, Diabetology, Lipid Profile, Organ Function, Thyroid, Vitamins). Include 1-sentence plain-language explanations in English ('explanation_en') and Telugu ('explanation_te').`,
  });

  for (const modelName of candidateModels) {
    try {
      const response = await generateContentWithTimeout(
        ai,
        {
          model: modelName,
          contents: { parts },
          config: {
            systemInstruction: UNIVERSAL_MEDICAL_SYSTEM_PROMPT,
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: UNIVERSAL_REPORT_SCHEMA,
          },
        },
        9500
      );

      const rawText = response.text;
      if (!rawText) continue;

      const parsed = JSON.parse(rawText.trim());
      const extractedResults = Array.isArray(parsed.extracted_results)
        ? parsed.extracted_results
        : [];

      if (!parsed.is_readable || extractedResults.length === 0) {
        return {
          isReadable: false,
          unreadableReasonEn:
            parsed.unreadable_reason_en ||
            'We could not clearly see any blood test values on this file. Please upload a clear photo or PDF of your blood test report.',
          unreadableReasonTe:
            parsed.unreadable_reason_te ||
            'ఈ ఫైల్‌లో రక్త పరీక్ష వివరాలు స్పష్టంగా కనిపించడం లేదు. దయచేసి స్పష్టమైన ఫోటో లేదా PDF రిపోర్ట్‌ను అప్‌లోడ్ చేయండి.',
          report_metadata: null,
          extracted_results: [],
          dietary_recommendations: [],
        };
      }

      const meta = parsed.report_metadata || {};
      // Enrich with our Machine Learning Dataset Recommendation Engine
      const mlResult = computeMLDatasetRecommendations(extractedResults);

      return {
        isReadable: true,
        patientName: meta.patient_name || null,
        reportDate: meta.report_date || null,
        report_metadata: {
          lab_name: meta.lab_name || null,
          lab_id: meta.lab_id || null,
          patient_name: meta.patient_name || null,
          age_gender: meta.age_gender || null,
          referring_physician: meta.referring_physician || null,
          sample_collected: meta.sample_collected || null,
          report_date: meta.report_date || null,
          barcode_no: meta.barcode_no || null,
          fasting_status: meta.fasting_status || null,
          authorized_signatory: meta.authorized_signatory || null,
        },
        extracted_results: extractedResults,
        dietary_recommendations: mlResult.topRecommendations,
        ml_insights: mlResult.mlInsights,
      };
    } catch (err) {
      console.warn(`Gemini model ${modelName} attempt failed:`, err?.status || err?.message);
    }
  }

  // 3. Resilient Fallback when Gemini API experiences 503 high-demand spikes on images
  if (!isPdf) {
    try {
      const imageBuffer = Buffer.from(cleanBase64, 'base64');
      const {
        data: { text: ocrText },
      } = await Tesseract.recognize(imageBuffer, 'eng');
      const ocrParsed = parseBloodReportTextWithMLDataset(ocrText);
      if (ocrParsed && ocrParsed.extracted_results.length > 0) {
        return ocrParsed;
      }
    } catch (ocrErr) {
      console.warn('OCR fallback error:', ocrErr);
    }
  }

  return {
    isReadable: false,
    unreadableReasonEn:
      'We could not clearly read the blood test numbers from this file. Please upload a clearer photo or PDF blood test report.',
    unreadableReasonTe:
      'ఈ రిపోర్ట్‌లోని రక్త పరీక్ష విలువలు స్పష్టంగా కనిపించడం లేదు. దయచేసి స్పష్టమైన ఫోటో లేదా PDF రిపోర్ట్‌ను అప్‌లోడ్ చేయండి.',
    report_metadata: null,
    extracted_results: [],
    dietary_recommendations: [],
  };
}

/**
 * Generates high-clarity spoken audio (WAV base64) in English or Telugu
 * using gemini-3.8-flash-lite-tts as a reliable companion/fallback to Web Speech API.
 */
export async function generateSpokenAudio(text, lang = 'en') {
  const ai = getGenAIClient();
  const styleInstruction =
    lang === 'te'
      ? 'Warm, respectful, slow-paced, clear South Indian doctor speaking Telugu to an elderly grandparent'
      : 'Warm, respectful, slow-paced, clear Indian doctor speaking English to an elderly grandparent';

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash-lite-tts',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text,
            speechMetadata: {
              style: styleInstruction,
            },
          },
        ],
      },
    ],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio =
    response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error('Could not synthesize audio');
  }
  return base64Audio;
}

const PLATE_ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    is_food_plate: {
      type: Type.BOOLEAN,
      description:
        'True ONLY if the photo clearly shows edible food, a meal plate, a bowl of curry/dish, or beverages. MUST be false if the photo shows a human face, person, selfie, silhouette, dark/black frame, empty room, furniture, document, or non-food object.',
    },
    non_food_reason_en: {
      type: Type.STRING,
      description:
        'If is_food_plate is false, explain kindly in 1 sentence what was seen instead (e.g., a human face/person or dark room) and ask the user to point the camera at their meal plate.',
    },
    detected_items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          csv_dish_name: {
            type: Type.STRING,
            description:
              'Exact dish name from the Ifood_new Indian Food Dataset (e.g., Upma, Idli, Dosa, Masala Dosa, Pesarattu, Uttapam, Vada, Pongal, Sambar, Rasam, Thayir sadam, Poriyal, Avial, Keerai kootu, Pachadi, Koshambri, Biryani, Chicken Varuval, Butter chicken, Chicken Tikka masala, Chicken Tikka, Tandoori Chicken, Tandoori Fish Tikka, Maach Jhol, Chapati, Bhakri, Bajri no rotlo, Paratha, Naan, Dal tadka, Dal makhani, Chana masala, Rajma chaval, Palak paneer, Paneer butter masala, Kadai paneer, Aloo gobi, Jeera Aloo, Bhindi masala, Karela bharta, Lauki ki subji, Poha, Khichdi, Brown Rice, Red Rice, Dhokla, Samosa, Puri Bhaji, Chole bhature, Lassi, Payasam, Gulab jamun, White Rice, Foxtail Millet).',
          },
          dish_id: {
            type: Type.STRING,
            description:
              'Normalized lowercase snake_case slug of csv_dish_name (e.g., upma, idli, dosa, masala_dosa, pesarattu, uttapam, vada, pongal, sambar, rasam, thayir_sadam, poriyal, avial, keerai_kootu, pachadi, koshambri, biryani, chicken_varuval, butter_chicken, chicken_tikka_masala, tandoori_chicken, maach_jhol, chapati, bhakri, bajri_no_rotlo, paratha, dal_tadka, dal_makhani, chana_masala, rajma_chaval, palak_paneer, paneer_butter_masala, kadai_paneer, aloo_gobi, jeera_aloo, bhindi_masala, karela_bharta, lauki_ki_subji, poha, khichdi, brown_rice, red_rice, dhokla, samosa, puri_bhaji, chole_bhature, lassi, payasam, gulab_jamun, white_rice, foxtail_millet_ragi).',
          },
          nameEn: { type: Type.STRING },
          portionEn: { type: Type.STRING },
          calories: { type: Type.NUMBER },
          carbsG: { type: Type.NUMBER },
          proteinG: { type: Type.NUMBER },
          fiberG: { type: Type.NUMBER },
          glycemicIndex: { type: Type.NUMBER },
          status: { type: Type.STRING, enum: ['Good', 'Moderate', 'Limit'] },
        },
        required: [
          'csv_dish_name',
          'dish_id',
          'nameEn',
          'portionEn',
          'calories',
          'carbsG',
          'proteinG',
          'fiberG',
          'glycemicIndex',
          'status',
        ],
      },
    },
  },
  required: ['is_food_plate', 'non_food_reason_en', 'detected_items'],
};

/**
 * Analyzes a photo of a meal plate captured from the user's camera.
 * Strictly rejects non-food photos (faces, selfies, dark silhouettes, documents)
 * and identifies all dishes using Gemini Vision + Ifood_new (255-Dish) CSV Dataset.
 */
export async function analyzeMealPlateImage(
  base64Data,
  mimeType = 'image/jpeg',
  bloodReportResults = [],
  presetId = '',
  visualStats = null
) {
  // 1. If user selected a built-in sample plate preset or a dish directly from the 255-dish Ifood_new catalog
  if (presetId && String(presetId).trim().length > 0) {
    return evaluatePlateWithMLDataset([], bloodReportResults, String(presetId).trim(), null);
  }

  // 2. Pre-check client visual features for obvious face or pitch-dark webcam silhouette
  if (visualStats) {
    const preCheck = classifyPlateFromVisualFeatures(visualStats);
    if (!preCheck.isFoodPlate) {
      return {
        isFoodPlate: false,
        messageEn: preCheck.rejectionReasonEn,
        messageTe: preCheck.rejectionReasonTe,
      };
    }
  }

  const cleanBase64 = base64Data.includes('base64,')
    ? base64Data.split('base64,')[1]
    : base64Data;

  const resolvedMimeType =
    mimeType && mimeType.startsWith('image/') ? mimeType : 'image/jpeg';

  const ai = getGenAIClient();
  const candidateModels = [
    { name: 'gemini-3-flash-preview', timeoutMs: 15000 },
    { name: 'gemini-3.6-flash', timeoutMs: 10000 },
    { name: 'gemini-3.5-flash', timeoutMs: 10000 },
  ];

  const promptText = `You are a clinical nutritionist and expert on the Indian Food Dataset (Ifood_new.csv — 255 Indian dishes).
Inspect this image carefully:
1. Does this image clearly show edible food, a meal plate, or a bowl of food?
   - If the image shows a human face, person, selfie, dark shadow/silhouette, blank wall, medical paper, or anything that is NOT food, set "is_food_plate": false and "detected_items": [].
2. If the image DOES show food ("is_food_plate": true):
   - Identify ONLY the actual dishes visible in the photo and map each to its exact dish name in the Ifood_new Indian Food Dataset:
     * White/cream semolina porridge/mound in a plate or bowl with curry leaves, cashews, green chilies, mustard seeds, or chana dal -> csv_dish_name: "Upma", dish_id: "upma".
     * Tempered yogurt mixed with soft rice -> csv_dish_name: "Thayir sadam", dish_id: "thayir_sadam".
     * Moong dal + rice harvest porridge -> csv_dish_name: "Pongal", dish_id: "pongal".
     * Steamed fermented rice cakes -> csv_dish_name: "Idli", dish_id: "idli".
     * Plain crispy lentil-rice crepe -> csv_dish_name: "Dosa", dish_id: "dosa"; with potato filling -> csv_dish_name: "Masala Dosa", dish_id: "masala_dosa"; green moong crepe -> csv_dish_name: "Pesarattu", dish_id: "pesarattu".
     * Reddish-brown chicken or mutton masala curry/fry -> csv_dish_name: "Chicken Varuval", dish_id: "chicken_varuval".
     * Creamy orange tomato-butter chicken -> csv_dish_name: "Butter chicken", dish_id: "butter_chicken".
     * Spiced basmati rice with meat or vegetables -> csv_dish_name: "Biryani", dish_id: "biryani".
     * Plain steamed white rice grains -> csv_dish_name: "White Rice", dish_id: "white_rice".
   - Do not confuse dish names that share minor tempering ingredients. Output strictly as JSON.`;

  if (cleanBase64 && cleanBase64.length > 100) {
    for (const candidate of candidateModels) {
      try {
        const response = await generateContentWithTimeout(
          ai,
          {
            model: candidate.name,
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: resolvedMimeType,
                    data: cleanBase64,
                  },
                },
                { text: promptText },
              ],
            },
            config: {
              temperature: 0.1,
              responseMimeType: 'application/json',
              responseSchema: PLATE_ANALYSIS_SCHEMA,
            },
          },
          candidate.timeoutMs
        );

        const rawText = response.text;
        if (!rawText) continue;
        const parsed = JSON.parse(rawText.trim());

        if (
          parsed.is_food_plate === false ||
          !Array.isArray(parsed.detected_items) ||
          parsed.detected_items.length === 0
        ) {
          return {
            isFoodPlate: false,
            messageEn:
              parsed.non_food_reason_en ||
              'No food plate or dish was detected in this photo. Please point your camera clearly at your meal plate or bowl.',
            messageTe:
              'ఈ ఫోటోలో ఆహార ప్లేట్ లేదా వంటకం కనిపించడం లేదు. దయచేసి కెమెరాను మీ భోజనం ప్లేట్ వైపు ఉంచి ఫోటో తీయండి.',
          };
        }

        return evaluatePlateWithMLDataset(parsed.detected_items, bloodReportResults, '', visualStats);
      } catch (err) {
        console.warn(`Plate analysis model ${candidate.name} fallback:`, err?.status || err?.message);
      }
    }
  }

  // 3. Resilient Ifood_new Central-Region Visual Feature Dataset Fallback if all upstream Gemini models time out / 503
  return evaluatePlateWithMLDataset([], bloodReportResults, presetId, visualStats);
}



