# Hydro — MVP1 (Expo / React Native)

Mobile-first embodied data platform. Record real-world task videos with your phone, earn **$HYDRO**.

Built exactly to the MVP1 spec: **Expo (React Native) + expo-router**, with Supabase / on-chain rewards
stubbed behind a simple data layer so the full experience runs today and real services can be dropped in later.

## Screens (per spec)

1. **Welcome + Connect Wallet** (`src/app/index.tsx`) — demo wallet connect, persisted locally.
2. **Task list** (`src/app/tasks.tsx`) — task cards (name, est. duration, reward). Mock data in `src/data/tasks.ts`.
3. **Record** (`src/app/record.tsx`) — live camera preview (expo-camera), start/stop, live timer.
4. **Upload confirm + result** (`src/app/upload.tsx`) — L1 auto-check, upload progress bar, "+N $HYDRO" reward.
5. **Profile** (`src/app/profile.tsx`) — total uploads, total $HYDRO, recent contributions.

State (wallet address + contributions) lives in `src/store.tsx`, persisted with AsyncStorage.

## Run locally

```bash
bun install          # or: npm install
npx expo start       # press i (iOS sim), a (Android), w (web)
```

- iOS Simulator has no camera → the record screen offers a "Simulate a recording" fallback.
- On a real iPhone (Expo Go or a dev build) the camera records real video.

## What is stubbed (swap in real services later)

| Area | Current (MVP1) | Next |
| --- | --- | --- |
| Wallet | demo address generated on connect (`store.tsx → connect`) | WalletConnect / Privy |
| Tasks | local array (`data/tasks.ts`) | Supabase table read |
| Video upload | simulated progress | Supabase Storage presigned upload |
| Reward | added locally | Supabase Edge Function → Virtuals/Base token transfer |

## Ship to TestFlight

Use Expo EAS (recommended):

```bash
npm i -g eas-cli
eas login
eas build --platform ios --profile production   # cloud build, no local Xcode headaches
eas submit --platform ios
```

Bundle id is `co.hydrobotics.app` in `app.json` (distinct from the earlier native app so both can coexist on the same Apple account).
