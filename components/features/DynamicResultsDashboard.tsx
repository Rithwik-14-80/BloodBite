import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  RotateCcw,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Volume2,
  Square,
  Share2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { MedicalLogo, ThemeMode } from '../ui/MedicalLogo';
import { ThemeToggle } from '../ui/ThemeToggle';
import { DietPlan } from './DietPlan';
import {
  ExtractedBloodTestItem,
  ReportAnalysisResult,
  fetchSpokenAudioBase64,
} from '../../services/reportClient';
import { THEME, getThemeTokens } from '../../utils/styling.js';

export interface DynamicResultsDashboardProps {
  result: ReportAnalysisResult;
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  language: 'en' | 'te';
  onToggleLanguage: (lang: 'en' | 'te') => void;
  onReset: () => void;
}

export const DynamicResultsDashboard: React.FC<DynamicResultsDashboardProps> = ({
  result,
  themeMode,
  onThemeChange,
  language,
  onToggleLanguage,
  onReset,
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  const [isAllGoodExpanded, setIsAllGoodExpanded] = useState(
    () => result.needsAttention.length === 0
  );
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const tokens = getThemeTokens(themeMode);

  // Group normal tests by clinical category
  const groupedNormalTests = useMemo(() => {
    const groups: Record<
      string,
      { titleEn: string; titleTe: string; items: ExtractedBloodTestItem[] }
    > = {};
    result.allGood.forEach((item) => {
      const key = item.category || 'General Panel';
      if (!groups[key]) {
        groups[key] = {
          titleEn: item.category || 'General Panel',
          titleTe: item.category_te || item.category || 'సాధారణ పరీక్షలు',
          items: [],
        };
      }
      groups[key].items.push(item);
    });
    return Object.values(groups);
  }, [result.allGood]);

  const stopAllSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      audioElementRef.current = null;
    }
    setIsSpeaking(false);
    setIsGeneratingAudio(false);
  };

  useEffect(() => {
    return () => {
      stopAllSpeech();
    };
  }, []);

  const handleLanguageSwitch = (newLang: 'en' | 'te') => {
    stopAllSpeech();
    onToggleLanguage(newLang);
  };

  const handleListenToggle = async () => {
    if (isSpeaking || isGeneratingAudio) {
      stopAllSpeech();
      return;
    }

    const textToRead =
      language === 'en' ? result.spokenSummary.en : result.spokenSummary.te;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const voices = window.speechSynthesis.getVoices();
      const targetLangPrefix = language === 'te' ? 'te' : 'en';
      const matchingVoice =
        voices.find(
          (v) =>
            v.lang.toLowerCase().startsWith(targetLangPrefix) &&
            v.lang.toLowerCase().includes('in')
        ) || voices.find((v) => v.lang.toLowerCase().startsWith(targetLangPrefix));

      if (language === 'en' || matchingVoice) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = language === 'te' ? 'te-IN' : 'en-IN';
        utterance.rate = 0.92;
        utterance.pitch = 1.0;
        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
        return;
      }
    }

    setIsGeneratingAudio(true);
    const base64Wav = await fetchSpokenAudioBase64(textToRead, language);
    setIsGeneratingAudio(false);

    if (base64Wav) {
      const audio = new Audio(`data:audio/wav;base64,${base64Wav}`);
      audioElementRef.current = audio;
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      audio.play().catch(() => setIsSpeaking(false));
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = language === 'te' ? 'te-IN' : 'en-IN';
      utterance.rate = 0.92;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const whatsappText =
    language === 'en' ? result.whatsappText.en : result.whatsappText.te;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(whatsappText);
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 2500);
    } catch {
      // Ignore clipboard error
    }
  };

  const attentionCount = result.needsAttention.length;
  const normalCount = result.allGood.length;
  const totalCount = result.extracted_results.length;
  const meta = result.reportMetadata;

  return (
    <div className="space-y-8 pb-12">
      {/* Clean Editorial Top Navigation & Action Bar */}
      <header className={`px-5 py-4 rounded-2xl space-y-4 ${tokens.headerBar}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <MedicalLogo themeMode={themeMode} language={language} size="md" />
          <ThemeToggle
            themeMode={themeMode}
            onThemeChange={onThemeChange}
            language={language}
            onLanguageChange={handleLanguageSwitch}
          />
        </div>

        <div
          className={`pt-3.5 border-t ${tokens.divider} flex flex-wrap items-center justify-between gap-3`}
        >
          <Button
            variant="secondaryPill"
            themeMode={themeMode}
            onClick={() => {
              stopAllSpeech();
              onReset();
            }}
            icon={<RotateCcw className="w-4 h-4" />}
          >
            {language === 'en'
              ? 'Analyze Another Report'
              : 'మరో రిపోర్ట్ విశ్లేషించండి'}
          </Button>

          {/* Spoken Audio Readout Control */}
          <Button
            variant={isSpeaking || isGeneratingAudio ? 'actionVoiceActive' : 'actionVoice'}
            themeMode={themeMode}
            onClick={handleListenToggle}
            aria-live="polite"
            icon={
              isSpeaking ? (
                <Square className="w-4 h-4 fill-current" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )
            }
          >
            <span>
              {isGeneratingAudio
                ? language === 'en'
                  ? 'Preparing spoken summary...'
                  : 'వాయిస్ సిద్ధమవుతోంది...'
                : isSpeaking
                ? language === 'en'
                  ? 'Stop Spoken Readout'
                  : 'చదవడం ఆపండి'
                : language === 'en'
                ? 'Listen to Report Summary'
                : 'రిపోర్ట్ ఫలితాలు వినండి'}
            </span>
          </Button>
        </div>
      </header>

      {/* Clinical Dossier Header: Patient & Specimen Particulars */}
      <Card variant="elevated" themeMode={themeMode} padding="md" className="space-y-4">
        <div className={`flex flex-wrap items-baseline justify-between gap-3 pb-3 border-b ${tokens.divider}`}>
          <div>
            <div className={`text-xs font-mono uppercase tracking-widest ${tokens.brandAccentText}`}>
              {language === 'en' ? 'Diagnostic Case Sheet' : 'రక్త పరీక్ష నివేదిక'}
            </div>
            <h1 className={`font-display text-xl sm:text-2xl font-semibold mt-0.5 ${tokens.textPrimary}`}>
              {meta?.lab_name ||
                (language === 'en' ? 'Laboratory Biomarker Evaluation' : 'ల్యాబ్ పరీక్ష ఫలితాలు')}
            </h1>
          </div>

          <div className={`font-mono text-xs sm:text-sm ${tokens.textSecondary}`}>
            {meta?.lab_id ? `ID ${meta.lab_id} · ` : ''}
            <span className={`font-semibold ${tokens.brandAccentText}`}>
              {language === 'en'
                ? `${totalCount} Biomarkers Evaluated`
                : `మొత్తం ${totalCount} పరీక్షలు`}
            </span>
          </div>
        </div>

        {meta && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-1 text-left">
            {meta.patient_name && (
              <div>
                <div className={`text-[11px] font-mono uppercase tracking-wider ${tokens.textMuted}`}>
                  {language === 'en' ? 'Patient' : 'రోగి పేరు'}
                </div>
                <div className={`font-sans font-semibold text-sm sm:text-base mt-0.5 ${tokens.textPrimary}`}>
                  {meta.patient_name}
                </div>
              </div>
            )}
            {meta.age_gender && (
              <div>
                <div className={`text-[11px] font-mono uppercase tracking-wider ${tokens.textMuted}`}>
                  {language === 'en' ? 'Age / Sex' : 'వయస్సు / లింగం'}
                </div>
                <div className={`font-sans font-semibold text-sm sm:text-base mt-0.5 ${tokens.textPrimary}`}>
                  {meta.age_gender}
                </div>
              </div>
            )}
            {meta.referring_physician && (
              <div>
                <div className={`text-[11px] font-mono uppercase tracking-wider ${tokens.textMuted}`}>
                  {language === 'en' ? 'Referred By' : 'డాక్టర్'}
                </div>
                <div className={`font-sans font-semibold text-sm sm:text-base mt-0.5 ${tokens.textPrimary}`}>
                  {meta.referring_physician}
                </div>
              </div>
            )}
            {meta.sample_collected && (
              <div>
                <div className={`text-[11px] font-mono uppercase tracking-wider ${tokens.textMuted}`}>
                  {language === 'en' ? 'Collected' : 'తేదీ'}
                </div>
                <div className={`font-mono text-xs sm:text-sm mt-0.5 ${tokens.textPrimary}`}>
                  {meta.sample_collected}
                </div>
              </div>
            )}
            {meta.barcode_no && (
              <div>
                <div className={`text-[11px] font-mono uppercase tracking-wider ${tokens.textMuted}`}>
                  {language === 'en' ? 'Specimen Ref' : 'రిఫరెన్స్'}
                </div>
                <div className={`font-mono text-xs sm:text-sm mt-0.5 ${tokens.textPrimary}`}>
                  {meta.barcode_no}
                </div>
              </div>
            )}
            {meta.fasting_status && (
              <div>
                <div className={`text-[11px] font-mono uppercase tracking-wider ${tokens.textMuted}`}>
                  {language === 'en' ? 'Specimen State' : 'ఉపవాస స్థితి'}
                </div>
                <div className={`font-sans font-semibold text-sm sm:text-base mt-0.5 ${tokens.textPrimary}`}>
                  {meta.fasting_status}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ====================================================================
          SECTION 1: Out-of-Range Clinical Findings ("Needs Attention")
         ==================================================================== */}
      <section aria-labelledby="needs-attention-heading">
        <div className={`p-6 sm:p-8 rounded-2xl ${tokens.attentionSectionBg}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-current/10 mb-6">
            <div className="flex items-start sm:items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  attentionCount > 0 ? tokens.dangerBanner : tokens.SafeBanner
                }`}
              >
                {attentionCount > 0 ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="text-xs font-mono uppercase tracking-widest opacity-75">
                  {language === 'en'
                    ? 'Primary Clinical Review'
                    : 'ప్రధాన రక్త పరీక్ష సమీక్ష'}
                </div>
                <h2
                  id="needs-attention-heading"
                  className={THEME.typography.sectionTitle}
                >
                  {language === 'en'
                    ? `Out-of-Range Biomarkers (${attentionCount})`
                    : `పరిమితి దాటిన పరీక్షలు (${attentionCount})`}
                </h2>
              </div>
            </div>

            <div className="font-mono text-xs sm:text-sm opacity-80">
              {attentionCount > 0
                ? language === 'en'
                  ? `${attentionCount} of ${totalCount} markers outside reference interval`
                  : `${totalCount} లో ${attentionCount} పరీక్షలు సాధారణ పరిమితి బయట ఉన్నాయి`
                : language === 'en'
                ? `0 of ${totalCount} markers out of range`
                : `అన్ని పరీక్షలు సాధారణ పరిమితిలో ఉన్నాయి`}
            </div>
          </div>

          {attentionCount === 0 ? (
            <div className={`p-6 rounded-xl text-left sm:flex items-center justify-between gap-6 ${tokens.SafeBanner}`}>
              <div className="space-y-1">
                <h3 className="font-display text-xl font-semibold">
                  {language === 'en'
                    ? `All ${totalCount} evaluated biomarkers are within their reference intervals.`
                    : `మొత్తం ${totalCount} రక్త పరీక్షలు సాధారణ ఆరోగ్య పరిమితిలో ఉన్నాయి.`}
                </h3>
                <p className="text-sm sm:text-base opacity-85">
                  {language === 'en'
                    ? 'Review the complete categorized laboratory ledger directly below.'
                    : 'క్రింది విభాగంలో అన్ని పరీక్షల పూర్తి వివరాలను చూడండి.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {result.needsAttention.map((test, idx) => {
                const isHigh = test.status === 'High';
                const cardStyle = isHigh
                  ? tokens.attentionCardHigh
                  : tokens.attentionCardLow;

                const indicatorStyle = isHigh
                  ? tokens.dangerBanner
                  : tokens.warningBanner;

                return (
                  <div
                    key={idx}
                    className={`p-5 sm:p-6 rounded-xl transition-all ${cardStyle}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      {/* Left: Custom SVG Direction Emblem + Test Name + Explanation */}
                      <div className="flex items-start gap-4 flex-1">
                        <div
                          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex flex-col items-center justify-center shrink-0 ${indicatorStyle}`}
                          aria-label={isHigh ? 'Above reference range' : 'Below reference range'}
                        >
                          {isHigh ? (
                            <ArrowUpRight className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.25]" />
                          ) : (
                            <ArrowDownRight className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.25]" />
                          )}
                          <span className="font-mono font-semibold text-[10px] uppercase tracking-wider mt-0.5">
                            {isHigh
                              ? language === 'en'
                                ? 'High'
                                : 'ఎక్కువ'
                              : language === 'en'
                              ? 'Low'
                              : 'తక్కువ'}
                          </span>
                        </div>

                        <div className="space-y-1.5 flex-1">
                          <div className={`text-xs font-mono ${tokens.textSecondary}`}>
                            <span>{language === 'en' ? test.category : test.category_te}</span>
                            <span className="mx-1.5">·</span>
                            <span className="font-semibold">
                              {isHigh
                                ? language === 'en'
                                  ? 'Above Reference Interval'
                                  : 'సాధారణం కంటే ఎక్కువ'
                                : language === 'en'
                                ? 'Below Reference Interval'
                                : 'సాధారణం కంటే తక్కువ'}
                            </span>
                          </div>

                          <h3 className={`font-display text-xl sm:text-2xl font-semibold ${tokens.textPrimary}`}>
                            {language === 'en' ? test.test_name : test.test_name_te}
                          </h3>

                          <p className={`text-sm sm:text-base leading-relaxed ${tokens.textSecondary}`}>
                            {language === 'en' ? test.explanation_en : test.explanation_te}
                          </p>
                        </div>
                      </div>

                      {/* Right: Tabular Observed Value & Reference Range */}
                      <div
                        className={`p-4 rounded-xl md:min-w-[220px] text-left md:text-right shrink-0 ${tokens.insetBox}`}
                      >
                        <div className={`text-[11px] font-mono uppercase tracking-wider ${tokens.textMuted}`}>
                          {language === 'en' ? 'Observed Value' : 'ఫలితం'}
                        </div>
                        <div className="flex md:justify-end items-baseline gap-1.5 mt-0.5">
                          <span className={`${THEME.typography.metricHuge} ${tokens.textPrimary}`}>
                            {test.value}
                          </span>
                          <span className={`font-mono text-sm font-medium ${tokens.textMuted}`}>
                            {test.unit}
                          </span>
                        </div>
                        {test.reference_range && (
                          <div className={`font-mono text-xs mt-1 tabular-nums ${tokens.textSecondary}`}>
                            {language === 'en'
                              ? `Ref: ${test.reference_range}`
                              : `సాధారణం: ${test.reference_range}`}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ====================================================================
          SECTION 2: Within Reference Range ("Normal Biomarkers")
         ==================================================================== */}
      <section aria-labelledby="all-good-heading">
        <div className={`p-6 sm:p-8 rounded-2xl ${tokens.allGoodSectionBg}`}>
          <button
            type="button"
            onClick={() => setIsAllGoodExpanded((prev) => !prev)}
            aria-expanded={isAllGoodExpanded}
            className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left cursor-pointer"
          >
            <div className="flex items-start sm:items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tokens.SafeBanner}`}
              >
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-mono uppercase tracking-widest opacity-75">
                  {language === 'en' ? 'Reference Interval Ledger' : 'సాధారణ ఫలితాల జాబితా'}
                </div>
                <h2 id="all-good-heading" className={THEME.typography.sectionTitle}>
                  {language === 'en'
                    ? `Within Normal Range (${normalCount})`
                    : `సాధారణ స్థాయిలో ఉన్న పరీక్షలు (${normalCount})`}
                </h2>
              </div>
            </div>

            <div
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-sans font-semibold text-xs sm:text-sm shrink-0 ${tokens.secondaryPillBtn}`}
            >
              <span>
                {isAllGoodExpanded
                  ? language === 'en'
                    ? 'Hide Normal Ledger'
                    : 'జాబితా దాచండి'
                  : language === 'en'
                  ? `View All ${normalCount} Normal Markers`
                  : `${normalCount} సాధారణ పరీక్షలు చూడండి`}
              </span>
              {isAllGoodExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          {/* Categorized Ledger of Normal Biomarkers */}
          {isAllGoodExpanded && normalCount > 0 && (
            <div className="mt-6 pt-6 border-t border-current/15 space-y-6">
              {groupedNormalTests.map((group, gIdx) => (
                <div key={gIdx} className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-display text-lg font-semibold">
                      {language === 'en' ? group.titleEn : group.titleTe}
                    </h3>
                    <span className="font-mono text-xs opacity-75">
                      {language === 'en'
                        ? `${group.items.length} within range`
                        : `${group.items.length} సాధారణం`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.items.map((test, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl flex items-start justify-between gap-4 ${tokens.allGoodRow}`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <h4 className="font-display font-semibold text-base sm:text-lg">
                              {language === 'en' ? test.test_name : test.test_name_te}
                            </h4>
                          </div>
                          <p className="text-xs sm:text-sm opacity-85 leading-relaxed">
                            {language === 'en' ? test.explanation_en : test.explanation_te}
                          </p>
                        </div>

                        <div className="text-right shrink-0 tabular-nums">
                          <div className="font-mono font-semibold text-base sm:text-lg">
                            {test.value}{' '}
                            <span className="text-xs font-normal opacity-75">
                              {test.unit}
                            </span>
                          </div>
                          {test.reference_range && (
                            <div className="font-mono text-[11px] opacity-75 mt-0.5">
                              {language === 'en'
                                ? `Ref: ${test.reference_range}`
                                : `సాధారణం: ${test.reference_range}`}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ====================================================================
          SECTION 3: "Analyze My Plate" — Camera Meal & Diet Scanner
         ==================================================================== */}
      <DietPlan
        mlInsights={result.mlInsights}
        bloodReportResults={result.extracted_results}
        language={language}
        themeMode={themeMode}
      />

      {/* ====================================================================
          SECTION 4: Physician & Family Summary Dispatch (WhatsApp & Copy)
         ==================================================================== */}
      <Card variant="elevated" themeMode={themeMode} padding="lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className={`text-xs font-mono uppercase tracking-widest ${tokens.brandAccentText}`}>
              {language === 'en' ? 'Patient Summary Dispatch' : 'నివేదిక షేరింగ్'}
            </div>
            <h2 className={`font-display text-xl sm:text-2xl font-semibold ${tokens.textPrimary}`}>
              {language === 'en'
                ? 'Share this clinical note with family or your physician'
                : 'ఈ రిపోర్ట్ వివరాలను కుటుంబ సభ్యులకు లేదా డాక్టర్‌కు పంపండి'}
            </h2>
            <p className={`text-sm sm:text-base ${tokens.textSecondary}`}>
              {language === 'en'
                ? 'Generates a structured plain-text summary of out-of-range findings, normal panels, and dietary guidance.'
                : 'మీ రక్త పరీక్షల ఫలితాలను మరియు ఆహార సూచనలను నేరుగా వాట్సాప్‌లో పంపండి.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto shrink-0">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${THEME.buttons.base} ${THEME.buttons.actionWhatsApp} no-underline text-center gap-2.5`}
            >
              <Share2 className="w-4 h-4 shrink-0" />
              <span>
                {language === 'en'
                  ? 'Send via WhatsApp'
                  : 'వాట్సాప్‌లో పంపండి'}
              </span>
            </a>

            <button
              type="button"
              onClick={handleCopyText}
              className={`w-full sm:w-auto min-h-[52px] px-5 py-3 rounded-xl font-sans font-semibold text-sm sm:text-base flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${tokens.secondaryPillBtn}`}
            >
              {copiedWhatsApp ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>{language === 'en' ? 'Summary Copied' : 'కాపీ అయింది'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>{language === 'en' ? 'Copy Summary Text' : 'టెక్స్ట్ కాపీ చేయండి'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};
