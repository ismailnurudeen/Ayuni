# P1-09 CI/CD Pipeline

## Objective
Set up continuous integration and deployment pipelines via GitHub Actions so every push is automatically tested, and deployments to staging/production are triggered by branch or tag.

## Why This Exists
There is currently no CI/CD configuration. Tests run only locally and manually. Deployment is ad-hoc. This creates risk of shipping broken builds and makes releases slow and error-prone. CI gates prevent regressions; CD automation makes releases repeatable.

## Scope

### CI (on every push and PR)

- Backend: install deps, lint, run Jest tests
- Mobile: Gradle build for Android (debug APK), run commonTest
- Ops console: install deps, lint, run tests, build
- Promo site: install deps, build
- Fail fast on any test failure or lint error

### CD (on merge to main or tag)

- Backend: deploy to staging server (e.g., Railway, Render, or VPS via SSH)
- Ops console: build and deploy static assets (e.g., Vercel, Netlify, or S3+CloudFront)
- Promo site: build and deploy static assets
- Mobile: build release APK/AAB, upload as artifact (full store deploy is P2)
- Environment-specific config injection (dev/staging/prod base URLs, secrets)

### Infrastructure

- GitHub Actions workflow files in `.github/workflows/`
- Secret management via GitHub Secrets
- Caching for node_modules, Gradle, and pod dependencies
- Status badges in README

## Non-Goals

- iOS App Store deployment (requires Apple Developer account setup)
- Google Play Store deployment (defer to release-hardening)
- Container orchestration (Kubernetes, ECS)
- Blue-green or canary deployments
- Infrastructure-as-code (Terraform, Pulumi)

## Dependencies

- `P1-08` (testing expansion — tests must exist to gate CI)
- `P0-16` (environment config — build-time config injection)

## Affected Areas

- `.github/workflows/` — new directory with workflow YAML files
- `README.md` — add CI status badges
- `backend/package.json` — ensure `test` and `lint` scripts defined
- `ops-console/package.json` — ensure `test`, `lint`, and `build` scripts defined
- `promo-site/package.json` — ensure `build` script defined

## Implementation Notes

- Use `actions/setup-node@v4` for Node.js, `actions/setup-java@v4` for Gradle/Android.
- Cache Gradle home (`~/.gradle`) and node_modules for faster CI runs.
- Backend test step: `cd backend && npm ci && npm test`.
- Mobile build step: `./gradlew :composeApp:assembleDebug` (Android) + `./gradlew :composeApp:desktopTest` (commonTest).
- Separate workflow files: `ci.yml` (runs on PR/push), `deploy-backend.yml`, `deploy-web.yml`.
- Use environment protection rules for production deployments.
- Secrets needed: deployment host credentials, API keys for staging/prod.

## Acceptance Criteria

- [ ] CI runs automatically on every push and PR to main.
- [ ] CI fails if backend tests fail.
- [ ] CI fails if mobile build fails or commonTest fails.
- [ ] CI fails if ops-console or promo-site build fails.
- [ ] CD deploys backend to staging on merge to main.
- [ ] CD deploys ops-console and promo-site on merge to main.
- [ ] Android debug APK uploaded as CI artifact.
- [ ] Secrets managed via GitHub Secrets, not committed to repo.
- [ ] CI caches dependencies for faster subsequent runs.
- [ ] README shows CI status badge.

## Review Checklist

- [ ] No secrets or credentials in workflow files (all via GitHub Secrets).
- [ ] Workflow permissions follow least-privilege principle.
- [ ] Cache keys include lockfile hashes to invalidate on dependency changes.
- [ ] CD workflows require CI pass before deploying.
- [ ] Environment protection rules configured for production.

## Test Checklist

- [ ] Push to feature branch triggers CI and reports status.
- [ ] PR shows CI check status before merge.
- [ ] Merge to main triggers CD for backend and web apps.
- [ ] CI correctly fails on intentionally broken test.
- [ ] Cached build is faster than first build.
- [ ] Deployment target receives correct build artifacts.

## Completion Notes
