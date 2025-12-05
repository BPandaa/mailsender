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

- **Accurate open tracking**: Resend tracks actual opens automatically
- **Delivery confirmation**: Know exactly when emails are delivered
- **Bounce handling**: Get notified of hard and soft bounces
- **Click tracking**: Track all link clicks automatically
- **No custom tracking infrastructure needed**: Resend handles everything

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

### Step 4: How It Works

When you send emails through the app:

1. **Email is sent via Resend API** with native tracking enabled
2. **Resend assigns a unique message ID** which is stored in your database
3. **Resend automatically tracks** opens, clicks, deliveries, and bounces
4. **Webhook events are sent to your app** at `/api/webhooks/resend`
5. **Your database is updated** with tracking data automatically

The sending code in `/api/projects/[projectId]/campaigns/[campaignId]/send` stores the Resend message ID for webhook reconciliation:

```typescript
// Send email with Resend's native tracking
const result = await sendEmail({
  to: subscriber.email,
  from: fromEmail,
  subject: emailSubject,
  html: emailHtml,
});

// Store the Resend message ID for webhook matching
await prisma.emailEvent.update({
  where: { id: emailEvent.id },
  data: {
    resendId: result.messageId,
    status: "delivered",
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

## Tracking Email Replies (Inbound Emails)

Mail Tracker can track replies to your campaigns automatically using Resend's inbound email feature.

### How It Works

When a subscriber replies to your campaign email, Resend can forward that reply to your webhook endpoint, where it's automatically saved in your database and associated with the campaign and subscriber.

### Step 1: Set Up Inbound Email Domain

1. **Go to Resend Dashboard** → Inbound
   - Visit: https://resend.com/inbound

2. **Add Your Domain**
   - Enter the domain you want to receive emails on (e.g., `replies.yourdomain.com`)
   - Follow Resend's DNS configuration instructions

3. **Configure MX Records**
   - Add the MX records provided by Resend to your DNS
   - Wait for DNS propagation (can take up to 24 hours)

### Step 2: Create Inbound Webhook

1. **Go to Resend Dashboard** → Webhooks
   - Visit: https://resend.com/webhooks

2. **Create Inbound Email Webhook**
   - Click "Add Webhook"
   - **Webhook URL**: `https://your-app.vercel.app/api/webhooks/resend-inbound`
   - Select event: `email.received`
   - Save the webhook

3. **Use the Same Webhook Secret**
   - You can use the same `RESEND_WEBHOOK_SECRET` for both outbound and inbound webhooks

### Step 3: Update Your Campaign "From" Address

When creating campaigns, use a "Reply-To" format or set your from address to allow replies:

```
From: noreply@yourdomain.com
Reply-To: replies@yourdomain.com
```

Or configure Resend to forward all replies to your inbound domain.

### Step 4: Receive Replies in Your Personal Email

You have **two options** to receive replies in your personal inbox:

#### **Option 1: Automatic Email Forwarding (Recommended)**

The app will automatically forward replies to your personal email with a nice formatted notification.

1. **Add to your `.env` file**:
   ```env
   REPLY_FORWARD_EMAIL=your-personal-email@gmail.com
   REPLY_FORWARD_FROM_EMAIL=noreply@yourdomain.com
   ```

2. **What you'll receive**:
   - Email notification when someone replies
   - Shows campaign name, sender info, and reply content
   - Beautifully formatted HTML email
   - You can reply directly to respond to the subscriber

3. **Example notification email**:
   ```
   Subject: [Reply] Re: Your Campaign Subject - Monthly Newsletter

   New Campaign Reply
   Campaign: Monthly Newsletter
   From: John Doe <john@example.com>
   Subject: Re: Your Campaign Subject
   Received: 12/5/2025, 3:45 PM

   [Reply content displayed here]

   💡 Tip: Reply directly to this email to respond to john@example.com
   ```

#### **Option 2: Resend Built-in Forwarding**

Resend can also forward emails directly (without going through your app):

1. **Go to Resend Dashboard** → Inbound → Your Domain
2. **Click "Forward Emails"**
3. **Add forwarding rule**:
   - From: `*@replies.yourdomain.com` (all addresses)
   - To: `your-personal-email@gmail.com`

This will forward ALL inbound emails directly to your personal email, but they won't be stored in your database unless the webhook is also configured.

#### **Best Approach: Use Both!**

- ✅ Enable webhook forwarding (Option 1) - Stores in database + sends notification
- ✅ Keep Resend forwarding (Option 2) - Backup copy in your inbox

### Step 5: View Replies in Database

Replies are automatically:
- Saved to the database in the `Reply` table
- Associated with the campaign they're replying to
- Linked to the subscriber who sent the reply

You can view replies:
1. In your personal email (if forwarding is enabled)
2. Using Prisma Studio: `npx prisma studio`
3. In your campaign analytics dashboard (UI coming soon)

### Database Schema

The Reply model stores:
- `fromEmail` - Subscriber's email address
- `fromName` - Subscriber's name (if available)
- `subject` - Reply subject line
- `textContent` - Plain text version of reply
- `htmlContent` - HTML version of reply
- `receivedAt` - When the reply was received
- `campaignId` - The campaign being replied to
- `subscriberId` - The subscriber who replied

### Troubleshooting

**Replies not appearing?**
- Verify your inbound domain DNS is configured correctly
- Check that the inbound webhook URL is correct
- Ensure replies are sent to an address on your inbound domain
- Check application logs for webhook errors

**Can't determine which campaign a reply is for?**
- The system automatically links replies to the most recent email sent to that subscriber
- If no recent email is found, it links to the most recent campaign in the project

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

# Reply Forwarding (Optional - to receive replies in your personal email)
REPLY_FORWARD_EMAIL="your-personal-email@gmail.com"
REPLY_FORWARD_FROM_EMAIL="noreply@yourdomain.com"

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
