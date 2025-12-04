import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Rewrite all links in HTML content to use click tracking
 */
export function rewriteLinksForTracking(
  html: string,
  emailEventId: string,
  baseUrl: string
): string {
  // Match all <a> tags with href attributes
  const linkRegex = /<a\s+([^>]*href=["']([^"']+)["'][^>]*)>/gi;

  return html.replace(linkRegex, (match, attributes, url) => {
    // Skip if already a tracking link
    if (url.includes('/api/track/click')) {
      return match;
    }

    // Create tracking URL
    const trackingUrl = `${baseUrl}/api/track/click/${emailEventId}?url=${encodeURIComponent(url)}`;

    // Replace the href value
    const newAttributes = attributes.replace(
      /href=["'][^"']+["']/i,
      `href="${trackingUrl}"`
    );

    return `<a ${newAttributes}>`;
  });
}

/**
 * Insert tracking pixel at the end of HTML body
 */
export function insertTrackingPixel(html: string, emailEventId: string, baseUrl: string): string {
  const trackingPixel = `<img src="${baseUrl}/api/track/open/${emailEventId}" width="1" height="1" style="display:none" alt="" />`;

  // Try to insert before closing </body> tag
  if (html.includes('</body>')) {
    return html.replace('</body>', `${trackingPixel}</body>`);
  }

  // Otherwise append to the end
  return html + trackingPixel;
}

/**
 * Send an email via Resend
 */
export async function sendEmail(params: {
  to: string;
  from: string;
  subject: string;
  html: string;
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: params.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("Send email error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
