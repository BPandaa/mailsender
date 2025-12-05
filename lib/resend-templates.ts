import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Template variable definition
 */
export interface TemplateVariable {
  key: string;
  type: "string" | "number" | "boolean";
  fallbackValue?: string | number | boolean;
}

/**
 * Create a template in Resend
 */
export async function createResendTemplate(params: {
  name: string;
  html: string;
  variables?: TemplateVariable[];
  publish?: boolean;
}) {
  try {
    const templateData: any = {
      name: params.name,
      html: params.html,
    };

    // Add variables if provided
    if (params.variables && params.variables.length > 0) {
      templateData.variables = params.variables;
    }

    // Create the template
    const { data, error } = await resend.templates.create(templateData);

    if (error) {
      throw new Error(error.message);
    }

    // Publish if requested
    if (params.publish && data?.id) {
      await resend.templates.publish(data.id);
    }

    return { success: true, templateId: data?.id };
  } catch (error) {
    console.error("Create Resend template error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get a template from Resend
 */
export async function getResendTemplate(templateId: string) {
  try {
    const response = await resend.templates.get(templateId);
    const template = response.data;

    if (!template) {
      throw new Error("Template not found");
    }

    return { success: true, template };
  } catch (error) {
    console.error("Get Resend template error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update a template in Resend
 */
export async function updateResendTemplate(
  templateId: string,
  params: {
    name?: string;
    html?: string;
    variables?: TemplateVariable[];
  }
) {
  try {
    const updateData: any = {};

    if (params.name) updateData.name = params.name;
    if (params.html) updateData.html = params.html;
    if (params.variables) updateData.variables = params.variables;

    const { data, error } = await resend.templates.update(templateId, updateData);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, template: data };
  } catch (error) {
    console.error("Update Resend template error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Publish a template in Resend
 */
export async function publishResendTemplate(templateId: string) {
  try {
    await resend.templates.publish(templateId);
    return { success: true };
  } catch (error) {
    console.error("Publish Resend template error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Duplicate a template in Resend
 */
export async function duplicateResendTemplate(templateId: string) {
  try {
    const { data, error } = await resend.templates.duplicate(templateId);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, templateId: data?.id };
  } catch (error) {
    console.error("Duplicate Resend template error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete a template from Resend
 */
export async function deleteResendTemplate(templateId: string) {
  try {
    await resend.templates.remove(templateId);
    return { success: true };
  } catch (error) {
    console.error("Delete Resend template error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * List all templates from Resend
 */
export async function listResendTemplates(params?: {
  limit?: number;
  after?: string;
}) {
  try {
    const response = await resend.templates.list(params);
    const templates = response.data?.data || [];

    return { success: true, templates };
  } catch (error) {
    console.error("List Resend templates error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Process template content with signature
 */
export function addSignatureToTemplate(html: string, signature?: string): string {
  if (!signature) return html;

  // Add signature at the end of the HTML
  const signatureHtml = `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      ${signature}
    </div>
  `;

  // Check if html has closing body tag
  if (html.includes("</body>")) {
    return html.replace("</body>", `${signatureHtml}</body>`);
  }

  // Otherwise, just append
  return html + signatureHtml;
}

/**
 * Validate template variables in HTML
 */
export function validateTemplateVariables(
  html: string,
  variables: TemplateVariable[]
): { valid: boolean; missingVars: string[]; undeclaredVars: string[] } {
  // Find all variables in HTML (format: {{{VAR_NAME}}})
  const varMatches = html.match(/\{\{\{([A-Z_]+)\}\}\}/g) || [];
  const htmlVars = varMatches.map((match) => match.replace(/\{\{\{|\}\}\}/g, ""));
  const declaredVars = variables.map((v) => v.key);

  // Check for missing declarations
  const undeclaredVars = htmlVars.filter((v) => !declaredVars.includes(v));

  // Check for unused declarations
  const missingVars = declaredVars.filter((v) => !htmlVars.includes(v));

  return {
    valid: undeclaredVars.length === 0,
    missingVars,
    undeclaredVars,
  };
}
