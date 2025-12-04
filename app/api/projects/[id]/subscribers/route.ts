import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/projects/[id]/subscribers - List subscribers for a project
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const subscribers = await prisma.subscriber.findMany({
      where: {
        projectId: id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ subscribers });
  } catch (error) {
    console.error("Get subscribers error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/subscribers - Add subscriber(s)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await request.json();

    // Handle bulk import (array of subscribers)
    if (Array.isArray(body)) {
      const results = {
        created: 0,
        updated: 0,
        errors: [] as string[],
      };

      for (const subscriber of body) {
        if (!subscriber.email) {
          results.errors.push("Email is required");
          continue;
        }

        try {
          await prisma.subscriber.upsert({
            where: {
              email_projectId: {
                email: subscriber.email,
                projectId: id,
              },
            },
            update: {
              name: subscriber.name || null,
              metadata: subscriber.metadata || null,
              subscribed: subscriber.subscribed !== undefined ? subscriber.subscribed : true,
            },
            create: {
              email: subscriber.email,
              name: subscriber.name || null,
              projectId: id,
              metadata: subscriber.metadata || null,
              subscribed: subscriber.subscribed !== undefined ? subscriber.subscribed : true,
            },
          });
          results.created++;
        } catch (error) {
          results.errors.push(`Failed to import ${subscriber.email}`);
        }
      }

      return NextResponse.json({ results }, { status: 201 });
    }

    // Handle single subscriber
    const { email, name, metadata } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const subscriber = await prisma.subscriber.upsert({
      where: {
        email_projectId: {
          email,
          projectId: id,
        },
      },
      update: {
        name: name || null,
        metadata: metadata || null,
      },
      create: {
        email,
        name: name || null,
        projectId: id,
        metadata: metadata || null,
      },
    });

    return NextResponse.json({ subscriber }, { status: 201 });
  } catch (error) {
    console.error("Create subscriber error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
