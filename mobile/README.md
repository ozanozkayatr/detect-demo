# Detect Mobile

Expo + React Native mobile shell for the Detect boxing analysis product.

## Current scope

- Expo Router app structure with bottom tabs
- Stitch-inspired visual direction
- backend health check against the existing FastAPI API
- initial route shells for:
  - home
  - analyses
  - profile
  - settings
  - new analysis
  - edit athlete profile

This is the starting point for the real mobile app. The existing `frontend/` Next.js demo can remain as a reference while mobile replaces it.

## Setup

```bash
cp .env.example .env
npm install
```

## Run

```bash
npm run start
```

iOS simulator:

```bash
npm run ios
```

Android emulator:

```bash
npm run android
```

Type-check:

```bash
npm run typecheck
```

## API base URL

Set this in `.env`:

```bash
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

Notes:

- `127.0.0.1` works for iOS simulator and local web testing.
- A real device on Expo Go needs your computer's LAN IP instead of `127.0.0.1`.

## Structure

```text
mobile/
├── src/app/
├── src/components/
├── src/design/
├── src/lib/
└── app.json
```
