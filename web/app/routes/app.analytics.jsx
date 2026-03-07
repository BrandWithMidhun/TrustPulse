import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  DataTable,
  Badge,
  Divider,
  EmptyState,
} from "@shopify/polaris";

export const loader = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  const { default: prisma } = await import("../db.server");

  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const days = [7, 30].map(d => {
    const date = new Date();
    date.setDate(date.getDate() - d);
    return date;
  });

  const [
    impressions7d, clicks7d, impressions30d, clicks30d,
    topProducts, recentActivity,
  ] = await Promise.all([
    prisma.popupActivity.count({ where: { shop, type: "impression", createdAt: { gte: days[0] } } }),
    prisma.popupActivity.count({ where: { shop, type: "click", createdAt: { gte: days[0] } } }),
    prisma.popupActivity.count({ where: { shop, type: "impression", createdAt: { gte: days[1] } } }),
    prisma.popupActivity.count({ where: { shop, type: "click", createdAt: { gte: days[1] } } }),
    prisma.recentOrder.groupBy({
      by: ["productTitle"],
      where: { shop },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
    prisma.popupActivity.findMany({
      where: { shop },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return json({
    stats: {
      impressions7d, clicks7d,
      ctr7d: impressions7d > 0 ? ((clicks7d / impressions7d) * 100).toFixed(1) : "0.0",
      impressions30d, clicks30d,
      ctr30d: impressions30d > 0 ? ((clicks30d / impressions30d) * 100).toFixed(1) : "0.0",
    },
    topProducts,
    recentActivity,
  });
};

export default function Analytics() {
  const { stats, topProducts, recentActivity } = useLoaderData();

  const topProductRows = topProducts.map(p => [
    p.productTitle,
    p._count.id,
    <Badge tone="success">Active</Badge>,
  ]);

  const activityRows = recentActivity.slice(0, 10).map(a => [
    a.type,
    a.popupType.replace(/_/g, " "),
    new Date(a.createdAt).toLocaleString(),
  ]);

  return (
    <Page title="Analytics" subtitle="Track your social proof popup performance" backAction={{ url: "/app" }}>
      <Layout>
        <Layout.Section>
          <InlineStack gap="400" wrap>
            {[
              { label: "7d Impressions", value: stats.impressions7d.toLocaleString() },
              { label: "7d Clicks", value: stats.clicks7d.toLocaleString() },
              { label: "7d CTR", value: `${stats.ctr7d}%` },
              { label: "30d Impressions", value: stats.impressions30d.toLocaleString() },
              { label: "30d Clicks", value: stats.clicks30d.toLocaleString() },
              { label: "30d CTR", value: `${stats.ctr30d}%` },
            ].map(s => (
              <div key={s.label} style={{ flex: "1 1 140px" }}>
                <Card>
                  <BlockStack gap="100">
                    <Text variant="bodySm" tone="subdued">{s.label}</Text>
                    <Text variant="headingXl" fontWeight="bold">{s.value}</Text>
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
                <BlockStack gap="300">
                  <Text variant="headingMd">Top Products in Popups</Text>
                  <Divider />
                  {topProductRows.length === 0 ? (
                    <EmptyState heading="No data yet" image="">
                      <p>Product data will appear once orders come in.</p>
                    </EmptyState>
                  ) : (
                    <DataTable
                      columnContentTypes={["text", "numeric", "text"]}
                      headings={["Product", "Orders", "Status"]}
                      rows={topProductRows}
                    />
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>

            <Layout.Section variant="oneHalf">
              <Card>
                <BlockStack gap="300">
                  <Text variant="headingMd">Recent Activity</Text>
                  <Divider />
                  {activityRows.length === 0 ? (
                    <EmptyState heading="No activity yet" image="">
                      <p>Activity logs will appear once visitors see popups.</p>
                    </EmptyState>
                  ) : (
                    <DataTable
                      columnContentTypes={["text", "text", "text"]}
                      headings={["Event", "Type", "Time"]}
                      rows={activityRows}
                    />
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
