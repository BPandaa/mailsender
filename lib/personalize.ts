type Subscriber = {
  id: string;
  email: string;
  name: string | null;
  metadata?: any;
};

/**
 * Replace dynamic variables in email content with subscriber data
 * Supports: {{name}}, {{email}}, {{first_name}}, {{last_name}}
 */
export function personalizeContent(
  content: string,
  subscriber: Subscriber
): string {
  let personalized = content;

  // Replace {{name}} or {{ name }} with subscriber's name or "there" as fallback
  personalized = personalized.replace(
    /\{\{\s*name\s*\}\}/gi,
    subscriber.name || "there"
  );

  // Replace {{email}} or {{ email }} with subscriber's email
  personalized = personalized.replace(/\{\{\s*email\s*\}\}/gi, subscriber.email);

  // Replace {{first_name}} or {{ first_name }} - extract first word from name
  const firstName = subscriber.name?.split(" ")[0] || "there";
  personalized = personalized.replace(/\{\{\s*first_name\s*\}\}/gi, firstName);

  // Replace {{last_name}} or {{ last_name }} - extract last word from name
  const nameParts = subscriber.name?.split(" ") || [];
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
  personalized = personalized.replace(/\{\{\s*last_name\s*\}\}/gi, lastName);

  // Replace any custom metadata fields if they exist
  // e.g., {{company}}, {{location}}, etc.
  if (subscriber.metadata && typeof subscriber.metadata === "object") {
    Object.keys(subscriber.metadata).forEach((key) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
      personalized = personalized.replace(regex, subscriber.metadata[key] || "");
    });
  }

  return personalized;
}

/**
 * Get list of available personalization variables
 */
export function getAvailableVariables(): string[] {
  return [
    "{{name}}",
    "{{email}}",
    "{{first_name}}",
    "{{last_name}}",
    "{{custom_field}}", // Any metadata field
  ];
}

/**
 * Preview personalization with sample data
 */
export function previewPersonalization(content: string): string {
  return personalizeContent(content, {
    id: "sample",
    email: "subscriber@example.com",
    name: "John Doe",
    metadata: {
      company: "Acme Corp",
      location: "New York",
    },
  });
}
