# Running Ayuni

## Quick Start

For **local development**, follow the instructions below.  
For **deployment and production configuration**, see **[DEPLOYMENT.md](DEPLOYMENT.md)**.

## What is currently verified

- Backend API boots successfully on `http://127.0.0.1:3000`
- Ops console boots successfully on `http://127.0.0.1:4173`
- Backend health check:

```json
{"ok":true,"product":"ayuni","dropHourWAT":20}
```

## Backend

```bash
cd "/Users/elnuru/Documents/New project/backend"
npm install
# Optional for durable local data:
# export DATABASE_URL="postgres://localhost:5432/ayuni"
npm run migrate
npm run start:dev
```

> **💡 Configuration Tip**: For full environment setup including Twilio and Paystack, copy `backend/.env.example` to `backend/.env` and fill in your credentials. See [DEPLOYMENT.md](DEPLOYMENT.md) for details.

Notes:

- If `DATABASE_URL` is set, Ayuni uses PostgreSQL and data survives restarts.
- If `DATABASE_URL` is not set, the backend falls back to `pg-mem` for local/test convenience only.
- Demo fixtures are enabled automatically outside production. Set `AYUNI_ENABLE_DEMO_FIXTURES=false` to disable them.
- Without Twilio credentials, OTP codes are logged to console (test mode).
- Without Paystack credentials, payments return mock responses (test mode).

Useful endpoints:

- `GET http://127.0.0.1:3000/v1/health`
- `GET http://127.0.0.1:3000/v1/suggestions/daily?city=Lagos`
- `GET http://127.0.0.1:3000/v1/bookings`
- `GET http://127.0.0.1:3000/v1/ops/overview`

Example API calls:

```bash
curl -s http://127.0.0.1:3000/v1/health
curl -s "http://127.0.0.1:3000/v1/suggestions/daily?city=Lagos"
curl -s -X POST http://127.0.0.1:3000/v1/payments/date-token/initiate \
  -H "Content-Type: application/json" \
  -d '{"paymentMethod":"ussd"}'
```

## Ops Console

```bash
cd "/Users/elnuru/Documents/New project/ops-console"
npm install
npm run dev -- --host 127.0.0.1 --port 4173
```

> **💡 Configuration Tip**: The ops console API endpoint can be configured via `.env` file (`VITE_API_BASE_URL`). By default it uses `http://localhost:3000/v1`. See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment.

Open:

- `http://127.0.0.1:4173/`

## Compose Multiplatform App

The mobile app scaffold is present in `composeApp`, but it still needs a working Gradle wrapper or a healthy local Gradle install before it can be launched from Android Studio or Xcode.

> **💡 Configuration Tip**: The mobile app's API endpoint is configured via `gradle.properties` (`API_BASE_URL`). By default it points to `http://localhost:3000/v1`. For production builds, override with `-PAPI_BASE_URL=https://your-backend.com/v1`. See [DEPLOYMENT.md](DEPLOYMENT.md) for details.

Current blocker on this machine:

- the globally installed `gradle` binary fails native startup on `arm64`
- there is no `gradlew` wrapper committed yet

Once a wrapper is added, the expected path is:

```bash
cd "/Users/elnuru/Documents/New project"
./gradlew :composeApp:assembleDebug
# For production: ./gradlew :composeApp:assembleRelease -PAPI_BASE_URL=https://your-backend.com/v1
```

Then:

- Android: open the project in Android Studio and run `composeApp`
- iOS: generate/open the iOS host project and use `MainViewController()` from `iosMain`

## Notes

- In this environment, binding local ports required running the backend and ops console outside the sandbox.
- If you want, the next useful step is for me to add a Gradle wrapper and finish the mobile bootstrap so the Compose Multiplatform app is runnable too.
