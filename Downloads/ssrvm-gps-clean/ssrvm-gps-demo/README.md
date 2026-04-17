# SSRVM GPS Tracker — Agartala Demo

Live school bus tracking app for Sri Sri Ravishankar Vidya Mandir, Agartala.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run the server
npm start
# or for auto-reload during development:
npm run dev

# 3. Open browser
# http://localhost:3000
```

## Login Credentials (Demo)

| Field    | Value        |
|----------|-------------|
| Username | `ssrvm`      |
| Password | `Ssrvm@2026` |

## Project Structure

```
ssrvm-gps-demo/
├── backend/
│   ├── server.js      ← Express server + SSE endpoints
│   ├── config.js      ← All settings (credentials, school coords, geofence)
│   ├── simulator.js   ← Realistic bus movement simulation
│   └── demoData.js    ← 27 buses, 7 routes (Agartala area)
└── app/
    ├── index.html     ← Full single-page app
    ├── manifest.json  ← PWA manifest
    ← sw.js           ← Service worker (offline + push notifications)
    ├── alert.wav      ← Beep sound for geofence alerts
    ├── icon-192.png   ← PWA icon
    ├── icon-512.png   ← PWA icon
    └── css/
        └── app.css    ← All styles
```

## Features

- ✅ 27 simulated buses with realistic movement
- ✅ Live SSE updates (no polling, no refresh needed)
- ✅ Map/Satellite toggle (OpenStreetMap + Esri, no API key)
- ✅ 10-minute geofence alert (banner + notification + sound + vibration)
- ✅ Follow mode, blue dot user location, school marker
- ✅ Bus trail, stats panel, driver info
- ✅ PWA — installable on Android/iOS home screen
- ✅ JWT authentication with 30-day token

## Customising for Real Use

Edit `backend/config.js`:
- `AUTH.USERNAME` / `AUTH.PASSWORD` — change login credentials
- `SCHOOL.LAT` / `SCHOOL.LNG` — set exact school GPS coordinates
- `SCHOOL.ADDRESS` / `SCHOOL.PHONE` — fill in school contact details
- `GEOFENCE.ALERT_MINUTES` — change alert distance (default: 10 min)

Edit `backend/demoData.js`:
- `BUSES` array — replace `TODO: Driver Name` / `TODO: Phone` with real data
- `ROUTES` — replace with actual school bus routes (GPS waypoints)

## Browser Compatibility

| Feature         | Chrome Android | Safari iOS | Desktop |
|----------------|----------------|------------|---------|
| Maps           | ✅              | ✅          | ✅       |
| Live updates   | ✅              | ✅          | ✅       |
| Geofence banner| ✅              | ✅          | ✅       |
| Notifications  | ✅              | ❌ (Apple)  | ✅       |
| Vibration      | ✅              | ❌          | ❌       |
| Sound          | ✅*             | ✅*         | ✅*      |

*Requires user interaction first (tap anything in the app)

## Requirements

- Node.js ≥ 18.0.0
- npm

## Notes

- The simulator runs entirely in memory — no database needed
- All map tiles are free (OpenStreetMap + Esri Satellite)
- No external API keys required
- For production: add HTTPS, use real GPS from bus devices, replace demo data
