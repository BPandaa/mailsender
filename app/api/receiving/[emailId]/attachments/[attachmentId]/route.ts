import { NextResponse } from "next/server";
import { getReceivedEmailAttachment } from "@/lib/resend-receiving";

export async function GET(
  request: Request,
  {
    params,
  }: { params: Promise<{ emailId: string; attachmentId: string }> }
) {
  try {
    const { emailId, attachmentId } = await params;
    const result = await getReceivedEmailAttachment(emailId, attachmentId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ attachment: result.data });
  } catch (error) {
    console.error("Get attachment error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attachment" },
      { status: 500 }
    );
  }
}
