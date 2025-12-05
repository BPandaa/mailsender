import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { duplicateResendTemplate } from "@/lib/resend-templates";

// POST /api/projects/[id]/templates/[templateId]/duplicate - Duplicate a template
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; templateId: string }> }
) {
  const { id, templateId } = await params;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify template belongs to user's project
    const template = await prisma.template.findFirst({
      where: {
        id: templateId,
        projectId: id,
        project: {
          userId: session.user.id,
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Create duplicate in database
    const duplicateTemplate = await prisma.template.create({
      data: {
        name: `${template.name} (Copy)`,
        html: template.html,
        subject: template.subject,
        projectId: id,
        variables: template.variables,
        signature: template.signature,
        status: "draft", // Duplicates start as draft
        // Don't copy resendTemplateId - it will be created if/when published
      },
    });

    return NextResponse.json({ template: duplicateTemplate }, { status: 201 });
  } catch (error) {
    console.error("Duplicate template error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
