import { NextResponse } from "next/server";
import { getReceivedEmail } from "@/lib/resend-receiving";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ emailId: string }> }
) {
  try {
    const { emailId } = await params;
    const result = await getReceivedEmail(emailId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ email: result.data });
  } catch (error) {
    console.error("Get received email error:", error);
    return NextResponse.json(
      { error: "Failed to fetch received email" },
      { status: 500 }
    );
  }
}
