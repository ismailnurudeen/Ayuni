---
name: ayuni-backend-foundation
description: Use when implementing Ayuni backend foundation work: persistence, auth/session, API contracts, migrations, environment config, notification plumbing, and durable user-scoped state.
---

# Ayuni Backend Foundation

Use this skill for backend tickets that establish or harden the system of record.

## Owns

- `/Users/elnuru/Documents/New project/backend/`

## Typical Ticket Types

- persistent storage
- auth/session
- migrations
- API request/response contracts
- user scoping
- bootstrap payload correctness
- notification persistence
- environment configuration

## Working Rules

1. Prefer explicit domain models over loose `any` payloads.
2. Make all user-facing state user-specific.
3. Keep endpoints idempotent where retries are likely.
4. Add migration-safe schema changes.
5. Do not leave production logic in singleton in-memory variables unless the ticket explicitly allows scaffolding.

## Required Deliverables

- schema or persistence layer updates
- controller/service updates
- request/response validation
- tests for happy path and at least one failure path

## Acceptance Focus

- data survives restart
- multi-user isolation works
- auth state is enforceable
- bootstrap is complete and coherent
