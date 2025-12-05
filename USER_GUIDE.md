# User Guide - Mail Tracker

## Table of Contents
1. [Adding Users Manually](#adding-users-manually)
2. [Resend Webhooks Setup](#resend-webhooks-setup)
3. [Connecting to Supabase](#connecting-to-supabase)
4. [Deploying to Vercel](#deploying-to-vercel)

---

## Adding Users Manually

Since the signup page has been removed, you need to add users directly to the database. Here are three methods:

### Method 1: Using Prisma Studio (Easiest)

1. Run Prisma Studio:
   ```bash
   npx prisma studio
   ```

2. Open your browser at `http://localhost:5555`

3. Click on the `User` model

4. Click "+ Add record"

5. Fill in the fields:
   - **email**: The user's email address
   - **password**: You need to hash the password first (see Method 2 for hashing)
   - **name** (optional): User's display name

6. Click "Save 1 change"

### Method 2: Using bcrypt to Hash Passwords

First, create a password hash:

```bash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('YOUR_PASSWORD_HERE', 10));"
```

This will output a hashed password. Copy it and use it in Method 1 or Method 3.

### Method 3: Using Supabase Dashboard

1. Go to your Supabase dashboard: https://app.supabase.com

2. Select your project

3. Click on "Table Editor" in the left sidebar

4. Find the `User` table

5. Click "Insert" → "Insert row"

6. Fill in:
   - **id**: Auto-generated (leave empty or use UUID)
   - **email**: User's email
   - **password**: Hashed password (use Method 2 to generate)
   - **name**: Optional display name
   - **createdAt**: Auto-generated

7. Click "Save"

### Method 4: Using SQL Query in Supabase

1. Go to Supabase Dashboard → SQL Editor

2. Run this query (replace with your values):

```sql
INSERT INTO "User" (id, email, password, name, "createdAt")
VALUES (
  gen_random_uuid(),
  'user@example.com',
  '$2a$10$HASHED_PASSWORD_HERE',  -- Use bcrypt hash from Method 2
  'User Name',
  NOW()
);
```

---

## Resend Webhooks Setup

Resend provides webhooks that give you **accurate tracking** for email events like opens, clicks, deliveries, and bounces. This is better than relying on tracking pixels alone.

### Why Use Resend Webhooks?

- **Accurate open tracking**: Resend tracks actual opens, not just pixel loads
- **Delivery confirmation**: Know exactly when emails are delivered
- **Bounce handling**: Get notified of hard and soft bounces
- **Click tracking**: Track all link clicks automatically
- **No manual tracking pixel management**: Resend handles it all

### Step 1: Create Webhook Endpoint

The webhook endpoint has already been created at:
```
POST /api/webhooks/resend
```

This endpoint will:
- Receive webhook events from Resend
- Update `EmailEvent` records with delivery status
- Create `OpenEvent` records when emails are opened
- Create `ClickEvent` records when links are clicked
- Handle bounces and complaints

### Step 2: Configure Resend Webhook

1. **Go to Resend Dashboard**:
   - Visit: https://resend.com/webhooks
   - Login to your account

2. **Create a New Webhook**:
   - Click "Add Webhook"
   - **Webhook URL**: `https://your-domain.com/api/webhooks/resend`
     - For Vercel: `https://your-app.vercel.app/api/webhooks/resend`
     - For local testing with ngrok: `https://your-ngrok-url.ngrok.io/api/webhooks/resend`

3. **Select Events to Listen For**:
   - ✅ `email.sent` - Email was successfully sent
   - ✅ `email.delivered` - Email was delivered to recipient
   - ✅ `email.delivery_delayed` - Delivery is delayed
   - ✅ `email.complained` - Recipient marked as spam
   - ✅ `email.bounced` - Email bounced
   - ✅ `email.opened` - Recipient opened the email
   - ✅ `email.clicked` - Recipient clicked a link

4. **Get Webhook Secret**:
   - After creating the webhook, Resend will give you a **webhook signing secret**
   - Copy this secret (starts with `whsec_...`)
   - Add it to your `.env` file:
   ```env
   RESEND_WEBHOOK_SECRET=whsec_your_secret_here
   ```

### Step 3: Test Webhooks Locally (Optional)

To test webhooks on your local machine:

1. **Install ngrok**:
   ```bash
   npm install -g ngrok
   ```

2. **Start your dev server**:
   ```bash
   npm run dev
   ```

3. **Expose your localhost with ngrok**:
   ```bash
   ngrok http 3000
   ```

4. **Copy the ngrok URL** (e.g., `https://abc123.ngrok.io`)

5. **Use this URL in Resend webhook settings**:
   ```
   https://abc123.ngrok.io/api/webhooks/resend
   ```

6. **Send a test email** and check ngrok terminal for webhook events

### Step 4: Update Email Sending Code

When sending emails through Resend, make sure to store the Resend message ID:

The code already does this in `/api/projects/[projectId]/campaigns/[campaignId]/send`:

```typescript
// When sending via Resend
const { data } = await resend.emails.send({
  from: 'your-email@example.com',
  to: subscriber.email,
  subject: campaign.subject,
  html: emailHtml,
});

// Store the Resend message ID
await prisma.emailEvent.create({
  data: {
    campaignId: campaign.id,
    subscriberId: subscriber.id,
    resendId: data?.id, // This links to Resend's tracking
    status: 'sent',
    sentAt: new Date(),
  },
});
```

### How Resend Webhooks Work

1. **You send an email via Resend API** → Resend assigns a unique `message_id`

2. **Resend tracks the email** → When events happen (delivery, open, click), Resend sends a POST request to your webhook URL

3. **Your webhook endpoint receives the event**:
   ```json
   {
     "type": "email.opened",
     "created_at": "2025-01-15T10:30:00Z",
     "data": {
       "email_id": "msg_abc123",
       "from": "noreply@yourdomain.com",
       "to": ["user@example.com"],
       "subject": "Your Campaign Subject",
       "opened_at": "2025-01-15T10:30:00Z"
     }
   }
   ```

4. **Your code updates the database**:
   - Finds the `EmailEvent` by `resendId`
   - Creates an `OpenEvent` with timestamp, IP, user agent
   - Updates campaign analytics

---

## Connecting to Supabase

Your DATABASE_URL is already configured. To verify or update:

1. **Get Connection String from Supabase**:
   - Go to https://app.supabase.com
   - Select your project
   - Click "Project Settings" → "Database"
   - Copy the "Connection String" (Transaction mode for Prisma)

2. **Update `.env`**:
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres"
   ```

3. **For connection pooling (recommended for Vercel)**:
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   ```

4. **Run migrations**:
   ```bash
   npx prisma migrate deploy
   ```

---

## Deploying to Vercel

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Import to Vercel

1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure environment variables:

```env
DATABASE_URL=your_supabase_connection_string
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://your-app.vercel.app
RESEND_API_KEY=your_resend_api_key
RESEND_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### Step 3: Configure Resend Webhook for Production

1. After Vercel deployment, get your production URL:
   ```
   https://your-app.vercel.app
   ```

2. Update Resend webhook URL:
   ```
   https://your-app.vercel.app/api/webhooks/resend
   ```

3. Deploy!

---

## Quick Reference

### Environment Variables Needed

```env
# Database
DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000" # or your production URL

# Resend
RESEND_API_KEY="re_..."
RESEND_WEBHOOK_SECRET="whsec_..."

# Optional: Geolocation
GEOLOCATION_API_KEY="your_key_here"
```

### Common Commands

```bash
# Run development server
npm run dev

# Open Prisma Studio
npx prisma studio

# Run database migrations
npx prisma migrate dev

# Deploy migrations (production)
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Build for production
npm run build

# Start production server
npm start
```

### Prisma Schema Location

Database schema: `prisma/schema.prisma`

### Database Models

- **User**: Authentication users
- **Project**: Brand/campaign containers
- **Subscriber**: Email list
- **Campaign**: Email campaigns
- **EmailEvent**: Individual email delivery records
- **OpenEvent**: Email open tracking
- **ClickEvent**: Link click tracking

---

## Troubleshooting

### Can't login?
- Make sure you added a user to the database using one of the methods above
- Verify the password is properly hashed with bcrypt
- Check that the email matches exactly

### Webhooks not working?
- Verify the webhook URL is correct in Resend dashboard
- Check that `RESEND_WEBHOOK_SECRET` is set in `.env`
- Look at Vercel logs for webhook errors
- Test with ngrok locally first

### Database connection issues?
- Verify `DATABASE_URL` in `.env`
- Check Supabase project is running
- Run `npx prisma generate` to regenerate client
- For Vercel, use connection pooling URL

---

## Support

For issues or questions:
1. Check application logs: `npm run dev` (local) or Vercel logs (production)
2. Review Resend webhook logs: https://resend.com/webhooks
3. Check Supabase logs: Project Dashboard → Logs
