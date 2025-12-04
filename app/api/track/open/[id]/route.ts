import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/track/open/[id] - Track email open
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: emailEventId } = await params;
    console.log(`📧 Tracking pixel requested for email event: ${emailEventId}`);

    // Get client information
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
    const userAgent = request.headers.get("user-agent") || "";
    console.log(`IP: ${ip}, User-Agent: ${userAgent}`);

    // Parse user agent for device/browser/OS info
    let device = "Unknown";
    let browser = "Unknown";
    let os = "Unknown";

    if (userAgent) {
      // Simple user agent parsing (you can enhance this with ua-parser-js)
      if (userAgent.includes("Mobile")) device = "Mobile";
      else if (userAgent.includes("Tablet")) device = "Tablet";
      else device = "Desktop";

      if (userAgent.includes("Chrome")) browser = "Chrome";
      else if (userAgent.includes("Firefox")) browser = "Firefox";
      else if (userAgent.includes("Safari")) browser = "Safari";
      else if (userAgent.includes("Edge")) browser = "Edge";

      if (userAgent.includes("Windows")) os = "Windows";
      else if (userAgent.includes("Mac")) os = "macOS";
      else if (userAgent.includes("Linux")) os = "Linux";
      else if (userAgent.includes("Android")) os = "Android";
      else if (userAgent.includes("iOS")) os = "iOS";
    }

    // Record open event
    const openEvent = await prisma.openEvent.create({
      data: {
        emailEventId,
        ipAddress: ip,
        userAgent,
        device,
        browser,
        os,
        // Geolocation can be added later with a geolocation service
        country: null,
        city: null,
      },
    });

    console.log(`✅ Open event recorded: ${openEvent.id} for ${device}/${browser}`);

    // Return 1x1 transparent GIF (minimal base64-encoded GIF)
    const pixel = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "base64"
    );

    return new NextResponse(pixel, {
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("❌ Track open error:", error);

    // Still return the pixel even if tracking fails
    const pixel = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "base64"
    );
    return new NextResponse(pixel, {
      headers: { "Content-Type": "image/gif" },
    });
  }
}
