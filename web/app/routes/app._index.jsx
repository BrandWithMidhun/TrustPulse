import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Badge,
  Box,
  Divider,
  Banner,
  DataTable,
  EmptyState,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Get or create settings
  let settings = await prisma.popupSettings.findUnique({ where: { shop } });
  if (!settings) {
    settings = await prisma.popupSettings.create({ data: { shop } });
  }

  // Get analytics: last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [impressions, clicks, recentOrders, totalOrders] = await Promise.all([
    prisma.popupActivity.count({
      where: { shop, type: "impression", createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.popupActivity.count({
      where: { shop, type: "click", createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.recentOrder.findMany({
      where: { shop },
      orderBy: { orderCreatedAt: "desc" },
      take: 5,
    }),
    prisma.recentOrder.count({ where: { shop } }),
  ]);

  const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(1) : "0.0";

  return json({
    settings,
    stats: { impressions, clicks, ctr, totalOrders },
    recentOrders,
  });
};

export default function Index() {
  const { settings, stats, recentOrders } = useLoaderData();
  const navigate = useNavigate();

  const statsCards = [
    { label: "Popup Impressions", value: stats.impressions.toLocaleString(), color: "#5c6ac4" },
    { label: "Product Clicks", value: stats.clicks.toLocaleString(), color: "#47c1bf" },
    { label: "Click-Through Rate", value: `${stats.ctr}%`, color: "#f49342" },
    { label: "Orders Tracked", value: stats.totalOrders.toLocaleString(), color: "#de3618" },
  ];

  return (
    <Page
      title="Social Proof Popups"
      subtitle="Boost conversions with real-time social proof"
      primaryAction={{
        content: "Customize Popups",
        onAction: () => navigate("/app/settings"),
      }}
      secondaryActions={[
        {
          content: settings.enabled ? "Disable Popups" : "Enable Popups",
          destructive: settings.enabled,
          onAction: () => navigate("/app/settings"),
        },
      ]}
    >
      <Layout>
        {!settings.enabled && (
          <Layout.Section>
            <Banner
              title="Popups are currently disabled"
              action={{ content: "Enable Now", onAction: () => navigate("/app/settings") }}
              tone="warning"
            >
              <p>Enable your social proof popups to start boosting conversions.</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <InlineStack gap="400" wrap>
            {statsCards.map((stat) => (
              <div key={stat.label} style={{ flex: "1 1 200px", minWidth: "180px" }}>
                <Card>
                  <BlockStack gap="200">
                    <Text variant="bodyMd" tone="subdued">{stat.label}</Text>
                    <Text variant="heading2xl" as="p" fontWeight="bold">
                      {stat.value}
                    </Text>
                    <Text variant="bodySm" tone="subdued">Last 30 days</Text>
                  </BlockStack>
                </Card>
              </div>
            ))}
          </InlineStack>
        </Layout.Section>

        <Layout.Section>
          <Layout>
            <Layout.Section variant="oneHalf">
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text variant="headingMd" as="h2">Current Configuration</Text>
                    <Button variant="plain" onClick={() => navigate("/app/settings")}>Edit</Button>
                  </InlineStack>
                  <Divider />
                  <BlockStack gap="300">
                    <InlineStack align="space-between">
                      <Text>Status</Text>
                      <Badge tone={settings.enabled ? "success" : "critical"}>
                        {settings.enabled ? "Active" : "Inactive"}
                      </Badge>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text>Display Type</Text>
                      <Badge>{settings.displayType.replace(/_/g, " ")}</Badge>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text>Position</Text>
                      <Text tone="subdued">{settings.position.replace(/-/g, " ")}</Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text>Theme</Text>
                      <Text tone="subdued">{settings.theme}</Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text>Show Delay</Text>
                      <Text tone="subdued">{settings.showDelay}s</Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text>Display Duration</Text>
                      <Text tone="subdued">{settings.displayDuration}s</Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text>Mobile Popups</Text>
                      <Badge tone={settings.mobileEnabled ? "success" : "new"}>
                        {settings.mobileEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>
            </Layout.Section>

            <Layout.Section variant="oneHalf">
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Recent Sales Activity</Text>
                  <Divider />
                  {recentOrders.length === 0 ? (
                    <EmptyState
                      heading="No orders yet"
                      image=""
                    >
                      <p>Orders will appear here once customers start purchasing.</p>
                    </EmptyState>
                  ) : (
                    <BlockStack gap="300">
                      {recentOrders.map((order) => (
                        <InlineStack key={order.id} gap="300" align="start" blockAlign="center">
                          {order.productImage && (
                            <img
                              src={order.productImage}
                              alt={order.productTitle}
                              style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6 }}
                            />
                          )}
                          <BlockStack gap="050">
                            <Text variant="bodySm" fontWeight="semibold">{order.productTitle}</Text>
                            <Text variant="bodySm" tone="subdued">
                              {order.customerName} · {order.customerCity || "Unknown"}, {order.customerCountry || ""}
                            </Text>
                            <Text variant="bodySm" tone="subdued">
                              {new Date(order.orderCreatedAt).toLocaleDateString()}
                            </Text>
                          </BlockStack>
                        </InlineStack>
                      ))}
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Quick Setup Guide</Text>
              <Divider />
              <InlineStack gap="600" wrap>
                {[
                  { step: "1", title: "Install App", desc: "App is installed and connected to your store", done: true },
                  { step: "2", title: "Customize Design", desc: "Choose colors, position, and popup style", done: false, action: () => navigate("/app/settings") },
                  { step: "3", title: "Go Live", desc: "Enable popups and watch conversions grow", done: settings.enabled },
                ].map((item) => (
                  <Box key={item.step} padding="400" background={item.done ? "bg-surface-success" : "bg-surface-secondary"} borderRadius="300" minWidth="200px">
                    <BlockStack gap="200">
                      <InlineStack gap="200" blockAlign="center">
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: item.done ? "#47c1bf" : "#e4e5e7",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: item.done ? "white" : "#637381", fontWeight: "bold", fontSize: 14
                        }}>
                          {item.done ? "✓" : item.step}
                        </div>
                        <Text variant="bodyMd" fontWeight="semibold">{item.title}</Text>
                      </InlineStack>
                      <Text variant="bodySm" tone="subdued">{item.desc}</Text>
                      {item.action && !item.done && (
                        <Button size="slim" onClick={item.action}>Configure</Button>
                      )}
                    </BlockStack>
                  </Box>
                ))}
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
