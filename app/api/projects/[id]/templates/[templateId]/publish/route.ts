import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  createResendTemplate,
  publishResendTemplate,
  type TemplateVariable,
} from "@/lib/resend-templates";

// POST /api/projects/[id]/templates/[templateId]/publish - Publish a template to Resend
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

    let resendTemplateId = template.resendTemplateId;

    // If template doesn't exist in Resend, create it
    if (!resendTemplateId) {
      const result = await createResendTemplate({
        name: template.name,
        html: template.html,
        variables: (template.variables as TemplateVariable[]) || [],
        publish: true,
      });

      if (!result.success || !result.templateId) {
        return NextResponse.json(
          { error: result.error || "Failed to create template in Resend" },
          { status: 500 }
        );
      }

      resendTemplateId = result.templateId;
    } else {
      // If it exists, publish it
      const result = await publishResendTemplate(resendTemplateId);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to publish template in Resend" },
          { status: 500 }
        );
      }
    }

    // Update database
    const updatedTemplate = await prisma.template.update({
      where: { id: templateId },
      data: {
        resendTemplateId,
        status: "published",
      },
    });

    return NextResponse.json({ template: updatedTemplate });
  } catch (error) {
    console.error("Publish template error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
