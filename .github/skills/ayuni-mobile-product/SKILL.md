---
name: ayuni-mobile-product
description: Use when implementing Ayuni mobile product work in Compose Multiplatform: onboarding, profile, rounds, dates, settings, navigation, API integration, and feature state management.
---

# Ayuni Mobile Product

Use this skill for user-facing mobile changes.

## Owns

- `/Users/elnuru/Documents/New project/composeApp/`

## Typical Ticket Types

- onboarding
- rounds flow
- profile editing
- settings
- notifications
- dates tab
- API integration
- screen state and error handling

## Product Rules To Preserve

- no freeform pre-date chat
- 5 suggestions per round
- 8:00 PM WAT round drop
- accepted profiles capped at 5
- booking requires payment
- advanced trust steps can be deferred, but booking gates must be respected

## Working Rules

1. Keep `App.kt` thin; move logic to feature state holders when possible.
2. Prefer fixed, clear, mobile-first layouts over dense debug UI.
3. Every network action must handle loading, success, and failure.
4. Never hardcode production-only values into source if build config can own them.

## Required Deliverables

- screen updates
- API wiring
- loading/error states
- compile verification
- manual UX sanity check list
