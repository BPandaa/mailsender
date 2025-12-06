# Debugging Guide - Tracking Issues

## Current Issues

1. ✅ Emails are being sent (IDs: `8f27c480-7dc2-4c07-a7cd-41424146a082`, `8f371041-8121-4560-9fd1-d1513a8eac45`)
2. ❌ Opens not showing on dashboard
3. ❌ Replies not being received in personal email

---

## Step-by-Step Debugging

### Step 1: Check Database Records

**Prisma Studio is now running at: http://localhost:51212**

1. Open http://localhost:51212 in your browser
2. Click on **EmailEvent** table
3. Search for resendId: `8f27c480-7dc2-4c07-a7cd-41424146a082`

**What to check:**
- ✅ Does the EmailEvent exist with this resendId?
- ✅ What is the `status` field? (should be "sent" or "delivered")
- ✅ Is `sentAt` populated?

**If EmailEvent doesn't exist:**
- The email sending code isn't storing the resendId properly
- Check the campaign send logs

**If EmailEvent exists but no opens:**
- Check the **OpenEvent** table
- Look for records with matching `emailEventId`

---

### Step 2: Check Webhook Configuration in Resend

Go to: https://resend.com/webhooks

**For OUTBOUND tracking (opens/clicks):**

1. **Check if webhook exists** for: `https://your-app.vercel.app/api/webhooks/resend`
   - ❓ Is it created?
   - ❓ Is the URL correct?
   - ❓ Is it pointing to your Vercel deployment (not localhost)?

2. **Check Events Enabled:**
   - ✅ `email.sent`
   - ✅ `email.delivered`
   - ✅ `email.opened` ← **THIS IS CRITICAL**
   - ✅ `email.clicked`
   - ✅ `email.bounced`
   - ✅ `email.complained`

3. **Check Webhook Logs** (in Resend dashboard):
   - Click on your webhook
   - Go to "Events" or "Logs" tab
   - Look for events for your email IDs
   - Check if webhooks are being sent
   - Check if they're succeeding or failing

**For INBOUND tracking (replies):**

1. **Check if webhook exists** for: `https://your-app.vercel.app/api/webhooks/resend-inbound`
   - ❓ Is it created?
   - ❓ Event: `email.received` is enabled?

---

### Step 3: Common Issues & Fixes

#### Issue: "Webhook URL is localhost"

**Problem:** If your webhook URL is `http://localhost:3000/api/webhooks/resend`, Resend can't reach it.

**Solution:**
- Deploy to Vercel first
- OR use ngrok for testing:
  ```bash
  npx ngrok http 3000
  ```
  Then update Resend webhook URL to: `https://your-ngrok-url.ngrok.io/api/webhooks/resend`

---

#### Issue: "Opens not tracking"

**Possible causes:**

1. **Webhook not configured in Resend**
   - Go to https://resend.com/webhooks
   - Create webhook if missing
   - Enable `email.opened` event

2. **Webhook URL is wrong**
   - Should be your production URL
   - NOT localhost (unless using ngrok)

3. **Email was sent before webhook was configured**
   - Old emails won't be tracked
   - Send a new test email after configuring webhooks

4. **Email client blocks tracking**
   - Some email clients (Apple Mail, etc.) block tracking pixels
   - This is normal - you won't see 100% open tracking

5. **resendId not stored in database**
   - Check EmailEvent table in Prisma Studio
   - If resendId is null, the sending code has an issue

---

#### Issue: "Replies not being received"

**Checklist:**

1. ✅ **Environment variables set?**
   - Check `.env` file has:
     ```
     REPLY_FORWARD_EMAIL=zouhairadnani46@gmail.com
     REPLY_FORWARD_FROM_EMAIL=team@badradnani.com
     ```

2. ✅ **Inbound webhook configured in Resend?**
   - Go to https://resend.com/webhooks
   - Create webhook for: `https://your-app.vercel.app/api/webhooks/resend-inbound`
   - Enable: `email.received`

3. ✅ **Inbound domain configured in Resend?**
   - Go to https://resend.com/inbound
   - You should see: `estoodal.resend.app`
   - Status should be "Active"

4. ✅ **Reply-To address correct?**
   - When you sent the email, was Reply-To set to something like:
     - `feedback@estoodal.resend.app`
     - Or any address ending in `@estoodal.resend.app`

5. ✅ **Database migration ran?**
   - Run: `npx prisma migrate dev --name add_reply_model`
   - This creates the Reply table

6. ✅ **App is deployed?**
   - Webhooks don't work on localhost
   - Must be deployed to Vercel or use ngrok

---

### Step 4: Test Email Tracking

**Send a test email:**

1. Create a new campaign
2. Set **From**: `team@badradnani.com`
3. Set **Reply-To** in Resend settings OR use: `feedback@estoodal.resend.app` as From
4. Send to yourself: `zouhairadnani46@gmail.com`
5. Open the email (wait 30 seconds)
6. Check Resend webhook logs
7. Check database in Prisma Studio

**What should happen:**

```
1. Email sent → resendId stored in EmailEvent
                    ↓
2. You open email → Resend sends webhook to /api/webhooks/resend
                    ↓
3. Webhook creates → OpenEvent record in database
                    ↓
4. Dashboard shows → Open count increases
```

---

### Step 5: Check Application Logs

**If deployed on Vercel:**

1. Go to Vercel dashboard
2. Click your project
3. Go to "Logs" tab
4. Filter for "webhook"
5. Look for:
   - `Resend webhook received: email.opened`
   - `Email opened: 8f27c480-7dc2-4c07-a7cd-41424146a082`
   - Any errors

**If running locally:**

- Check terminal output for webhook logs
- Remember: Webhooks won't work on localhost without ngrok

---

## Quick Fixes Checklist

### For Opens Not Tracking:

- [ ] Webhook configured in Resend for your production URL
- [ ] `email.opened` event enabled in webhook
- [ ] EmailEvent has correct resendId in database
- [ ] App is deployed (not just localhost)
- [ ] Send a NEW test email after configuring webhook

### For Replies Not Working:

- [ ] `REPLY_FORWARD_EMAIL` and `REPLY_FORWARD_FROM_EMAIL` in `.env`
- [ ] Inbound webhook created: `/api/webhooks/resend-inbound`
- [ ] `email.received` event enabled
- [ ] Reply sent to `@estoodal.resend.app` address
- [ ] `npx prisma migrate dev` ran successfully
- [ ] App is deployed to Vercel

---

## Testing Webhooks Locally

If you want to test before deploying:

```bash
# Terminal 1: Start your app
npm run dev

# Terminal 2: Start ngrok
npx ngrok http 3000

# Copy the ngrok URL (e.g., https://abc123.ngrok.io)
# Update Resend webhooks:
#   - Outbound: https://abc123.ngrok.io/api/webhooks/resend
#   - Inbound: https://abc123.ngrok.io/api/webhooks/resend-inbound
```

---

## What To Do Right Now

1. **Check Prisma Studio** (http://localhost:51212):
   - Look for your EmailEvent records
   - Check if resendId is populated
   - Look for OpenEvent records

2. **Check Resend Dashboard** (https://resend.com/webhooks):
   - Verify webhooks are configured
   - Check webhook logs for errors
   - Verify events are enabled

3. **Deploy to Vercel** (if not already):
   ```bash
   git add .
   git commit -m "Fix tracking configuration"
   git push
   ```
   Then update webhook URLs in Resend to your Vercel URL

4. **Run migration** (if Reply table doesn't exist):
   ```bash
   npx prisma migrate dev --name add_reply_model
   ```

5. **Send a NEW test email** and check if it tracks properly

---

## Need More Help?

Check these URLs:
- Prisma Studio: http://localhost:51212
- Resend Webhooks: https://resend.com/webhooks
- Resend Inbound: https://resend.com/inbound
- Vercel Logs: https://vercel.com/dashboard
