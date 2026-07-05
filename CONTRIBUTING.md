# Contributing to Hydro

Thanks for your interest in improving Hydro! This project is an Expo (React
Native) app with a Supabase backend and an OpenAI-powered AI review function.

## Ground rules

- **Never commit secrets.** No API keys, private keys, `.env`, `.p8`, or wallet
  material. These are already in `.gitignore` — keep it that way. If you think a
  secret leaked, tell a maintainer immediately (don't just delete it, history
  keeps it).
- Be respectful and constructive in issues and reviews.

## Getting set up

Follow the [Getting started](./README.md#getting-started) section of the README.
You'll need your own Supabase project, Privy app, and OpenAI key to run the full
stack. The app falls back to a local demo mode when Supabase isn't configured,
which is enough for most UI work.

## Workflow

1. **Fork** the repo and create a branch:
   `git checkout -b feat/short-description`
2. Make your change. Keep PRs focused and reasonably small.
3. Run the type checker and make sure the app builds:
   ```bash
   bunx tsc --noEmit
   npx expo start   # sanity-check the screens you touched
   ```
4. Commit with a clear message (see below), push your branch, and open a Pull
   Request against `main`.

## Commit messages

Use short, present-tense summaries, e.g.:

```
feat(home): add auto-scrolling banner carousel
fix(upload): handle frame extraction failure on simulator
```

## What to work on

Good first areas:

- New task types + task instructions (`src/data/tasks.ts`)
- Home page content and cards (`src/data/home.ts`)
- UI/UX polish and accessibility
- Improving the AI review prompt / scoring in `supabase/functions/reward`
- Tests and error handling

Please open an issue to discuss larger features (on-chain rewards, new auth
methods, Android polish) before starting.

## Code style

- TypeScript, functional React components with hooks
- Reuse the design system in `src/theme.ts` and `src/ui.tsx` instead of
  hardcoding colors/spacing
- Keep server-side logic (secrets, rewards) in the Edge Function, not the client

## Reporting bugs

Open an issue with steps to reproduce, expected vs actual behavior, and your
platform (iOS/Android, device/simulator, Expo version). Screenshots or a short
screen recording help a lot.
