# P1-10 Monitoring and Auditability

## Objective
Add structured logging, health checks, error tracking, and audit trails so the team can detect, diagnose, and investigate production issues and sensitive operations.

## Why This Exists
The backend currently has minimal logging and no structured error tracking. When something fails in production — a payment webhook drops, a booking state gets stuck, a verification is incorrectly processed — there is no way to trace what happened. Audit trails are also required for trust-sensitive operations (verification decisions, freeze actions, refund approvals).

## Scope

### Structured Logging

- Replace ad-hoc `console.log` with structured logger (e.g., `pino` or `winston`)
- Log format: JSON with timestamp, level, context (module/service), request ID, user ID
- Log levels: error, warn, info, debug
- Request logging middleware: method, path, status, duration, user ID
- Sensitive field redaction (passwords, tokens, full phone numbers)

### Health Checks

- `/health` endpoint: app status, database connectivity, uptime
- `/health/ready` endpoint: full readiness (DB connected, migrations applied)
- Used by deployment platforms and monitoring

### Error Tracking

- Integrate error tracking service (Sentry recommended for Node.js + mobile)
- Backend: capture unhandled exceptions and rejected promises
- Mobile: capture crash reports and unhandled exceptions
- Include request context and user ID in error reports

### Audit Trail

- Audit log table for sensitive operations
- Events: verification approvals/rejections, freeze actions, refund approvals, booking overrides, user suspensions
- Fields: actor (ops user or system), action, target entity, timestamp, details/notes
- Append-only — no updates or deletes on audit records
- Ops console viewer for audit log

## Non-Goals

- APM (application performance monitoring) with tracing spans
- Custom metrics dashboard (Grafana, Datadog)
- Log aggregation service setup (defer to production hardening)
- Uptime monitoring (external service, not in-app)

## Dependencies

- `P0-01` (persistence — complete)
- `P0-10` (ops console — complete)

## Affected Areas

- `backend/src/` — logging setup, middleware, health controller
- `backend/src/modules/*.ts` — replace console.log with structured logger
- `backend/migrations/` — audit log table migration
- `backend/src/modules/ops.controller.ts` — audit log endpoints
- `ops-console/src/` — audit log viewer
- `composeApp/` — Sentry/crash reporting setup (Android + iOS)

## Implementation Notes

- Use NestJS built-in logger or `pino` via `nestjs-pino` for structured logging.
- Request ID generation: use `crypto.randomUUID()` per request, propagate via async context.
- Audit log entries should be written in the same transaction as the action when possible.
- Health check should test actual DB query (e.g., `SELECT 1`) not just connection pool status.
- Sentry DSN stored in environment config, not source code.

## Acceptance Criteria

- [ ] All backend log output is structured JSON with timestamp, level, and context.
- [ ] Request logging captures method, path, status, duration, and user ID.
- [ ] Sensitive fields (tokens, passwords) are redacted in logs.
- [ ] `/health` returns app status and DB connectivity.
- [ ] Unhandled backend exceptions reported to error tracking service.
- [ ] Mobile crashes reported to error tracking service.
- [ ] Audit log records all verification decisions, freeze actions, and refund approvals.
- [ ] Audit log is append-only and viewable in ops console.

## Review Checklist

- [ ] No PII logged beyond redacted identifiers.
- [ ] Audit log table has no UPDATE or DELETE operations in application code.
- [ ] Health check does not expose internal system details to unauthenticated callers.
- [ ] Error tracking DSN not committed to source control.
- [ ] Request ID propagated consistently across log entries for a single request.

## Test Checklist

- [ ] Structured log output verified for key API calls.
- [ ] Request logging middleware tested with sample requests.
- [ ] Health endpoint returns correct status when DB is up/down.
- [ ] Audit entry created for verification approval action.
- [ ] Audit entry created for freeze action.
- [ ] Ops console audit log viewer loads and filters entries.
- [ ] Error tracking captures intentionally thrown test exception.

## Completion Notes
