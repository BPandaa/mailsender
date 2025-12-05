import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  updateResendTemplate,
  deleteResendTemplate,
  addSignatureToTemplate,
  validateTemplateVariables,
  type TemplateVariable,
} from "@/lib/resend-templates";

// GET /api/projects/[id]/templates/[templateId] - Get a single template
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; templateId: string }> }
) {
  const { id, templateId } = await params;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify project belongs to user and get template
    const template = await prisma.template.findFirst({
      where: {
        id: templateId,
        projectId: id,
        project: {
          userId: session.user.id,
        },
      },
      include: {
        _count: {
          select: {
            campaigns: true,
          },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Get template error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/templates/[templateId] - Update a template
export async function PUT(
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
    const existingTemplate = await prisma.template.findFirst({
      where: {
        id: templateId,
        projectId: id,
        project: {
          userId: session.user.id,
        },
      },
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, html, subject, variables, signature } = body;

    // Validate variables if provided
    if (variables && html) {
      const validation = validateTemplateVariables(html, variables);
      if (!validation.valid) {
        return NextResponse.json(
          {
            error: "Template validation failed",
            undeclaredVars: validation.undeclaredVars,
          },
          { status: 400 }
        );
      }
    }

    // Process HTML with signature
    const finalHtml = html
      ? addSignatureToTemplate(html, signature)
      : existingTemplate.html;

    // Update in database
    const template = await prisma.template.update({
      where: { id: templateId },
      data: {
        ...(name && { name }),
        ...(html && { html: finalHtml }),
        ...(subject !== undefined && { subject }),
        ...(variables && { variables }),
        ...(signature !== undefined && { signature }),
      },
    });

    // If template is published in Resend, update it there too
    if (existingTemplate.resendTemplateId) {
      const updateData: any = {};
      if (name) updateData.name = name;
      if (html) updateData.html = finalHtml;
      if (variables) updateData.variables = variables as TemplateVariable[];

      await updateResendTemplate(existingTemplate.resendTemplateId, updateData);
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Update template error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/templates/[templateId] - Delete a template
export async function DELETE(
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

    // Check if template is used in any campaigns
    const campaignCount = await prisma.campaign.count({
      where: { templateId: templateId },
    });

    if (campaignCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete template. It is used in ${campaignCount} campaign(s)`,
        },
        { status: 400 }
      );
    }

    // Delete from Resend if it exists there
    if (template.resendTemplateId) {
      await deleteResendTemplate(template.resendTemplateId);
    }

    // Delete from database
    await prisma.template.delete({
      where: { id: templateId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete template error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
