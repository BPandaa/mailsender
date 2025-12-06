import { NextResponse } from "next/server";
import { listReceivedEmails } from "@/lib/resend-receiving";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await listReceivedEmails();

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Ensure we return an array
    const emails = Array.isArray(result.data)
      ? result.data
      : result.data?.data || [];

    // Match emails to projects by looking up sender in subscribers
    const emailsWithProjects = await Promise.all(
      emails.map(async (email: any) => {
        // Find which project this sender belongs to
        const subscriber = await prisma.subscriber.findFirst({
          where: {
            email: email.from,
            project: {
              userId: session.user.id,
            },
          },
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        return {
          ...email,
          project: subscriber?.project || null,
        };
      })
    );

    return NextResponse.json({ emails: emailsWithProjects });
  } catch (error) {
    console.error("List received emails error:", error);
    return NextResponse.json(
      { error: "Failed to fetch received emails" },
      { status: 500 }
    );
  }
}
