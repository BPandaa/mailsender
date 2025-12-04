import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/projects/[id]/campaigns/[campaignId] - Get a single campaign
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  try {
    const { id, campaignId } = await params;
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

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        projectId: id,
      },
      include: {
        _count: {
          select: {
            emailEvents: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("Get campaign error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/campaigns/[campaignId] - Update a campaign
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  try {
    const { id, campaignId } = await params;
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

    const { name, subject, content, status } = await request.json();

    const campaign = await prisma.campaign.update({
      where: {
        id: campaignId,
        projectId: id,
      },
      data: {
        name: name !== undefined ? name : undefined,
        subject: subject !== undefined ? subject : undefined,
        content: content !== undefined ? content : undefined,
        status: status !== undefined ? status : undefined,
      },
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("Update campaign error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/campaigns/[campaignId] - Delete a campaign
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  try {
    const { id, campaignId } = await params;
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

    await prisma.campaign.delete({
      where: {
        id: campaignId,
        projectId: id,
      },
    });

    return NextResponse.json({ message: "Campaign deleted successfully" });
  } catch (error) {
    console.error("Delete campaign error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
