# Tracking Fixes Applied

## What Was Wrong

### Issue 1: Custom Tracking Pixel (Removed)
**Problem**: The project had a `public/pixel.gif` file that was never used, suggesting there might have been an attempt to implement custom tracking.

**Solution**: ✅ Removed the unused pixel.gif file. Resend handles ALL tracking automatically - you don't need to add tracking pixels or rewrite links in your code.

### Issue 2: Incorrect Webhook Event Data Structure
**Problem**: The webhook handler expected data in the wrong format:
- Expected `data.link` but Resend sends `data.click.link`
- Expected `data.ip_address` but Resend sends `data.click.ipAddress`
- Expected `data.user_agent` but Resend sends `data.click.userAgent`
- Expected device/browser/location data for `email.opened` events, but Resend doesn't provide this

**Solution**: ✅ Fixed webhook handler to match Resend's actual payload structure:
- `email.opened`: Now correctly processes basic metadata only (no device/browser/location data available)
- `email.clicked`: Now correctly extracts data from nested `click` object
- Added user agent parsing to extract device/browser/OS info from click events

### Issue 3: Missing Domain-Level Tracking Setup
**Problem**: Tracking must be enabled at the domain level in Resend, but there was no easy way to do this.

**Solution**: ✅ Created setup script (`scripts/setup-tracking.ts`) to:
- List your Resend domains
- Check tracking status
- Enable tracking with one command

## What Resend Actually Provides

### email.opened Event
```json
{
  "type": "email.opened",
  "created_at": "2024-02-22T23:41:12.126Z",
  "data": {
    "email_id": "56761188-7520-42d8-8898-ff6fc54ce618",
    "from": "you@example.com",
    "to": ["recipient@example.com"],
    "subject": "Your subject"
  }
}
```

**What's included**: Email ID, from, to, subject, timestamp
**What's NOT included**: IP address, user agent, device, browser, OS, location

### email.clicked Event
```json
{
  "type": "email.clicked",
  "created_at": "2024-11-22T23:41:12.126Z",
  "data": {
    "email_id": "56761188-7520-42d8-8898-ff6fc54ce618",
    "from": "you@example.com",
    "to": ["recipient@example.com"],
    "click": {
      "ipAddress": "122.115.53.11",
      "link": "https://resend.com",
      "timestamp": "2024-11-24T05:00:57.163Z",
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)..."
    }
  }
}
```

**What's included**: IP address, link URL, timestamp, user agent (device/browser/OS parsed from this)
**What's NOT included**: Geolocation (country/city)

## Files Created

1. **`TRACKING_SETUP.md`**: Complete guide on setting up and troubleshooting tracking
2. **`scripts/setup-tracking.ts`**: CLI tool to enable tracking for your domain
3. **`scripts/test-webhook.ts`**: Tool to test webhook processing locally
4. **`lib/resend-domain.ts`**: Helper functions for domain management

## Files Modified

1. **`app/api/webhooks/resend/route.ts`**: Fixed to handle correct Resend payload structure
2. **`CLAUDE.md`**: Updated with accurate information about what Resend provides

## Next Steps: Quick Start

### Step 1: Enable Domain Tracking

```bash
# List your domains
npx ts-node scripts/setup-tracking.ts list

# Enable tracking (replace YOUR_DOMAIN_ID)
npx ts-node scripts/setup-tracking.ts enable YOUR_DOMAIN_ID
```

### Step 2: Configure Webhook

1. Deploy your app or use a tunnel service (ngrok, localtunnel) for local testing
2. Go to https://resend.com/webhooks
3. Add webhook: `https://your-domain.com/api/webhooks/resend`
4. Select these events:
   - email.sent
   - email.delivered
   - email.delivery_delayed
   - email.complained
   - email.bounced
   - email.opened
   - email.clicked
5. Copy webhook secret to `.env`:
   ```
   RESEND_WEBHOOK_SECRET=whsec_your_secret_here
   ```

### Step 3: Test Everything

```bash
# Send a test email
curl "http://localhost:3000/api/test-email?to=your@email.com&from=verified@yourdomain.com"

# Test webhook processing locally
npx ts-node scripts/test-webhook.ts

# Check database records
node debug-tracking.js
```

## Common Issues Resolved

### "No tracking data in database"
**Cause**: Tracking not enabled for domain
**Fix**: Run `npx ts-node scripts/setup-tracking.ts enable YOUR_DOMAIN_ID`

### "Email event not found for: xyz"
**Cause**: Email was sent directly through Resend dashboard, not through your app
**Fix**: Only emails sent through your app's API will be tracked in your database

### "Invalid webhook signature"
**Cause**: RESEND_WEBHOOK_SECRET is incorrect or missing
**Fix**: Copy exact secret from Resend dashboard to your `.env` file

### "Opens tracked but no device/browser data"
**Expected**: Resend doesn't provide device/browser/location data for email.opened events
**Note**: This is a Resend limitation, not a bug in your app

## Testing Checklist

- [ ] Domain tracking is enabled (verify with `npx ts-node scripts/setup-tracking.ts info DOMAIN_ID`)
- [ ] Webhook is configured in Resend dashboard
- [ ] RESEND_WEBHOOK_SECRET is set in `.env`
- [ ] Webhook endpoint is publicly accessible
- [ ] Test email sends successfully
- [ ] EmailEvent created with resendId
- [ ] Opening email creates OpenEvent
- [ ] Clicking link creates ClickEvent with IP/user agent
- [ ] Dashboard displays analytics correctly

## Important Notes

1. **Domain-Level Configuration**: Tracking is configured once for your entire domain, not per email
2. **Automatic Processing**: Resend automatically inserts tracking pixels and rewrites links
3. **Limited Open Data**: email.opened events only provide basic metadata
4. **Rich Click Data**: email.clicked events provide IP, user agent, and link information
5. **No Geolocation**: Resend doesn't provide country/city data - you'd need to add a geolocation service

## Resources

- [Resend Open and Click Tracking](https://resend.com/blog/open-and-click-tracking)
- [Resend Webhook Event Types](https://resend.com/docs/dashboard/webhooks/event-types)
- [Managing Webhooks via API](https://resend.com/changelog/managing-webhooks-via-api)
