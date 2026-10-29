import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Upload,
  FileText,
  Utensils,
  FileCheck2,
  LogOut,
  Trash2,
  X,
  User as UserIcon,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { MedicalLogo, ThemeMode } from '../ui/MedicalLogo';
import { ThemeToggle } from '../ui/ThemeToggle';
import { DietPlan } from './DietPlan';
import {
  UploadedReportFile,
  fileToReportPayload,
  urlToReportPayload,
} from '../../services/reportClient';
import {
  User,
  SavedBloodReportRecord,
  SavedPlateScanRecord,
} from '../../services/firebase';
import {
  ATTACHED_NOVACARE_PDF_URL,
  SAMPLE_LAB_PRESETS,
  generateSampleReportImage,
} from '../../utils/sampleReports';
import { THEME, getThemeTokens } from '../../utils/styling.js';

export interface UploadWidgetProps {
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  language: 'en' | 'te';
  onToggleLanguage: (lang: 'en' | 'te') => void;
  onStartAnalysis: (todayReport: UploadedReportFile) => void;
  isLoading: boolean;
  user?: User | null;
  onSignOut?: () => void;
  savedReports?: SavedBloodReportRecord[];
  savedPlateScans?: SavedPlateScanRecord[];
  onDeleteReport?: (reportId: string) => void;
  onDeletePlateScan?: (plateId: string) => void;
}

export const UploadWidget: React.FC<UploadWidgetProps> = ({
  themeMode,
  onThemeChange,
  language,
  onToggleLanguage,
  onStartAnalysis,
  isLoading,
  user,
  onSignOut,
  savedReports = [],
  savedPlateScans = [],
  onDeleteReport,
  onDeletePlateScan,
}) => {
  const reportInputRef = useRef<HTMLInputElement | null>(null);
  const reportCameraInputRef = useRef<HTMLInputElement | null>(null);
  const reportVideoRef = useRef<HTMLVideoElement | null>(null);
  const reportStreamRef = useRef<MediaStream | null>(null);

  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);
  const [showPlateScanner, setShowPlateScanner] = useState(false);
  const [isReportCameraOpen, setIsReportCameraOpen] = useState(false);
  const [reportCameraError, setReportCameraError] = useState<string | null>(null);

  const tokens = getThemeTokens(themeMode);

  const stopReportCameraStream = () => {
    if (reportStreamRef.current) {
      reportStreamRef.current.getTracks().forEach((track) => track.stop());
      reportStreamRef.current = null;
    }
    setIsReportCameraOpen(false);
  };

  useEffect(() => {
    return () => {
      stopReportCameraStream();
    };
  }, []);

  const startReportCamera = async () => {
    setReportCameraError(null);

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      reportCameraInputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1600 },
          height: { ideal: 1200 },
        },
        audio: false,
      });
      reportStreamRef.current = stream;
      setIsReportCameraOpen(true);
      setTimeout(() => {
        if (reportVideoRef.current) {
          reportVideoRef.current.srcObject = stream;
          reportVideoRef.current.play().catch(() => {});
        }
      }, 60);
    } catch {
      setReportCameraError(
        language === 'en'
          ? 'Camera access was unavailable on this browser. Opening device photo capture instead.'
          : 'కెమెరా అనుమతి లభించలేదు. ఫోటో ఎంపికను తెరుస్తున్నాము.'
      );
      reportCameraInputRef.current?.click();
    }
  };

  const handleCaptureReportFromVideo = () => {
    if (!reportVideoRef.current) return;
    const video = reportVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    stopReportCameraStream();

    onStartAnalysis({
      base64: dataUrl,
      mimeType: 'image/jpeg',
      fileName: `Camera_Blood_Report_${Date.now()}.jpg`,
      previewUrl: dataUrl,
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      stopReportCameraStream();
      const payload = await fileToReportPayload(file);
      onStartAnalysis(payload);
    } catch {
      // Handled gracefully
    } finally {
      if (reportInputRef.current) reportInputRef.current.value = '';
      if (reportCameraInputRef.current) reportCameraInputRef.current.value = '';
    }
  };

  const handleAnalyzeAttachedPdf = async () => {
    setIsSampleModalOpen(false);
    stopReportCameraStream();
    try {
      const payload = await urlToReportPayload(
        ATTACHED_NOVACARE_PDF_URL,
        'Normal_Blood_Test_Report_1aa30bdd.pdf',
        'application/pdf'
      );
      onStartAnalysis(payload);
    } catch {
      const fallback = generateSampleReportImage(SAMPLE_LAB_PRESETS.novacareAbnormalPanel);
      onStartAnalysis(fallback);
    }
  };

  const handleRunSamplePreset = (presetKey: string) => {
    setIsSampleModalOpen(false);
    stopReportCameraStream();
    const preset =
      SAMPLE_LAB_PRESETS[presetKey] || SAMPLE_LAB_PRESETS.novacareAbnormalPanel;
    const reportImage = generateSampleReportImage(preset);
    onStartAnalysis(reportImage);
  };

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center py-12">
        <Card
          variant="elevated"
          themeMode={themeMode}
          padding="lg"
          className="w-full max-w-xl text-center space-y-6 py-12"
        >
          <div className="mx-auto flex items-center justify-center">
            <MedicalLogo themeMode={themeMode} language={language} size="lg" />
          </div>

          <div
            className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center ${tokens.insetBox}`}
          >
            <div
              className={`w-8 h-8 rounded-full border-2 border-t-transparent animate-spin ${tokens.brandAccentText}`}
            />
          </div>

          <div className="space-y-2">
            <div className={`text-xs font-mono uppercase tracking-widest ${tokens.brandAccentText}`}>
              {language === 'en' ? 'Clinical Document Inspection' : 'రిపోర్ట్ పరిశీలన'}
            </div>
            <h2 className={`font-display text-2xl sm:text-3xl font-semibold ${tokens.textPrimary}`}>
              {language === 'en'
                ? 'Reading your blood test report...'
                : 'మీ రక్త పరీక్ష రిపోర్ట్‌లోని వివరాలను చదువుతున్నాము...'}
            </h2>
            <p className={`text-sm sm:text-base ${tokens.textSecondary} max-w-md mx-auto`}>
              {language === 'en'
                ? 'Cross-checking patient particulars, CBC hematology, glycemic markers, lipid profile, and organ function reference intervals.'
                : 'రోగి వివరాలు, హిమటాలజీ (CBC), షుగర్, లిపిడ్ ప్రొఫైల్ మరియు కిడ్నీ/లివర్ పరీక్షలను విశ్లేషిస్తున్నాము.'}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[88vh] flex flex-col justify-between gap-8">
      {/* Clean Editorial Top Navigation Bar */}
      <header className={`px-5 py-4 rounded-2xl ${tokens.headerBar}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <MedicalLogo themeMode={themeMode} language={language} size="md" />

          {/* Center Workspace Desk Switcher */}
          <div
            className={`inline-flex items-center p-1 rounded-xl ${tokens.switcherTrack}`}
            role="tablist"
            aria-label="Workspace Mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!showPlateScanner}
              onClick={() => setShowPlateScanner(false)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg font-sans text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-all cursor-pointer ${
                !showPlateScanner ? tokens.switcherActive : tokens.switcherInactive
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>
                {language === 'en' ? 'Blood Report Desk' : 'రక్త పరీక్ష డెస్క్'}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={showPlateScanner}
              onClick={() => setShowPlateScanner(true)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg font-sans text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-all cursor-pointer ${
                showPlateScanner ? tokens.switcherActive : tokens.switcherInactive
              }`}
            >
              <Utensils className="w-4 h-4 shrink-0" />
              <span>
                {language === 'en' ? 'Analyze My Plate' : 'అనలైజ్ మై ప్లేట్'}
              </span>
            </button>
          </div>

          {/* Right Controls: Theme, Language & Patient Identity */}
          <div className="flex flex-wrap items-center gap-3">
            <ThemeToggle
              themeMode={themeMode}
              onThemeChange={onThemeChange}
              language={language}
              onLanguageChange={onToggleLanguage}
            />

            {user && (
              <div className={`flex items-center gap-2.5 pl-3 border-l ${tokens.divider}`}>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Patient'}
                    className="w-8 h-8 rounded-full border border-current/15"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${tokens.stepBadge}`}
                  >
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                <span className={`hidden xl:inline-block text-xs font-medium max-w-[140px] truncate ${tokens.textPrimary}`}>
                  {user.displayName || user.email || 'Patient'}
                </span>
                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    title={language === 'en' ? 'Sign Out' : 'సైన్ అవుట్'}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${tokens.secondaryPillBtn}`}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{language === 'en' ? 'Sign Out' : 'సైన్ అవుట్'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hidden File Explorer Input (PDF or Image) */}
      <input
        ref={reportInputRef}
        type="file"
        accept="image/*,application/pdf,.pdf"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Browse Blood Test Report from Files (Photo or PDF)"
      />

      {/* Hidden Native Camera Capture Input */}
      <input
        ref={reportCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Upload Blood Test Report Through Camera"
      />

      {/* Main Workspace Body */}
      {showPlateScanner ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className={`text-xs font-mono uppercase tracking-widest ${tokens.brandAccentText}`}>
                {language === 'en'
                  ? 'Nutritional & Glycemic Studio · 255 Indian Dishes'
                  : 'పోషకాహార & గ్లైసెమిక్ విశ్లేషణ · 255 భారతీయ వంటకాలు'}
              </div>
              <h1 className={`font-display text-2xl sm:text-3xl font-semibold mt-1 ${tokens.textPrimary}`}>
                {language === 'en'
                  ? 'Analyze Your Meal Plate'
                  : 'మీ భోజనం ప్లేట్‌ను పరీక్షించండి'}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setShowPlateScanner(false)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer ${tokens.secondaryPillBtn}`}
            >
              <FileText className="w-4 h-4" />
              <span>
                {language === 'en' ? 'Back to Blood Report Desk' : 'రక్త పరీక్ష డెస్క్‌కు తిరిగి వెళ్ళండి'}
              </span>
            </button>
          </div>

          <DietPlan
            language={language}
            themeMode={themeMode}
            autoOpenCamera={false}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start my-auto">
          {/* Left 7 Columns: Primary Blood Report Intake & Camera Desk */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <div className={`text-xs font-mono uppercase tracking-widest ${tokens.brandAccentText}`}>
                {language === 'en'
                  ? 'Diagnostic Laboratory Reader · English & Telugu'
                  : 'రక్త పరీక్ష విశ్లేషణ వేదిక · తెలుగు & ఇంగ్లీష్'}
              </div>
              <h1 className={`${THEME.typography.heroTitle} ${tokens.textPrimary}`}>
                {language === 'en'
                  ? 'Translate any blood test report into plain clinical notes.'
                  : 'మీ రక్త పరీక్ష రిపోర్ట్‌ను సులభమైన భాషలో అర్థం చేసుకోండి.'}
              </h1>
              <p className={`${THEME.typography.bodyLarge} ${tokens.textSecondary}`}>
                {language === 'en'
                  ? 'Photograph your printed diagnostic sheet directly with your camera or choose a PDF / image from your device.'
                  : 'మీ రిపోర్ట్ పేపర్‌ను నేరుగా కెమెరాతో ఫోటో తీయండి లేదా మీ ఫోన్/కంప్యూటర్ నుండి ఫైల్/PDF ఎంచుకోండి.'}
              </p>
            </div>

            <Card variant="elevated" themeMode={themeMode} padding="lg" className="space-y-6">
              <div className={`flex flex-wrap items-center justify-between gap-2 pb-4 border-b ${tokens.divider}`}>
                <div>
                  <h2 className={`font-display text-lg sm:text-xl font-semibold ${tokens.textPrimary}`}>
                    {language === 'en'
                      ? 'Submit Laboratory Report'
                      : 'రక్త పరీక్ష రిపోర్ట్‌ను అందించండి'}
                  </h2>
                  <p className={`text-xs sm:text-sm ${tokens.textSecondary}`}>
                    {language === 'en'
                      ? 'Reads CBC · HbA1c & Fasting Glucose · Lipid Profile · Renal & Liver Function'
                      : 'CBC · షుగర్ (HbA1c) · కొలెస్ట్రాల్ · కిడ్నీ & లివర్ పరీక్షలను చదువుతుంది'}
                  </p>
                </div>
                <span className={`font-mono text-xs ${tokens.textMuted}`}>
                  PDF · JPG · PNG · Camera
                </span>
              </div>

              {reportCameraError && (
                <div className={`p-4 rounded-xl text-sm font-medium ${tokens.warningBanner}`}>
                  {reportCameraError}
                </div>
              )}

              {/* Live Camera Viewfinder for Blood Test Report */}
              {isReportCameraOpen && (
                <div className={`p-5 rounded-2xl space-y-4 ${tokens.insetBox}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 font-display font-semibold text-base sm:text-lg">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse" />
                      <span>
                        {language === 'en'
                          ? 'Align printed lab report inside the viewfinder'
                          : 'కెమెరాను మీ రక్త పరీక్ష రిపోర్ట్ పేపర్‌పై ఉంచండి'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={stopReportCameraStream}
                      className={`p-2 rounded-lg cursor-pointer ${tokens.secondaryPillBtn}`}
                      aria-label="Close Report Camera"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-[400px] mx-auto flex items-center justify-center border border-current/20">
                    <video
                      ref={reportVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {/* Subtle Editorial Corner Framing Guides */}
                    <div className="pointer-events-none absolute inset-5 border border-white/50 rounded-lg flex items-end justify-center pb-3">
                      <span className="px-3 py-1 rounded-md bg-black/65 text-white text-xs font-mono">
                        {language === 'en'
                          ? 'Ensure test names and numbers are clearly visible'
                          : 'పరీక్ష పేర్లు మరియు అంకెలు స్పష్టంగా కనిపించేలా ఉంచండి'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button
                      variant="massivePrimary"
                      themeMode={themeMode}
                      onClick={handleCaptureReportFromVideo}
                      icon={<Camera className="w-5 h-5" />}
                    >
                      {language === 'en'
                        ? 'Capture & Read Report'
                        : 'ఫోటో తీసి రిపోర్ట్‌ను విశ్లేషించండి'}
                    </Button>

                    <Button
                      variant="massiveSecondary"
                      themeMode={themeMode}
                      onClick={() => {
                        stopReportCameraStream();
                        reportInputRef.current?.click();
                      }}
                      icon={<Upload className="w-5 h-5" />}
                    >
                      {language === 'en'
                        ? 'Or Browse File / PDF'
                        : 'లేదా ఫైల్ / PDF ఎంచుకోండి'}
                    </Button>
                  </div>
                </div>
              )}

              {!isReportCameraOpen && (
                <div className="space-y-4">
                  {/* Two Dedicated Intake Cards: Camera Capture vs File/PDF Explorer */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={startReportCamera}
                      aria-label="Upload Blood Report Through Camera"
                      className={`group text-left p-5 rounded-2xl transition-all cursor-pointer flex flex-col justify-between gap-5 ${tokens.insetBox} hover:border-current/40`}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center ${tokens.stepBadge}`}
                        >
                          <Camera className="w-5 h-5" />
                        </div>
                        <span className={`font-mono text-xs ${tokens.brandAccentText}`}>
                          {language === 'en' ? 'Live Camera' : 'కెమెరా స్కాన్'}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className={`font-display font-semibold text-lg flex items-center justify-between ${tokens.textPrimary}`}>
                          <span>
                            {language === 'en'
                              ? 'Upload Report Through Camera'
                              : 'కెమెరాతో రిపోర్ట్ ఫోటో తీయండి'}
                          </span>
                          <ArrowUpRight className="w-4 h-4 opacity-60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </div>
                        <p className={`text-xs sm:text-sm leading-relaxed ${tokens.textSecondary}`}>
                          {language === 'en'
                            ? 'Use your phone or laptop camera to photograph a physical lab report page.'
                            : 'మీ వద్ద ఉన్న ప్రింటెడ్ రిపోర్ట్ పేపర్‌ను నేరుగా కెమెరాతో ఫోటో తీయండి.'}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => reportInputRef.current?.click()}
                      aria-label="Browse Blood Test Report from File Explorer"
                      className={`group text-left p-5 rounded-2xl transition-all cursor-pointer flex flex-col justify-between gap-5 ${tokens.insetBox} hover:border-current/40`}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center ${tokens.stepBadge}`}
                        >
                          <Upload className="w-5 h-5" />
                        </div>
                        <span className={`font-mono text-xs ${tokens.brandAccentText}`}>
                          {language === 'en' ? 'PDF / Image' : 'ఫైల్ / PDF'}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className={`font-display font-semibold text-lg flex items-center justify-between ${tokens.textPrimary}`}>
                          <span>
                            {language === 'en'
                              ? 'Browse Report File / PDF'
                              : 'ఫైల్ / PDF రిపోర్ట్ అప్‌లోడ్ చేయండి'}
                          </span>
                          <ArrowUpRight className="w-4 h-4 opacity-60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </div>
                        <p className={`text-xs sm:text-sm leading-relaxed ${tokens.textSecondary}`}>
                          {language === 'en'
                            ? 'Select a digital diagnostic PDF or saved image from your device files.'
                            : 'మీ ఫోన్ లేదా కంప్యూటర్‌లో ఉన్న PDF లేదా ఫోటో రిపోర్ట్‌ను ఎంచుకోండి.'}
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Secondary Meal Plate Companion Strip */}
                  <div
                    className={`p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${tokens.insetBox}`}
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tokens.glassCard} ${tokens.brandAccentText}`}
                      >
                        <Utensils className="w-5 h-5" />
                      </div>
                      <div>
                        <div className={`font-display font-semibold text-base ${tokens.textPrimary}`}>
                          {language === 'en'
                            ? 'Checking a meal instead of a blood report?'
                            : 'మీ భోజనం ప్లేట్‌లోని పోషకాలను తెలుసుకోవాలా?'}
                        </div>
                        <p className={`text-xs sm:text-sm ${tokens.textSecondary}`}>
                          {language === 'en'
                            ? 'Scan your plate with the camera or search 255 Indian dishes for glycemic & macro guidance.'
                            : 'కెమెరాతో మీ భోజనాన్ని స్కాన్ చేయండి లేదా 255 భారతీయ వంటకాల వివరాలను చూడండి.'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowPlateScanner(true)}
                      className={`px-4 py-2.5 rounded-xl font-sans font-semibold text-xs sm:text-sm whitespace-nowrap cursor-pointer transition-all ${tokens.secondaryPillBtn}`}
                    >
                      {language === 'en' ? 'Open Plate Studio' : 'అనలైజ్ మై ప్లేట్ తెరవండి'}
                    </button>
                  </div>
                </div>
              )}

              {/* Sample Clinical Reports Footer Bar */}
              <div className={`pt-4 border-t ${tokens.divider} flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm`}>
                <span className={tokens.textSecondary}>
                  {language === 'en'
                    ? 'Want to explore with a sample diagnostic sheet?'
                    : 'నమూనా రిపోర్ట్‌తో పరీక్షించాలనుకుంటున్నారా?'}
                </span>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleAnalyzeAttachedPdf}
                    className={`inline-flex items-center gap-1.5 font-semibold cursor-pointer ${tokens.brandAccentText} hover:underline underline-offset-4`}
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>
                      {language === 'en'
                        ? 'NovaCare 16-Biomarker PDF'
                        : 'NovaCare నమూనా PDF'}
                    </span>
                  </button>
                  <span className={tokens.textMuted}>·</span>
                  <button
                    type="button"
                    onClick={() => setIsSampleModalOpen(true)}
                    className={`inline-flex items-center gap-1.5 font-semibold cursor-pointer ${tokens.brandAccentText} hover:underline underline-offset-4`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>
                      {language === 'en'
                        ? 'Clinical Scenarios'
                        : 'మరిన్ని నమూనా రిపోర్ట్‌లు'}
                    </span>
                  </button>
                </div>
              </div>
            </Card>
          </div>

          {/* Right 5 Columns: Clinical Ledger & Saved Patient History */}
          <div className="lg:col-span-5 space-y-6">
            {/* Saved Patient Journal Card */}
            <Card variant="glass" themeMode={themeMode} padding="md" className="space-y-4">
              <div className={`flex items-center justify-between pb-3 border-b ${tokens.divider}`}>
                <div>
                  <h2 className={`font-display text-lg font-semibold ${tokens.textPrimary}`}>
                    {language === 'en'
                      ? 'Patient Health Journal'
                      : 'నా ఆరోగ్య జర్నల్'}
                  </h2>
                  <p className={`text-xs ${tokens.textSecondary}`}>
                    {language === 'en'
                      ? 'Recent blood evaluations & meal plate logs'
                      : 'ఇటీవలి రక్త పరీక్షలు & భోజనం స్కాన్‌లు'}
                  </p>
                </div>
                <span className={`font-mono text-xs ${tokens.textMuted}`}>
                  {savedReports.length + savedPlateScans.length}{' '}
                  {language === 'en' ? 'entries' : 'రికార్డులు'}
                </span>
              </div>

              {savedReports.length === 0 && savedPlateScans.length === 0 ? (
                <div className={`p-5 rounded-xl text-left space-y-2 ${tokens.insetBox}`}>
                  <div className={`font-display font-medium text-sm ${tokens.textPrimary}`}>
                    {language === 'en'
                      ? 'No archived consultations yet'
                      : 'ఇంకా సేవ్ చేసిన రిపోర్ట్‌లు లేవు'}
                  </div>
                  <p className={`text-xs leading-relaxed ${tokens.textSecondary}`}>
                    {language === 'en'
                      ? 'When you analyze a blood report or scan a meal plate, a summary is automatically recorded here for longitudinal reference.'
                      : 'మీరు రక్త పరీక్ష రిపోర్ట్ లేదా భోజనం ప్లేట్‌ను విశ్లేషించినప్పుడు, ఆ వివరాలు ఇక్కడ స్వయంచాలకంగా భద్రపరచబడతాయి.'}
                  </p>
                </div>
              ) : (
                <div className={`divide-y ${tokens.divider} max-h-[380px] overflow-y-auto pr-1`}>
                  {savedReports.slice(0, 4).map((rep) => (
                    <div
                      key={rep.id}
                      className="py-3.5 first:pt-1 last:pb-1 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className={`font-display font-semibold text-sm sm:text-base ${tokens.textPrimary}`}>
                            {rep.patientName}
                          </span>
                          <span className={`text-xs ${tokens.textMuted}`}>
                            · {rep.labName}
                          </span>
                        </div>
                        <p className={`text-xs line-clamp-2 ${tokens.textSecondary}`}>
                          {language === 'en' ? rep.keyFindingsEn : rep.keyFindingsTe}
                        </p>
                        <div className={`font-mono text-[11px] ${tokens.textMuted}`}>
                          {rep.reportDate} · {rep.totalTestsCount} biomarkers ·{' '}
                          <span className={tokens.brandAccentText}>
                            Index {rep.overallWellnessScore}%
                          </span>
                        </div>
                      </div>

                      {onDeleteReport && (
                        <button
                          type="button"
                          onClick={() => onDeleteReport(rep.id)}
                          className={`p-1.5 rounded-lg opacity-60 hover:opacity-100 transition-opacity cursor-pointer shrink-0 ${tokens.textSecondary}`}
                          aria-label="Delete saved report"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  {savedPlateScans.slice(0, 4).map((pl) => (
                    <div
                      key={pl.id}
                      className="py-3.5 first:pt-1 last:pb-1 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className={`font-display font-semibold text-sm ${tokens.textPrimary}`}>
                            {language === 'en' ? pl.verdictTitleEn : pl.verdictTitleTe}
                          </span>
                        </div>
                        <p className={`text-xs line-clamp-1 ${tokens.textSecondary}`}>
                          {pl.dishesSummaryEn}
                        </p>
                        <div className={`font-mono text-[11px] ${tokens.textMuted}`}>
                          {pl.totalCalories} kcal · GI {pl.avgGlycemicIndex} · Plate Score{' '}
                          {pl.plateScore}/100
                        </div>
                      </div>

                      {onDeletePlateScan && (
                        <button
                          type="button"
                          onClick={() => onDeletePlateScan(pl.id)}
                          className={`p-1.5 rounded-lg opacity-60 hover:opacity-100 transition-opacity cursor-pointer shrink-0 ${tokens.textSecondary}`}
                          aria-label="Delete saved plate scan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Reference Biomarker Coverage Card */}
            <Card variant="glass" themeMode={themeMode} padding="md" className="space-y-3">
              <div className={`text-xs font-mono uppercase tracking-wider ${tokens.brandAccentText}`}>
                {language === 'en' ? 'Reference Panels Supported' : 'మద్దతు ఉన్న ల్యాబ్ పరీక్షలు'}
              </div>
              <div className={`divide-y ${tokens.divider} text-xs sm:text-sm`}>
                <div className="py-2 flex items-baseline justify-between gap-2">
                  <span className={`font-medium ${tokens.textPrimary}`}>
                    {language === 'en' ? 'Glycemic & Metabolic' : 'షుగర్ & మెటబాలిక్'}
                  </span>
                  <span className={`font-mono text-xs ${tokens.textSecondary}`}>
                    FBS · PPBS · HbA1c
                  </span>
                </div>
                <div className="py-2 flex items-baseline justify-between gap-2">
                  <span className={`font-medium ${tokens.textPrimary}`}>
                    {language === 'en' ? 'Lipid & Cardiovascular' : 'లిపిడ్ ప్రొఫైల్'}
                  </span>
                  <span className={`font-mono text-xs ${tokens.textSecondary}`}>
                    Total Chol · Triglycerides · HDL · LDL
                  </span>
                </div>
                <div className="py-2 flex items-baseline justify-between gap-2">
                  <span className={`font-medium ${tokens.textPrimary}`}>
                    {language === 'en' ? 'Hematology (Complete Blood Count)' : 'హిమటాలజీ (CBC)'}
                  </span>
                  <span className={`font-mono text-xs ${tokens.textSecondary}`}>
                    Hemoglobin · RBC · WBC · Platelets
                  </span>
                </div>
                <div className="py-2 flex items-baseline justify-between gap-2">
                  <span className={`font-medium ${tokens.textPrimary}`}>
                    {language === 'en' ? 'Renal, Hepatic & Thyroid' : 'కిడ్నీ, లివర్ & థైరాయిడ్'}
                  </span>
                  <span className={`font-mono text-xs ${tokens.textSecondary}`}>
                    Creatinine · Urea · SGOT · SGPT · TSH
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Modal for Sample Multi-Test Blood Report Scenarios */}
      <Modal
        isOpen={isSampleModalOpen}
        onClose={() => setIsSampleModalOpen(false)}
        themeMode={themeMode}
        title={
          language === 'en'
            ? 'Sample Clinical Blood Reports'
            : 'నమూనా రక్త పరీక్ష రిపోర్ట్‌లు'
        }
      >
        <div className="space-y-3">
          <p className={`text-sm sm:text-base leading-relaxed ${tokens.textSecondary}`}>
            {language === 'en'
              ? 'Select a pre-loaded diagnostic sheet to inspect how BloodBite interprets normal and out-of-range biomarkers:'
              : 'బ్లడ్‌బైట్ (BloodBite) రిపోర్ట్‌లను ఎలా వివరిస్తుందో చూడటానికి క్రింది నమూనా రిపోర్ట్‌లలో ఒకదానిని ఎంచుకోండి:'}
          </p>

          <button
            type="button"
            onClick={handleAnalyzeAttachedPdf}
            className={`w-full text-left p-4 rounded-xl transition-all cursor-pointer space-y-1 ${tokens.insetBox} hover:border-current/40`}
          >
            <div
              className={`flex items-center justify-between font-display font-semibold text-base sm:text-lg ${tokens.textPrimary}`}
            >
              <span>
                {language === 'en'
                  ? 'NovaCare Diagnostics PDF (16 Biomarkers)'
                  : 'NovaCare Diagnostics PDF (మొత్తం 16 పరీక్షలు)'}
              </span>
              <ArrowUpRight className={`w-4 h-4 shrink-0 ${tokens.brandAccentText}`} />
            </div>
            <p className={`text-xs sm:text-sm ${tokens.textSecondary}`}>
              {language === 'en'
                ? 'Patient: John Doe (35 Yrs / Male) · CBC (5) · Diabetology (2) · Lipid Profile (4) · Renal & Hepatic (5)'
                : 'John Doe (35 Yrs / Male) · CBC (5) · షుగర్ (2) · లిపిడ్ (4) · లివర్ & కిడ్నీ (5)'}
            </p>
          </button>

          {Object.values(SAMPLE_LAB_PRESETS).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleRunSamplePreset(preset.id)}
              className={`w-full text-left p-4 rounded-xl transition-all cursor-pointer space-y-1 ${tokens.insetBox} hover:border-current/40`}
            >
              <div
                className={`flex items-center justify-between font-display font-semibold text-base sm:text-lg ${tokens.textPrimary}`}
              >
                <span>{language === 'en' ? preset.titleEn : preset.titleTe}</span>
                <ArrowUpRight className={`w-4 h-4 shrink-0 ${tokens.brandAccentText}`} />
              </div>
              <p className={`text-xs sm:text-sm ${tokens.textSecondary}`}>
                {language === 'en' ? preset.subtitleEn : preset.subtitleTe}
              </p>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
};
