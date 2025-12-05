import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseUserAgent, getGeolocationIPAPI } from "@/lib/tracking";

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

    // Parse user agent using ua-parser-js for accurate detection
    const { device, browser, os } = parseUserAgent(userAgent);

    // Get geolocation from IP (async, but don't block the pixel response)
    const geolocation = await getGeolocationIPAPI(ip);

    // Record open event
    const openEvent = await prisma.openEvent.create({
      data: {
        emailEventId,
        ipAddress: ip,
        userAgent,
        device,
        browser,
        os,
        country: geolocation.country,
        city: geolocation.city,
      },
    });

    console.log(`✅ Open event recorded: ${openEvent.id} for ${device}/${browser} from ${geolocation.city}, ${geolocation.country}`);

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
