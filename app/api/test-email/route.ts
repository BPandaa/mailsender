import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

// GET /api/test-email?to=your@email.com&from=verified@yourdomain.com
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const to = searchParams.get("to");
  const from = searchParams.get("from");

  if (!to || !from) {
    return NextResponse.json(
      { error: "Please provide 'to' and 'from' query parameters" },
      { status: 400 }
    );
  }

  console.log(`Testing email send to: ${to} from: ${from}`);

  const result = await sendEmail({
    to,
    from,
    subject: "Test Email from Mail Tracker",
    html: `
      <html>
        <body>
          <h1>Test Email</h1>
          <p>This is a test email from your Mail Tracker app.</p>
          <p>If you received this, Resend is working correctly!</p>
          <p>Sent at: ${new Date().toISOString()}</p>
        </body>
      </html>
    `,
  });

  if (result.success) {
    return NextResponse.json({
      success: true,
      message: "Email sent successfully!",
      messageId: result.messageId,
    });
  } else {
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        details: "Check the server logs for more information",
      },
      { status: 500 }
    );
  }
}
