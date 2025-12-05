import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send an email via Resend with native tracking enabled
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
      // Enable Resend's native tracking
      tags: [
        {
          name: "category",
          value: "campaign",
        },
      ],
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
