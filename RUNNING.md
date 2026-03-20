# Running Sway

## What is currently verified

- Backend API boots successfully on `http://127.0.0.1:3000`
- Ops console boots successfully on `http://127.0.0.1:4173`
- Backend health check:

```json
{"ok":true,"product":"sway-social","dropHourWAT":20}
```

## Backend

```bash
cd "/Users/elnuru/Documents/New project/backend"
npm install
npm run start:dev
```

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

Open:

- `http://127.0.0.1:4173/`

## Compose Multiplatform App

The mobile app scaffold is present in `composeApp`, but it still needs a working Gradle wrapper or a healthy local Gradle install before it can be launched from Android Studio or Xcode.

Current blocker on this machine:

- the globally installed `gradle` binary fails native startup on `arm64`
- there is no `gradlew` wrapper committed yet

Once a wrapper is added, the expected path is:

```bash
cd "/Users/elnuru/Documents/New project"
./gradlew :composeApp:assembleDebug
```

Then:

- Android: open the project in Android Studio and run `composeApp`
- iOS: generate/open the iOS host project and use `MainViewController()` from `iosMain`

## Notes

- In this environment, binding local ports required running the backend and ops console outside the sandbox.
- If you want, the next useful step is for me to add a Gradle wrapper and finish the mobile bootstrap so the Compose Multiplatform app is runnable too.
