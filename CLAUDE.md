# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an email campaign management and analytics platform - a self-hosted alternative to Mailchimp/MailerLite. It allows managing multiple brands/projects, sending email campaigns via Resend API, and tracking detailed analytics with an Umami-inspired dashboard.

## Core Features

**Multi-Project System**: Each brand (e.g., Personal Brand, Klarifai, Gradtips) is a separate project with isolated subscribers and campaigns.

**Subscriber Management**: Upload subscribers via CSV or add manually. Each subscriber belongs to a specific project.

**Campaign System**: Create and send email campaigns through Resend API. Each campaign tracks individual email delivery and engagement.

**Analytics Tracking**:
- Email delivery status (sent, failed, bounced)
- Open tracking via Resend native tracking (timestamp only - no device/browser/location data)
- Click tracking via Resend native tracking (includes IP, user agent, timestamp)
- Reply tracking via Resend inbound email
- Multiple opens/clicks per subscriber tracked
- Device/browser/OS info (parsed from user agent for clicks only)
- Per-link click analytics

**Dashboard**: Umami-style analytics interface showing:
- Total subscribers per project
- Campaign performance metrics (sent, open rate, click rate)
- Engagement charts over time
- Top-performing links
- Geographic and device demographics

## Technology Stack

- **Framework**: Next.js 14+ with App Router and TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Email Provider**: Resend API
- **Authentication**: NextAuth.js
- **UI Framework**: Tailwind CSS with Umami-inspired minimalist design
- **Charts**: Recharts or similar for analytics visualization
- **IP Geolocation**: MaxMind GeoLite2 or similar
- **User Agent Parsing**: ua-parser-js or similar

## Architecture

### Database Schema

**Users**: Authentication and user management
**Projects**: Brand/project containers (one-to-many with campaigns and subscribers)
**Subscribers**: Email list per project with metadata
**Campaigns**: Email campaigns with message content and sending configuration
**EmailEvents**: Individual email records tracking delivery and all engagement events
**OpenEvent**: Email open tracking with device/browser/geo data
**ClickEvent**: Link click tracking with URL, timestamp, and context
**Reply**: Inbound email replies to campaigns
**Analytics**: Aggregated metrics for dashboard performance

### Email Tracking Mechanism

**Resend Native Tracking**:
- All tracking is handled by Resend automatically at the domain level
- No custom tracking pixels or link rewriting needed in code
- Tracking must be enabled for your domain in Resend dashboard or via API
- Webhook events provide open and click data with different levels of detail:
  - **email.opened**: Only provides email metadata (no device/browser/IP/location data)
  - **email.clicked**: Provides IP address, user agent, link URL, and timestamp
  - Device/browser/OS info is parsed from user agent string for click events

### API Routes

- `/api/campaigns` - CRUD for campaigns
- `/api/campaigns/[id]/send` - Send campaign to all project subscribers
- `/api/subscribers` - CRUD and CSV import
- `/api/webhooks/resend` - Resend webhook handler for outbound email tracking events
- `/api/webhooks/resend-inbound` - Resend webhook handler for inbound email (replies)
- `/api/analytics/[projectId]` - Dashboard data aggregation

### Key Implementation Details

**Email Sending**: Use Resend API with native tracking enabled. Store Resend message ID for webhook reconciliation.

**Webhook Processing**: Receive and verify webhook signatures. Match webhook events to EmailEvent records via resendId. Create OpenEvent and ClickEvent records from webhook data.

**Analytics Aggregation**: Pre-compute daily/hourly metrics for dashboard performance. Use database indexes on timestamp fields for query efficiency.

**Event Data**: Webhook payload includes geolocation, device info, and user agent automatically from Resend.

## Common Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Database migrations
npx prisma migrate dev
npx prisma generate
npx prisma studio  # View database in browser

# Build for production
npm run build
npm run start

# Linting and formatting
npm run lint
npm run format

# Run tests
npm test
npm run test:watch
```

## Development Workflow

1. **Adding a new feature**: Start with database schema changes in `prisma/schema.prisma`, run migrations, then implement API routes, then UI components.

2. **Testing email tracking**: Use Resend test mode or a personal email for development. Check browser network tab for tracking pixel and redirect requests.

3. **Dashboard updates**: Analytics queries should use indexed fields. Consider caching expensive aggregations in Redis or precomputed tables.

4. **CSV import**: Validate email format and handle duplicates. Use streaming parser for large files.

## Environment Variables

```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
RESEND_API_KEY=...
GEOLOCATION_API_KEY=...
```

## Project Structure

- `/app` - Next.js app router pages and layouts
- `/app/api` - API routes for campaigns, tracking, analytics
- `/components` - Reusable UI components
- `/lib` - Utility functions (email parsing, link rewriting, analytics)
- `/prisma` - Database schema and migrations
- `/types` - TypeScript type definitions
- `/public` - Static assets including tracking pixel

## Design Philosophy

**Umami-inspired UI**: Clean, minimalist interface with focus on data. Use simple charts, clear typography, ample whitespace. Dark mode support. Mobile-responsive.

**Privacy-conscious**: Store only necessary tracking data. Provide opt-out mechanisms. Comply with email marketing regulations (CAN-SPAM, GDPR).

**Performance**: Optimize for dashboard load time with efficient queries and caching. Tracking endpoints must be fast (<100ms) to avoid email client timeouts.
