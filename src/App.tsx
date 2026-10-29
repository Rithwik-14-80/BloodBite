/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { UploadWidget } from '../components/features/UploadWidget';
import { DynamicResultsDashboard } from '../components/features/DynamicResultsDashboard';
import { AuthGate } from '../components/features/AuthGate';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { MedicalLogo } from '../components/ui/MedicalLogo';
import { ThemeProvider, useAppTheme } from '../components/ui/ThemeToggle';
import {
  UploadedReportFile,
  ReportAnalysisResult,
  AnalyzeApiError,
  analyzeReportsRequest,
} from '../services/reportClient';
import {
  auth,
  onAuthStateChanged,
  User,
  ensureUserProfileInFirestore,
  saveBloodReportToFirestore,
  subscribeToUserReports,
  subscribeToUserPlateScans,
  deleteSavedBloodReport,
  deleteSavedPlateScan,
  signOutCurrentUser,
  SavedBloodReportRecord,
  SavedPlateScanRecord,
} from '../services/firebase';
import { THEME, getThemeTokens } from '../utils/styling.js';

function AnalyzerContent() {
  const { themeMode, setThemeMode, language, setLanguage } = useAppTheme();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [analysisResult, setAnalysisResult] = useState<ReportAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState<AnalyzeApiError | null>(null);

  const [savedReports, setSavedReports] = useState<SavedBloodReportRecord[]>([]);
  const [savedPlateScans, setSavedPlateScans] = useState<SavedPlateScanRecord[]>([]);

  const tokens = getThemeTokens(themeMode);

  // Track Firebase Authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthReady(true);
      if (!user) {
        setAnalysisResult(null);
        setSavedReports([]);
        setSavedPlateScans([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Attach Firestore real-time listeners once authenticated
  useEffect(() => {
    if (!isAuthReady || !currentUser) return;

    let unsubReports: (() => void) | null = null;
    let unsubPlates: (() => void) | null = null;

    ensureUserProfileInFirestore(currentUser, language, themeMode)
      .then(() => {
        unsubReports = subscribeToUserReports(currentUser.uid, setSavedReports);
        unsubPlates = subscribeToUserPlateScans(currentUser.uid, setSavedPlateScans);
      })
      .catch(() => {});

    return () => {
      if (unsubReports) unsubReports();
      if (unsubPlates) unsubPlates();
    };
  }, [isAuthReady, currentUser?.uid]);

  // Keep preferredLanguage and preferredTheme synced in Firestore /users/{userId}
  useEffect(() => {
    if (!isAuthReady || !currentUser) return;
    ensureUserProfileInFirestore(currentUser, language, themeMode).catch(() => {});
  }, [language, themeMode]);

  const handleStartAnalysis = async (todayReport: UploadedReportFile) => {
    setErrorState(null);
    setIsLoading(true);

    const response = await analyzeReportsRequest({
      todayReport,
    });

    setIsLoading(false);

    if (response.ok === false) {
      setErrorState(response.error);
      return;
    }

    setAnalysisResult(response.data);
    if (currentUser) {
      saveBloodReportToFirestore(currentUser, response.data).catch(() => {});
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setErrorState(null);
  };

  const handleSignOut = async () => {
    await signOutCurrentUser();
    setAnalysisResult(null);
    setErrorState(null);
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!currentUser) return;
    await deleteSavedBloodReport(currentUser.uid, reportId).catch(() => {});
  };

  const handleDeletePlateScan = async (plateId: string) => {
    if (!currentUser) return;
    await deleteSavedPlateScan(currentUser.uid, plateId).catch(() => {});
  };

  return (
    <div className={tokens.pageBg}>
      <main className={THEME.canvas.container}>
        {!isAuthReady ? (
          <div className="min-h-[82vh] flex flex-col items-center justify-center gap-5">
            <MedicalLogo themeMode={themeMode} language={language} size="lg" />
            <div
              className={`w-8 h-8 rounded-full border-2 border-t-transparent animate-spin ${tokens.brandAccentText}`}
            />
          </div>
        ) : !currentUser ? (
          <AuthGate
            themeMode={themeMode}
            onThemeChange={setThemeMode}
            language={language}
            onToggleLanguage={setLanguage}
          />
        ) : analysisResult ? (
          <DynamicResultsDashboard
            result={analysisResult}
            themeMode={themeMode}
            onThemeChange={setThemeMode}
            language={language}
            onToggleLanguage={setLanguage}
            onReset={handleReset}
          />
        ) : (
          <UploadWidget
            themeMode={themeMode}
            onThemeChange={setThemeMode}
            language={language}
            onToggleLanguage={setLanguage}
            onStartAnalysis={handleStartAnalysis}
            isLoading={isLoading}
            user={currentUser}
            onSignOut={handleSignOut}
            savedReports={savedReports}
            savedPlateScans={savedPlateScans}
            onDeleteReport={handleDeleteReport}
            onDeletePlateScan={handleDeletePlateScan}
          />
        )}
      </main>

      {/* Graceful Error Modal when an Image is Unreadable or Blurry */}
      <Modal
        isOpen={Boolean(errorState)}
        onClose={() => setErrorState(null)}
        themeMode={themeMode}
        title={
          language === 'en'
            ? 'Please capture a clearer image'
            : 'దయచేసి స్పష్టమైన ఫోటో తీయండి'
        }
      >
        {errorState && (
          <div className="space-y-5">
            <div className={`p-4 rounded-xl space-y-2 ${tokens.warningBanner}`}>
              <p className={`text-base font-semibold leading-relaxed ${tokens.textPrimary}`}>
                {language === 'en' ? errorState.messageEn : errorState.messageTe}
              </p>
              <p className={`text-sm ${tokens.textSecondary}`}>
                {language === 'en'
                  ? 'Place the diagnostic sheet flat on a well-lit surface and ensure test names and values are in focus.'
                  : 'రిపోర్ట్ పేపర్‌ను మంచి వెలుతురులో టేబుల్‌పై ఉంచి, ఫోన్ కదలకుండా ఫోటో తీయండి.'}
              </p>
            </div>

            <Button
              variant="massivePrimary"
              themeMode={themeMode}
              icon={<Camera className="w-5 h-5" />}
              onClick={() => setErrorState(null)}
            >
              {language === 'en' ? 'Try Again' : 'మళ్ళీ ఫోటో తీయండి'}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AnalyzerContent />
    </ThemeProvider>
  );
}
