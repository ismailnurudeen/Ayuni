---
name: ayuni-review-gate
description: Use when reviewing an Ayuni backlog item. Focus on bugs, regressions, security/privacy risks, spec mismatch, and missing tests. This skill is for code review, not implementation.
---

# Ayuni Review Gate

Use this skill after implementation and before marking a ticket complete.

## Review Priorities

1. Behavioral regressions
2. Security/privacy issues
3. Spec mismatches
4. State model inconsistencies
5. Missing tests

## Required Review Output

- findings ordered by severity
- file references
- open questions or assumptions
- explicit statement when no findings are found

## Ayuni-Specific Checks

- does the change preserve the no-chat-before-date rule?
- does it respect trust/verification gates?
- does it keep user-specific data isolated?
- is money/booking logic server-authoritative?
- does the UI match the current product rules?
