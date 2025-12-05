import { NextResponse } from "next/server";
import { listReceivedEmails } from "@/lib/resend-receiving";

export async function GET() {
  try {
    const result = await listReceivedEmails();

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ emails: result.data });
  } catch (error) {
    console.error("List received emails error:", error);
    return NextResponse.json(
      { error: "Failed to fetch received emails" },
      { status: 500 }
    );
  }
}
