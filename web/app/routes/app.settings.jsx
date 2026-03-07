import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
import { useState } from "react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Select,
  RangeSlider,
  Checkbox,
  TextField,
  Badge,
  Divider,
  Banner,
  Frame,
  Box,
  Tabs,
} from "@shopify/polaris";

export const loader = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  const { default: prisma } = await import("../db.server");

  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  let settings = await prisma.popupSettings.findUnique({ where: { shop } });
  if (!settings) {
    settings = await prisma.popupSettings.create({ data: { shop } });
  }
  return json({ settings });
};

export const action = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  const { default: prisma } = await import("../db.server");

  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "toggle") {
    const current = await prisma.popupSettings.findUnique({ where: { shop } });
    await prisma.popupSettings.update({
      where: { shop },
      data: { enabled: !current.enabled },
    });
    return json({ success: true, message: !current.enabled ? "Popups enabled!" : "Popups disabled." });
  }

  if (intent === "save") {
    const data = {
      enabled: formData.get("enabled") === "true",
      displayType: formData.get("displayType"),
      position: formData.get("position"),
      theme: formData.get("theme"),
      customBgColor: formData.get("customBgColor") || null,
      customTextColor: formData.get("customTextColor") || null,
      customAccentColor: formData.get("customAccentColor") || null,
      showDelay: parseInt(formData.get("showDelay") || "3"),
      displayDuration: parseInt(formData.get("displayDuration") || "6"),
      betweenDelay: parseInt(formData.get("betweenDelay") || "8"),
      mobileEnabled: formData.get("mobileEnabled") === "true",
      showProductImage: formData.get("showProductImage") === "true",
      showTimeAgo: formData.get("showTimeAgo") === "true",
      showLocation: formData.get("showLocation") === "true",
      anonymousName: formData.get("anonymousName") === "true",
      maxPopups: parseInt(formData.get("maxPopups") || "0"),
      customHeadline: formData.get("customHeadline") || null,
      customMessage: formData.get("customMessage") || null,
    };
    await prisma.popupSettings.update({ where: { shop }, data });
    return json({ success: true, message: "Settings saved successfully!" });
  }

  return json({ success: false });
};

export default function Settings() {
  const { settings } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";

  const [selectedTab, setSelectedTab] = useState(0);
  const [formState, setFormState] = useState({
    enabled: settings.enabled,
    displayType: settings.displayType,
    position: settings.position,
    theme: settings.theme,
    customBgColor: settings.customBgColor || "#1a1a2e",
    customTextColor: settings.customTextColor || "#ffffff",
    customAccentColor: settings.customAccentColor || "#e94560",
    showDelay: settings.showDelay,
    displayDuration: settings.displayDuration,
    betweenDelay: settings.betweenDelay,
    mobileEnabled: settings.mobileEnabled,
    showProductImage: settings.showProductImage,
    showTimeAgo: settings.showTimeAgo,
    showLocation: settings.showLocation,
    anonymousName: settings.anonymousName,
    maxPopups: settings.maxPopups,
    customHeadline: settings.customHeadline || "",
    customMessage: settings.customMessage || "",
  });

  const handleSave = () => {
    const fd = new FormData();
    fd.append("intent", "save");
    Object.entries(formState).forEach(([k, v]) => fd.append(k, String(v)));
    submit(fd, { method: "post" });
  };

  const tabs = [
    { id: "display", content: "Display & Type" },
    { id: "design", content: "Design" },
    { id: "timing", content: "Timing" },
    { id: "content", content: "Content" },
  ];

  return (
    <Frame>
      <Page
        title="Popup Settings"
        backAction={{ url: "/app" }}
        primaryAction={{
          content: "Save Settings",
          loading: isSaving,
          onAction: handleSave,
        }}
        secondaryActions={[
          {
            content: formState.enabled ? "Disable" : "Enable",
            destructive: formState.enabled,
            onAction: () => setFormState(s => ({ ...s, enabled: !s.enabled })),
          },
        ]}
      >
        {actionData?.message && (
          <Banner tone="success" onDismiss={() => {}}>
            {actionData.message}
          </Banner>
        )}

        <Layout>
          <Layout.Section variant="twoThirds">
            <Card>
              <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
                <Box padding="400">
                  {selectedTab === 0 && (
                    <BlockStack gap="400">
                      <Text variant="headingMd">Display Configuration</Text>
                      <Select
                        label="Popup Type"
                        options={[
                          { label: "Recent Sales (Someone just bought...)", value: "recent_sales" },
                          { label: "Live Visitors (X people viewing this)", value: "live_visitors" },
                          { label: "Add to Cart Activity", value: "add_to_cart" },
                          { label: "Mixed (Rotate all types)", value: "mixed" },
                        ]}
                        value={formState.displayType}
                        onChange={v => setFormState(s => ({ ...s, displayType: v }))}
                      />
                      <Select
                        label="Popup Position"
                        options={[
                          { label: "Bottom Left", value: "bottom-left" },
                          { label: "Bottom Right", value: "bottom-right" },
                          { label: "Top Left", value: "top-left" },
                          { label: "Top Right", value: "top-right" },
                        ]}
                        value={formState.position}
                        onChange={v => setFormState(s => ({ ...s, position: v }))}
                      />
                      <BlockStack gap="300">
                        <Text variant="bodyMd" fontWeight="semibold">Display Options</Text>
                        <Checkbox
                          label="Show product image"
                          checked={formState.showProductImage}
                          onChange={v => setFormState(s => ({ ...s, showProductImage: v }))}
                        />
                        <Checkbox
                          label='Show "X minutes ago" timestamp'
                          checked={formState.showTimeAgo}
                          onChange={v => setFormState(s => ({ ...s, showTimeAgo: v }))}
                        />
                        <Checkbox
                          label="Show customer location (city/country)"
                          checked={formState.showLocation}
                          onChange={v => setFormState(s => ({ ...s, showLocation: v }))}
                        />
                        <Checkbox
                          label="Anonymize customer names (show as J.)"
                          checked={formState.anonymousName}
                          onChange={v => setFormState(s => ({ ...s, anonymousName: v }))}
                        />
                        <Checkbox
                          label="Enable on mobile devices"
                          checked={formState.mobileEnabled}
                          onChange={v => setFormState(s => ({ ...s, mobileEnabled: v }))}
                        />
                      </BlockStack>
                      <BlockStack gap="200">
                        <Text>Max popups per session (0 = unlimited): {formState.maxPopups}</Text>
                        <RangeSlider
                          label=""
                          min={0} max={20} step={1}
                          value={formState.maxPopups}
                          onChange={v => setFormState(s => ({ ...s, maxPopups: v }))}
                          output
                        />
                      </BlockStack>
                    </BlockStack>
                  )}

                  {selectedTab === 1 && (
                    <BlockStack gap="400">
                      <Text variant="headingMd">Design</Text>
                      <Select
                        label="Theme"
                        options={[
                          { label: "Dark", value: "dark" },
                          { label: "Light", value: "light" },
                          { label: "Custom", value: "custom" },
                        ]}
                        value={formState.theme}
                        onChange={v => setFormState(s => ({ ...s, theme: v }))}
                      />
                      {formState.theme === "custom" && (
                        <BlockStack gap="300">
                          <TextField
                            label="Background Color"
                            value={formState.customBgColor}
                            onChange={v => setFormState(s => ({ ...s, customBgColor: v }))}
                            prefix={<div style={{ width: 16, height: 16, background: formState.customBgColor, borderRadius: 3 }} />}
                            placeholder="#1a1a2e"
                          />
                          <TextField
                            label="Text Color"
                            value={formState.customTextColor}
                            onChange={v => setFormState(s => ({ ...s, customTextColor: v }))}
                            prefix={<div style={{ width: 16, height: 16, background: formState.customTextColor, borderRadius: 3 }} />}
                            placeholder="#ffffff"
                          />
                          <TextField
                            label="Accent Color"
                            value={formState.customAccentColor}
                            onChange={v => setFormState(s => ({ ...s, customAccentColor: v }))}
                            prefix={<div style={{ width: 16, height: 16, background: formState.customAccentColor, borderRadius: 3 }} />}
                            placeholder="#e94560"
                          />
                        </BlockStack>
                      )}
                    </BlockStack>
                  )}

                  {selectedTab === 2 && (
                    <BlockStack gap="500">
                      <Text variant="headingMd">Timing Configuration</Text>
                      <BlockStack gap="200">
                        <Text>Initial delay: {formState.showDelay} seconds</Text>
                        <RangeSlider
                          label=""
                          min={0} max={30} step={1}
                          value={formState.showDelay}
                          onChange={v => setFormState(s => ({ ...s, showDelay: v }))}
                          output
                          helpText="How long to wait before showing the first popup after page load"
                        />
                      </BlockStack>
                      <BlockStack gap="200">
                        <Text>Display duration: {formState.displayDuration} seconds</Text>
                        <RangeSlider
                          label=""
                          min={2} max={20} step={1}
                          value={formState.displayDuration}
                          onChange={v => setFormState(s => ({ ...s, displayDuration: v }))}
                          output
                          helpText="How long each popup stays visible"
                        />
                      </BlockStack>
                      <BlockStack gap="200">
                        <Text>Delay between popups: {formState.betweenDelay} seconds</Text>
                        <RangeSlider
                          label=""
                          min={3} max={60} step={1}
                          value={formState.betweenDelay}
                          onChange={v => setFormState(s => ({ ...s, betweenDelay: v }))}
                          output
                          helpText="Time to wait between showing consecutive popups"
                        />
                      </BlockStack>
                    </BlockStack>
                  )}

                  {selectedTab === 3 && (
                    <BlockStack gap="400">
                      <Text variant="headingMd">Custom Content</Text>
                      <Banner tone="info">
                        Leave blank to use default messages. Use {"{{product}}"}, {"{{name}}"}, {"{{location}}"} as variables.
                      </Banner>
                      <TextField
                        label="Custom Headline"
                        value={formState.customHeadline}
                        onChange={v => setFormState(s => ({ ...s, customHeadline: v }))}
                        placeholder="Someone recently purchased"
                        helpText='Default: "Someone in {city} purchased"'
                      />
                      <TextField
                        label="Custom Message"
                        value={formState.customMessage}
                        onChange={v => setFormState(s => ({ ...s, customMessage: v }))}
                        placeholder="{{name}} just bought {{product}}"
                        multiline={3}
                        helpText="Customize the popup message text"
                      />
                    </BlockStack>
                  )}
                </Box>
              </Tabs>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Live Preview</Text>
                <Divider />
                <PopupPreview settings={formState} />
                <Text variant="bodySm" tone="subdued" alignment="center">
                  Preview of how your popup will look
                </Text>
              </BlockStack>
            </Card>

            <Box paddingBlockStart="400">
              <Card>
                <BlockStack gap="300">
                  <Text variant="headingMd">Status</Text>
                  <Divider />
                  <InlineStack align="space-between">
                    <Text>Popups</Text>
                    <Badge tone={formState.enabled ? "success" : "critical"}>
                      {formState.enabled ? "Active" : "Inactive"}
                    </Badge>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text>Mobile</Text>
                    <Badge tone={formState.mobileEnabled ? "success" : "new"}>
                      {formState.mobileEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </InlineStack>
                </BlockStack>
              </Card>
            </Box>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}

function PopupPreview({ settings }) {
  const getBgColor = () => {
    if (settings.theme === "dark") return "#1a1a2e";
    if (settings.theme === "light") return "#ffffff";
    return settings.customBgColor || "#1a1a2e";
  };
  const getTextColor = () => {
    if (settings.theme === "dark") return "#ffffff";
    if (settings.theme === "light") return "#333333";
    return settings.customTextColor || "#ffffff";
  };
  const getAccent = () => {
    if (settings.theme === "dark") return "#e94560";
    if (settings.theme === "light") return "#5c6ac4";
    return settings.customAccentColor || "#e94560";
  };

  return (
    <div style={{
      background: getBgColor(),
      color: getTextColor(),
      borderRadius: 12,
      padding: "12px 16px",
      display: "flex",
      gap: 12,
      alignItems: "center",
      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      border: `1px solid ${getAccent()}20`,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${getAccent()}, transparent)`,
      }} />
      {settings.showProductImage && (
        <div style={{
          width: 48, height: 48, borderRadius: 8, flexShrink: 0,
          background: `${getAccent()}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24,
        }}>🛍️</div>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 2 }}>
          {settings.customHeadline || "Someone in New York purchased"}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          Wireless Headphones Pro
        </div>
        {settings.showTimeAgo && (
          <div style={{ fontSize: 11, color: getAccent(), marginTop: 2 }}>
            ● 3 minutes ago
          </div>
        )}
      </div>
      <div style={{
        position: "absolute", top: 6, right: 8,
        fontSize: 16, opacity: 0.4, cursor: "pointer",
      }}>×</div>
    </div>
  );
}
