import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseUserAgent, getGeolocationIPAPI } from "@/lib/tracking";

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

    // Parse user agent using ua-parser-js for accurate detection
    const { device, browser, os } = parseUserAgent(userAgent);

    // Get geolocation and record click event (don't await to make redirect faster)
    getGeolocationIPAPI(ip)
      .then((geolocation) => {
        return prisma.clickEvent.create({
          data: {
            emailEventId,
            linkUrl: targetUrl,
            ipAddress: ip,
            userAgent,
            device,
            browser,
            os,
            country: geolocation.country,
            city: geolocation.city,
          },
        });
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
