# Email Tracking Setup Guide

This guide will help you set up email tracking with Resend's native tracking system.

## Important: How Resend Tracking Works

**Resend handles ALL tracking automatically** - you don't need to add tracking pixels or rewrite links in your code. Here's how it works:

1. **Domain-Level Configuration**: Tracking is configured at the domain level in your Resend account, NOT per email
2. **Automatic Pixel Insertion**: When tracking is enabled, Resend automatically inserts a 1x1 transparent pixel in every email
3. **Automatic Link Rewriting**: Resend automatically rewrites all links to track clicks
4. **Webhook Events**: All tracking data is delivered to your webhook endpoint in real-time

## Step 1: Enable Tracking for Your Domain

You have two options to enable tracking:

### Option A: Using the Setup Script (Recommended)

We've provided a script to help you enable tracking:

```bash
# 1. List your domains to get the domain ID
npx ts-node scripts/setup-tracking.ts list

# 2. Check current tracking status
npx ts-node scripts/setup-tracking.ts info YOUR_DOMAIN_ID

# 3. Enable tracking for your domain
npx ts-node scripts/setup-tracking.ts enable YOUR_DOMAIN_ID
```

### Option B: Using the Resend Dashboard

1. Go to https://resend.com/domains
2. Select your domain
3. Navigate to the "Configuration" section
4. Toggle on **Open Tracking** and **Click Tracking**

## Step 2: Configure Webhook

To receive tracking events, you need to set up a webhook:

### 2.1. Deploy Your Application

Your webhook endpoint must be publicly accessible. Deploy your app to:
- Vercel
- Railway
- Any hosting platform with a public URL

Your webhook will be available at:
```
https://your-domain.com/api/webhooks/resend
```

### 2.2. Add Webhook in Resend Dashboard

1. Go to https://resend.com/webhooks
2. Click "Add Webhook"
3. Enter your webhook URL: `https://your-domain.com/api/webhooks/resend`
4. Select the following events:
   - ✅ `email.sent`
   - ✅ `email.delivered`
   - ✅ `email.delivery_delayed`
   - ✅ `email.complained`
   - ✅ `email.bounced`
   - ✅ `email.opened`
   - ✅ `email.clicked`
5. Copy the **Webhook Secret** (you'll need this)

### 2.3. Add Webhook Secret to Environment Variables

Add this to your `.env` file:

```env
RESEND_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## Step 3: Verify Everything Works

### 3.1. Send a Test Email

```bash
# Replace with your verified domain and test email
curl "http://localhost:3000/api/test-email?to=your@email.com&from=noreply@yourdomain.com"
```

### 3.2. Open the Email

Open the test email in your email client and click any links.

### 3.3. Check Webhook Logs

In your Resend dashboard, go to Webhooks → Click on your webhook → View Recent Deliveries

You should see:
- `email.sent` event
- `email.delivered` event
- `email.opened` event (after opening the email)
- `email.clicked` event (after clicking a link)

### 3.4. Check Database

Run the debug script to verify tracking data is being stored:

```bash
node debug-tracking.js
```

You should see:
- EmailEvent records with `resendId`
- OpenEvent records with device/browser/location data
- ClickEvent records with link URLs

## Common Issues & Solutions

### Issue 1: No Open/Click Events Received

**Symptoms**: Emails are sent but no open/click events in database

**Solutions**:
1. ✅ Verify tracking is enabled for your domain:
   ```bash
   npx ts-node scripts/setup-tracking.ts info YOUR_DOMAIN_ID
   ```

2. ✅ Check webhook is configured correctly:
   - Webhook URL is correct and publicly accessible
   - All event types are selected (`email.opened`, `email.clicked`)
   - Webhook secret is in your `.env` file

3. ✅ Check webhook delivery status in Resend dashboard
   - Look for failed deliveries
   - Check error messages

4. ✅ Verify webhook signature validation:
   - Check server logs for "Invalid webhook signature" errors
   - Make sure `RESEND_WEBHOOK_SECRET` is correct

### Issue 2: Opens Tracked but Not Clicks

**Symptoms**: Open events work but click events don't

**Solutions**:
1. ✅ Make sure click tracking is enabled for your domain
2. ✅ Verify your email HTML contains actual clickable links:
   ```html
   <a href="https://example.com">Click here</a>
   ```
3. ✅ Check that links are full URLs (not relative paths)

### Issue 3: Email Events Not Found

**Symptoms**: Webhook receives events but database shows "Email event not found"

**Solutions**:
1. ✅ Check that emails are being sent through your app (not directly via Resend dashboard)
2. ✅ Verify `resendId` is being stored correctly when sending emails
3. ✅ Run the debug script to inspect EmailEvent records:
   ```bash
   node debug-tracking.js
   ```

### Issue 4: Tracking Works Locally but Not in Production

**Solutions**:
1. ✅ Make sure webhook URL points to production domain (not localhost)
2. ✅ Verify `RESEND_WEBHOOK_SECRET` is set in production environment variables
3. ✅ Check production logs for webhook errors
4. ✅ Ensure database migrations ran in production

## How Tracking Works Behind the Scenes

### When You Send an Email:

1. Your app calls `sendEmail()` in `lib/email.ts`
2. Email is sent via Resend API
3. Resend returns a message ID (e.g., `8f27c480-7dc2-4c07-a7cd-41424146a082`)
4. Your app stores an `EmailEvent` record with this `resendId`

### When Someone Opens the Email:

1. Resend's tracking pixel loads (automatically inserted by Resend)
2. Resend detects the open and extracts:
   - IP address
   - User agent
   - Device type
   - Browser name
   - Geographic location (country, city)
3. Resend sends `email.opened` webhook event to your app
4. Your webhook handler (`app/api/webhooks/resend/route.ts`) processes it:
   - Finds the `EmailEvent` using `resendId`
   - Creates an `OpenEvent` record with all tracking data

### When Someone Clicks a Link:

1. User clicks a link that was rewritten by Resend (automatically)
2. Click goes through Resend's tracking server
3. Resend redirects user to the actual URL
4. Resend sends `email.clicked` webhook event to your app
5. Your webhook handler creates a `ClickEvent` record with:
   - Which link was clicked
   - When it was clicked
   - Device/browser/location data

## Testing Checklist

Use this checklist to verify everything is working:

- [ ] Domain tracking is enabled (run `npx ts-node scripts/setup-tracking.ts info DOMAIN_ID`)
- [ ] Webhook is configured in Resend dashboard
- [ ] Webhook secret is in `.env` file
- [ ] Webhook URL is publicly accessible
- [ ] Test email sends successfully
- [ ] EmailEvent is created with `resendId`
- [ ] Opening email creates OpenEvent record
- [ ] Clicking link creates ClickEvent record
- [ ] Dashboard shows correct analytics

## Need Help?

If you're still experiencing issues:

1. Check the webhook delivery logs in Resend dashboard
2. Check your application logs for errors
3. Run `node debug-tracking.js` to inspect database records
4. Verify your domain DNS records are correct
5. Make sure your domain is verified in Resend

## Additional Resources

- [Resend Open and Click Tracking](https://resend.com/blog/open-and-click-tracking)
- [Resend Webhooks Documentation](https://resend.com/docs/dashboard/webhooks/event-types)
- [Managing Domains in Resend](https://resend.com/docs/dashboard/domains/introduction)
