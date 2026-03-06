import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  const { topic, shop, session, admin, payload } =
    await authenticate.webhook(request);

  switch (topic) {
    case "APP_UNINSTALLED":
      if (session) {
        await prisma.session.deleteMany({ where: { shop } });
      }
      break;

    case "ORDERS_CREATE":
      await handleOrderCreate(shop, payload);
      break;

    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  throw new Response("", { status: 200 });
};

async function handleOrderCreate(shop, order) {
  try {
    if (!order || !order.line_items?.length) return;

    // Store each line item as a recent order for social proof
    for (const item of order.line_items.slice(0, 1)) { // Just first item
      const customerName = getCustomerName(order, shop);
      
      // Check if product has an image
      let productImage = null;
      if (item.product_id) {
        // We'll store without image for now - can fetch via Admin API if needed
        productImage = null;
      }

      await prisma.recentOrder.upsert({
        where: { shop_orderId: { shop, orderId: String(order.id) } },
        update: {},
        create: {
          shop,
          orderId: String(order.id),
          productId: item.product_id ? String(item.product_id) : null,
          productTitle: item.title || "Product",
          productImage,
          productHandle: null,
          customerName,
          customerCity: order.billing_address?.city || order.shipping_address?.city || null,
          customerCountry: order.billing_address?.country_code || order.shipping_address?.country_code || null,
          orderCreatedAt: new Date(order.created_at),
        },
      });
    }

    // Keep only last 100 orders per shop
    const orders = await prisma.recentOrder.findMany({
      where: { shop },
      orderBy: { orderCreatedAt: "desc" },
      skip: 100,
      select: { id: true },
    });
    if (orders.length) {
      await prisma.recentOrder.deleteMany({
        where: { id: { in: orders.map(o => o.id) } },
      });
    }
  } catch (e) {
    console.error("Error handling order webhook:", e);
  }
}

function getCustomerName(order, shop) {
  const first = order.customer?.first_name;
  const last = order.customer?.last_name;
  if (first && last) return `${first} ${last.charAt(0)}.`;
  if (first) return first;
  if (order.billing_address?.first_name) return order.billing_address.first_name;
  return "Someone";
}
