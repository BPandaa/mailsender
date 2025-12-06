/**
 * Setup Resend Domain Tracking
 *
 * This script helps you enable click and open tracking for your Resend domain.
 *
 * Usage:
 * 1. First, list your domains to get the domain ID:
 *    npx ts-node scripts/setup-tracking.ts list
 *
 * 2. Enable tracking for a specific domain:
 *    npx ts-node scripts/setup-tracking.ts enable YOUR_DOMAIN_ID
 *
 * 3. Check domain tracking status:
 *    npx ts-node scripts/setup-tracking.ts info YOUR_DOMAIN_ID
 */

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

async function listDomains() {
  console.log("📋 Fetching your Resend domains...\n");

  try {
    const response = await resend.domains.list();
    const domains = response.data?.data || [];

    if (domains.length === 0) {
      console.log("❌ No domains found.");
      console.log("   Please add a domain in your Resend dashboard: https://resend.com/domains\n");
      return;
    }

    console.log(`✅ Found ${domains.length} domain(s):\n`);

    domains.forEach((domain: any, index: number) => {
      console.log(`${index + 1}. ${domain.name}`);
      console.log(`   ID: ${domain.id}`);
      console.log(`   Status: ${domain.status}`);
      console.log(`   Region: ${domain.region}`);
      console.log("");
    });

    console.log("💡 Use the domain ID to enable tracking:");
    console.log("   npx ts-node scripts/setup-tracking.ts enable YOUR_DOMAIN_ID\n");
  } catch (error) {
    console.error("❌ Error listing domains:", error);
  }
}

async function getDomainInfo(domainId: string) {
  console.log(`📊 Fetching domain info for: ${domainId}\n`);

  try {
    const response = await resend.domains.get(domainId);
    const domain = response.data as any;

    if (!domain) {
      console.error("❌ Domain not found");
      return;
    }

    console.log("Domain Information:");
    console.log(`  Name: ${domain.name}`);
    console.log(`  ID: ${domain.id}`);
    console.log(`  Status: ${domain.status}`);
    console.log(`  Region: ${domain.region}`);
    console.log(`  Created: ${domain.created_at}`);
    console.log("");

    console.log("Tracking Settings:");
    console.log(`  ✉️  Open Tracking: ${domain.open_tracking ? "✅ ENABLED" : "❌ DISABLED"}`);
    console.log(`  🔗 Click Tracking: ${domain.click_tracking ? "✅ ENABLED" : "❌ DISABLED"}`);
    console.log("");

    if (!domain.open_tracking || !domain.click_tracking) {
      console.log("💡 To enable tracking, run:");
      console.log(`   npx ts-node scripts/setup-tracking.ts enable ${domainId}\n`);
    } else {
      console.log("✅ Tracking is fully enabled for this domain!\n");
    }
  } catch (error) {
    console.error("❌ Error fetching domain info:", error);
  }
}

async function enableTracking(domainId: string) {
  console.log(`🔧 Enabling tracking for domain: ${domainId}\n`);

  try {
    await resend.domains.update({
      id: domainId,
      openTracking: true,
      clickTracking: true,
    });

    console.log("✅ Tracking enabled successfully!\n");
    console.log("Verification:");
    await getDomainInfo(domainId);
  } catch (error) {
    console.error("❌ Error enabling tracking:", error);
    console.log("\n💡 Make sure:");
    console.log("   1. The domain ID is correct");
    console.log("   2. Your RESEND_API_KEY is valid");
    console.log("   3. The domain is verified in your Resend dashboard\n");
  }
}

// Main execution
const command = process.argv[2];
const domainId = process.argv[3];

async function main() {
  if (!process.env.RESEND_API_KEY) {
    console.error("❌ Error: RESEND_API_KEY environment variable is not set\n");
    console.log("Please set it in your .env file or export it:");
    console.log("   export RESEND_API_KEY=re_your_api_key_here\n");
    process.exit(1);
  }

  console.log("╔════════════════════════════════════════════╗");
  console.log("║   Resend Domain Tracking Setup Tool      ║");
  console.log("╚════════════════════════════════════════════╝\n");

  switch (command) {
    case "list":
      await listDomains();
      break;

    case "info":
      if (!domainId) {
        console.error("❌ Error: Domain ID is required\n");
        console.log("Usage: npx ts-node scripts/setup-tracking.ts info YOUR_DOMAIN_ID\n");
        process.exit(1);
      }
      await getDomainInfo(domainId);
      break;

    case "enable":
      if (!domainId) {
        console.error("❌ Error: Domain ID is required\n");
        console.log("Usage: npx ts-node scripts/setup-tracking.ts enable YOUR_DOMAIN_ID\n");
        process.exit(1);
      }
      await enableTracking(domainId);
      break;

    default:
      console.log("Usage:");
      console.log("  List domains:        npx ts-node scripts/setup-tracking.ts list");
      console.log("  Get domain info:     npx ts-node scripts/setup-tracking.ts info YOUR_DOMAIN_ID");
      console.log("  Enable tracking:     npx ts-node scripts/setup-tracking.ts enable YOUR_DOMAIN_ID\n");
      console.log("Examples:");
      console.log("  npx ts-node scripts/setup-tracking.ts list");
      console.log("  npx ts-node scripts/setup-tracking.ts enable b8617ad3-b712-41d9-81a0-f7c3d879314e\n");
      break;
  }
}

main().catch(console.error);
