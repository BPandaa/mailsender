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
- Open tracking via 1x1 tracking pixel
- Click tracking via redirect URLs
- Multiple opens/clicks per subscriber tracked
- Geolocation (country/city) from IP address
- Device/browser info from user agent
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
**LinkClicks**: Detailed click tracking with URL, timestamp, and context
**Analytics**: Aggregated metrics for dashboard performance

### Email Tracking Mechanism

**Open Tracking**:
- Generate unique tracking pixel URL per email: `/api/track/open/[uniqueId]`
- Embed 1x1 transparent GIF in email HTML
- Log open event with timestamp, IP, user agent when pixel is requested

**Click Tracking**:
- Rewrite all links in email to redirect through: `/api/track/click/[uniqueId]/[linkId]`
- Log click event with metadata, then redirect to original URL
- Track multiple clicks per link per subscriber

### API Routes

- `/api/campaigns` - CRUD for campaigns
- `/api/campaigns/[id]/send` - Send campaign to all project subscribers
- `/api/subscribers` - CRUD and CSV import
- `/api/track/open/[id]` - Tracking pixel endpoint
- `/api/track/click/[id]/[linkId]` - Click redirect endpoint
- `/api/analytics/[projectId]` - Dashboard data aggregation

### Key Implementation Details

**Email Sending**: Use Resend batch API for efficient sending. Queue large campaigns. Store Resend message ID for webhook reconciliation.

**Link Rewriting**: Parse email HTML, extract all `<a href>` tags, replace with tracking URLs, maintain mapping of linkId to original URL.

**Analytics Aggregation**: Pre-compute daily/hourly metrics for dashboard performance. Use database indexes on timestamp fields for query efficiency.

**Geolocation**: Cache IP-to-location lookups to avoid repeated API calls. Handle IPv4 and IPv6.

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
