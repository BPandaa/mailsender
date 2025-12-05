import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Enable click and open tracking for a domain
 * @param domainId - The Resend domain ID
 */
export async function enableTracking(domainId: string) {
  try {
    await resend.domains.update({
      id: domainId,
      openTracking: true,
      clickTracking: true,
    });

    console.log(`✅ Tracking enabled for domain ${domainId}`);
    return { success: true };
  } catch (error) {
    console.error("Enable tracking error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Get domain information including tracking status
 * @param domainId - The Resend domain ID
 */
export async function getDomainInfo(domainId: string) {
  try {
    const domain = await resend.domains.get(domainId);
    console.log("Domain info:", domain);
    return { success: true, data: domain };
  } catch (error) {
    console.error("Get domain error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * List all domains
 */
export async function listDomains() {
  try {
    const { data } = await resend.domains.list();
    console.log("Domains:", data);
    return { success: true, data };
  } catch (error) {
    console.error("List domains error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
