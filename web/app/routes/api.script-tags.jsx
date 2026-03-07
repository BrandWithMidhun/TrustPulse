import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");
  const APP_URL = process.env.SHOPIFY_APP_URL;

  if (intent === "install_script") {
    const res = await admin.graphql(`
      query { scriptTags(first: 10) { edges { node { id src } } } }
    `);
    const data = await res.json();
    const existing = data.data.scriptTags.edges.find(
      (e) => e.node.src.includes("popup.js")
    );
    if (!existing) {
      await admin.graphql(`
        mutation scriptTagCreate($input: ScriptTagInput!) {
          scriptTagCreate(input: $input) {
            scriptTag { id src }
            userErrors { field message }
          }
        }
      `, { variables: { input: { src: APP_URL + "/popup.js?shop=" + shop, displayScope: "ALL" } } });
    }
    return json({ success: true });
  }

  if (intent === "remove_script") {
    const res = await admin.graphql(`
      query { scriptTags(first: 10) { edges { node { id src } } } }
    `);
    const data = await res.json();
    const existing = data.data.scriptTags.edges.find(
      (e) => e.node.src.includes("popup.js")
    );
    if (existing) {
      await admin.graphql(`
        mutation scriptTagDelete($id: ID!) {
          scriptTagDelete(id: $id) {
            deletedScriptTagId
            userErrors { field message }
          }
        }
      `, { variables: { id: existing.node.id } });
    }
    return json({ success: true });
  }

  return json({ error: "Unknown intent" }, { status: 400 });
};