import { UAParser } from "ua-parser-js";

/**
 * Detect if a user agent is likely a bot, email scanner, or proxy
 */
export function isBot(userAgent: string): boolean {
  if (!userAgent) return true;

  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scan/i,
    /HeadlessChrome/i,
    /PhantomJS/i,
    /GoogleImageProxy/i,
    /Yahoo! Slurp/i,
    /bingbot/i,
    /LinkedInBot/i,
    /facebookexternalhit/i,
    /Twitterbot/i,
    /WhatsApp/i,
    /SkypeUriPreview/i,
    /Slackbot/i,
    /Discordbot/i,
  ];

  return botPatterns.some((pattern) => pattern.test(userAgent));
}

/**
 * Parse user agent string to extract device, browser, and OS information
 */
export function parseUserAgent(userAgent: string) {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  return {
    device: result.device.type || "desktop",
    browser: result.browser.name || "Unknown",
    os: result.os.name || "Unknown",
    isBot: isBot(userAgent),
  };
}

/**
 * Get geolocation data from IP address using IP-API.com (free, no API key needed)
 * Rate limit: 150 requests/minute (45 requests/minute with batch)
 */
export async function getGeolocation(ip: string): Promise<{
  country: string | null;
  city: string | null;
}> {
  // Handle localhost and private IPs
  if (
    !ip ||
    ip === "::1" ||
    ip === "127.0.0.1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.")
  ) {
    return { country: null, city: null };
  }

  try {
    // Extract first IP if there are multiple (x-forwarded-for can have multiple IPs)
    const cleanIp = ip.split(",")[0].trim();

    // Use IP-API.com (free, no API key required)
    const response = await fetch(
      `http://ip-api.com/json/${cleanIp}?fields=status,message,country,city`,
      {
        headers: { "Accept": "application/json" },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(3000),
      }
    );

    if (!response.ok) {
      console.warn(`Geolocation API error: ${response.status}`);
      return { country: null, city: null };
    }

    const data = await response.json();

    if (data.status === "fail") {
      console.warn(`Geolocation failed: ${data.message}`);
      return { country: null, city: null };
    }

    return {
      country: data.country || null,
      city: data.city || null,
    };
  } catch (error) {
    console.error("Geolocation error:", error);
    return { country: null, city: null };
  }
}

/**
 * Alternative: ipapi.co (free tier: 1,000 requests/day, no API key)
 * Use this if you need HTTPS support (Vercel requires HTTPS for external API calls)
 */
export async function getGeolocationIPAPI(ip: string): Promise<{
  country: string | null;
  city: string | null;
}> {
  if (
    !ip ||
    ip === "::1" ||
    ip === "127.0.0.1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.")
  ) {
    return { country: null, city: null };
  }

  try {
    const cleanIp = ip.split(",")[0].trim();

    // Use ipapi.co (HTTPS, free tier: 1,000/day)
    const response = await fetch(`https://ipapi.co/${cleanIp}/json/`, {
      headers: { "User-Agent": "mailsender-tracker" },
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      console.warn(`ipapi.co error: ${response.status}`);
      return { country: null, city: null };
    }

    const data = await response.json();

    if (data.error) {
      console.warn(`ipapi.co error: ${data.reason}`);
      return { country: null, city: null };
    }

    return {
      country: data.country_name || null,
      city: data.city || null,
    };
  } catch (error) {
    console.error("ipapi.co error:", error);
    return { country: null, city: null };
  }
}
