# Email Templates Guide

## Overview

The template system allows you to create reusable email templates with variables, signatures, and images - similar to Resend's template UI.

## Features

- ✅ Create, update, and delete templates
- ✅ Template variables with fallback values (e.g., `{{{NAME}}}`, `{{{PRICE}}}`)
- ✅ Add email signatures to templates
- ✅ Publish templates to Resend for use across projects
- ✅ Duplicate templates
- ✅ Template validation (ensures all variables are declared)
- ✅ Per-project template management
- ✅ Track which campaigns use each template

## Database Schema

```prisma
model Template {
  id               String    @id @default(cuid())
  name             String
  html             String    @db.Text
  subject          String?   // Optional default subject
  projectId        String
  project          Project   @relation(...)
  resendTemplateId String?   @unique // Resend template ID when published
  variables        Json?     // Array of {key, type, fallbackValue}
  signature        String?   @db.Text // Email signature
  thumbnailUrl     String?   // Preview image URL
  status           String    @default("draft") // draft, published
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  campaigns        Campaign[]
}
```

## API Endpoints

### List Templates
```http
GET /api/projects/{projectId}/templates
```

Returns all templates for a project.

### Create Template
```http
POST /api/projects/{projectId}/templates
Content-Type: application/json

{
  "name": "Welcome Email",
  "html": "<h1>Hello {{{NAME}}}</h1><p>Thanks for joining!</p>",
  "subject": "Welcome to {{APP_NAME}}!",
  "variables": [
    {
      "key": "NAME",
      "type": "string",
      "fallbackValue": "there"
    }
  ],
  "signature": "<p>Best regards,<br>The Team</p>",
  "publish": false
}
```

### Get Template
```http
GET /api/projects/{projectId}/templates/{templateId}
```

### Update Template
```http
PUT /api/projects/{projectId}/templates/{templateId}
Content-Type: application/json

{
  "name": "Updated Welcome Email",
  "html": "<h1>Hi {{{NAME}}}</h1>",
  "variables": [...]
}
```

### Delete Template
```http
DELETE /api/projects/{projectId}/templates/{templateId}
```

Note: Cannot delete templates that are used in campaigns.

### Publish Template
```http
POST /api/projects/{projectId}/templates/{templateId}/publish
```

Publishes the template to Resend, making it available for use.

### Duplicate Template
```http
POST /api/projects/{projectId}/templates/{templateId}/duplicate
```

Creates a copy of the template with " (Copy)" appended to the name.

## Template Variables

### Syntax
Use triple curly braces for variables: `{{{VARIABLE_NAME}}}`

### Example
```html
<h1>Order Confirmation</h1>
<p>Hi {{{CUSTOMER_NAME}}},</p>
<p>Your order for {{{PRODUCT}}} totaling ${{{PRICE}}} has been confirmed.</p>
```

### Variable Declaration
```json
{
  "variables": [
    {
      "key": "CUSTOMER_NAME",
      "type": "string",
      "fallbackValue": "valued customer"
    },
    {
      "key": "PRODUCT",
      "type": "string",
      "fallbackValue": "item"
    },
    {
      "key": "PRICE",
      "type": "number",
      "fallbackValue": 0
    }
  ]
}
```

### Supported Types
- `string` - Text values
- `number` - Numeric values
- `boolean` - True/false values

## Email Signatures

Add a signature that will be automatically appended to the end of your template:

```json
{
  "signature": "<div style='margin-top: 20px;'><p>Best regards,</p><p><strong>John Doe</strong><br>CEO, Example Inc.<br>john@example.com</p></div>"
}
```

The signature will be added with a border separator for visual distinction.

## Template Validation

The system automatically validates that:
- All variables used in HTML are declared in the `variables` array
- No undeclared variables exist in the template
- Variable syntax is correct (`{{{VAR}}}` not `{{VAR}}`)

## Using Templates with Campaigns

When creating a campaign, you can select a template:

```javascript
// Create campaign from template
const campaign = await prisma.campaign.create({
  data: {
    name: "Welcome Campaign",
    subject: "Welcome!",
    content: template.html,
    templateId: template.id,
    projectId: projectId,
  },
});
```

The template's variables will be replaced with subscriber data when sending.

## Integration with Resend

### Publishing Flow

1. Create template in database (status: "draft")
2. Publish template → Creates in Resend via API
3. Resend returns template ID
4. Update database with `resendTemplateId` (status: "published")

### Syncing Updates

When you update a published template:
- Database is updated immediately
- Resend template is updated via API
- Both stay in sync

### Deletion

When deleting a template:
- Check if used in any campaigns (prevent deletion if yes)
- Delete from Resend (if published)
- Delete from database

## Library Functions

### `lib/resend-templates.ts`

```typescript
// Create template in Resend
await createResendTemplate({
  name: "Welcome Email",
  html: "<h1>Hello {{{NAME}}}</h1>",
  variables: [{ key: "NAME", type: "string", fallbackValue: "there" }],
  publish: true,
});

// Update template
await updateResendTemplate(templateId, {
  html: "<h1>Hi {{{NAME}}}</h1>",
});

// Publish template
await publishResendTemplate(templateId);

// Delete template
await deleteResendTemplate(templateId);

// List all templates
await listResendTemplates({ limit: 10 });

// Add signature to template
const htmlWithSignature = addSignatureToTemplate(html, signature);

// Validate template variables
const validation = validateTemplateVariables(html, variables);
if (!validation.valid) {
  console.log("Undeclared variables:", validation.undeclaredVars);
}
```

## Best Practices

1. **Use Descriptive Names**: Make template names clear and descriptive
2. **Define All Variables**: Always declare variables with appropriate fallback values
3. **Test Templates**: Create test campaigns to preview templates before production use
4. **Keep Signatures Consistent**: Use similar signature formats across templates
5. **Version Control**: Consider duplicating templates before major changes
6. **Clean Unused Templates**: Regularly review and delete unused draft templates

## Examples

### Simple Welcome Email
```json
{
  "name": "Welcome Email",
  "subject": "Welcome to {{{APP_NAME}}}!",
  "html": "<h1>Welcome, {{{NAME}}}!</h1><p>We're excited to have you on board.</p>",
  "variables": [
    { "key": "NAME", "type": "string", "fallbackValue": "there" },
    { "key": "APP_NAME", "type": "string", "fallbackValue": "our app" }
  ]
}
```

### Order Confirmation
```json
{
  "name": "Order Confirmation",
  "subject": "Order #{{{ORDER_ID}}} Confirmed",
  "html": "<h1>Order Confirmation</h1><p>Hi {{{CUSTOMER_NAME}}},</p><p>Your order for {{{PRODUCT}}} (${{{PRICE}}}) has been confirmed.</p><p>Order ID: {{{ORDER_ID}}}</p>",
  "variables": [
    { "key": "CUSTOMER_NAME", "type": "string", "fallbackValue": "Customer" },
    { "key": "PRODUCT", "type": "string", "fallbackValue": "product" },
    { "key": "PRICE", "type": "number", "fallbackValue": 0 },
    { "key": "ORDER_ID", "type": "string", "fallbackValue": "N/A" }
  ],
  "signature": "<p>Questions? Contact us at support@example.com</p>"
}
```

## Troubleshooting

### "Template validation failed"
- Ensure all variables used in HTML (`{{{VAR}}}`) are declared in the `variables` array
- Check for typos in variable names (case-sensitive)

### "Cannot delete template"
- Template is used in existing campaigns
- Either delete the campaigns first or keep the template

### "Failed to create template in Resend"
- Check your `RESEND_API_KEY` is valid
- Ensure you're not exceeding Resend's rate limits
- Verify HTML is valid

## Next Steps

1. Set up database: `npx prisma db push`
2. Create your first template via API or UI
3. Test template with a campaign
4. Publish to Resend when ready

