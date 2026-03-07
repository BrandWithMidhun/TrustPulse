import { json } from "@remix-run/node";

// This endpoint is called by the storefront script to get popup data
export const loader = async ({ request }) => {
  const { default: prisma } = await import("../db.server");

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return json({ error: "Missing shop parameter" }, { status: 400 });
  }

  const headers = {
    "Access-Control-Allow-Origin": `https://${shop}`,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Content-Type": "application/json",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers, status: 204 });
  }

  try {
    const settings = await prisma.popupSettings.findUnique({ where: { shop } });

    if (!settings || !settings.enabled) {
      return json({ enabled: false }, { headers });
    }

    const recentOrders = await prisma.recentOrder.findMany({
      where: { shop },
      orderBy: { orderCreatedAt: "desc" },
      take: 20,
      select: {
        productTitle: true,
        productImage: true,
        productHandle: true,
        customerName: true,
        customerCity: true,
        customerCountry: true,
        orderCreatedAt: true,
      },
    });

    const processedOrders = recentOrders.map(o => ({
      ...o,
      customerName: settings.anonymousName ? anonymizeName(o.customerName) : o.customerName,
      orderCreatedAt: o.orderCreatedAt.toISOString(),
    }));

    const liveVisitors = Math.floor(Math.random() * 15) + 3;

    return json({
      enabled: true,
      settings: {
        displayType: settings.displayType,
        position: settings.position,
        theme: settings.theme,
        customBgColor: settings.customBgColor,
        customTextColor: settings.customTextColor,
        customAccentColor: settings.customAccentColor,
        showDelay: settings.showDelay,
        displayDuration: settings.displayDuration,
        betweenDelay: settings.betweenDelay,
        mobileEnabled: settings.mobileEnabled,
        showProductImage: settings.showProductImage,
        showTimeAgo: settings.showTimeAgo,
        showLocation: settings.showLocation,
        maxPopups: settings.maxPopups,
        customHeadline: settings.customHeadline,
        customMessage: settings.customMessage,
      },
      recentOrders: processedOrders,
      liveVisitors,
    }, { headers });
  } catch (e) {
    console.error("API error:", e);
    return json({ error: "Internal server error" }, { status: 500, headers });
  }
};

// POST to track events
export const action = async ({ request }) => {
  const { default: prisma } = await import("../db.server");

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  const headers = {
    "Access-Control-Allow-Origin": shop ? `https://${shop}` : "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers, status: 204 });
  }

  if (!shop) {
    return json({ error: "Missing shop" }, { status: 400, headers });
  }

  try {
    const body = await request.json();
    const { type, popupType, sessionId } = body;

    if (type && popupType) {
      await prisma.popupActivity.create({
        data: { shop, type, popupType, sessionId: sessionId || null },
      });
    }
    return json({ ok: true }, { headers });
  } catch (e) {
    return json({ error: "Error" }, { status: 500, headers });
  }
};

function anonymizeName(name) {
  if (!name) return "Someone";
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0].charAt(0) + "***";
  return `${parts[0]} ${parts[1].charAt(0)}.`;
}
