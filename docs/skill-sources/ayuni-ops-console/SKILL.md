---
name: ayuni-ops-console
description: Use when implementing Ayuni operations tooling: moderation queues, verification review, venue management, booking support, escalation actions, and incident handling UI.
---

# Ayuni Ops Console

Use this skill for admin/support workflows.

## Owns

- `/Users/elnuru/Documents/New project/ops-console/`
- related ops endpoints in backend when required

## Scope

- moderation queue
- user/profile lookup
- venue tools
- booking escalations
- verification review
- report resolution
- freeze/unfreeze controls

## Working Rules

1. Optimize for speed, clarity, and operator confidence.
2. Show the exact state needed to act without requiring DB access.
3. Every destructive or high-impact action should be auditable.
4. Prefer explicit filters and statuses over ambiguous dashboards.

## Required Deliverables

- live API-backed UI
- core operator actions
- error states and optimistic updates where safe
- verification that console behavior matches backend state
