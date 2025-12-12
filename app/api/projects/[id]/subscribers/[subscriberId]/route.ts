import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// PUT /api/projects/[id]/subscribers/[subscriberId] - Update a subscriber
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; subscriberId: string }> }
) {
  try {
    const { id, subscriberId } = await params;
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

    const { name, subscribed, metadata } = await request.json();

    const subscriber = await prisma.subscriber.update({
      where: {
        id: subscriberId,
        projectId: id,
      },
      data: {
        name: name !== undefined ? name : undefined,
        subscribed: subscribed !== undefined ? subscribed : undefined,
        metadata: metadata !== undefined ? metadata : undefined,
      },
    });

    return NextResponse.json({ subscriber });
  } catch (error) {
    console.error("Update subscriber error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id]/subscribers/[subscriberId] - Partially update a subscriber
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; subscriberId: string }> }
) {
  try {
    const { id, subscriberId } = await params;
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

    const subscriber = await prisma.subscriber.update({
      where: {
        id: subscriberId,
        projectId: id,
      },
      data: body,
    });

    return NextResponse.json({ subscriber });
  } catch (error) {
    console.error("Update subscriber error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/subscribers/[subscriberId] - Delete a subscriber
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; subscriberId: string }> }
) {
  try {
    const { id, subscriberId } = await params;
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

    await prisma.subscriber.delete({
      where: {
        id: subscriberId,
        projectId: id,
      },
    });

    return NextResponse.json({ message: "Subscriber deleted successfully" });
  } catch (error) {
    console.error("Delete subscriber error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
