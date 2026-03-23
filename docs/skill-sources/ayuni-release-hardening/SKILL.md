---
name: ayuni-release-hardening
description: Use when preparing Ayuni for deployment and release: CI/CD, environments, secrets, monitoring, legal/compliance surfaces, app config, and store readiness.
---

# Ayuni Release Hardening

Use this skill for tickets that make the project deployable and operable.

## Scope

- environment config
- CI/CD
- secrets handling
- deploy manifests
- observability
- crash/error reporting
- legal and consent surfaces
- release process docs

## Working Rules

1. Remove source-level environment coupling.
2. Prefer reproducible deployment config over manual tribal knowledge.
3. Track operational risks explicitly.
4. Add validation steps that can run in CI.

## Required Deliverables

- config changes
- pipeline updates
- runbooks or repo-local deployment docs where needed
- verification of staging/prod assumptions
