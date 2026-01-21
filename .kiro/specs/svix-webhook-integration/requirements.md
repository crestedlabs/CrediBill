# Requirements Document: Svix Webhook Integration

## Introduction

This specification defines the requirements for replacing CrediBill's custom outgoing webhook delivery system with Svix, a managed webhook infrastructure service. The current system implements manual retry logic, signature generation, and delivery tracking. Svix will provide enterprise-grade reliability, automatic retries, customer-facing webhook dashboards, debugging tools, and better delivery guarantees.

## Glossary

- **Svix**: A managed webhook infrastructure service that handles webhook delivery, retries, and monitoring
- **CrediBill_App**: An application created by a CrediBill customer to manage their billing
- **Svix_Application**: A Svix entity that represents a CrediBill_App and manages its webhook endpoints
- **Webhook_Endpoint**: A customer-configured URL that receives webhook events
- **Event_Type**: A categorized webhook event (e.g., subscription.created, invoice.paid)
- **Message**: A Svix term for a webhook delivery attempt containing event data
- **Delivery_Attempt**: A single attempt to deliver a webhook message to an endpoint
- **Webhook_Dashboard**: A Svix-provided UI where customers can view and debug webhook deliveries
- **Signature**: A cryptographic hash used to verify webhook authenticity
- **Legacy_System**: The current custom webhook implementation in webhookDelivery.ts and outgoingWebhooks.ts
- **Migration_Period**: The transition phase where both Legacy_System and Svix operate simultaneously

## Requirements

### Requirement 1: Svix Application Management

**User Story:** As a CrediBill platform administrator, I want each CrediBill_App to be represented as a Svix_Application, so that webhook endpoints can be managed through Svix infrastructure.

#### Acceptance Criteria

1. WHEN a CrediBill_App is created, THE System SHALL create a corresponding Svix_Application
2. WHEN a Svix_Application is created, THE System SHALL store the Svix application ID in the apps table
3. WHEN a CrediBill_App is deleted, THE System SHALL delete the corresponding Svix_Application
4. THE System SHALL use the CrediBill_App name as the Svix_Application name
5. THE System SHALL include CrediBill_App metadata in the Svix_Application (organizationId, appId, mode)

### Requirement 2: Webhook Endpoint Management

**User Story:** As a SaaS developer using CrediBill, I want to manage my webhook endpoints through Svix, so that I can configure multiple endpoints with different event subscriptions.

#### Acceptance Criteria

1. WHEN a customer configures a webhook URL, THE System SHALL create a Svix endpoint for that URL
2. WHEN a customer updates their webhook URL, THE System SHALL update the corresponding Svix endpoint
3. WHEN a customer deletes their webhook URL, THE System SHALL disable the corresponding Svix endpoint
4. THE System SHALL allow customers to subscribe to specific Event_Types per endpoint
5. THE System SHALL provide customers with a link to the Svix_Dashboard for their application
6. WHEN a customer accesses the Svix_Dashboard, THE System SHALL generate a time-limited dashboard access URL

### Requirement 3: Event Delivery via Svix

**User Story:** As a CrediBill platform, I want to send webhook events through Svix, so that customers receive reliable webhook deliveries with automatic retries.

#### Acceptance Criteria

1. WHEN a billable event occurs, THE System SHALL send a message to Svix with the event type and payload
2. THE System SHALL include event metadata (timestamp, app_id, event_id) in the message
3. THE System SHALL use Svix's idempotency mechanism to prevent duplicate deliveries
4. WHEN Svix delivers a webhook, THE System SHALL NOT perform additional signature generation
5. THE System SHALL map CrediBill Event_Types to Svix event type strings
6. THE System SHALL support all existing webhook events (subscription.*, invoice.*, customer.*, payment.*, plan.*)

### Requirement 4: Webhook Signature Verification

**User Story:** As a SaaS developer receiving webhooks, I want to verify webhook authenticity using Svix signatures, so that I can trust the webhook source.

#### Acceptance Criteria

1. THE System SHALL provide customers with their Svix webhook signing secret
2. THE System SHALL document how to verify Svix webhook signatures using the Svix SDK
3. WHEN a webhook is delivered, THE Svix SHALL include signature headers (svix-id, svix-timestamp, svix-signature)
4. THE System SHALL provide code examples for signature verification in js
5. THE System SHALL deprecate the custom X-Webhook-Signature header in favor of Svix signatures

### Requirement 5: Webhook Delivery Monitoring

**User Story:** As a SaaS developer, I want to view webhook delivery logs and debug failed deliveries, so that I can troubleshoot integration issues.

#### Acceptance Criteria

1. WHEN a customer views webhook settings, THE System SHALL display a link to the Svix_Dashboard
2. WHEN a customer accesses the Svix_Dashboard, THE System SHALL show delivery attempts, response codes, and timing
3. THE System SHALL allow customers to manually retry failed webhook deliveries through the Svix_Dashboard
4. THE System SHALL display webhook delivery statistics (success rate, average latency) in the CrediBill UI
5. THE System SHALL query Svix API to retrieve recent delivery attempts for display in CrediBill UI

### Requirement 6: Migration from Legacy System

**User Story:** As a CrediBill platform administrator, I want to migrate existing webhook configurations to Svix without disrupting customer integrations, so that the transition is seamless.

#### Acceptance Criteria

There is nothing in outgoing webhooks to break since
i had not yet started sending actual webhooks

### Requirement 7: Error Handling and Fallback

**User Story:** As a CrediBill platform administrator, I want graceful error handling when Svix API is unavailable, so that the platform remains operational during Svix outages.

#### Acceptance Criteria

1. WHEN Svix API returns an error, THE System SHALL log the error with full context
2. WHEN Svix API is unavailable during app creation, THE System SHALL retry Svix_Application creation asynchronously
3. WHEN Svix API is unavailable during event delivery, THE System SHALL queue the event for retry
4. THE System SHALL implement exponential backoff for Svix API retries
5. WHEN Svix API errors persist, THE System SHALL alert platform administrators
6. THE System SHALL NOT fail customer-facing operations due to Svix API errors

### Requirement 8: Svix Configuration Management

**User Story:** As a CrediBill platform administrator, I want to configure Svix API credentials securely, so that the integration is properly authenticated.

#### Acceptance Criteria

1. THE System SHALL store the Svix API key in Convex environment variables
2. THE System SHALL support separate Svix API keys for test and live modes
3. THE System SHALL validate Svix API key on application startup
4. WHEN Svix API key is invalid, THE System SHALL log an error and disable Svix integration
5. THE System SHALL provide documentation for obtaining and configuring Svix API keys

### Requirement 9: Event Type Mapping

**User Story:** As a CrediBill platform, I want to map internal event types to Svix event type strings, so that customers can filter events by type.

#### Acceptance Criteria

1. THE System SHALL define a mapping between CrediBill events and Svix event type strings
2. THE System SHALL use dot notation for event types (e.g., subscription.created, invoice.paid)
3. THE System SHALL support event type filtering in Svix endpoint configuration
4. THE System SHALL document all available event types for customers
5. THE System SHALL maintain backward compatibility with existing event type names

### Requirement 10: Webhook Testing

**User Story:** As a SaaS developer, I want to send test webhooks to my endpoint, so that I can verify my integration before going live.

#### Acceptance Criteria

1. WHEN a customer clicks "Send Test", THE System SHALL send a test message through Svix
2. THE test message SHALL include a test.webhook event type
3. THE test message SHALL include sample payload data
4. THE System SHALL display the test delivery result in the UI
5. THE System SHALL allow customers to view test deliveries in the Svix_Dashboard

### Requirement 11: Webhook Payload Structure

**User Story:** As a SaaS developer, I want webhook payloads to follow a consistent structure, so that I can parse them reliably.

#### Acceptance Criteria

1. THE System SHALL include event type in the payload root
2. THE System SHALL include event data in a "data" field
3. THE System SHALL include timestamp in ISO 8601 format
4. THE System SHALL include app_id for multi-tenant customers
5. THE System SHALL include event_id for idempotency tracking
6. THE System SHALL maintain backward compatibility with existing payload structure

### Requirement 12: Svix Dashboard Access

**User Story:** As a SaaS developer, I want secure access to the Svix webhook dashboard, so that I can view and debug my webhook deliveries.

#### Acceptance Criteria

1. WHEN a customer clicks "View Dashboard", THE System SHALL generate a Svix dashboard access URL
2. THE dashboard access URL SHALL be time-limited (expires after 1 hour)
3. THE dashboard access URL SHALL be scoped to the customer's Svix_Application only
4. WHEN the access URL expires, THE System SHALL allow customers to generate a new URL
5. THE System SHALL log dashboard access for security auditing

### Requirement 13: Webhook Retry Configuration

**User Story:** As a CrediBill platform, I want Svix to handle webhook retries automatically, so that transient failures don't result in lost events.

#### Acceptance Criteria

1. THE System SHALL configure Svix to retry failed deliveries automatically
2. THE System SHALL use Svix's default retry schedule (exponential backoff)
3. THE System SHALL allow Svix to retry up to the maximum configured attempts
4. WHEN all retry attempts fail, THE System SHALL mark the delivery as permanently failed
5. THE System SHALL NOT implement custom retry logic on top of Svix retries

### Requirement 14: Webhook Security

**User Story:** As a SaaS developer, I want webhooks to be delivered securely, so that sensitive billing data is protected.

#### Acceptance Criteria

1. THE System SHALL only allow HTTPS URLs for webhook endpoints
2. THE System SHALL validate webhook URLs before creating Svix endpoints
3. THE System SHALL reject webhook URLs with invalid SSL certificates
4. THE System SHALL include security headers in webhook requests
5. THE System SHALL support webhook signature verification using Svix SDK

### Requirement 15: Performance and Scalability

**User Story:** As a CrediBill platform, I want webhook delivery to scale with platform growth, so that high-volume customers receive timely notifications.

#### Acceptance Criteria

1. THE System SHALL send webhook messages to Svix asynchronously
2. THE System SHALL NOT block customer-facing operations while sending webhooks
3. THE System SHALL batch webhook sends when multiple events occur simultaneously
4. THE System SHALL handle Svix API rate limits gracefully
5. THE System SHALL monitor webhook delivery latency and alert on degradation
