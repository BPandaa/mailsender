import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({
        authenticated: false,
        message: "Not logged in",
      });
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    // Get user's projects
    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        userId: true,
        createdAt: true,
        _count: {
          select: {
            subscribers: true,
            campaigns: true,
            templates: true,
          },
        },
      },
    });

    // Check if the specific user ID exists
    const specificUser = await prisma.user.findUnique({
      where: { id: "cmis1cdv90000qgi8gmohka0t" },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    return NextResponse.json({
      authenticated: true,
      currentUser: user,
      session: {
        userId: session.user.id,
        email: session.user.email,
      },
      projects: projects,
      projectCount: projects.length,
      specificUserExists: !!specificUser,
      specificUser: specificUser,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
