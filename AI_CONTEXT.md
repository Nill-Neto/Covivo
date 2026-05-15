# AI Shared Context (Canonical Brief)

## Purpose
Keep a single, concise operational memory for any AI agent working in this repository.

## Source-of-truth order
1. Runtime code and database schema.
2. Automated tests and test fixtures.
3. Product/legal docs under `docs/`.
4. This file (`AI_CONTEXT.md`).
5. Structured event log (`ai/changelog.ndjson`).

If conflicts exist, follow the highest-priority source and register a correction event in `ai/changelog.ndjson`.

## Current product stage
- Product is pre-launch.
- Billing gateway (Stripe) is not connected in production.
- Legal policies are drafts pending formal legal review.
- Support/SAC operation is founder-operated for internal/beta exceptions.

## Active operating policy (pre-launch)
- Beta may include invited external users.
- No real subscription charging for public users before payment rails and legal checks are ready.
- Premium features can be enabled by whitelist during beta.
- Billing lifecycle states must still be technically testable via simulation (`active`, `past_due`, `downgraded_free`).

## Core decisions in force
- Group must always have at least one admin.
- Sponsor role is billing responsibility and does not grant governance power.
- Multi-group context is first-class; billing/governance rules are group-scoped.
- Dispute flow requires auditable states and operator justification.

## Immediate priorities
1. Stabilize pre-launch guardrails and beta charter.
2. Clarify invitations model evolution (friend-first + optional group invite).
3. Prepare Stripe-ready gates using readiness criteria (not calendar-only deadlines).

## Do-not-do list (until explicitly approved)
- Do not enable real billing collection from external users.
- Do not introduce irreversible legal/product claims in public copy.
- Do not merge policy text as "final" without legal validation.

## Update protocol
Any AI that makes material product/process decisions must:
1. Update this file if a durable decision changed.
2. Append one JSON line to `ai/changelog.ndjson` with date, agent, type, scope, summary, files, and commit.
3. Keep this file concise (target under 200 lines).
