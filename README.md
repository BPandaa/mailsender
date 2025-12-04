# Mail Tracker

A self-hosted email campaign management and analytics platform built with Next.js. Track email opens, clicks, and engagement metrics with an Umami-inspired dashboard.

## Features

- **Multi-Project Management**: Organize campaigns by brand/project
- **Subscriber Management**: CSV import and manual entry
- **Email Campaigns**: Send via Resend API
- **Analytics Tracking**:
  - Email delivery status
  - Open tracking (pixel-based)
  - Click tracking (redirect URLs)
  - Geolocation and device info
  - Engagement metrics
- **Umami-style Dashboard**: Clean, minimalist analytics interface

## Tech Stack

- Next.js 15.0.5 (secure version)
- React 19.0.1 (patched CVE-2025-55182)
- TypeScript
- Tailwind CSS v4
- Prisma ORM
- PostgreSQL
- NextAuth.js
- Resend API

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Resend API key

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd mail-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials and API keys
```

4. Run database migrations:
```bash
npx prisma generate
npx prisma migrate dev
```

5. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Setup

### Local PostgreSQL

```bash
# Install PostgreSQL if needed
# Then create a database
createdb mailtracker

# Update DATABASE_URL in .env
DATABASE_URL="postgresql://localhost:5432/mailtracker"
```

### Cloud Database (Recommended)

Use a managed PostgreSQL service:
- Supabase
- Neon
- Railway
- Vercel Postgres

## Environment Variables

See `.env.example` for required variables:

- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Random secret for authentication
- `NEXTAUTH_URL`: Your app URL
- `RESEND_API_KEY`: Resend API key for sending emails
- `GEOLOCATION_API_KEY`: (Optional) For IP geolocation

## Project Structure

```
mail-tracker/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   └── generated/prisma/  # Generated Prisma client
├── components/            # React components
├── lib/                   # Utility functions
├── prisma/               # Database schema
├── public/               # Static assets
└── types/                # TypeScript definitions
```

## Development

```bash
# Run development server
npm run dev

# View database in browser
npx prisma studio

# Run migrations
npx prisma migrate dev

# Build for production
npm run build
npm run start
```

## Deployment

Deploy to Vercel, Railway, or any Node.js hosting:

1. Set environment variables
2. Run `npm run build`
3. Database migrations run automatically via Prisma

## Security Notes

This project uses patched versions:
- Next.js 15.0.5 (fixes CVE-2025-66478)
- React 19.0.1 (fixes CVE-2025-55182)

Always keep dependencies updated.

## License

MIT
