import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  analyzeMedicalReportImage,
  analyzeMealPlateImage,
  generateSpokenAudio,
} from './services/ai.js';
import {
  getIfoodDatasetCatalog,
  evaluatePlateWithMLDataset,
} from './services/mlDatasetEngine.js';
import { buildReportAnalysis } from './services/comparison.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support high-resolution camera photos up to 25MB
  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  /**
   * GET /api/ifood-dataset
   * Returns the complete 255-dish Ifood_new_023ce684.csv catalog with ICMR-NIN metrics.
   */
  app.get('/api/ifood-dataset', (_req, res) => {
    try {
      const catalog = getIfoodDatasetCatalog();
      res.json({ ok: true, count: catalog.length, dishes: catalog });
    } catch (err) {
      res.status(500).json({ ok: false, dishes: [] });
    }
  });

  /**
   * POST /api/analyze
   * Extracts EVERY blood test listed on the report via /services/ai.js
   * and structures "Needs Attention" + "All Good" sections via /services/comparison.js.
   */
  app.post('/api/analyze', async (req, res) => {
    try {
      const { todayImage } = req.body || {};

      if (!todayImage || !todayImage.base64) {
        return res.status(400).json({
          ok: false,
          isUnreadable: true,
          messageEn: 'Please select or take a photo of your Blood Test Report.',
          messageTe: 'దయచేసి మీ రక్త పరీక్ష రిపోర్ట్ ఫోటోను ఎంచుకోండి.',
        });
      }

      const extractedReport = await analyzeMedicalReportImage(
        todayImage.base64,
        todayImage.mimeType,
        todayImage.syntheticText || null
      );

      if (!extractedReport.isReadable) {
        return res.status(422).json({
          ok: false,
          isUnreadable: true,
          messageEn: extractedReport.unreadableReasonEn,
          messageTe: extractedReport.unreadableReasonTe,
        });
      }

      const finalizedDashboardData = buildReportAnalysis(extractedReport);

      return res.json({
        ok: true,
        data: finalizedDashboardData,
      });
    } catch (error: any) {
      console.error('Error analyzing universal blood test report:', error);
      return res.status(500).json({
        ok: false,
        isUnreadable: false,
        messageEn:
          'We could not process this photo right now. Please make sure the photo is clear and try again.',
        messageTe:
          'ప్రస్తుతం ఈ ఫోటోను పరిశీలించలేకపోయాము. దయచేసి స్పష్టమైన ఫోటోతో మళ్ళీ ప్రయత్నించండి.',
      });
    }
  });

  /**
   * POST /api/analyze-plate
   * Analyzes a photo of the patient's current meal plate captured via camera
   * or evaluates selected dishes from the 255-dish Ifood_new_023ce684.csv dataset.
   */
  app.post('/api/analyze-plate', async (req, res) => {
    try {
      const { plateImage, bloodReportResults } = req.body || {};

      if (
        !plateImage ||
        (!plateImage.base64 &&
          !plateImage.presetId &&
          (!Array.isArray(plateImage.selectedDishIds) || plateImage.selectedDishIds.length === 0))
      ) {
        return res.status(400).json({
          ok: false,
          isNotFoodPlate: true,
          messageEn: 'Please take a photo of your food plate with your camera.',
          messageTe: 'దయచేసి కెమెరాతో మీ భోజనం ప్లేట్ ఫోటో తీయండి.',
        });
      }

      let plateAnalysis: any = null;

      if (Array.isArray(plateImage.selectedDishIds) && plateImage.selectedDishIds.length > 0) {
        const rawItems = plateImage.selectedDishIds.map((id: string) => ({
          dish_id: id,
          csv_dish_name: id,
          nameEn: id,
        }));
        plateAnalysis = evaluatePlateWithMLDataset(
          rawItems,
          Array.isArray(bloodReportResults) ? bloodReportResults : [],
          '',
          null
        );
      } else {
        plateAnalysis = await analyzeMealPlateImage(
          plateImage.base64 || '',
          plateImage.mimeType || 'image/jpeg',
          Array.isArray(bloodReportResults) ? bloodReportResults : [],
          plateImage.presetId || '',
          plateImage.visualStats || null
        );
      }

      if (plateAnalysis && plateAnalysis.isFoodPlate === false) {
        return res.status(422).json({
          ok: false,
          isNotFoodPlate: true,
          messageEn:
            plateAnalysis.messageEn ||
            'No food plate or dish was detected in this photo. Please point your camera clearly at your meal plate.',
          messageTe:
            plateAnalysis.messageTe ||
            'ఈ ఫోటోలో ఆహార ప్లేట్ కనిపించడం లేదు. దయచేసి కెమెరాను మీ భోజనం ప్లేట్ వైపు ఉంచి ఫోటో తీయండి.',
        });
      }

      return res.json({
        ok: true,
        data: plateAnalysis,
      });
    } catch (error: any) {
      console.error('Error analyzing food plate:', error);
      return res.status(500).json({
        ok: false,
        messageEn: 'Could not analyze the plate photo right now. Please try again.',
        messageTe: 'ప్రస్తుతం ప్లేట్ ఫోటోను విశ్లేషించలేకపోయాము. దయచేసి మళ్ళీ ప్రయత్నించండి.',
      });
    }
  });

  /**
   * POST /api/tts
   * Provides natural spoken audio in Telugu or English for devices without local TTS voices.
   */
  app.post('/api/tts', async (req, res) => {
    try {
      const { text, lang } = req.body || {};
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Missing text' });
      }
      const audioBase64 = await generateSpokenAudio(text, lang === 'te' ? 'te' : 'en');
      return res.json({ audioBase64 });
    } catch (error) {
      console.error('TTS generation error:', error);
      return res.status(500).json({ error: 'Failed to synthesize speech' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BloodBite Universal Analyzer running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
