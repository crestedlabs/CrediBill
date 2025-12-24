# Credibill – Project Context for Gemini Agent

## Overview

Credibill is a SaaS billing and subscription management platform designed to be used by multiple independent apps. Apps integrate with Credibill to handle plans, subscriptions, usage-based billing, invoices, and payments without caring about Credibill’s internal implementation.

Credibill is **not** a payment provider itself. It orchestrates billing logic and integrates with external PSPs such as Flutterwave, pawaPay, DPO, and Pesapal.

Tech stack:

- Backend: Convex
- Database: Convex schema
- Billing model: Flat-rate, usage-based, and hybrid plans
- Multi-tenant by organization

---

## Core Principles

- Multi-organization (B2B SaaS)
- One organization can own multiple apps
- Apps have plans
- Customers subscribe to plans
- Usage is tracked independently
- Invoices are generated from subscriptions + usage
- Payments reconcile invoices (can be partial or multiple)

---

## Entity Hierarchy (Top → Bottom)

Users  
→ Organizations  
→ OrganizationMembers  
→ Apps  
→ Plans  
→ Customers  
→ Subscriptions  
→ UsageEvents  
→ Invoices  
→ Payments

---

## Entities Explained

### Users

- Represent internal users (developers / business owners)
- Can belong to multiple organizations
- Do not directly own billing data

### Organizations

- Top-level tenant
- Owns apps, plans, customers, invoices, and payments
- Used for permissions and isolation

### OrganizationMembers

- Join table between users and organizations
- Roles: owner, admin, member

---

### Apps

- Products owned by an organization
- Example: Reciit, Brodkast, SalonSlot
- Customers subscribe to apps, not organizations directly

---

### Plans

- Belong to an app (and implicitly the organization)
- Define pricing rules:
  - Flat pricing
  - Usage-based pricing
  - Hybrid (base fee + usage)
- Plans are templates, not assignments

---

### Customers

- External paying entities (not platform users)
- Belong to an app
- Can have multiple subscriptions over time

---

### Subscriptions

- Bind a customer to a plan
- Track lifecycle:
  - trialing
  - active
  - paused
  - canceled
- Define billing period and usage aggregation window

---

### UsageEvents

- Record metered usage
- Always linked to a subscription
- Used to compute usage-based charges
- Example metrics: API calls, messages sent, receipts issued

---

### Invoices

- Generated periodically from:
  - Subscription base fee
  - Aggregated usage events
- Represent what the customer owes
- Status:
  - draft
  - open
  - paid
  - overdue
  - void

Invoices do **not** assume payment success.

---

### Payments

- Represent actual money movement
- Linked to invoices
- Support:
  - Multiple payments per invoice
  - Partial payments
  - Refunds
- Provider-agnostic (Flutterwave, pawaPay, DPO, Pesapal)

Invoice payment status is derived from payments.

---

## Important Design Decisions

- Plans belong to apps, not customers
- Customers do NOT directly choose pricing logic
- Subscriptions are the source of truth for billing
- Usage is decoupled from invoices
- Payments are decoupled from invoices
- Invoices can exist without payments
- One invoice can have multiple payments

---

## Current Project State

✅ Database schema fully designed in Convex  
✅ Usage-based billing accounted for  
✅ Multi-app, multi-org architecture finalized

🚧 Next phase:

- Backend API layer
- CRUD + business logic
- Invoice generation engine
- Payment reconciliation
- Access control (organization-based)

---

## What Gemini Should Help With Next

- Designing backend API endpoints
- Convex mutations and queries
- Billing logic (usage aggregation → invoice)
- Subscription lifecycle logic
- PSP webhook handling
- Permissions and access rules

---

## Constraints

- Must remain Convex-compatible
- Must be multi-tenant safe
- Must not assume Stripe-only workflows
- Must support African PSPs
