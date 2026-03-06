# 🚀 Social Proof Popups — Complete Shopify App

A full-featured social proof popup app ready to publish on the Shopify App Store. Boost conversions with real-time sales notifications, live visitor counts, and activity popups.

## ✨ Features

- **Recent Sales Popups** — "John in New York purchased Product X • 3 minutes ago"
- **Live Visitor Count** — "47 people are viewing this right now"
- **Add-to-Cart Activity** — Show cart activity to create urgency
- **Mixed Mode** — Automatically rotate between all popup types
- **Full Design Customization** — Dark/Light/Custom themes, colors, position
- **Timing Control** — Show delay, duration, and between-popup delay
- **Analytics Dashboard** — Track impressions, clicks, and CTR
- **Mobile Optimized** — Optional mobile disable
- **Name Anonymization** — Show "J***" instead of full names for privacy
- **Session Limits** — Cap popups per visitor session

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Remix (React) |
| UI | Shopify Polaris |
| Database | SQLite via Prisma (swap to Postgres for production) |
| Auth | Shopify OAuth via `@shopify/shopify-app-remix` |
| Storefront | Vanilla JS widget injected via ScriptTag API |
| Hosting | Any Node.js host (Railway, Fly.io, Render, Heroku) |

---

## 📁 Project Structure

```
shopify-social-proof/
├── web/app/
│   ├── routes/
│   │   ├── app.jsx              # App layout + nav
│   │   ├── app._index.jsx       # Dashboard
│   │   ├── app.settings.jsx     # Popup customization
│   │   ├── app.analytics.jsx    # Analytics
│   │   ├── api.popup-data.jsx   # Public API for widget
│   │   ├── api.script-tags.jsx  # Script tag management
│   │   ├── popup.js.jsx         # Serves widget JS to storefronts
│   │   ├── webhooks.jsx         # Order + uninstall webhooks
│   │   └── auth.$.jsx           # OAuth handler
│   ├── shopify.server.js        # Shopify app config
│   ├── db.server.js             # Prisma client
│   └── root.jsx                 # HTML shell
├── extensions/
│   └── social-proof-popup/      # Theme app extension (optional)
├── prisma/
│   └── schema.prisma            # Database models
├── shopify.app.toml             # App configuration
├── vite.config.js
└── package.json
```

---

## 🚀 Setup & Installation

### 1. Create Shopify Partner Account
1. Go to [partners.shopify.com](https://partners.shopify.com)
2. Create a new app → "Public app" 
3. Note your **API key** and **API secret**

### 2. Clone & Configure
```bash
git clone <this-repo>
cd shopify-social-proof
cp .env.example .env
```

Edit `.env`:
```env
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_APP_URL=https://your-domain.com
SCOPES=read_orders,read_products,read_customers,write_script_tags,read_script_tags
DATABASE_URL="file:./dev.db"
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Setup Database
```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Run Locally with Shopify CLI
```bash
npm install -g @shopify/cli @shopify/app
shopify app dev
```

This opens a tunnel and OAuth flow automatically.

---

## 🌐 Production Deployment

### Railway (Recommended - easiest)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

Set environment variables in Railway dashboard.

### Fly.io
```bash
fly launch
fly secrets set SHOPIFY_API_KEY=xxx SHOPIFY_API_SECRET=xxx SHOPIFY_APP_URL=https://xxx.fly.dev
fly deploy
```

### Render / Heroku
Standard Node.js deployment. Set all env vars, run `npm run setup` as the build command.

### Production Database
For production, switch from SQLite to PostgreSQL:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

## 📦 Publishing to Shopify App Store

### 1. Update shopify.app.toml
```toml
client_id = "YOUR_ACTUAL_CLIENT_ID"
application_url = "https://your-deployed-app.com"

[auth]
redirect_urls = [
  "https://your-deployed-app.com/auth/callback",
  "https://your-deployed-app.com/auth/shopify/callback", 
  "https://your-deployed-app.com/exitiframe"
]
```

### 2. Register Webhooks in Partner Dashboard
- `orders/create` → `https://your-app.com/webhooks/orders`  
- `app/uninstalled` → `https://your-app.com/webhooks`

### 3. App Store Listing Requirements
- **App name**: Social Proof Popups
- **App icon**: 1200×1200 PNG
- **Screenshots**: At least 3 (1600×900 recommended)
- **Description**: See below
- **Privacy policy URL**: Required
- **App category**: Marketing & conversion

### 4. Submit for Review
- Complete the [Shopify App Review checklist](https://shopify.dev/docs/apps/store/review)
- Typical review time: 5-10 business days

---

## 📝 Suggested App Store Description

**Boost conversions with real social proof!**

Social Proof Popups shows your visitors real-time notifications of recent purchases, live visitor counts, and cart activity — exactly like the leading apps SalesPop and Qikify, but with full customization control.

**Key features:**
- Recent purchase popups with customer name, city, and product
- Live visitor counter ("X people viewing this now")
- Add-to-cart activity notifications
- Full design customization: colors, position, theme
- Detailed analytics: impressions, clicks, CTR
- Mobile-optimized display
- GDPR-friendly name anonymization

---

## 🔧 How the Widget Works

1. On app install, a `ScriptTag` is registered pointing to `/popup.js?shop=xxx`
2. This script loads on every storefront page
3. It fetches `/api/popup-data?shop=xxx` to get settings + recent orders
4. Popups are shown according to timing settings
5. Click/impression events are posted back for analytics
6. Order data is updated in real-time via `orders/create` webhook

---

## 🛡️ Security

- All admin routes authenticated via Shopify OAuth
- Public API endpoints use CORS restricted to the shop domain
- No customer PII stored beyond what's displayed (name, city)
- Webhook signatures verified by Shopify SDK

---

## 📄 License

MIT — free to use, modify, and sell.
