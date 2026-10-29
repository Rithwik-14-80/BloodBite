/**
 * /services/firebase.ts
 * Initializes Firebase Authentication (Google Sign-In & Email/Password)
 * and Firestore (Enterprise database) with structured error handling,
 * token-service readiness checks, and local storage fallback persistence.
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  setLogLevel,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { ReportAnalysisResult, PlateAnalysisResult } from './reportClient';
import { ThemeMode } from '../components/ui/MedicalLogo';

// Silence noisy internal WebChannel / token-service connection retry logs in console
try {
  setLogLevel('silent');
} catch {
  // Ignore if setLogLevel is unavailable
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;

/**
 * Checks whether the current user session can authenticate against Cloud Firestore.
 * Supports both Google accounts (emailVerified = true) and Email/Password accounts.
 */
async function canUseCloudFirestore(user: User | null): Promise<boolean> {
  if (!user || !user.uid) return false;
  try {
    const token = await user.getIdToken(false);
    return Boolean(token);
  } catch {
    return false;
  }
}

// Validate Connection to Firestore on boot only when auth state is ready and valid
async function testConnection() {
  try {
    if (typeof auth.authStateReady === 'function') {
      await auth.authStateReady();
    }
    if (!auth.currentUser) return;
    const canConnect = await canUseCloudFirestore(auth.currentUser);
    if (!canConnect) return;
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch {
    // Operate seamlessly using local cache when offline or token service is unavailable
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  // Do not throw or log console errors for transient offline or token-service propagation states
  if (
    lower.includes('client is offline') ||
    lower.includes('token-service-api') ||
    lower.includes('fetching auth token failed') ||
    lower.includes('network-request-failed') ||
    lower.includes('unavailable')
  ) {
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: message,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };

  if (lower.includes('Missing or insufficient permissions'.toLowerCase()) || lower.includes('permission-denied')) {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }
}

// Volumetric & Regex Sanitization Helpers (synchronized with firebase-blueprint.json)
const SAFE_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

function clampString(val: string | null | undefined, fallback: string, maxLen: number): string {
  const clean = (val || '').trim();
  const nonEmpty = clean.length > 0 ? clean : fallback;
  return nonEmpty.slice(0, maxLen);
}

function clampNumber(val: number | undefined | null, min: number, max: number, fallback: number): number {
  const num = Number(val);
  if (Number.isNaN(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function generateSafeDocId(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 10);
  const id = `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_\-]/g, '');
  return id.slice(0, 64);
}

export interface SavedBloodReportRecord {
  id: string;
  userId: string;
  patientName: string;
  labName: string;
  reportDate: string;
  overallWellnessScore: number;
  needsAttentionCount: number;
  normalCount: number;
  totalTestsCount: number;
  keyFindingsEn: string;
  keyFindingsTe: string;
  createdAt?: Timestamp | null;
}

export interface SavedPlateScanRecord {
  id: string;
  userId: string;
  verdictTitleEn: string;
  verdictTitleTe: string;
  plateScore: number;
  plateGrade: 'Green' | 'Yellow' | 'Red';
  totalCalories: number;
  totalCarbsG: number;
  totalProteinG: number;
  totalFiberG: number;
  avgGlycemicIndex: number;
  dishesSummaryEn: string;
  createdAt?: Timestamp | null;
}

// ============================================================================
// Local Cache Helpers (ensures instant persistence even when offline)
// ============================================================================
const reportListeners = new Map<string, Set<(reports: SavedBloodReportRecord[]) => void>>();
const plateListeners = new Map<string, Set<(plates: SavedPlateScanRecord[]) => void>>();

function getLocalReportsKey(userId: string): string {
  return `arogyasetu_reports_${userId}`;
}

function getLocalPlatesKey(userId: string): string {
  return `arogyasetu_plates_${userId}`;
}

function readLocalReports(userId: string): SavedBloodReportRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(getLocalReportsKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalReports(userId: string, reports: SavedBloodReportRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = reports.slice(0, 15);
    window.localStorage.setItem(getLocalReportsKey(userId), JSON.stringify(trimmed));
    const listeners = reportListeners.get(userId);
    if (listeners) {
      listeners.forEach((cb) => cb(trimmed));
    }
  } catch {
    // Ignore storage quota errors
  }
}

function readLocalPlates(userId: string): SavedPlateScanRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(getLocalPlatesKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalPlates(userId: string, plates: SavedPlateScanRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = plates.slice(0, 15);
    window.localStorage.setItem(getLocalPlatesKey(userId), JSON.stringify(trimmed));
    const listeners = plateListeners.get(userId);
    if (listeners) {
      listeners.forEach((cb) => cb(trimmed));
    }
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Triggers Google Sign-In via Popup and syncs user profile to Firestore.
 */
export async function signInWithGooglePopup(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider);
  await ensureUserProfileInFirestore(credential.user).catch(() => {});
  return credential.user;
}

/**
 * Signs in an existing user with Email and Password and syncs user profile to Firestore.
 */
export async function signInWithEmailAccount(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  await ensureUserProfileInFirestore(credential.user).catch(() => {});
  return credential.user;
}

/**
 * Creates a new user account with Email, Password, and optional Full Name,
 * and immediately creates the `/users/{userId}` document in Cloud Firestore.
 */
export async function registerWithEmailAccount(
  email: string,
  password: string,
  fullName?: string
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (fullName && fullName.trim().length > 0 && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        `arogyasetu_display_name_${credential.user.uid}`,
        fullName.trim().slice(0, 120)
      );
    } catch {
      // Ignore storage errors
    }
  }
  await ensureUserProfileInFirestore(credential.user).catch(() => {});
  return credential.user;
}

/**
 * Sends a password reset email to the given email address.
 */
export async function sendPasswordResetToEmail(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Signs out the current user.
 */
export async function signOutCurrentUser(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Ensures the signed-in user's `/users/{userId}` document exists in Firestore.
 * Works for both Google Popup accounts and Mail (Email/Password) accounts.
 */
export async function ensureUserProfileInFirestore(
  user: User,
  language: 'en' | 'te' = 'en',
  themeMode: ThemeMode = 'light'
): Promise<void> {
  if (!user?.uid || !SAFE_ID_REGEX.test(user.uid)) return;
  if (!(await canUseCloudFirestore(user))) return;

  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);

  const cachedName =
    typeof window !== 'undefined'
      ? window.localStorage.getItem(`arogyasetu_display_name_${user.uid}`)
      : null;

  const displayName = clampString(
    user.displayName || cachedName || user.email?.split('@')[0],
    'Patient',
    120
  );
  const email = clampString(user.email, 'patient@example.com', 254);
  const photoURL = (user.photoURL || '').slice(0, 1024);
  const preferredLanguage = language === 'te' ? 'te' : 'en';
  const preferredTheme =
    themeMode === 'dark' || themeMode === 'neon' ? themeMode : 'light';

  try {
    let exists = false;
    try {
      const snap = await getDoc(userRef);
      exists = snap.exists();
    } catch {
      exists = false;
    }

    if (!exists) {
      await setDoc(userRef, {
        uid: user.uid.slice(0, 128),
        displayName,
        email,
        photoURL,
        preferredLanguage,
        preferredTheme,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        displayName,
        photoURL,
        preferredLanguage,
        preferredTheme,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

/**
 * Saves an analyzed blood report summary under `/users/{userId}/reports/{reportId}`.
 */
export async function saveBloodReportToFirestore(
  user: User,
  report: ReportAnalysisResult
): Promise<void> {
  if (!user?.uid || !SAFE_ID_REGEX.test(user.uid)) return;

  const reportId = generateSafeDocId('rep');
  const path = `users/${user.uid}/reports/${reportId}`;

  const attentionSummaryEn =
    report.needsAttention.length > 0
      ? report.needsAttention
          .map((t) => `${t.arrow} ${t.test_name}: ${t.value} ${t.unit} (${t.status})`)
          .join(' · ')
      : `All ${report.extracted_results.length} blood tests are safely within normal range.`;

  const attentionSummaryTe =
    report.needsAttention.length > 0
      ? report.needsAttention
          .map((t) => `${t.arrow} ${t.test_name_te}: ${t.value} ${t.unit}`)
          .join(' · ')
      : `మొత్తం ${report.extracted_results.length} పరీక్షలు సాధారణ పరిమితిలో ఉన్నాయి.`;

  const baseFields = {
    userId: user.uid.slice(0, 128),
    patientName: clampString(
      report.patientName || report.reportMetadata?.patient_name || user.displayName,
      'Patient',
      120
    ),
    labName: clampString(
      report.reportMetadata?.lab_name,
      'Clinical Laboratory Report',
      160
    ),
    reportDate: clampString(
      report.reportDate || report.reportMetadata?.report_date,
      new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      80
    ),
    overallWellnessScore: clampNumber(report.mlInsights?.overallWellnessScore, 0, 100, 90),
    needsAttentionCount: clampNumber(report.needsAttention.length, 0, 200, 0),
    normalCount: clampNumber(report.allGood.length, 0, 200, 0),
    totalTestsCount: clampNumber(report.extracted_results.length, 1, 200, 1),
    keyFindingsEn: clampString(attentionSummaryEn, 'Blood report analyzed.', 2000),
    keyFindingsTe: clampString(attentionSummaryTe, 'రక్త పరీక్ష విశ్లేషించబడింది.', 2000),
  };

  // Always update local cache immediately for instant UI responsiveness
  const localRecord: SavedBloodReportRecord = {
    id: reportId,
    ...baseFields,
    createdAt: null,
  };
  const existingLocal = readLocalReports(user.uid);
  writeLocalReports(user.uid, [localRecord, ...existingLocal]);

  if (!(await canUseCloudFirestore(user))) return;

  await ensureUserProfileInFirestore(user);
  const reportRef = doc(db, 'users', user.uid, 'reports', reportId);

  try {
    await setDoc(reportRef, {
      ...baseFields,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Saves an "Analyze My Plate" camera evaluation under `/users/{userId}/plates/{plateId}`.
 */
export async function savePlateScanToFirestore(
  user: User,
  plate: PlateAnalysisResult
): Promise<void> {
  if (!user?.uid || !SAFE_ID_REGEX.test(user.uid)) return;

  const plateId = generateSafeDocId('plate');
  const path = `users/${user.uid}/plates/${plateId}`;

  const dishesSummary = plate.detectedItems
    .map((d) => `${d.nameEn} (${d.calories} kcal)`)
    .join(', ');

  const validGrade: 'Green' | 'Yellow' | 'Red' =
    plate.plateGrade === 'Green' || plate.plateGrade === 'Yellow' || plate.plateGrade === 'Red'
      ? plate.plateGrade
      : 'Yellow';

  const baseFields = {
    userId: user.uid.slice(0, 128),
    verdictTitleEn: clampString(plate.verdictTitleEn, 'Analyzed Meal Plate', 200),
    verdictTitleTe: clampString(plate.verdictTitleTe, 'భోజనం ప్లేట్ విశ్లేషణ', 200),
    plateScore: clampNumber(plate.plateScore, 0, 100, 75),
    plateGrade: validGrade,
    totalCalories: clampNumber(plate.totalCalories, 0, 5000, 400),
    totalCarbsG: clampNumber(plate.totalCarbsG, 0, 1000, 50),
    totalProteinG: clampNumber(plate.totalProteinG, 0, 500, 12),
    totalFiberG: clampNumber(plate.totalFiberG, 0, 500, 6),
    avgGlycemicIndex: clampNumber(plate.avgGlycemicIndex, 0, 150, 55),
    dishesSummaryEn: clampString(dishesSummary, 'South Indian Meal Plate', 1000),
  };

  // Always update local cache immediately
  const localRecord: SavedPlateScanRecord = {
    id: plateId,
    ...baseFields,
    createdAt: null,
  };
  const existingLocal = readLocalPlates(user.uid);
  writeLocalPlates(user.uid, [localRecord, ...existingLocal]);

  if (!(await canUseCloudFirestore(user))) return;

  await ensureUserProfileInFirestore(user);
  const plateRef = doc(db, 'users', user.uid, 'plates', plateId);

  try {
    await setDoc(plateRef, {
      ...baseFields,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Deletes a saved blood report record.
 */
export async function deleteSavedBloodReport(userId: string, reportId: string): Promise<void> {
  const nextLocal = readLocalReports(userId).filter((r) => r.id !== reportId);
  writeLocalReports(userId, nextLocal);

  if (!(await canUseCloudFirestore(auth.currentUser))) return;

  const path = `users/${userId}/reports/${reportId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'reports', reportId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Deletes a saved plate scan record.
 */
export async function deleteSavedPlateScan(userId: string, plateId: string): Promise<void> {
  const nextLocal = readLocalPlates(userId).filter((p) => p.id !== plateId);
  writeLocalPlates(userId, nextLocal);

  if (!(await canUseCloudFirestore(auth.currentUser))) return;

  const path = `users/${userId}/plates/${plateId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'plates', plateId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Subscribes to the signed-in user's saved blood reports in Firestore (with local fallback).
 */
export function subscribeToUserReports(
  userId: string,
  onData: (reports: SavedBloodReportRecord[]) => void
): () => void {
  if (!reportListeners.has(userId)) {
    reportListeners.set(userId, new Set());
  }
  reportListeners.get(userId)!.add(onData);

  // Immediately deliver cached reports
  onData(readLocalReports(userId));

  let firestoreUnsub: (() => void) | null = null;
  let cancelled = false;

  canUseCloudFirestore(auth.currentUser).then((canUse) => {
    if (cancelled || !canUse) return;
    const path = `users/${userId}/reports`;
    const q = query(
      collection(db, 'users', userId, 'reports'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(15)
    );

    firestoreUnsub = onSnapshot(
      q,
      (snapshot) => {
        const items: SavedBloodReportRecord[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<SavedBloodReportRecord, 'id'>),
        }));
        writeLocalReports(userId, items);
        onData(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  });

  return () => {
    cancelled = true;
    reportListeners.get(userId)?.delete(onData);
    if (firestoreUnsub) firestoreUnsub();
  };
}

/**
 * Subscribes to the signed-in user's saved plate scans in Firestore (with local fallback).
 */
export function subscribeToUserPlateScans(
  userId: string,
  onData: (plates: SavedPlateScanRecord[]) => void
): () => void {
  if (!plateListeners.has(userId)) {
    plateListeners.set(userId, new Set());
  }
  plateListeners.get(userId)!.add(onData);

  // Immediately deliver cached plate scans
  onData(readLocalPlates(userId));

  let firestoreUnsub: (() => void) | null = null;
  let cancelled = false;

  canUseCloudFirestore(auth.currentUser).then((canUse) => {
    if (cancelled || !canUse) return;
    const path = `users/${userId}/plates`;
    const q = query(
      collection(db, 'users', userId, 'plates'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(15)
    );

    firestoreUnsub = onSnapshot(
      q,
      (snapshot) => {
        const items: SavedPlateScanRecord[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<SavedPlateScanRecord, 'id'>),
        }));
        writeLocalPlates(userId, items);
        onData(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  });

  return () => {
    cancelled = true;
    plateListeners.get(userId)?.delete(onData);
    if (firestoreUnsub) firestoreUnsub();
  };
}

export { onAuthStateChanged };
export type { User };
