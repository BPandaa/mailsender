/**
 * Webhook Testing Tool
 *
 * This script simulates Resend webhook events to test your webhook handler locally.
 *
 * Usage:
 * 1. Make sure your dev server is running (npm run dev)
 * 2. Run this script:
 *    npx ts-node scripts/test-webhook.ts
 */

import crypto from "crypto";

const WEBHOOK_URL = process.env.WEBHOOK_URL || "http://localhost:3000/api/webhooks/resend";
const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;

// Sample webhook payloads based on actual Resend format
const samplePayloads = {
  "email.sent": {
    type: "email.sent",
    created_at: new Date().toISOString(),
    data: {
      email_id: "test-email-id-123",
      from: "test@example.com",
      to: ["recipient@example.com"],
      subject: "Test Email",
      created_at: new Date().toISOString(),
    },
  },

  "email.delivered": {
    type: "email.delivered",
    created_at: new Date().toISOString(),
    data: {
      email_id: "test-email-id-123",
      from: "test@example.com",
      to: ["recipient@example.com"],
      subject: "Test Email",
      created_at: new Date().toISOString(),
    },
  },

  "email.opened": {
    type: "email.opened",
    created_at: new Date().toISOString(),
    data: {
      email_id: "test-email-id-123",
      from: "test@example.com",
      to: ["recipient@example.com"],
      subject: "Test Email",
      created_at: new Date().toISOString(),
      // NOTE: Resend does NOT provide device/browser/location data for email.opened
    },
  },

  "email.clicked": {
    type: "email.clicked",
    created_at: new Date().toISOString(),
    data: {
      email_id: "test-email-id-123",
      from: "test@example.com",
      to: ["recipient@example.com"],
      subject: "Test Email",
      created_at: new Date().toISOString(),
      click: {
        ipAddress: "192.168.1.1",
        link: "https://example.com/test-link",
        timestamp: new Date().toISOString(),
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15",
      },
    },
  },

  "email.bounced": {
    type: "email.bounced",
    created_at: new Date().toISOString(),
    data: {
      email_id: "test-email-id-123",
      from: "test@example.com",
      to: ["recipient@example.com"],
      subject: "Test Email",
      bounce_type: "hard",
      created_at: new Date().toISOString(),
    },
  },
};

function generateSvixHeaders(payload: string, secret: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  const svixId = crypto.randomUUID();

  // Svix signature format: {timestamp}.{body}
  const signedContent = `${svixId}.${timestamp}.${payload}`;

  // Extract the secret part after "whsec_"
  const secretPart = secret.startsWith("whsec_") ? secret.split("_")[1] : secret;

  // Create HMAC signature
  const signature = crypto
    .createHmac("sha256", secretPart)
    .update(signedContent)
    .digest("base64");

  return {
    "svix-id": svixId,
    "svix-timestamp": timestamp.toString(),
    "svix-signature": `v1,${signature}`,
  };
}

async function sendWebhook(eventType: keyof typeof samplePayloads, emailId?: string) {
  const payload = { ...samplePayloads[eventType] };

  // Allow custom email ID for testing
  if (emailId) {
    payload.data.email_id = emailId;
  }

  const body = JSON.stringify(payload);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add signature headers if webhook secret is provided
  if (WEBHOOK_SECRET) {
    const svixHeaders = generateSvixHeaders(body, WEBHOOK_SECRET);
    Object.assign(headers, svixHeaders);
  } else {
    console.log("⚠️  Warning: RESEND_WEBHOOK_SECRET not set - signature validation will be skipped\n");
  }

  console.log(`📤 Sending ${eventType} webhook to ${WEBHOOK_URL}`);
  console.log(`   Email ID: ${payload.data.email_id}\n`);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers,
      body,
    });

    if (response.ok) {
      console.log(`✅ Success! Status: ${response.status}`);
      const data = await response.json();
      console.log(`   Response:`, data);
    } else {
      console.log(`❌ Failed! Status: ${response.status}`);
      const text = await response.text();
      console.log(`   Error:`, text);
    }
  } catch (error) {
    console.log(`❌ Request failed:`, error);
  }

  console.log("");
}

async function main() {
  console.log("╔════════════════════════════════════════════╗");
  console.log("║     Resend Webhook Testing Tool           ║");
  console.log("╚════════════════════════════════════════════╝\n");

  // Get email ID from command line or use default
  const emailIdArg = process.argv[2];
  const eventTypeArg = process.argv[3] as keyof typeof samplePayloads | undefined;

  if (eventTypeArg && !samplePayloads[eventTypeArg]) {
    console.log("❌ Invalid event type. Available types:");
    Object.keys(samplePayloads).forEach((type) => console.log(`   - ${type}`));
    process.exit(1);
  }

  // If specific event type provided, send only that
  if (eventTypeArg) {
    await sendWebhook(eventTypeArg, emailIdArg || undefined);
    return;
  }

  // Otherwise, send all events in sequence
  console.log("📧 Testing complete email lifecycle...\n");

  await sendWebhook("email.sent", emailIdArg);
  await new Promise((resolve) => setTimeout(resolve, 500));

  await sendWebhook("email.delivered", emailIdArg);
  await new Promise((resolve) => setTimeout(resolve, 500));

  await sendWebhook("email.opened", emailIdArg);
  await new Promise((resolve) => setTimeout(resolve, 500));

  await sendWebhook("email.clicked", emailIdArg);
  await new Promise((resolve) => setTimeout(resolve, 500));

  console.log("✅ All test webhooks sent!\n");
  console.log("💡 Check your server logs and database to verify events were processed correctly.");
  console.log("   Run: node debug-tracking.js\n");
}

// Usage instructions
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log("Resend Webhook Testing Tool");
  console.log("");
  console.log("Usage:");
  console.log("  npx ts-node scripts/test-webhook.ts [EMAIL_ID] [EVENT_TYPE]");
  console.log("");
  console.log("Arguments:");
  console.log("  EMAIL_ID    - Optional: Resend email ID to use in test (default: test-email-id-123)");
  console.log("  EVENT_TYPE  - Optional: Specific event to test (default: all events)");
  console.log("");
  console.log("Event Types:");
  Object.keys(samplePayloads).forEach((type) => console.log(`  - ${type}`));
  console.log("");
  console.log("Examples:");
  console.log("  # Test all events with default email ID");
  console.log("  npx ts-node scripts/test-webhook.ts");
  console.log("");
  console.log("  # Test all events with specific email ID");
  console.log("  npx ts-node scripts/test-webhook.ts 8f27c480-7dc2-4c07-a7cd-41424146a082");
  console.log("");
  console.log("  # Test only email.opened event");
  console.log("  npx ts-node scripts/test-webhook.ts test-123 email.opened");
  console.log("");
  console.log("Environment Variables:");
  console.log("  WEBHOOK_URL           - Webhook endpoint (default: http://localhost:3000/api/webhooks/resend)");
  console.log("  RESEND_WEBHOOK_SECRET - Webhook secret for signature validation");
  console.log("");
  process.exit(0);
}

main().catch(console.error);
