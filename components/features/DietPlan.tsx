import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Utensils,
  Activity,
  Volume2,
  Square,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  X,
  Upload,
  Search,
  Plus,
  Check,
  ArrowUpRight,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ThemeMode } from '../ui/MedicalLogo';
import {
  ExtractedBloodTestItem,
  IfoodCatalogDish,
  MLInsightsData,
  PlateAnalysisResult,
  analyzePlateRequest,
  fileToReportPayload,
  fetchIfoodDatasetCatalog,
  fetchSpokenAudioBase64,
  extractImageVisualStats,
} from '../../services/reportClient';
import { auth, savePlateScanToFirestore } from '../../services/firebase';
import { THEME, getThemeTokens } from '../../utils/styling.js';

export interface DietPlanProps {
  mlInsights?: MLInsightsData;
  bloodReportResults?: ExtractedBloodTestItem[];
  language: 'en' | 'te';
  themeMode?: ThemeMode;
  autoOpenCamera?: boolean;
}

/** Custom Botanical Leaf Symbol for Vegetarian Dishes */
const BotanicalLeafSvg: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <path d="M13.5 2.5C8 2.5 3.5 6 3.5 11.5C8.5 11.5 13.5 8 13.5 2.5Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2.5 13.5L9.5 6.5" strokeLinecap="round" />
  </svg>
);

/** Custom Culinary Vessel Symbol for Non-Vegetarian Dishes */
const CulinaryVesselSvg: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <path d="M2.5 7.5H13.5C13.5 11 11 13.5 8 13.5C5 13.5 2.5 11 2.5 7.5Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5.5 4.5C5.5 3.5 6.5 3 6.5 2M10.5 4.5C10.5 3.5 11.5 3 11.5 2" strokeLinecap="round" />
  </svg>
);

/**
 * Generates a warm editorial visual preview of a sample or selected Indian meal plate
 * so users can test "Analyze My Plate" on desktop or from the Ifood_new dataset picker.
 */
function createSamplePlatePreviewDataUrl(
  presetId: string,
  customLabel?: string
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Warm linen table surface
  ctx.fillStyle = '#F2ECE1';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Handcrafted brass / stoneware thali rim
  ctx.beginPath();
  ctx.arc(320, 210, 172, 0, Math.PI * 2);
  ctx.fillStyle = '#FAF8F5';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle =
    presetId === 'balancedMilletPlate'
      ? '#1B4D3E'
      : presetId === 'spicyChickenMuttonCurry'
      ? '#9A3412'
      : '#8C7A6B';
  ctx.stroke();

  if (presetId === 'southIndianRiceThali') {
    ctx.beginPath();
    ctx.arc(310, 235, 80, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#D5CEC0';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(225, 120, 38, 0, Math.PI * 2);
    ctx.fillStyle = '#C26D2D';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(320, 95, 36, 0, Math.PI * 2);
    ctx.fillStyle = '#9C4A1A';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(410, 125, 36, 0, Math.PI * 2);
    ctx.fillStyle = '#EFECE6';
    ctx.fill();

    ctx.fillStyle = '#1C2421';
    ctx.font = '600 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('Steamed Rice (200g)', 310, 240);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 12px sans-serif';
    ctx.fillText('Sambar', 225, 124);
    ctx.fillText('Aloo Fry', 320, 99);
    ctx.fillStyle = '#1C2421';
    ctx.fillText('Curd', 410, 129);
  } else if (presetId === 'spicyChickenMuttonCurry') {
    ctx.beginPath();
    ctx.arc(320, 210, 140, 0, Math.PI * 2);
    ctx.fillStyle = '#7C2D12';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#B8A99A';
    ctx.stroke();

    const chunks = [
      [275, 180, 32],
      [355, 175, 34],
      [295, 245, 36],
      [365, 235, 30],
      [320, 205, 28],
    ];
    chunks.forEach(([cx, cy, r]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#9A3412';
      ctx.fill();
      ctx.strokeStyle = '#431407';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    ctx.fillStyle = '#FAF8F5';
    ctx.font = '600 16px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('Chicken Varuval / Masala', 320, 205);
    ctx.fillText('180g Serving', 320, 228);
  } else if (presetId === 'balancedMilletPlate') {
    ctx.beginPath();
    ctx.arc(305, 240, 64, 0, Math.PI * 2);
    ctx.fillStyle = '#EED9B3';
    ctx.fill();
    ctx.strokeStyle = '#C8A97E';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(220, 125, 42, 0, Math.PI * 2);
    ctx.fillStyle = '#2E6F4E';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(320, 95, 42, 0, Math.PI * 2);
    ctx.fillStyle = '#1B4D3E';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(415, 130, 38, 0, Math.PI * 2);
    ctx.fillStyle = '#EFECE6';
    ctx.fill();

    ctx.fillStyle = '#1C2421';
    ctx.font = '600 14px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('Foxtail Millet', 305, 244);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 12px sans-serif';
    ctx.fillText('Spinach Dal', 220, 129);
    ctx.fillText('Stir-Fry', 320, 99);
    ctx.fillStyle = '#1C2421';
    ctx.fillText('Curd', 415, 134);
  } else {
    ctx.beginPath();
    ctx.arc(320, 210, 128, 0, Math.PI * 2);
    ctx.fillStyle = '#F5EFE4';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1B4D3E';
    ctx.stroke();

    ctx.fillStyle = '#1C2421';
    ctx.font = '600 20px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText((customLabel || presetId).slice(0, 28), 320, 205);
    ctx.font = '500 13px monospace';
    ctx.fillStyle = '#525E58';
    ctx.fillText('Ifood_new Culinary Reference', 320, 232);
  }

  return canvas.toDataURL('image/jpeg', 0.9);
}

export const DietPlan: React.FC<DietPlanProps> = ({
  mlInsights,
  bloodReportResults = [],
  language,
  themeMode = 'light',
  autoOpenCamera = false,
}) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isAnalyzingPlate, setIsAnalyzingPlate] = useState(false);
  const [platePreviewUrl, setPlatePreviewUrl] = useState<string>('');
  const [plateResult, setPlateResult] = useState<PlateAnalysisResult | null>(null);
  const [plateRejectionError, setPlateRejectionError] = useState<{
    en: string;
    te: string;
  } | null>(null);
  const [isSpeakingPlate, setIsSpeakingPlate] = useState(false);

  // Ifood_new 255-Dish CSV Dataset state
  const [ifoodCatalog, setIfoodCatalog] = useState<IfoodCatalogDish[]>([]);
  const [dishSearchQuery, setDishSearchQuery] = useState('');
  const [dietFilter, setDietFilter] = useState<'all' | 'vegetarian' | 'non vegetarian'>('all');
  const [selectedDishIds, setSelectedDishIds] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const plateFileInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const tokens = getThemeTokens(themeMode);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const stopPlateSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsSpeakingPlate(false);
  };

  useEffect(() => {
    fetchIfoodDatasetCatalog().then((dishes) => {
      if (dishes && dishes.length > 0) {
        setIfoodCatalog(dishes);
      }
    });
    if (autoOpenCamera) {
      startLiveCamera();
    }
    return () => {
      stopCameraStream();
      stopPlateSpeech();
    };
  }, []);

  // Zero-clash filtered view of the 255-dish Ifood_new dataset
  const filteredCatalogDishes = useMemo(() => {
    const q = dishSearchQuery.trim().toLowerCase();
    return ifoodCatalog
      .filter((dish) => {
        if (dietFilter !== 'all' && dish.diet.toLowerCase() !== dietFilter) {
          return false;
        }
        if (!q) return true;
        return (
          dish.csvName.toLowerCase().includes(q) ||
          dish.nameEn.toLowerCase().includes(q) ||
          dish.nameTe.toLowerCase().includes(q) ||
          dish.ingredients.toLowerCase().includes(q) ||
          dish.state.toLowerCase().includes(q) ||
          dish.course.toLowerCase().includes(q)
        );
      })
      .slice(0, 18);
  }, [ifoodCatalog, dishSearchQuery, dietFilter]);

  const selectedCatalogDishes = useMemo(() => {
    const map = new Map<string, IfoodCatalogDish>(
      ifoodCatalog.map((d): [string, IfoodCatalogDish] => [d.id, d])
    );
    return selectedDishIds
      .map((id) => map.get(id))
      .filter((d): d is IfoodCatalogDish => Boolean(d));
  }, [ifoodCatalog, selectedDishIds]);

  const toggleDishSelection = (dishId: string) => {
    setSelectedDishIds((prev) =>
      prev.includes(dishId) ? prev.filter((id) => id !== dishId) : [...prev, dishId]
    );
  };

  const handleAnalyzeSelectedCatalogDishes = async () => {
    if (selectedDishIds.length === 0) return;
    stopCameraStream();
    const label = selectedCatalogDishes.map((d) => d.csvName).join(' + ');
    const previewUrl = createSamplePlatePreviewDataUrl(selectedDishIds[0], label);
    await runPlateAnalysis({
      base64: previewUrl,
      mimeType: 'image/jpeg',
      previewUrl,
      selectedDishIds,
    });
  };

  const startLiveCamera = async () => {
    setCameraError(null);
    setPlateRejectionError(null);
    stopPlateSpeech();

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      plateFileInputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 60);
    } catch {
      setCameraError(
        language === 'en'
          ? 'Camera access was not available. Opening device photo capture instead.'
          : 'కెమెరా అనుమతి లభించలేదు. ఫోటో ఎంపికను తెరుస్తున్నాము.'
      );
      plateFileInputRef.current?.click();
    }
  };

  const handleCaptureFromLiveVideo = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 960;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopCameraStream();
    await runPlateAnalysis({ base64: dataUrl, mimeType: 'image/jpeg', previewUrl: dataUrl });
  };

  const handlePlateFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const payload = await fileToReportPayload(file);
      stopCameraStream();
      await runPlateAnalysis({
        base64: payload.base64,
        mimeType: payload.mimeType,
        previewUrl: payload.previewUrl || payload.base64,
      });
    } catch {
      // Handled gracefully
    } finally {
      if (plateFileInputRef.current) plateFileInputRef.current.value = '';
    }
  };

  const handleSamplePlateAnalysis = async (presetId: string, label?: string) => {
    stopCameraStream();
    const previewUrl = createSamplePlatePreviewDataUrl(presetId, label);
    await runPlateAnalysis({
      base64: previewUrl,
      mimeType: 'image/jpeg',
      previewUrl,
      presetId,
    });
  };

  const runPlateAnalysis = async (params: {
    base64: string;
    mimeType: string;
    previewUrl: string;
    presetId?: string;
    selectedDishIds?: string[];
  }) => {
    stopPlateSpeech();
    setPlateRejectionError(null);
    setPlatePreviewUrl(params.previewUrl);
    setIsAnalyzingPlate(true);

    const visualStats =
      params.presetId || (params.selectedDishIds && params.selectedDishIds.length > 0)
        ? null
        : await extractImageVisualStats(params.base64);

    const response = await analyzePlateRequest({
      base64: params.base64,
      mimeType: params.mimeType,
      presetId: params.presetId,
      selectedDishIds: params.selectedDishIds,
      visualStats,
      bloodReportResults,
    });

    setIsAnalyzingPlate(false);
    if (response.ok) {
      setPlateRejectionError(null);
      setPlateResult(response.data);
      if (auth.currentUser) {
        savePlateScanToFirestore(auth.currentUser, response.data).catch(() => {});
      }
    } else {
      setPlateResult(null);
      setPlateRejectionError({
        en: response.error.messageEn,
        te: response.error.messageTe,
      });
    }
  };

  const handleListenToPlate = async () => {
    if (!plateResult) return;
    if (isSpeakingPlate) {
      stopPlateSpeech();
      return;
    }

    const textToRead =
      language === 'en' ? plateResult.spokenSummary.en : plateResult.spokenSummary.te;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const voices = window.speechSynthesis.getVoices();
      const targetPrefix = language === 'te' ? 'te' : 'en';
      const matchingVoice = voices.find((v) =>
        v.lang.toLowerCase().startsWith(targetPrefix)
      );
      if (language === 'en' || matchingVoice) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(textToRead);
        utter.lang = language === 'te' ? 'te-IN' : 'en-IN';
        utter.rate = 0.92;
        if (matchingVoice) utter.voice = matchingVoice;
        utter.onend = () => setIsSpeakingPlate(false);
        utter.onerror = () => setIsSpeakingPlate(false);
        setIsSpeakingPlate(true);
        window.speechSynthesis.speak(utter);
        return;
      }
    }

    setIsSpeakingPlate(true);
    const wavBase64 = await fetchSpokenAudioBase64(textToRead, language);
    if (wavBase64) {
      const audio = new Audio(`data:audio/wav;base64,${wavBase64}`);
      audioRef.current = audio;
      audio.onended = () => setIsSpeakingPlate(false);
      audio.onerror = () => setIsSpeakingPlate(false);
      audio.play().catch(() => setIsSpeakingPlate(false));
    } else {
      setIsSpeakingPlate(false);
    }
  };

  return (
    <section aria-labelledby="analyze-plate-heading" className="space-y-8">
      {/* 1. Organ-System Clinical Index (when blood report is present) */}
      {mlInsights && (
        <Card variant="elevated" themeMode={themeMode} padding="lg" className="space-y-6">
          <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${tokens.divider}`}>
            <div>
              <div className={`text-xs font-mono uppercase tracking-widest ${tokens.brandAccentText}`}>
                {language === 'en'
                  ? 'Organ-System Physiological Index'
                  : 'అవయవ ఆరోగ్య సూచిక'}
              </div>
              <h2 className={`${THEME.typography.sectionTitle} mt-0.5 ${tokens.textPrimary}`}>
                {language === 'en'
                  ? 'Biomarker Balance Across Four Clinical Systems'
                  : 'నాలుగు ప్రధాన అవయవ వ్యవస్థల ఆరోగ్య స్కోర్లు'}
              </h2>
            </div>

            <div className={`px-5 py-3 rounded-xl text-left md:text-right shrink-0 ${tokens.insetBox}`}>
              <div className={`text-[11px] font-mono uppercase tracking-wider ${tokens.textMuted}`}>
                {language === 'en' ? 'Composite Index' : 'మొత్తం ఆరోగ్య స్కోరు'}
              </div>
              <div
                className={`font-mono text-2xl sm:text-3xl font-semibold tabular-nums ${tokens.brandAccentText}`}
              >
                {mlInsights.overallWellnessScore}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                labelEn: 'Hematology (CBC)',
                labelTe: 'హిమటాలజీ (CBC)',
                score: mlInsights.organScores.hematology,
              },
              {
                labelEn: 'Glycemic Control',
                labelTe: 'మధుమేహం (షుగర్)',
                score: mlInsights.organScores.glycemic,
              },
              {
                labelEn: 'Lipid & Vascular',
                labelTe: 'కొలెస్ట్రాల్ & గుండె',
                score: mlInsights.organScores.lipid,
              },
              {
                labelEn: 'Renal & Hepatic',
                labelTe: 'కిడ్నీ & లివర్',
                score: mlInsights.organScores.renalHepatic,
              },
            ].map((org, idx) => (
              <div key={idx} className={`p-4 rounded-xl space-y-2 ${tokens.insetBox}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs sm:text-sm font-medium ${tokens.textSecondary}`}>
                    {language === 'en' ? org.labelEn : org.labelTe}
                  </span>
                  <Activity className={`w-4 h-4 ${tokens.brandAccentText}`} />
                </div>
                <div
                  className={`font-mono text-xl sm:text-2xl font-semibold tabular-nums ${tokens.textPrimary}`}
                >
                  {org.score}%
                </div>
                <div className="w-full h-1.5 rounded-full bg-current/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      org.score >= 85
                        ? 'bg-emerald-600'
                        : org.score >= 70
                        ? 'bg-amber-600'
                        : 'bg-rose-600'
                    }`}
                    style={{ width: `${org.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 2. "Analyze My Plate" — Camera Meal & Culinary Dataset Studio */}
      <Card variant="elevated" themeMode={themeMode} padding="lg" className="space-y-6">
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${tokens.divider}`}>
          <div className="flex items-start sm:items-center gap-3.5">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tokens.stepBadge}`}
            >
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <div className={`text-xs font-mono uppercase tracking-widest ${tokens.brandAccentText}`}>
                {language === 'en'
                  ? `Indian Culinary & Glycemic Reference · ${ifoodCatalog.length || 255} Verified Dishes`
                  : `భారతీయ ఆహార & గ్లైసెమిక్ రిఫరెన్స్ · ${ifoodCatalog.length || 255} వంటకాలు`}
              </div>
              <h2
                id="analyze-plate-heading"
                className={`${THEME.typography.sectionTitle} mt-0.5 ${tokens.textPrimary}`}
              >
                {language === 'en'
                  ? 'Analyze My Plate'
                  : 'అనలైజ్ మై ప్లేట్ (భోజనం విశ్లేషణ)'}
              </h2>
              <p className={`text-sm sm:text-base ${tokens.textSecondary}`}>
                {language === 'en'
                  ? 'Photograph your meal plate or compose a multi-dish thali from the 255-dish Ifood_new dataset to inspect calories, carbohydrates, ingredients, and glycemic impact.'
                  : 'మీ భోజనం ప్లేట్‌ను కెమెరాతో ఫోటో తీయండి లేదా 255 వంటకాల జాబితా నుండి ఎంచుకొని పోషక విలువలను తెలుసుకోండి.'}
              </p>
            </div>
          </div>
        </div>

        {/* Hidden Native Camera / Image Input */}
        <input
          ref={plateFileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePlateFileChange}
          className="hidden"
          aria-label="Capture or Upload Meal Plate Photo"
        />

        {cameraError && (
          <div className={`p-4 rounded-xl text-sm font-medium ${tokens.warningBanner}`}>
            {cameraError}
          </div>
        )}

        {/* Live Camera Viewfinder Mode */}
        {isCameraOpen && (
          <div className={`p-5 rounded-2xl space-y-4 ${tokens.insetBox}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 font-display font-semibold text-base sm:text-lg">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse" />
                <span>
                  {language === 'en'
                    ? 'Center your meal plate inside the circular frame'
                    : 'కెమెరాను మీ భోజనం ప్లేట్ వైపు ఉంచండి'}
                </span>
              </div>
              <button
                type="button"
                onClick={stopCameraStream}
                className={`p-2 rounded-lg cursor-pointer ${tokens.secondaryPillBtn}`}
                aria-label="Close Camera"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-[400px] mx-auto flex items-center justify-center border border-current/20">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Subtle Circular Plate Guide */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-52 h-52 sm:w-64 sm:h-64 rounded-full border border-white/60" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="massivePrimary"
                themeMode={themeMode}
                onClick={handleCaptureFromLiveVideo}
                icon={<Camera className="w-5 h-5" />}
              >
                {language === 'en'
                  ? 'Capture & Evaluate Plate'
                  : 'ఫోటో తీసి ప్లేట్‌ను విశ్లేషించండి'}
              </Button>
            </div>
          </div>
        )}

        {/* Primary Camera Action Buttons + Ifood_new 255-Dish Picker */}
        {!isCameraOpen && !isAnalyzingPlate && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="massivePrimary"
                themeMode={themeMode}
                onClick={startLiveCamera}
                icon={<Camera className="w-5 h-5" />}
              >
                {language === 'en'
                  ? 'Open Camera to Scan Plate'
                  : 'కెమెరాతో ప్లేట్‌ను స్కాన్ చేయండి'}
              </Button>

              <Button
                variant="massiveSecondary"
                themeMode={themeMode}
                onClick={() => plateFileInputRef.current?.click()}
                icon={<Upload className="w-5 h-5" />}
              >
                {language === 'en'
                  ? 'Upload Meal Plate Photo'
                  : 'ప్లేట్ ఫోటో అప్‌లోడ్ చేయండి'}
              </Button>
            </div>

            {/* Curated Sample Plates Strip */}
            <div className={`p-4 rounded-xl ${tokens.insetBox} space-y-2.5`}>
              <div className={`text-xs font-mono uppercase tracking-wider ${tokens.textMuted}`}>
                {language === 'en'
                  ? 'Sample Regional Meals (Instant Evaluation):'
                  : 'నమూనా భోజనం ప్లేట్‌తో ఇప్పుడే పరీక్షించండి:'}
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    id: 'upma_rava_khichdi',
                    custom: 'Upma (Rava Upma)',
                    labelEn: 'Rava Upma',
                    labelTe: 'ఉప్మా (Upma)',
                  },
                  {
                    id: 'masala_dosa',
                    custom: 'Masala Dosa',
                    labelEn: 'Masala Dosa',
                    labelTe: 'మసాలా దోశ',
                  },
                  {
                    id: 'southIndianRiceThali',
                    custom: undefined,
                    labelEn: 'Steamed Rice + Sambar + Aloo Fry',
                    labelTe: 'తెల్ల అన్నం + సాంబార్ + ఆలూ ఫ్రై',
                  },
                  {
                    id: 'balancedMilletPlate',
                    custom: undefined,
                    labelEn: 'Foxtail Millet (Korralu) + Spinach Dal',
                    labelTe: 'కొర్ర అన్నం + ఆకుకూర పప్పు',
                  },
                  {
                    id: 'spicyChickenMuttonCurry',
                    custom: undefined,
                    labelEn: 'Chicken Varuval / Masala Curry',
                    labelTe: 'చికెన్ వరువల్ / మసాలా కూర',
                  },
                ].map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => handleSamplePlateAnalysis(sample.id, sample.custom)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-sans font-medium text-xs sm:text-sm transition-all cursor-pointer ${tokens.secondaryPillBtn}`}
                  >
                    <span>{language === 'en' ? sample.labelEn : sample.labelTe}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Ifood_new 255-Dish Dataset Search & Multi-Dish Plate Builder */}
            {ifoodCatalog.length > 0 && (
              <div className={`p-5 rounded-2xl space-y-4 ${tokens.insetBox}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className={`text-xs font-mono uppercase tracking-widest ${tokens.brandAccentText}`}>
                      {language === 'en'
                        ? `Ifood_new.csv Reference Corpus (${ifoodCatalog.length} Dishes)`
                        : `Ifood_new.csv ఆహార డేటాసెట్ (${ifoodCatalog.length} వంటకాలు)`}
                    </div>
                    <h3 className={`font-display text-lg sm:text-xl font-semibold mt-0.5 ${tokens.textPrimary}`}>
                      {language === 'en'
                        ? 'Search & Compose Your Meal Plate'
                        : 'డేటాసెట్ నుండి మీ ప్లేట్‌లోని వంటకాలను ఎంచుకోండి'}
                    </h3>
                  </div>

                  {/* Diet Filter Tabs with Custom Botanical / Culinary SVG Symbols */}
                  <div className={`inline-flex items-center p-1 rounded-xl ${tokens.switcherTrack}`}>
                    <button
                      type="button"
                      onClick={() => setDietFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        dietFilter === 'all' ? tokens.switcherActive : tokens.switcherInactive
                      }`}
                    >
                      {language === 'en' ? 'All Dishes' : 'అన్నీ'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDietFilter('vegetarian')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                        dietFilter === 'vegetarian' ? tokens.switcherActive : tokens.switcherInactive
                      }`}
                    >
                      <BotanicalLeafSvg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{language === 'en' ? 'Vegetarian' : 'వెజ్'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDietFilter('non vegetarian')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                        dietFilter === 'non vegetarian' ? tokens.switcherActive : tokens.switcherInactive
                      }`}
                    >
                      <CulinaryVesselSvg className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                      <span>{language === 'en' ? 'Non-Veg' : 'నాన్-వెజ్'}</span>
                    </button>
                  </div>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search
                    className={`w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 ${tokens.textMuted}`}
                  />
                  <input
                    type="text"
                    value={dishSearchQuery}
                    onChange={(e) => setDishSearchQuery(e.target.value)}
                    placeholder={
                      language === 'en'
                        ? 'Search by dish name, ingredient, or state (e.g. Upma, Dosa, Idli, Biryani, Paneer, Chicken Varuval, Poha)...'
                        : 'వంటకం పేరు లేదా పదార్థంతో వెతకండి (ఉదా: Upma, Dosa, Idli, Biryani, Paneer, Chicken)...'
                    }
                    className={`w-full pl-11 pr-10 py-3 rounded-xl text-sm sm:text-base border focus:outline-none ${
                      themeMode === 'light'
                        ? 'bg-white border-[#D5CEC0] text-[#1C2421] focus:border-[#1B4D3E]'
                        : themeMode === 'neon'
                        ? 'bg-[#050F14] border-2 border-[#17C2DB] text-white placeholder-[#7DD3FC]/60 focus:border-[#22D3EE]'
                        : 'bg-[#0D1B22] border-[#254859] text-[#ECF6F9] placeholder-[#6D93A1] focus:border-[#22D3EE]'
                    }`}
                  />
                  {dishSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setDishSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-current/10 cursor-pointer"
                      aria-label="Clear dish search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Selected Dishes Tray */}
                {selectedCatalogDishes.length > 0 && (
                  <div className={`p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${tokens.SafeBanner}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono uppercase tracking-wider font-semibold">
                        {language === 'en' ? 'Current Plate:' : 'ఎంచుకున్న వంటకాలు:'}
                      </span>
                      {selectedCatalogDishes.map((dish) => (
                        <span
                          key={dish.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-black/10 dark:bg-white/10"
                        >
                          <span>{dish.csvName}</span>
                          <button
                            type="button"
                            onClick={() => toggleDishSelection(dish.id)}
                            className="hover:opacity-80 cursor-pointer"
                            aria-label={`Remove ${dish.csvName}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedDishIds([])}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium opacity-80 hover:opacity-100 cursor-pointer"
                      >
                        {language === 'en' ? 'Clear' : 'తుడిచివేయి'}
                      </button>
                      <button
                        type="button"
                        onClick={handleAnalyzeSelectedCatalogDishes}
                        className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold cursor-pointer ${tokens.massivePrimaryBtn}`}
                      >
                        {language === 'en'
                          ? `Evaluate ${selectedCatalogDishes.length} Dish(es)`
                          : `${selectedCatalogDishes.length} వంటకాలను విశ్లేషించండి`}
                      </button>
                    </div>
                  </div>
                )}

                {/* Dish Ledger Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {filteredCatalogDishes.map((dish) => {
                    const isSelected = selectedDishIds.includes(dish.id);
                    const isNonVeg = dish.diet.toLowerCase() === 'non vegetarian';
                    return (
                      <div
                        key={dish.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                          isSelected
                            ? tokens.selectedCard
                            : `border-current/10 bg-white/60 dark:bg-white/[0.02] hover:border-current/25`
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            {isNonVeg ? (
                              <CulinaryVesselSvg className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                            ) : (
                              <BotanicalLeafSvg className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                            )}
                            <span
                              className={`font-display font-semibold text-sm truncate ${tokens.textPrimary}`}
                              title={dish.nameEn}
                            >
                              {dish.csvName}
                            </span>
                          </div>
                          <div className={`font-mono text-[11px] truncate mt-0.5 ${tokens.textMuted}`}>
                            {dish.calories} kcal · GI {dish.glycemicIndex} · {dish.course}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleDishSelection(dish.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                              isSelected ? tokens.massivePrimaryBtn : tokens.secondaryPillBtn
                            }`}
                            title="Add or remove dish from multi-dish plate"
                          >
                            {isSelected ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Plus className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSamplePlateAnalysis(dish.id, dish.csvName)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${tokens.secondaryPillBtn}`}
                          >
                            {language === 'en' ? 'Inspect' : 'పరీక్షించు'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Non-Food / Face / Dark Silhouette Rejection Notice */}
        {plateRejectionError && !isAnalyzingPlate && (
          <div className={`p-6 rounded-2xl space-y-5 ${tokens.attentionSectionBg}`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {platePreviewUrl && (
                <img
                  src={platePreviewUrl}
                  alt="Rejected Camera Frame"
                  className="w-24 h-24 rounded-xl object-cover border border-current/20 shrink-0"
                />
              )}
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider font-semibold text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4" />
                  <span>
                    {language === 'en'
                      ? 'No Meal Plate Detected in Frame'
                      : 'ఆహార ప్లేట్ కనిపించలేదు'}
                  </span>
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-semibold">
                  {language === 'en'
                    ? 'Please point the camera at a food plate or bowl'
                    : 'దయచేసి కెమెరాను మీ భోజనం ప్లేట్ వైపు ఉంచండి'}
                </h3>
                <p className="text-sm sm:text-base leading-relaxed opacity-90">
                  {language === 'en' ? plateRejectionError.en : plateRejectionError.te}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="massivePrimary"
                themeMode={themeMode}
                onClick={startLiveCamera}
                icon={<Camera className="w-5 h-5" />}
              >
                {language === 'en'
                  ? 'Scan Meal Plate Again'
                  : 'మళ్ళీ భోజనం ప్లేట్‌ను స్కాన్ చేయండి'}
              </Button>
            </div>
          </div>
        )}

        {/* Loading State while Analyzing Plate */}
        {isAnalyzingPlate && (
          <div className={`p-8 rounded-2xl text-center space-y-3 ${tokens.insetBox}`}>
            <div
              className={`mx-auto w-10 h-10 rounded-full border-2 border-t-transparent animate-spin ${tokens.brandAccentText}`}
            />
            <h3 className={`font-display text-xl font-semibold ${tokens.textPrimary}`}>
              {language === 'en'
                ? 'Evaluating dishes on your plate...'
                : 'మీ ప్లేట్‌లోని ఆహార పదార్థాలను విశ్లేషిస్తున్నాము...'}
            </h3>
            <p className={`text-sm sm:text-base ${tokens.textSecondary}`}>
              {language === 'en'
                ? 'Matching with the 255-dish Ifood_new culinary corpus and ICMR-NIN glycemic index tables.'
                : 'Ifood_new మరియు ICMR-NIN పోషకాహార డేటాసెట్ ఆధారంగా పోషక విలువలను లెక్కిస్తున్నాము.'}
            </p>
          </div>
        )}

        {/* Plate Analysis Results Ledger */}
        {plateResult && !isAnalyzingPlate && (
          <div className="space-y-6 pt-2">
            {/* Editorial Plate Verdict Header */}
            <div
              className={`p-6 rounded-2xl space-y-5 ${
                plateResult.plateGrade === 'Green'
                  ? tokens.allGoodSectionBg
                  : tokens.attentionSectionBg
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="flex items-start sm:items-center gap-4">
                  {platePreviewUrl && (
                    <img
                      src={platePreviewUrl}
                      alt="Evaluated Meal Plate"
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border border-current/15 shrink-0"
                    />
                  )}
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider font-semibold">
                      {plateResult.plateGrade === 'Green' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                      <span>
                        {language === 'en'
                          ? `Plate Score ${plateResult.plateScore}/100 · ${plateResult.plateGrade} Zone`
                          : `ప్లేట్ స్కోరు ${plateResult.plateScore}/100`}
                      </span>
                    </div>
                    <h3 className="font-display text-2xl sm:text-3xl font-semibold">
                      {language === 'en'
                        ? plateResult.verdictTitleEn
                        : plateResult.verdictTitleTe}
                    </h3>
                    <p className="text-xs font-mono opacity-75">
                      {plateResult.datasetSource}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <Button
                    variant={isSpeakingPlate ? 'actionVoiceActive' : 'actionVoice'}
                    themeMode={themeMode}
                    onClick={handleListenToPlate}
                    icon={
                      isSpeakingPlate ? (
                        <Square className="w-4 h-4 fill-current" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )
                    }
                  >
                    {isSpeakingPlate
                      ? language === 'en'
                        ? 'Stop Audio'
                        : 'ఆపండి'
                      : language === 'en'
                      ? 'Listen to Plate Summary'
                      : 'ప్లేట్ విశ్లేషణ వినండి'}
                  </Button>

                  <Button
                    variant="secondaryPill"
                    themeMode={themeMode}
                    onClick={startLiveCamera}
                    icon={<RotateCcw className="w-4 h-4" />}
                  >
                    {language === 'en' ? 'Scan Another Plate' : 'మరో ప్లేట్ స్కాన్ చేయండి'}
                  </Button>
                </div>
              </div>

              {/* 5 Tabular Nutritional & Glycemic Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                {[
                  {
                    labelEn: 'Energy',
                    labelTe: 'కేలరీలు',
                    val: `${plateResult.totalCalories} kcal`,
                  },
                  {
                    labelEn: 'Carbohydrates',
                    labelTe: 'కార్బోహైడ్రేట్లు',
                    val: `${plateResult.totalCarbsG} g`,
                  },
                  {
                    labelEn: 'Protein',
                    labelTe: 'ప్రోటీన్',
                    val: `${plateResult.totalProteinG} g`,
                  },
                  {
                    labelEn: 'Dietary Fiber',
                    labelTe: 'పీచు పదార్థం',
                    val: `${plateResult.totalFiberG} g`,
                  },
                  {
                    labelEn: 'Glycemic Index',
                    labelTe: 'గ్లైసెమిక్ ఇండెక్స్',
                    val: `GI ${plateResult.avgGlycemicIndex}`,
                  },
                ].map((stat, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl text-left ${tokens.insetBox}`}
                  >
                    <div className={`text-[11px] font-mono uppercase tracking-wider ${tokens.textMuted}`}>
                      {language === 'en' ? stat.labelEn : stat.labelTe}
                    </div>
                    <div
                      className={`font-mono text-lg sm:text-xl font-semibold mt-1 tabular-nums ${tokens.textPrimary}`}
                    >
                      {stat.val}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Blood Report Biomarker Cross-Check */}
            {plateResult.reportCrossChecks && plateResult.reportCrossChecks.length > 0 && (
              <div className={`p-5 rounded-xl space-y-2 ${tokens.insetBox}`}>
                <div className={`text-xs font-mono uppercase tracking-widest ${tokens.brandAccentText}`}>
                  {language === 'en'
                    ? 'Clinical Biomarker Correlation'
                    : 'రక్త పరీక్ష రిపోర్ట్‌తో సంబంధం'}
                </div>
                {plateResult.reportCrossChecks.map((chk, idx) => (
                  <p
                    key={idx}
                    className={`text-sm sm:text-base leading-relaxed ${tokens.textPrimary}`}
                  >
                    {language === 'en' ? chk.en : chk.te}
                  </p>
                ))}
              </div>
            )}

            {/* Detected Food Items Breakdown with Clean Unboxed Metadata */}
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h4 className={`font-display text-xl font-semibold ${tokens.textPrimary}`}>
                  {language === 'en'
                    ? `Evaluated Dishes on Plate (${plateResult.detectedItems.length})`
                    : `మీ ప్లేట్‌లో గుర్తించిన వంటకాలు (${plateResult.detectedItems.length})`}
                </h4>
                <span className={`font-mono text-xs ${tokens.textMuted}`}>
                  Ifood_new · ICMR-NIN
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plateResult.detectedItems.map((item, idx) => {
                  const statusTone =
                    item.status === 'Good'
                      ? tokens.SafeBanner
                      : item.status === 'Limit'
                      ? tokens.dangerBanner
                      : tokens.warningBanner;

                  const statusLabel =
                    item.status === 'Good'
                      ? language === 'en'
                        ? 'Favorable Choice'
                        : 'మంచి ఆహారం'
                      : item.status === 'Limit'
                      ? language === 'en'
                        ? 'High Glycemic / Limit'
                        : 'తగ్గించాలి'
                      : language === 'en'
                      ? 'Moderate Portion'
                      : 'మితంగా తినాలి';

                  const isNonVeg = item.diet?.toLowerCase() === 'non vegetarian';

                  // Unboxed editorial metadata line (separated by middle dots)
                  const metaParts = [
                    language === 'en' ? item.portionEn : item.portionTe,
                    item.diet
                      ? isNonVeg
                        ? language === 'en'
                          ? 'Non-Vegetarian'
                          : 'నాన్-వెజ్'
                        : language === 'en'
                        ? 'Vegetarian'
                        : 'వెజ్'
                      : null,
                    item.course ? item.course : null,
                    item.state && item.state !== 'Pan-India' ? item.state : null,
                  ].filter(Boolean);

                  return (
                    <div
                      key={idx}
                      className={`p-5 rounded-xl space-y-3.5 ${tokens.insetBox}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {isNonVeg ? (
                              <CulinaryVesselSvg className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                            ) : (
                              <BotanicalLeafSvg className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                            )}
                            <h5 className={`font-display text-lg sm:text-xl font-semibold ${tokens.textPrimary}`}>
                              {language === 'en' ? item.nameEn : item.nameTe}
                            </h5>
                          </div>
                          <div className={`text-xs ${tokens.textSecondary}`}>
                            {metaParts.join(' · ')}
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium shrink-0 ${statusTone}`}
                        >
                          {statusLabel}
                        </span>
                      </div>

                      {/* Tabular Macro Ledger Row */}
                      <div className={`py-2.5 px-3 rounded-lg border ${tokens.divider} bg-white/50 dark:bg-black/20 grid grid-cols-5 gap-2 text-center font-mono text-xs`}>
                        <div>
                          <div className={`text-[10px] uppercase ${tokens.textMuted}`}>Kcal</div>
                          <div className={`font-semibold ${tokens.textPrimary}`}>{item.calories}</div>
                        </div>
                        <div>
                          <div className={`text-[10px] uppercase ${tokens.textMuted}`}>Carbs</div>
                          <div className={`font-semibold ${tokens.textPrimary}`}>{item.carbsG}g</div>
                        </div>
                        <div>
                          <div className={`text-[10px] uppercase ${tokens.textMuted}`}>Protein</div>
                          <div className={`font-semibold ${tokens.textPrimary}`}>{item.proteinG}g</div>
                        </div>
                        <div>
                          <div className={`text-[10px] uppercase ${tokens.textMuted}`}>Fiber</div>
                          <div className={`font-semibold ${tokens.textPrimary}`}>{item.fiberG}g</div>
                        </div>
                        <div>
                          <div className={`text-[10px] uppercase ${tokens.textMuted}`}>GI</div>
                          <div className={`font-semibold ${tokens.brandAccentText}`}>{item.glycemicIndex}</div>
                        </div>
                      </div>

                      {/* Unboxed Ingredients Line */}
                      {item.ingredients && (
                        <div className={`text-xs leading-relaxed ${tokens.textSecondary}`}>
                          <span className={`font-semibold ${tokens.textPrimary}`}>
                            {language === 'en' ? 'Ingredients: ' : 'పదార్థాలు: '}
                          </span>
                          <span>{item.ingredients}</span>
                        </div>
                      )}

                      <p className={`text-xs sm:text-sm leading-relaxed ${tokens.textSecondary}`}>
                        {language === 'en' ? item.noteEn : item.noteTe}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Practical Plate Adjustments */}
            {plateResult.improvementTips && plateResult.improvementTips.length > 0 && (
              <div className={`p-5 rounded-xl space-y-2.5 ${tokens.insetBox}`}>
                <div className={`text-xs font-mono uppercase tracking-widest ${tokens.brandAccentText}`}>
                  {language === 'en'
                    ? 'Recommended Portion & Pairing Adjustments'
                    : 'ఈ ప్లేట్‌ను మరింత ఆరోగ్యకరంగా మార్చుకోవడం ఎలా'}
                </div>
                <ul className="space-y-1.5">
                  {plateResult.improvementTips.map((tip, idx) => (
                    <li
                      key={idx}
                      className={`text-sm sm:text-base leading-relaxed flex items-start gap-2.5 ${tokens.textPrimary}`}
                    >
                      <span className={`font-mono text-xs mt-1 ${tokens.brandAccentText}`}>
                        0{idx + 1}
                      </span>
                      <span>{language === 'en' ? tip.en : tip.te}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>
    </section>
  );
};
