# TsCodingConventions.md

## Purpose

This document defines the behavioral rules and coding guidelines that AI agents must follow when generating or modifying **TypeScript** code in this repository. The intent is to ensure consistency, maintainability, security, and alignment with modern TypeScript best practices.

---

## Scope

* Applies to **all TypeScript files** (`**/*.ts`)
* Assumes **TypeScript 5.x or newer**
* Compilation target: **ES2022**
* Enforced for all automated agents, generators, and reviewers

---

## Core Intent

Agents must:

* Respect existing architecture, abstractions, and conventions
* Prefer readable and explicit solutions over clever shortcuts
* Extend existing abstractions before introducing new ones
* Optimize for long-term maintainability: short methods, small classes, clear responsibilities

---

## General Guardrails

* Target **TypeScript 5.x / ES2022** and prefer native language features
* Use **pure ES modules only** (`import` / `export`)

  * Never emit or introduce `require`, `module.exports`, or CommonJS helpers
* Rely on the repository’s existing build, lint, and test workflows
* When intent or trade-offs are non-obvious, document the reasoning

---

## Project Organization

* Follow the repository’s established folder structure and responsibility boundaries
* Use **kebab-case** filenames (e.g. `user-session.ts`, `data-service.ts`) unless explicitly instructed otherwise
* Keep tests, types, and helpers close to their implementation when it improves discoverability
* Reuse or extend shared utilities before adding new ones

---

## Naming & Style

* **PascalCase**: classes, interfaces, enums, type aliases
* **camelCase**: variables, functions, methods, properties
* Do **not** prefix interfaces with `I`
* Name entities after **behavior or domain meaning**, not implementation details

---

## Formatting & Code Style

* Run and respect the repository’s formatter and linter configuration
* Match existing rules for:

  * Indentation
  * Quotes
  * Trailing commas
* Keep functions focused; extract helpers as branching grows
* Prefer immutable data and pure functions when practical

---

## Type System Expectations

Agents must:

* Avoid `any` (explicit or implicit)
* Prefer `unknown` with explicit narrowing when type certainty is not guaranteed
* Use **discriminated unions** for:

  * Realtime events
  * State machines
* Centralize shared contracts instead of duplicating shapes
* Use TypeScript utility types intentionally (`Readonly`, `Partial`, `Record`, etc.) to express intent

---

## Async, Events & Error Handling

* Use `async` / `await` consistently
* Wrap awaited operations in `try/catch` and emit structured errors
* Guard invalid or edge cases early to reduce nesting
* Route errors through the project’s logging or telemetry utilities
* Surface user-facing errors using the repository’s notification patterns
* Debounce configuration-driven updates
* Dispose resources deterministically

---

## Architecture & Patterns

* Follow the repository’s dependency injection or composition patterns
* Keep modules **single-purpose**
* Respect existing initialization and disposal lifecycles
* Maintain clear boundaries between:

  * Transport
  * Domain
  * Presentation
* When adding services:

  * Provide lifecycle hooks (e.g. `initialize`, `dispose`)
  * Add focused, targeted tests

---

## External Integrations

Agents must:

* Instantiate external clients outside hot paths
* Inject dependencies to preserve testability
* Never hardcode secrets
* Apply retries, backoff, and cancellation to IO or network calls
* Normalize external responses into domain models
* Map external errors into domain-specific error shapes

---

## Security Practices

Agents must:

* Validate and sanitize all external input using schemas or type guards
* Avoid dynamic code execution and untrusted template rendering
* Encode untrusted content before rendering HTML
* Use parameterized queries or prepared statements
* Store secrets in secure storage and request least-privilege scopes
* Favor immutable flows and defensive copies for sensitive data
* Use only vetted cryptographic libraries
* Keep dependencies patched and monitor security advisories

---

## Configuration & Secrets

* Access configuration through shared helpers only
* Validate configuration using schemas or validators
* Guard against `undefined` or invalid configuration states
* Document newly introduced configuration keys
* Update or add related tests

---

## UI & UX Components

* Sanitize user-generated or external content before rendering
* Keep UI layers thin
* Push business logic into services or state managers
* Use events or messaging to decouple UI from domain logic

---

## Testing Expectations

Agents must:

* Add or update unit tests using the project’s testing framework
* Extend integration or end-to-end tests when behavior crosses module or platform boundaries
* Run targeted test suites before submitting changes
* Avoid brittle timing-based assertions
* Prefer fake timers or injected clocks

---

## Performance & Reliability

* Lazy-load heavy dependencies
* Dispose resources when no longer needed
* Defer expensive work until necessary
* Batch or debounce high-frequency events
* Track resource lifetimes to prevent leaks

---

## Documentation & Comments

* Add JSDoc for public APIs
* Use `@remarks` and `@example` where they improve clarity
* Write comments that explain intent, not mechanics
* Remove outdated comments during refactors
* Update architectural or design documents when introducing new patterns

---

## Enforcement

* Generated code must comply with this document
* Deviations require explicit justification in comments or review notes
* Consistency across the codebase is mandatory
