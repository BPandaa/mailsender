import { NextResponse } from "next/server";
import { listReceivedEmailAttachments } from "@/lib/resend-receiving";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ emailId: string }> }
) {
  try {
    const { emailId } = await params;
    const result = await listReceivedEmailAttachments(emailId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ attachments: result.data });
  } catch (error) {
    console.error("List attachments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attachments" },
      { status: 500 }
    );
  }
}
