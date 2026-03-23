# Deployment Configuration Guide

This document describes how to deploy and configure Ayuni for different environments.

## Overview

Ayuni consists of three deployable components:
1. **Backend** (NestJS API server)
2. **Ops Console** (React/Vite web app)
3. **Mobile App** (Kotlin Multiplatform for Android & iOS)

All components are configured via environment variables and build properties, **not source code edits**.

---

## Backend Deployment

### Environment Variables

The backend requires the following environment variables:

#### Required for Production

```bash
# Server
PORT=3000

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/database
DATABASE_SSL=true  # Enable SSL for production databases

# Twilio (SMS/OTP)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+234xxxxxxxxxx

# Paystack (Payments)
PAYSTACK_SECRET_KEY=sk_live_your_production_secret_key
```

#### Optional

```bash
NODE_ENV=production  # Enables production optimizations
```

### Setup Steps

1. **Create `.env` file** from `.env.example`:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Edit `.env`** with your production credentials

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Run migrations**:
   ```bash
   npm run migrate
   ```

5. **Start server**:
   ```bash
   npm start
   ```

### Test Mode

If any of the following environment variables are missing, the backend will run in **test mode**:
- Missing Twilio credentials → OTP codes logged to console instead of SMS
- Missing Paystack key → Payment transactions return mock responses

This is useful for local development but **not suitable for production**.

---

## Ops Console Deployment

### Environment Variables

```bash
# API endpoint (required)
VITE_API_BASE_URL=https://your-backend-url.com/v1
```

### Setup Steps

1. **Create `.env` file** from `.env.example`:
   ```bash
   cd ops-console
   cp .env.example .env
   ```

2. **Edit `.env`** with your backend URL

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```
   
   This creates a `dist/` folder with static files.

5. **Deploy** the `dist/` folder to any static hosting provider:
   - Vercel
   - Netlify
   - Cloudflare Pages
   - AWS S3 + CloudFront
   - etc.

### Local Development

```bash
npm run dev
```

The dev server will use `VITE_API_BASE_URL` from `.env` or default to `http://localhost:3000/v1`.

---

## Mobile App Deployment

### Configuration

The mobile app's API base URL is configured via **Gradle properties**, not environment variables.

#### Development Build (local backend)

**Default**: Points to `http://localhost:3000/v1` (defined in `gradle.properties`)

```bash
./gradlew assembleDebug  # Android
```

#### Production Build

**Option 1**: Override via command line
```bash
./gradlew assembleRelease -PAPI_BASE_URL=https://ayuni-backend.onrender.com/v1
```

**Option 2**: Override via environment variable
```bash
export API_BASE_URL=https://ayuni-backend.onrender.com/v1
./gradlew assembleRelease
```

**Option 3**: Edit `local.properties` (not committed to git)
```properties
API_BASE_URL=https://ayuni-backend.onrender.com/v1
```

### Staging vs Production

You can build different variants for different environments:

```bash
# Staging build
./gradlew assembleRelease -PAPI_BASE_URL=https://ayuni-staging.onrender.com/v1

# Production build
./gradlew assembleRelease -PAPI_BASE_URL=https://ayuni-backend.onrender.com/v1
```

### iOS Build

The same `API_BASE_URL` property applies to iOS builds. The build script auto-generates the config during compilation.

---

## Environment Checklist

### Development
- [ ] Backend runs locally on port 3000
- [ ] Backend `.env` has test credentials (or runs in test mode)
- [ ] Ops console points to `http://localhost:3000/v1`
- [ ] Mobile app uses default dev config (`http://localhost:3000/v1`)

### Staging
- [ ] Backend deployed with staging database
- [ ] Backend has real Twilio/Paystack credentials (or test mode)
- [ ] Ops console `.env` points to staging backend URL
- [ ] Mobile builds use staging backend URL via `-PAPI_BASE_URL`

### Production
- [ ] Backend deployed with production database
- [ ] Backend has production Twilio/Paystack credentials
- [ ] `DATABASE_SSL=true`
- [ ] Ops console `.env` points to production backend URL
- [ ] Mobile builds use production backend URL via `-PAPI_BASE_URL`
- [ ] All `.env` files are excluded from version control

---

## Security Checklist

- [ ] **No secrets committed to git** (check `.gitignore`)
- [ ] **No hardcoded URLs** in source code
- [ ] **Production database** uses SSL (`DATABASE_SSL=true`)
- [ ] **Twilio/Paystack keys** are production keys (not test keys)
- [ ] **Environment variables** set in deployment platform (not in code)

---

## Troubleshooting

### Backend can't connect to database
- Check `DATABASE_URL` format: `postgresql://user:password@host:port/database`
- Check `DATABASE_SSL` setting matches your database provider's requirements
- Test connection: `psql $DATABASE_URL`

### SMS not sending (Twilio)
- Check `TWILIO_ACCOUNT_SID` starts with `AC`
- Check `TWILIO_PHONE_NUMBER` is in E.164 format (`+234...`)
- Check console logs for "TEST MODE" warning
- Verify credentials in Twilio console

### Payments not processing (Paystack)
- Check `PAYSTACK_SECRET_KEY` starts with `sk_live_` (production) or `sk_test_` (test)
- Check console logs for "TEST MODE" warning
- Verify webhook URL is configured in Paystack dashboard

### Mobile app can't reach backend
- Check `API_BASE_URL` in build logs
- For Android emulator, use `http://10.0.2.2:3000/v1` instead of `localhost`
- For iOS simulator, use `http://localhost:3000/v1`
- For physical devices, use your computer's IP address or deployed backend URL

### Ops console shows CORS errors
- Check backend is running and accessible
- Check `VITE_API_BASE_URL` is correct
- Check backend CORS configuration allows ops console origin

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# Build mobile app for production
- name: Build Android Release
  run: ./gradlew assembleRelease -PAPI_BASE_URL=${{ secrets.PROD_API_URL }}

# Build ops console
- name: Build Ops Console
  env:
    VITE_API_BASE_URL: ${{ secrets.PROD_API_URL }}
  run: |
    cd ops-console
    npm install
    npm run build

# Deploy backend
- name: Deploy Backend
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    TWILIO_ACCOUNT_SID: ${{ secrets.TWILIO_SID }}
    TWILIO_AUTH_TOKEN: ${{ secrets.TWILIO_TOKEN }}
    TWILIO_PHONE_NUMBER: ${{ secrets.TWILIO_PHONE }}
    PAYSTACK_SECRET_KEY: ${{ secrets.PAYSTACK_KEY }}
  run: |
    cd backend
    npm install
    npm run build
    npm run migrate
```

---

## Quick Reference

| Component | Config Method | Development Default | Production Override |
|-----------|---------------|---------------------|---------------------|
| Backend | `.env` file | `PORT=3000`, test mode | Set all env vars in deployment platform |
| Ops Console | `.env` file | `http://localhost:3000/v1` | Set `VITE_API_BASE_URL` in `.env` or hosting platform |
| Mobile App | Gradle property | `http://localhost:3000/v1` | `./gradlew -PAPI_BASE_URL=...` or env var |

---

For more details, see:
- Backend: `backend/README.md`
- Ops Console: `ops-console/README.md`
- Mobile App: `RUNNING.md`
