import React, { useState } from 'react';
import {
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  UserPlus,
  LogIn,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { MedicalLogo, ThemeMode } from '../ui/MedicalLogo';
import { ThemeToggle } from '../ui/ThemeToggle';
import {
  signInWithGooglePopup,
  signInWithEmailAccount,
  registerWithEmailAccount,
  sendPasswordResetToEmail,
  FIREBASE_PROJECT_ID,
} from '../../services/firebase';
import { THEME, getThemeTokens } from '../../utils/styling.js';

export interface AuthGateProps {
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  language: 'en' | 'te';
  onToggleLanguage: (lang: 'en' | 'te') => void;
}

type AuthTabMode = 'google' | 'email';
type EmailSubMode = 'signin' | 'signup';

/** Custom hand-crafted Google mark */
const GoogleMarkSvg: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M21.8 12.23c0-.72-.06-1.4-.19-2.05H12v3.88h5.5a4.7 4.7 0 0 1-2.04 3.09v2.56h3.3c1.93-1.78 3.04-4.4 3.04-7.48Z"
      fill="currentColor"
      fillOpacity="0.9"
    />
    <path
      d="M12 22c2.76 0 5.07-.91 6.76-2.47l-3.3-2.56c-.91.61-2.08.98-3.46.98-2.66 0-4.92-1.8-5.73-4.22H2.86v2.65A10 10 0 0 0 12 22Z"
      fill="currentColor"
      fillOpacity="0.75"
    />
    <path
      d="M6.27 13.73A6.02 6.02 0 0 1 5.95 12c0-.6.11-1.18.32-1.73V7.62H2.86A10 10 0 0 0 2 12c0 1.61.39 3.14 1.07 4.38l3.2-2.65Z"
      fill="currentColor"
      fillOpacity="0.6"
    />
    <path
      d="M12 6.05c1.5 0 2.85.52 3.91 1.53l2.93-2.93C17.06 2.99 14.76 2 12 2 8.09 2 4.7 4.24 2.86 7.62l3.41 2.65C7.08 7.85 9.34 6.05 12 6.05Z"
      fill="currentColor"
    />
  </svg>
);

export const AuthGate: React.FC<AuthGateProps> = ({
  themeMode,
  onThemeChange,
  language,
  onToggleLanguage,
}) => {
  const [activeTab, setActiveTab] = useState<AuthTabMode>('google');
  const [emailSubMode, setEmailSubMode] = useState<EmailSubMode>('signin');

  // Shared status states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMessage, setAuthSuccessMessage] = useState<string | null>(null);
  const [needsConsoleEnable, setNeedsConsoleEnable] = useState(false);

  // Email & Password states
  const [fullName, setFullName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const tokens = getThemeTokens(themeMode);

  const clearFeedback = () => {
    setAuthError(null);
    setAuthSuccessMessage(null);
    setNeedsConsoleEnable(false);
  };

  const handleTabChange = (tab: AuthTabMode) => {
    setActiveTab(tab);
    clearFeedback();
  };

  const formatFirebaseAuthError = (err: any, method: AuthTabMode) => {
    const code = String(err?.code || '');
    const msg = String(err?.message || '');

    if (
      method === 'email' &&
      (code === 'auth/operation-not-allowed' ||
        code === 'auth/configuration-not-found' ||
        msg.includes('operation-not-allowed'))
    ) {
      setNeedsConsoleEnable(true);
      return language === 'en'
        ? 'Email/Password Sign-In is not enabled in your Firebase project yet. Enable the "Email/Password" provider in your Firebase Console below, or sign in with your Gmail Account.'
        : 'మీ ఫైర్‌బేస్ ప్రాజెక్ట్‌లో ఈమెయిల్/పాస్‌వర్డ్ సైన్-ఇన్ ఇంకా ఆన్ చేయబడలేదు. దయచేసి క్రింది లింక్ ద్వారా Firebase Console లో "Email/Password" ఆన్ చేయండి.';
    }

    switch (code) {
      case 'auth/popup-closed-by-user':
        return language === 'en'
          ? 'The sign-in window was closed before completing. Please try again.'
          : 'సైన్-ఇన్ విండో మూసివేయబడింది. దయచేసి మళ్ళీ ప్రయత్నించండి.';
      case 'auth/invalid-email':
        return language === 'en'
          ? 'Please enter a valid email address (for example: name@gmail.com).'
          : 'దయచేసి సరైన ఈమెయిల్ చిరునామాను నమోదు చేయండి (ఉదా: name@gmail.com).';
      case 'auth/user-not-found':
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        return language === 'en'
          ? 'Incorrect email or password. If you are new, switch to "Create New Account".'
          : 'ఈమెయిల్ లేదా పాస్‌వర్డ్ తప్పుగా ఉంది. మీకు ఖాతా లేకపోతే "కొత్త ఖాతా తెరవండి" ఎంచుకోండి.';
      case 'auth/email-already-in-use':
        return language === 'en'
          ? 'An account with this email already exists. Please switch to "Sign In with Mail".'
          : 'ఈ ఈమెయిల్‌తో ఇప్పటికే ఖాతా ఉంది. దయచేసి "ఈమెయిల్‌తో సైన్ ఇన్" ఎంచుకోండి.';
      case 'auth/weak-password':
        return language === 'en'
          ? 'Password is too short. Please enter at least 6 characters.'
          : 'పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి.';
      case 'auth/too-many-requests':
        return language === 'en'
          ? 'Too many attempts from this device. Please wait a minute or sign in with Gmail.'
          : 'చాలాసార్లు ప్రయత్నించారు. దయచేసి కొద్దిసేపు ఆగి మళ్ళీ ప్రయత్నించండి.';
      default:
        return language === 'en'
          ? `Could not complete sign-in (${code || 'Auth Error'}). Please check your details and try again.`
          : `సైన్-ఇన్ పూర్తి కాలేదు. దయచేసి వివరాలను సరిచూసి మళ్ళీ ప్రయత్నించండి.`;
    }
  };

  // 1. Google / Gmail Popup Sign-In
  const handleGoogleSignIn = async () => {
    clearFeedback();
    setIsSubmitting(true);
    try {
      await signInWithGooglePopup();
    } catch (err: any) {
      setAuthError(formatFirebaseAuthError(err, 'google'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Email Sign-In or Create Account
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    const cleanEmail = emailAddress.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthError(
        language === 'en'
          ? 'Please enter a valid email address.'
          : 'దయచేసి సరైన ఈమెయిల్ చిరునామాను నమోదు చేయండి.'
      );
      return;
    }

    if (password.length < 6) {
      setAuthError(
        language === 'en'
          ? 'Please enter a password with at least 6 characters.'
          : 'దయచేసి కనీసం 6 అక్షరాల పాస్‌వర్డ్‌ను నమోదు చేయండి.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (emailSubMode === 'signup') {
        await registerWithEmailAccount(cleanEmail, password, fullName);
      } else {
        await signInWithEmailAccount(cleanEmail, password);
      }
    } catch (err: any) {
      setAuthError(formatFirebaseAuthError(err, 'email'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    clearFeedback();
    const cleanEmail = emailAddress.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthError(
        language === 'en'
          ? 'Enter your email address above first, then select "Forgot Password?" to receive a reset link.'
          : 'ముందుగా పైన మీ ఈమెయిల్ చిరునామాను నమోదు చేసి, ఆపై "పాస్‌వర్డ్ మర్చిపోయారా?" నొక్కండి.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await sendPasswordResetToEmail(cleanEmail);
      setAuthSuccessMessage(
        language === 'en'
          ? `Password reset link sent to ${cleanEmail}. Please check your inbox.`
          : `${cleanEmail} కు పాస్‌వర్డ్ రీసెట్ లింక్ పంపబడింది. దయచేసి మీ మెయిల్ చెక్ చేయండి.`
      );
    } catch (err: any) {
      setAuthError(formatFirebaseAuthError(err, 'email'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBaseClasses =
    themeMode === 'neon'
      ? 'bg-[#050F14] border-2 border-[#17C2DB] focus:border-[#22D3EE] text-white placeholder-[#7DD3FC]/60'
      : themeMode === 'dark'
      ? 'bg-[#0D1B22] border border-[#254859] focus:border-[#22D3EE] text-[#ECF6F9] placeholder-[#6D93A1]'
      : 'bg-[#FFFFFF] border border-[#D5CEC0] focus:border-[#1B4D3E] text-[#1C2421] placeholder-[#8C948E]';

  const firebaseConsoleProvidersUrl = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/providers`;

  return (
    <div className="min-h-[90vh] flex flex-col justify-between gap-10">
      {/* Top 1-Row Header Bar */}
      <header
        className={`flex flex-wrap items-center justify-between gap-4 px-5 py-4 rounded-2xl ${tokens.headerBar}`}
      >
        <MedicalLogo themeMode={themeMode} language={language} size="md" />
        <ThemeToggle
          themeMode={themeMode}
          onThemeChange={onThemeChange}
          language={language}
          onLanguageChange={onToggleLanguage}
        />
      </header>

      {/* Main Two-Column Editorial Split Layout */}
      <div className="my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Editorial Clinical Overview */}
        <div className="lg:col-span-6 space-y-8 pt-2 lg:pr-4">
          <div className="space-y-4">
            <div className={`text-xs font-mono uppercase tracking-widest ${tokens.brandAccentText}`}>
              {language === 'en'
                ? 'Patient Consultation & Nutritional Desk'
                : 'రోగి రక్త పరీక్ష & ఆహార మార్గదర్శిని'}
            </div>

            <h1 className={`${THEME.typography.heroTitle} ${tokens.textPrimary}`}>
              {language === 'en'
                ? 'Understand your blood reports and daily meals with clarity.'
                : 'మీ రక్త పరీక్ష రిపోర్టులను మరియు రోజువారీ ఆహారాన్ని సులభంగా అర్థం చేసుకోండి.'}
            </h1>

            <p className={`${THEME.typography.bodyLarge} ${tokens.textSecondary}`}>
              {language === 'en'
                ? 'BloodBite translates laboratory panels into calm, readable clinical notes and pairs them with a 255-dish regional Indian food reference.'
                : 'బ్లడ్‌బైట్ (BloodBite) మీ ల్యాబ్ రిపోర్టులను సాధారణ భాషలో వివరించి, 255 భారతీయ వంటకాల ఆధారంగా సరైన ఆహార సూచనలను అందిస్తుంది.'}
            </p>
          </div>

          {/* Unboxed Architectural Ledger of Capabilities */}
          <div className={`border-t ${tokens.divider} divide-y ${tokens.divider}`}>
            <div className="py-5 flex items-start gap-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${tokens.insetBox} ${tokens.brandAccentText}`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M9 3H15M10 3V8.5L5.5 16.5C4.8 17.7 5.6 19.5 7.1 19.5H16.9C18.4 19.5 19.2 17.7 18.5 16.5L14 8.5V3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M7.5 14.5H16.5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="space-y-1">
                <h2 className={`font-display font-semibold text-lg ${tokens.textPrimary}`}>
                  {language === 'en'
                    ? 'Camera & Document Lab Report Reader'
                    : 'కెమెరా & PDF రక్త పరీక్ష రీడర్'}
                </h2>
                <p className={`text-sm sm:text-base leading-relaxed ${tokens.textSecondary}`}>
                  {language === 'en'
                    ? 'Capture a printed diagnostic sheet directly with your camera or upload a PDF. Reads HbA1c, fasting glucose, lipid profile, thyroid, kidney, liver, CBC, and vitamins.'
                    : 'మీ రిపోర్టును నేరుగా కెమెరాతో ఫోటో తీయండి లేదా PDF అప్‌లోడ్ చేయండి. షుగర్, కొలెస్ట్రాల్, థైరాయిడ్, కిడ్నీ, లివర్ మరియు విటమిన్ వివరాలను స్పష్టంగా చదవండి.'}
                </p>
              </div>
            </div>

            <div className="py-5 flex items-start gap-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${tokens.insetBox} ${tokens.brandAccentText}`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <circle cx="12" cy="12" r="8.5" />
                  <circle cx="12" cy="12" r="4.5" strokeDasharray="2 2" />
                  <path d="M3.5 12H5.5M18.5 12H20.5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="space-y-1">
                <h2 className={`font-display font-semibold text-lg ${tokens.textPrimary}`}>
                  {language === 'en'
                    ? '255-Dish Indian Culinary & Glycemic Reference'
                    : '255 భారతీయ వంటకాల పోషకాహార విశ్లేషణ'}
                </h2>
                <p className={`text-sm sm:text-base leading-relaxed ${tokens.textSecondary}`}>
                  {language === 'en'
                    ? 'Photograph your meal plate or build a multi-dish thali from our curated Indian food dataset with ingredient breakdowns, regional origins, and glycemic guidance.'
                    : 'మీ భోజనం ప్లేట్‌ను ఫోటో తీయండి లేదా 255 భారతీయ వంటకాల నుండి ఎంచుకొని క్యాలరీలు, కార్బోహైడ్రేట్లు మరియు గ్లైసెమిక్ స్థాయిలను తెలుసుకోండి.'}
                </p>
              </div>
            </div>

            <div className="py-5 flex items-start gap-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${tokens.insetBox} ${tokens.brandAccentText}`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M11 5L6 9H3V15H6L11 19V5Z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15.5 8.5C16.8 9.8 16.8 14.2 15.5 15.5M18.5 6C21 8.5 21 15.5 18.5 18" strokeLinecap="round" />
                </svg>
              </div>
              <div className="space-y-1">
                <h2 className={`font-display font-semibold text-lg ${tokens.textPrimary}`}>
                  {language === 'en'
                    ? 'Spoken Explanations in English & Telugu'
                    : 'తెలుగు & ఇంగ్లీష్ వాయిస్ వివరణ'}
                </h2>
                <p className={`text-sm sm:text-base leading-relaxed ${tokens.textSecondary}`}>
                  {language === 'en'
                    ? 'Listen to a calm, step-by-step voice summary of your findings and share a clean text summary with family members or your physician.'
                    : 'మీ రిపోర్ట్ ఫలితాలను తెలుగు లేదా ఇంగ్లీష్‌లో వినండి మరియు కుటుంబ సభ్యులతో వాట్సాప్ ద్వారా పంచుకోండి.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sign-In Sheet */}
        <div className="lg:col-span-6">
          <Card variant="elevated" themeMode={themeMode} padding="lg" className="space-y-6">
            <div className="space-y-2 border-b pb-5 border-current/10">
              <div className={`text-xs font-mono uppercase tracking-wider ${tokens.textSecondary}`}>
                {language === 'en' ? 'Patient Record Access' : 'వ్యక్తిగత ఖాతా ప్రవేశం'}
              </div>
              <h2 className={`font-display font-semibold text-2xl sm:text-3xl ${tokens.textPrimary}`}>
                {language === 'en'
                  ? 'Sign in to your health journal'
                  : 'మీ ఆరోగ్య జర్నల్‌లోకి సైన్ ఇన్ చేయండి'}
              </h2>
              <p className={`text-sm sm:text-base ${tokens.textSecondary}`}>
                {language === 'en'
                  ? 'Choose your Gmail account for one-step access or sign in with an email address and password.'
                  : 'మీ జిమెయిల్ ఖాతాతో లేదా ఈమెయిల్ & పాస్‌వర్డ్‌తో లాగిన్ అవ్వండి.'}
              </p>
            </div>

            {/* Method Selector Tabs */}
            <div
              role="tablist"
              aria-label="Sign-in method selector"
              className={`grid grid-cols-2 gap-2 p-1.5 rounded-xl ${tokens.insetBox}`}
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'google'}
                onClick={() => handleTabChange('google')}
                className={`flex items-center justify-center gap-2 min-h-[44px] px-3 py-2 rounded-lg font-sans font-semibold text-sm sm:text-base transition-all cursor-pointer ${
                  activeTab === 'google'
                    ? tokens.switcherActive
                    : `${tokens.textSecondary} hover:opacity-90`
                }`}
              >
                <GoogleMarkSvg className="w-4 h-4 shrink-0" />
                <span>{language === 'en' ? 'Gmail Account' : 'జిమెయిల్ ఖాతా'}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'email'}
                onClick={() => handleTabChange('email')}
                className={`flex items-center justify-center gap-2 min-h-[44px] px-3 py-2 rounded-lg font-sans font-semibold text-sm sm:text-base transition-all cursor-pointer ${
                  activeTab === 'email'
                    ? tokens.switcherActive
                    : `${tokens.textSecondary} hover:opacity-90`
                }`}
              >
                <Mail className="w-4 h-4 shrink-0" />
                <span>{language === 'en' ? 'Mail Account' : 'ఈమెయిల్ ఖాతా'}</span>
              </button>
            </div>

            {/* Error & Console Setup Helper Banner */}
            {authError && (
              <div className={`p-4 rounded-xl space-y-2.5 text-left ${tokens.warningBanner}`}>
                <p className={`text-sm sm:text-base font-medium ${tokens.textPrimary}`}>{authError}</p>
                {needsConsoleEnable && (
                  <div className={`p-3.5 rounded-lg text-sm space-y-2 ${tokens.insetBox}`}>
                    <div className={`font-semibold ${tokens.brandAccentText}`}>
                      {language === 'en'
                        ? 'Enable Email/Password in Firebase Console:'
                        : 'Firebase Console లో Email/Password ఆన్ చేసే విధానం:'}
                    </div>
                    <ol className={`list-decimal list-inside space-y-1 text-xs sm:text-sm ${tokens.textSecondary}`}>
                      <li>
                        {language === 'en'
                          ? 'Open your Firebase Authentication Providers page below.'
                          : 'క్రింది లింక్ నొక్కి Firebase Console తెరవండి.'}
                      </li>
                      <li>
                        {language === 'en'
                          ? 'Select "Email/Password", toggle "Enable", and save.'
                          : '"Email/Password" ఎంచుకొని "Enable" ఆన్ చేసి "Save" నొక్కండి.'}
                      </li>
                    </ol>
                    <a
                      href={firebaseConsoleProvidersUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 font-semibold underline underline-offset-4 ${tokens.brandAccentText}`}
                    >
                      <span>
                        {language === 'en'
                          ? 'Open Firebase Authentication Providers'
                          : 'Firebase Authentication Providers తెరవండి'}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Success Message Banner */}
            {authSuccessMessage && (
              <div className={`p-4 rounded-xl flex items-center gap-3 text-left ${tokens.SafeBanner}`}>
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <p className={`text-sm sm:text-base font-medium ${tokens.textPrimary}`}>
                  {authSuccessMessage}
                </p>
              </div>
            )}

            {/* TAB 1: GOOGLE / GMAIL SIGN-IN */}
            {activeTab === 'google' && (
              <div className="space-y-5 py-2">
                <div className={`p-4 rounded-xl space-y-1.5 ${tokens.insetBox}`}>
                  <div className={`font-display font-semibold text-base ${tokens.textPrimary}`}>
                    {language === 'en'
                      ? 'Continue with your Google / Gmail credentials'
                      : 'మీ జిమెయిల్ (Gmail) ఖాతాతో నేరుగా కొనసాగండి'}
                  </div>
                  <p className={`text-sm leading-relaxed ${tokens.textSecondary}`}>
                    {language === 'en'
                      ? 'Your lab history and meal logs are linked privately to your verified Google identity.'
                      : 'మీ పాత రిపోర్టులు మరియు ఆహార విశ్లేషణలు మీ గూగుల్ ఖాతాలో సురక్షితంగా భద్రపరచబడతాయి.'}
                  </p>
                </div>

                <Button
                  variant="massivePrimary"
                  themeMode={themeMode}
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  aria-label="Sign in with Google"
                >
                  <span className="flex items-center justify-center gap-3">
                    <GoogleMarkSvg className="w-5 h-5 shrink-0" />
                    <span>
                      {isSubmitting
                        ? language === 'en'
                          ? 'Connecting to Gmail...'
                          : 'జిమెయిల్‌తో అనుసంధానమవుతోంది...'
                        : language === 'en'
                        ? 'Continue with Gmail Account'
                        : 'జిమెయిల్ ఖాతాతో సైన్ ఇన్ చేయండి'}
                    </span>
                    <ArrowRight className="w-4 h-4 shrink-0 opacity-80" />
                  </span>
                </Button>
              </div>
            )}

            {/* TAB 2: MAIL ACCOUNT (EMAIL & PASSWORD) SIGN-IN / SIGN-UP */}
            {activeTab === 'email' && (
              <div className="space-y-5">
                {/* Sub-mode toggle: Sign In vs Create New Mail Account */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailSubMode('signin');
                      clearFeedback();
                    }}
                    className={`flex-1 inline-flex items-center justify-center gap-2 min-h-[40px] px-3 py-2 rounded-lg font-sans font-medium text-sm border transition-all cursor-pointer ${
                      emailSubMode === 'signin'
                        ? `${tokens.selectedCard}`
                        : `border-transparent ${tokens.insetBox} ${tokens.textSecondary}`
                    }`}
                  >
                    <LogIn className="w-4 h-4" />
                    <span>
                      {language === 'en' ? 'Sign In with Mail' : 'ఈమెయిల్‌తో సైన్ ఇన్'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEmailSubMode('signup');
                      clearFeedback();
                    }}
                    className={`flex-1 inline-flex items-center justify-center gap-2 min-h-[40px] px-3 py-2 rounded-lg font-sans font-medium text-sm border transition-all cursor-pointer ${
                      emailSubMode === 'signup'
                        ? `${tokens.selectedCard}`
                        : `border-transparent ${tokens.insetBox} ${tokens.textSecondary}`
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>
                      {language === 'en' ? 'Create New Account' : 'కొత్త ఖాతా తెరవండి'}
                    </span>
                  </button>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  {emailSubMode === 'signup' && (
                    <div className="space-y-1.5 text-left">
                      <label
                        htmlFor="email-full-name"
                        className={`block font-sans font-medium text-sm ${tokens.textPrimary}`}
                      >
                        {language === 'en' ? 'Patient Name' : 'మీ పూర్తి పేరు'}
                      </label>
                      <input
                        id="email-full-name"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={
                          language === 'en'
                            ? 'Enter your full name'
                            : 'మీ పూర్తి పేరు నమోదు చేయండి'
                        }
                        className={`w-full min-h-[48px] px-4 py-2.5 rounded-xl font-sans text-base outline-none transition-all ${inputBaseClasses}`}
                      />
                    </div>
                  )}

                  <div className="space-y-1.5 text-left">
                    <label
                      htmlFor="email-address-input"
                      className={`block font-sans font-medium text-sm ${tokens.textPrimary}`}
                    >
                      {language === 'en' ? 'Email Address' : 'మీ ఈమెయిల్ చిరునామా'}
                    </label>
                    <input
                      id="email-address-input"
                      type="email"
                      required
                      autoComplete="email"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      placeholder="name@example.com"
                      className={`w-full min-h-[48px] px-4 py-2.5 rounded-xl font-sans text-base outline-none transition-all ${inputBaseClasses}`}
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="email-password-input"
                        className={`block font-sans font-medium text-sm ${tokens.textPrimary}`}
                      >
                        {language === 'en' ? 'Password' : 'పాస్‌వర్డ్'}
                      </label>
                      {emailSubMode === 'signin' && (
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          className={`text-xs font-medium cursor-pointer ${tokens.brandAccentText} hover:underline`}
                        >
                          {language === 'en' ? 'Forgot password?' : 'పాస్‌వర్డ్ మర్చిపోయారా?'}
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <input
                        id="email-password-input"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        autoComplete={
                          emailSubMode === 'signup' ? 'new-password' : 'current-password'
                        }
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={
                          language === 'en'
                            ? 'At least 6 characters'
                            : 'కనీసం 6 అక్షరాల పాస్‌వర్డ్'
                        }
                        className={`w-full min-h-[48px] pl-4 pr-12 py-2.5 rounded-xl font-sans text-base outline-none transition-all ${inputBaseClasses}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg cursor-pointer ${tokens.textSecondary}`}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="massivePrimary"
                    themeMode={themeMode}
                    disabled={isSubmitting}
                  >
                    <span className="flex items-center justify-center gap-2.5">
                      <Mail className="w-5 h-5 shrink-0" />
                      <span>
                        {isSubmitting
                          ? language === 'en'
                            ? 'Signing in...'
                            : 'దయచేసి వేచి ఉండండి...'
                          : emailSubMode === 'signup'
                          ? language === 'en'
                            ? 'Create Mail Account & Continue'
                            : 'కొత్త ఈమెయిల్ ఖాతా తెరిచి కొనసాగండి'
                          : language === 'en'
                          ? 'Sign In with Mail Account'
                          : 'ఈమెయిల్ ఖాతాతో సైన్ ఇన్ చేయండి'}
                      </span>
                    </span>
                  </Button>
                </form>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Quiet Editorial Colophon */}
      <footer className={`pt-4 border-t ${tokens.divider} flex flex-wrap items-center justify-between gap-4 text-xs ${tokens.textSecondary}`}>
        <span>
          {language === 'en'
            ? 'BloodBite Clinical Companion · Informational reference for patient education'
            : 'బ్లడ్‌బైట్ (BloodBite) · రోగుల అవగాహన కోసం రూపొందించబడిన ఆరోగ్య వేదిక'}
        </span>
        <span className="font-mono">
          {language === 'en'
            ? 'ICMR-NIN · IFood 255-Dish Reference · Clinical Biomarker Ledger'
            : 'ICMR-NIN · 255 వంటకాల డేటాసెట్'}
        </span>
      </footer>
    </div>
  );
};
