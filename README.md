# Ayuni

Ayuni is a Nigeria-focused real-dates app scaffolded as a greenfield monorepo with:

- `composeApp`: Kotlin Multiplatform + Compose Multiplatform consumer app
- `backend`: NestJS API for onboarding, suggestions, matching, booking, safety, and operations
- `ops-console`: React/Vite operations dashboard for moderation and venue support

## Product stance

- Android and iOS share most UI and business logic through Compose Multiplatform.
- The product is mass-market, but intentionally high-trust.
- No freeform chat before booking.
- Users receive 5 suggestions daily at `8:00 PM WAT`.
- Every booked date requires upfront token payment of `NGN 3,500`.
- Date formats emphasize cafes, lounges, brunch spots, hotel lobbies, dessert spots, and casual restaurants.

## Repo layout

```text
.
├── composeApp
├── backend
├── ops-console
├── build.gradle.kts
├── settings.gradle.kts
└── gradle.properties
```

## What is implemented

- Shared domain models for profiles, matches, bookings, date tokens, and safety.
- Rules engine for:
  - 48-hour match expiry
  - logistics-only chat opening exactly 2 hours before date start
  - refund and freeze eligibility
  - daily 8 PM suggestion batches
- Compose Multiplatform app shell with:
  - onboarding/trust overview
  - daily suggestions
  - match planning
  - booking and safety dashboard
- Nest-style API skeleton with the public endpoints from the product plan.
- In-memory backend services that demonstrate the end-to-end lifecycle.
- Operations dashboard scaffold for queue triage and venue oversight.

## Current environment note

The globally installed `gradle` binary on this machine currently fails to initialize native services on `arm64`, so I could not finish a full Gradle bootstrap in this turn. The project files are structured for Compose Multiplatform and can be completed by adding a working Gradle wrapper or a healthy local Gradle install.

## Next setup steps

1. Add a working Gradle wrapper and sync the `composeApp` project.
2. Run `npm install` inside `backend` and `ops-console`.
3. Start the API with `npm run start:dev` in `backend`.
4. Start the ops console with `npm run dev` in `ops-console`.
