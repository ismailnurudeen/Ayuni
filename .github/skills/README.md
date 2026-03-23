# Ayuni Copilot Skills

This directory contains specialized workflow skills for the Ayuni project. These skills are automatically discovered by GitHub Copilot when working in this repository.

## Available Skills

Each skill is invoked by typing `/` in the Copilot chat to see the list of available commands.

### Development Skills

- **ayuni-backend-foundation** - Backend persistence, auth, migrations, API contracts
- **ayuni-mobile-product** - Mobile app features in Compose Multiplatform
- **ayuni-bookings-and-payments** - Booking state, payments, Paystack integration
- **ayuni-trust-and-verification** - OTP, selfie, ID verification, safety reporting
- **ayuni-ops-console** - Admin tools and support workflows
- **ayuni-release-hardening** - Deployment, CI, observability

### Process Skills

- **ayuni-backlog-orchestrator** - Executes backlog tickets with proper skill routing
- **ayuni-review-gate** - Code review focused on security, regressions, spec compliance
- **ayuni-test-gate** - Validation and verification requirements
- **ayuni-product-qa** - Product quality assurance workflows

## How to Use

When working on a task, Copilot will automatically suggest relevant skills based on the context. You can also explicitly invoke a skill by:

1. Opening Copilot chat
2. Typing `/` to see available skills
3. Selecting the appropriate skill for your task

## Skill Discovery

Skills are discovered through their `description` field in the YAML frontmatter. The description contains keywords that help Copilot match the skill to your request.

## Adding New Skills

To add a new skill:

1. Create a new directory under `.github/skills/`
2. Add a `SKILL.md` file with YAML frontmatter:
   ```yaml
   ---
   name: skill-name
   description: Use when [description with keywords]
   ---
   ```
3. Document the workflow, inputs, and deliverables

## Source

These skills were migrated from `docs/skill-sources/` and adapted for GitHub Copilot with Claude.
