# Hydro

**Flowing data, shaping physical intelligence.**

Hydro is a mobile app that turns everyday human actions into training data for
embodied AI. Contributors pick a real-world task (pour water, fold a shirt, plug
in a cable…), record a short first-person clip, and an AI reviewer verifies the
clip actually shows the task before crediting **$HYDRO** rewards.

> MVP1 status: rewards are accounted **off-chain** (in-app balance, claimable to
> your wallet at token launch). No token is deployed yet.

---

## How it works

```
┌─────────────┐    record + extract frames    ┌──────────────────┐
│  Expo app   │ ─────────────────────────────▶ │ Supabase Storage  │
│ (iOS / RN)  │                                │  (private bucket) │
└─────┬───────┘                                └─────────┬────────┘
      │ create contribution + request reward             │
      ▼                                                   ▼
┌───────────────────────────┐   frames    ┌───────────────────────────┐
│ Supabase Edge Function     │ ──────────▶ │ OpenAI vision (gpt-4o-mini)│
│ `reward` (Deno)            │ ◀────────── │  {approved, score, reason} │
└─────┬─────────────────────┘   verdict    └───────────────────────────┘
      │ only credits $HYDRO if the clip passes AI review
      ▼
┌───────────────────────────┐
│ Postgres `contributions`   │  status: rewarded | rejected | pending_review
└───────────────────────────┘
```

## Tech stack

- **App**: Expo (React Native), expo-router, expo-camera, expo-video-thumbnails
- **Auth / wallet**: Privy embedded wallets (email OTP login)
- **Backend**: Supabase — Postgres, Row-Level Security, Storage, Edge Functions
- **AI review**: OpenAI `gpt-4o-mini` vision, called from the `reward` Edge Function
- **Build / deploy**: EAS (Expo Application Services)

## Features

- Bottom-tab navigation: **Home** (intro + industry updates), **Task** (record &
  upload), **My** (wallet, balance, per-upload AI score)
- Real device video recording (60s cap) with front/back camera
- On-device frame extraction + private upload to Supabase
- **AI quality gate**: a vision model scores every clip against the task
  instructions; only passing clips are rewarded
- Off-chain $HYDRO accounting with a clear "claimable at launch" model

---

## Getting started

You will need your **own** Supabase project, Privy app, and OpenAI API key. The
app gracefully falls back to a local demo mode when Supabase isn't configured.

### 1. Prerequisites

- Node 20+ and [Bun](https://bun.sh) (or npm)
- [Expo](https://docs.expo.dev/) tooling (`npx expo`)
- A [Supabase](https://supabase.com) project
- A [Privy](https://privy.io) app (for email login + embedded wallets)
- An [OpenAI](https://platform.openai.com) API key (for the AI reviewer)

### 2. Install

```bash
bun install        # or: npm install
```

### 3. Configure environment

```bash
cp .env.example .env
# then fill in your own values (see .env.example for the full list)
```

`EXPO_PUBLIC_*` values are bundled into the client and are safe to expose
(Supabase anon key, Privy app id). Server-side secrets (OpenAI key, service
role, treasury) are **never** put in the app — see below.

### 4. Set up the database

Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL editor.
It creates the `profiles`, `tasks`, `contributions` tables + RLS policies + the
private `recordings` storage bucket, and seeds the task list. Also enable
**Anonymous sign-ins** (Authentication → Providers).

### 5. Deploy the reward function

```bash
# set the server-side secret (never commit this)
supabase secrets set OPENAI_API_KEY=sk-...

# deploy
supabase functions deploy reward --project-ref <your-project-ref>
```

### 6. Run the app

```bash
npx expo start          # dev
# or a device build:
eas build --profile development --platform ios
```

---

## Project structure

```
src/
  app/               expo-router routes
    index.tsx        login / welcome gate
    (tabs)/          Home · Task · My  (bottom tabs)
    record.tsx       camera recording (full screen)
    upload.tsx       review + AI verdict
  data/              task list + home content
  lib/               Supabase client + API layer
  wallet/            Privy integration (platform-split)
  store.tsx          app state (session, contributions, balance)
  theme.ts / ui.tsx  design system
supabase/
  schema.sql         database schema + RLS + seed
  functions/reward/  Edge Function: AI review + reward
```

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md).
The short version: fork, branch, keep secrets out of commits, open a PR.

## License

See [LICENSE](./LICENSE).
