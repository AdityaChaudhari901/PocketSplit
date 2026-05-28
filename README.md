# MoneyPulse AI

Production-oriented Expo/React Native foundation for an AI-powered personal and split expense tracker.

## What Is Included

- Expo Router navigation with `Home | Split | Add | AI | Reports`
- First-launch onboarding with feature intro, plan selection, and Free plan fallback entry
- Personal income/expense tracking with integer minor-unit money math
- Money Pulse dashboard, safe daily spend, budgets, and report cards
- Smart Bills & Subscription Guard for recurring bills, reminders, and safer daily-spend forecasting
- Savings Goals with planned monthly reserves that reduce spendable cash before daily budget calculations
- Splitwise-style group expenses with balances and greedy settlement simplification
- Receipt scanner/review flow with mocked OCR/AI fallback
- Server-side AI Edge Function adapter so provider keys never ship in the mobile app
- Central entitlement service for Free, Pro, and Premium plans with monthly/yearly billing under paid tiers
- Biometric lock hook using Expo LocalAuthentication and SecureStore
- Supabase PostgreSQL migration with RLS policies, soft deletes, audit/activity tables, and indexes
- Unit tests for money, split, entitlement, recurring bill, and savings goal logic

## Setup

```sh
pnpm install
cp .env.example .env
pnpm start
```

The app works in local demo mode if Supabase env vars are empty. Supabase Auth and Edge Functions are used when the public Supabase URL and anon key are configured.

Use Node LTS (`>=20 <25`). Node `25.x` currently breaks Expo CLI port detection through `freeport-async`; this repo includes `.node-version` for Node `22.13.1`.

## Environment Variables

Mobile-safe:

```sh
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_ENABLE_DEMO_MODE=true
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Server-side only for Supabase Edge Functions:

```sh
APP_ENV=development
AI_REQUIRE_AUTH=false
AI_ALLOW_MOCKS=true
AI_PROVIDER=bedrock
AWS_REGION=us-east-1
AWS_BEARER_TOKEN_BEDROCK=
BEDROCK_MODEL_ID=amazon.nova-lite-v1:0
OCR_PROVIDER=mock
```

Do not put AWS, OCR, service-role, payment, or banking keys in the Expo app. For production, set `EXPO_PUBLIC_APP_ENV=production`, keep `EXPO_PUBLIC_ENABLE_DEMO_MODE=false`, and prefer short-lived Bedrock bearer tokens or least-privilege AWS credentials that can only call `bedrock:InvokeModel` for the specific model or inference profile you enable.

## Database

Apply migrations with the Supabase CLI:

```sh
supabase link --project-ref <project-ref>
supabase db push
```

Deploy the AI Edge Function:

```sh
supabase functions deploy ai-insights
supabase secrets set APP_ENV=production AI_REQUIRE_AUTH=true AI_ALLOW_MOCKS=false AI_PROVIDER=bedrock AWS_REGION=us-east-1 AWS_BEARER_TOKEN_BEDROCK=... BEDROCK_MODEL_ID=amazon.nova-lite-v1:0
```

## Verification

```sh
pnpm run typecheck
pnpm test
pnpm run lint
```

## Production Notes

- The current app uses a persisted local store for development and demo flows. Replace service internals with Supabase queries while preserving the same domain contracts.
- Recurring bills are modeled locally as `RecurringBill` and map naturally to the existing Supabase `recurring_rules` table through `transaction_template`, `frequency`, `next_run_at`, and `active`.
- Savings goals are modeled locally as `SavingsGoal` and backed by Supabase `savings_goals` plus `savings_goal_contributions` tables with owner-scoped RLS.
- Demo mode is disabled automatically when `EXPO_PUBLIC_APP_ENV=production`; production builds should fail closed instead of fabricating local profiles or AI responses.
- StoreKit, Google Play Billing, or RevenueCat adapters should update `entitlements` and `feature_usage`; do not bypass `entitlement.service.ts`.
- Plan selection exposes Free, Pro, and Premium. Pro and Premium each support monthly and yearly billing, and paid activation requires a billing adapter before activation.
- Receipt image and payment proof uploads should use Supabase Storage buckets with member-aware access checks.
- Delete-account should be a backend job that exports data, soft-deletes financial history, writes audit logs, and only then performs irreversible account deletion where required.
- AI outputs are validated client-side with Zod and in the Edge Function before returning to the app.
