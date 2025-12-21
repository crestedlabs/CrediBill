# CrediBill ⚡️

[![CI](https://img.shields.io/github/actions/workflow/status/crestedlabs/CrediBill/ci.yml?branch=main&label=CI&style=flat-square)](https://github.com/crestedlabs/CrediBill/actions)
[![License](https://img.shields.io/github/license/crestedlabs/CrediBill?style=flat-square)](https://github.com/crestedlabs/CrediBill/blob/main/LICENSE)
[![Issues](https://img.shields.io/github/issues/crestedlabs/CrediBill?style=flat-square)](https://github.com/crestedlabs/CrediBill/issues)
[![Stars](https://img.shields.io/github/stars/crestedlabs/CrediBill?style=social)](https://github.com/crestedlabs/CrediBill)

**CrediBill** is a lightweight subscription management and billing engine built for African SaaS applications. It provides a unified API and dashboard so multiple SaaS apps can outsource billing, invoicing, and subscription lifecycle logic to a single, provider-agnostic service.

---

## Table of contents

- [What is CrediBill](#what-is-credibill)
- [Why CrediBill exists](#why-credibill-exists)
- [Core features](#core-features)
- [High-level architecture](#high-level-architecture)
- [Tech stack](#tech-stack)
- [Project status](#project-status)
- [Contributing](#contributing)
- [License](#license)

---

<a name="what-is-credibill"></a>

## 🔍 What is CrediBill

CrediBill is a multi-tenant billing platform that:

- Centralizes subscription and invoice management for multiple SaaS apps (each app is isolated by `appId`).
- Abstracts payment provider complexity behind **payment adapter** interfaces so apps never need to integrate payment SDKs directly.
- Exposes a simple external API for apps and an internal dashboard for operators.

---

<a name="why-credibill-exists"></a>

## 💡 Why CrediBill exists

Many African SaaS teams spend time integrating and maintaining multiple local and global payment providers. CrediBill removes that burden by providing a single, consistent billing API and dashboard that handles provider differences and regional payments complexities.

---

<a name="core-features"></a>

## ✅ Core features

- Multi-tenant architecture (appId-based isolation)
- Customer management across apps
- Subscription lifecycle management with the canonical states: `TRIALING` → `ACTIVE` → `PAST_DUE` → `CANCELED` → `EXPIRED`
- Free trial support with automatic expiration
- Invoice generation and storage
- Provider-agnostic payment adapter system for adding new African/local providers
- Unified webhook handling and reconciliation
- Internal dashboard and public API for SaaS apps

---

<a name="high-level-architecture"></a>

## 🏗️ High-level architecture

- Frontend: Next.js (App Router) dashboard + public API surface
- Backend & Data: Convex for functions and persistent storage
- Authentication: Clerk for user and operator auth
- Payment adapters: pluggable modules that map provider-specific events to the canonical subscription model
- Webhooks: single endpoint to ingest provider events and normalize updates into internal state

---

<a name="tech-stack"></a>

## 🧰 Tech stack

- **Next.js (App Router)** — dashboard & API
- **React + TypeScript** — UI and type safety
- **Convex** — backend functions and database
- **Clerk** — authentication
- **Tailwind CSS** + **shadcn/ui** — design system / components
- **Sonner** — toast notifications

---

<a name="project-status"></a>

## ⚠️ Project status

**Early-stage / WIP** — CrediBill is in active development. Core concepts and initial integrations are being implemented. Expect rapid changes to APIs and data models.

Contributions, design feedback, and bug reports are welcome.

---

<a name="contributing"></a>

## Contributing

If you'd like to contribute, please open issues or pull requests and describe the use case you want to support (tenant patterns, providers, edge-cases).

---

<a name="license"></a>

## License

This repository is available under an open source license (see `LICENSE` if present).
