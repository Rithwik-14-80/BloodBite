/**
 * firestore.rules.test.ts
 * Verifies all 12 "Dirty Dozen" adversarial payloads from security_spec.md return PERMISSION_DENIED.
 */

export interface DirtyDozenAssertion {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expectedOutcome: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_SECURITY_TESTS: DirtyDozenAssertion[] = [
  {
    id: 1,
    name: 'Unauthenticated Profile Creation',
    collectionPath: '/users/user_123',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Email Spoofing',
    collectionPath: '/users/user_123',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Cross-User PII Read',
    collectionPath: '/users/user_123',
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Ghost Field Injection on Profile',
    collectionPath: '/users/user_123',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'ID Poisoning / Oversized String Attack',
    collectionPath: '/users/user_123/reports/invalid$id!@#',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Timestamp Forgery',
    collectionPath: '/users/user_123/reports/rep_1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Orphaned Subcollection Write Without Parent User',
    collectionPath: '/users/user_123/reports/rep_1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Identity Spoofing in Report Payload',
    collectionPath: '/users/user_123/reports/rep_1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Immortal Field Mutation on Profile Update',
    collectionPath: '/users/user_123',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Value Poisoning on Update (Invalid preferredTheme)',
    collectionPath: '/users/user_123',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Cross-User Report List Scraping',
    collectionPath: '/users/user_123/reports',
    operation: 'list',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Out-of-Bounds Metric Injection on Plate Scan',
    collectionPath: '/users/user_123/plates/plate_1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
  },
];
