import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/track/click/[id] - Track link click and redirect
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: emailEventId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const targetUrl = searchParams.get("url");

    if (!targetUrl) {
      return NextResponse.json({ error: "URL parameter required" }, { status: 400 });
    }

    // Get client information
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
    const userAgent = request.headers.get("user-agent") || "";

    // Parse user agent for device/browser/OS info
    let device = "Unknown";
    let browser = "Unknown";
    let os = "Unknown";

    if (userAgent) {
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

    // Record click event (don't await to make redirect faster)
    prisma.clickEvent
      .create({
        data: {
          emailEventId,
          linkUrl: targetUrl,
          ipAddress: ip,
          userAgent,
          device,
          browser,
          os,
          // Geolocation can be added later
          country: null,
          city: null,
        },
      })
      .catch((error) => {
        console.error("Track click error:", error);
      });

    // Redirect to original URL
    return NextResponse.redirect(targetUrl);
  } catch (error) {
    console.error("Track click redirect error:", error);

    // Try to redirect anyway if we have the URL
    const searchParams = request.nextUrl.searchParams;
    const targetUrl = searchParams.get("url");

    if (targetUrl) {
      return NextResponse.redirect(targetUrl);
    }

    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
