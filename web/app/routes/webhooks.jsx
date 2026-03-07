export const action = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  const { default: prisma } = await import("../db.server");

  const { topic, shop, session, payload } =
    await authenticate.webhook(request);

  switch (topic) {
    case "APP_UNINSTALLED":
      if (session) {
        await prisma.session.deleteMany({ where: { shop } });
      }
      break;

    case "ORDERS_CREATE":
      await handleOrderCreate(shop, payload, prisma);
      break;

    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  throw new Response("", { status: 200 });
};

async function handleOrderCreate(shop, order, prisma) {
  try {
    if (!order || !order.line_items?.length) return;

    for (const item of order.line_items.slice(0, 1)) {
      const customerName = getCustomerName(order);

      await prisma.recentOrder.upsert({
        where: { shop_orderId: { shop, orderId: String(order.id) } },
        update: {},
        create: {
          shop,
          orderId: String(order.id),
          productId: item.product_id ? String(item.product_id) : null,
          productTitle: item.title || "Product",
          productImage: null,
          productHandle: null,
          customerName,
          customerCity: order.billing_address?.city || order.shipping_address?.city || null,
          customerCountry: order.billing_address?.country_code || order.shipping_address?.country_code || null,
          orderCreatedAt: new Date(order.created_at),
        },
      });
    }

    // Keep only last 100 orders per shop
    const oldOrders = await prisma.recentOrder.findMany({
      where: { shop },
      orderBy: { orderCreatedAt: "desc" },
      skip: 100,
      select: { id: true },
    });
    if (oldOrders.length) {
      await prisma.recentOrder.deleteMany({
        where: { id: { in: oldOrders.map(o => o.id) } },
      });
    }
  } catch (e) {
    console.error("Error handling order webhook:", e);
  }
}

function getCustomerName(order) {
  const first = order.customer?.first_name;
  const last = order.customer?.last_name;
  if (first && last) return `${first} ${last.charAt(0)}.`;
  if (first) return first;
  if (order.billing_address?.first_name) return order.billing_address.first_name;
  return "Someone";
}
