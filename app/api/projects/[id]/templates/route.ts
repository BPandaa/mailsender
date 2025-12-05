import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  createResendTemplate,
  addSignatureToTemplate,
  validateTemplateVariables,
  type TemplateVariable,
} from "@/lib/resend-templates";

// GET /api/projects/[id]/templates - List all templates for a project
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
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

    // Get all templates for this project
    const templates = await prisma.template.findMany({
      where: { projectId: id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        subject: true,
        status: true,
        thumbnailUrl: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            campaigns: true,
          },
        },
      },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("List templates error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/templates - Create a new template
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
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
    const { name, html, subject, variables, signature, publish } = body;

    if (!name || !html) {
      return NextResponse.json(
        { error: "Name and HTML content are required" },
        { status: 400 }
      );
    }

    // Validate variables if provided
    if (variables && variables.length > 0) {
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

    // Add signature to HTML if provided
    const finalHtml = addSignatureToTemplate(html, signature);

    // Create template in database
    const template = await prisma.template.create({
      data: {
        name,
        html: finalHtml,
        subject,
        projectId: id,
        variables: variables || [],
        signature,
        status: publish ? "draft" : "draft", // Will be updated after Resend creation
      },
    });

    // If publish is requested, create in Resend and update database
    if (publish) {
      const resendResult = await createResendTemplate({
        name,
        html: finalHtml,
        variables: variables as TemplateVariable[],
        publish: true,
      });

      if (resendResult.success && resendResult.templateId) {
        await prisma.template.update({
          where: { id: template.id },
          data: {
            resendTemplateId: resendResult.templateId,
            status: "published",
          },
        });
      }
    }

    // Fetch the updated template
    const updatedTemplate = await prisma.template.findUnique({
      where: { id: template.id },
    });

    return NextResponse.json({ template: updatedTemplate }, { status: 201 });
  } catch (error) {
    console.error("Create template error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
