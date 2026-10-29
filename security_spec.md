# ArogyaSetu Security Specification (Zero-Trust ABAC & Relational Sync)

## 1. Data Invariants & Master Source of Truth

1. **Master Gate (`/users/{userId}`)**:
   - The `UserProfile` document at `/users/{userId}` is the Master Source of Truth for a patient's identity.
   - Only a signed-in user with `request.auth.uid == userId` and `request.auth.token.email_verified == true` may read, create, or update their own `/users/{userId}` document.
   - No blanket `list` is allowed on `/users` to prevent PII enumeration (`email`, `displayName`, `photoURL`).
   - Immutable fields (`uid`, `email`, `createdAt`) cannot be modified during updates, and `updatedAt` must strictly equal `request.time`.

2. **Subcollection Relational Sync (`/users/{userId}/reports/{reportId}` & `/users/{userId}/plates/{plateId}`)**:
   - Every `SavedBloodReport` and `SavedPlateScan` document must belong to an existing `/users/{userId}` parent document (`exists(/databases/$(database)/documents/users/$(userId))`) where `get(/databases/$(database)/documents/users/$(userId)).data.uid == request.auth.uid`.
   - `incoming().userId` must strictly equal `request.auth.uid` and `userId`.
   - `createdAt` must strictly equal `request.time`.
   - `allow list` on subcollections enforces `isSignedIn() && isVerified() && userId == request.auth.uid && resource.data.userId == request.auth.uid`.

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 (Unauthenticated Profile Creation)**: `auth = null` attempting `create` on `/users/user_123`. -> `PERMISSION_DENIED`
2. **Payload 2 (Unverified Email Spoofing)**: `auth = { uid: 'user_123', token: { email_verified: false } }` attempting `create` on `/users/user_123`. -> `PERMISSION_DENIED`
3. **Payload 3 (Cross-User PII Read)**: `auth = { uid: 'attacker_999', token: { email_verified: true } }` attempting `get` on `/users/user_123`. -> `PERMISSION_DENIED`
4. **Payload 4 (Shadow Ghost Field Injection on Profile)**: Authenticated owner sending `{ ..., isAdmin: true }` to `/users/user_123`. -> `PERMISSION_DENIED` (blocked by `.keys().hasOnly(...)`)
5. **Payload 5 (ID Poisoning / Oversized String Attack)**: Authenticated user creating `/users/user_123/reports/invalid$id!@#` or `patientName` > 120 chars. -> `PERMISSION_DENIED`
6. **Payload 6 (Timestamp Forgery)**: Authenticated owner sending a past/future `createdAt` instead of `request.time`. -> `PERMISSION_DENIED`
7. **Payload 7 (Orphaned Subcollection Write)**: Authenticated user creating `/users/user_123/reports/rep_1` before `/users/user_123` exists. -> `PERMISSION_DENIED`
8. **Payload 8 (Identity Spoofing in Report Payload)**: Authenticated user `user_123` setting `userId: 'victim_456'` inside `/users/user_123/reports/rep_1`. -> `PERMISSION_DENIED`
9. **Payload 9 (Immortal Field Mutation on Profile Update)**: Authenticated owner attempting to mutate `createdAt` or `uid` during an update on `/users/user_123`. -> `PERMISSION_DENIED`
10. **Payload 10 (Value Poisoning on Update)**: Authenticated owner updating `preferredTheme` to `"hacker_mode"` (outside `['light', 'dark', 'neon']`). -> `PERMISSION_DENIED`
11. **Payload 11 (Cross-User Report List Scraping)**: Authenticated user `attacker_999` attempting `list` on `/users/user_123/reports`. -> `PERMISSION_DENIED`
12. **Payload 12 (Out-of-Bounds Metric Injection on Plate Scan)**: Authenticated owner creating `/users/user_123/plates/plate_1` with `plateScore: 9999` or `plateGrade: "Purple"`. -> `PERMISSION_DENIED`
