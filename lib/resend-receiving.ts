import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * List all received emails
 */
export async function listReceivedEmails() {
  try {
    const { data, error } = await resend.emails.receiving.list();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("List received emails error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get a specific received email
 * @param emailId - The Resend email ID
 */
export async function getReceivedEmail(emailId: string) {
  try {
    const { data, error } = await resend.emails.receiving.get(emailId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Get received email error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * List attachments for a received email
 * @param emailId - The Resend email ID
 * NOTE: This feature is not yet available in the Resend SDK
 */
export async function listReceivedEmailAttachments(emailId: string) {
  try {
    // TODO: Enable when Resend SDK supports attachments API
    // const { data, error } = await resend.attachments.receiving.list({
    //   emailId,
    // });

    // Placeholder - will be enabled when SDK supports it
    return { success: true, data: [] };
  } catch (error) {
    console.error("List attachments error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get a specific attachment from a received email
 * @param emailId - The Resend email ID
 * @param attachmentId - The attachment ID
 * NOTE: This feature is not yet available in the Resend SDK
 */
export async function getReceivedEmailAttachment(
  emailId: string,
  attachmentId: string
) {
  try {
    // TODO: Enable when Resend SDK supports attachments API
    // const { data, error } = await resend.attachments.receiving.get({
    //   id: attachmentId,
    //   emailId,
    // });

    // Placeholder - will be enabled when SDK supports it
    return { success: true, data: null };
  } catch (error) {
    console.error("Get attachment error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
