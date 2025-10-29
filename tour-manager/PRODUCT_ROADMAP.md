# Merch Table - Product Roadmap

## ✅ Phase 1: Messaging Clarity (COMPLETED)

### Goal

Make it crystal clear how payment processing works to avoid confusion.

### Implementation

- Added "How Payment Processing Works" section to landing page
- Three clear categories: Credit Cards, Digital Payments, Cash
- Explains why we don't process (zero fees, direct to user)
- Teases future Stripe integration for premium users

### Status: SHIPPED ✅

---

## 🚧 Phase 2: CSV Product Import (NEXT - 1-2 Weeks)

### Goal

Allow vendors to import products from Shopify, Squarespace, Square, Etsy instead of manual entry.

### User Story

"As a vendor with 50+ products in Shopify, I want to import my product catalog in under 1 minute, so I don't have to manually re-enter everything."

### Technical Requirements

**1. File Upload Component**

- Accept CSV files (drag & drop + file picker)
- Parse CSV with `papaparse` library
- Show preview of first 5 rows

**2. Column Mapping Interface**

```
CSV Column          →    Merch Table Field
--------------------------------------------
"Product Name"      →    Name
"Price"             →    Price
"Category"          →    Category
"Variant Options"   →    Sizes
"Description"       →    Description
"SKU"               →    ID
"Image URL"         →    Image URL
```

**3. Data Transformation**

- Handle common formats (Shopify, Square, Squarespace, Etsy)
- Provide templates for each platform
- Validate data (price is number, required fields present)
- Preview before import

**4. Bulk Import**

- Import all products with one click
- Show progress indicator
- Sync to Google Sheets
- Show success summary ("50 products imported")

### Files to Create/Modify

```
/src/components/ProductImport.tsx          (New - Import UI)
/src/lib/csvParser.ts                      (New - Parse & transform)
/src/app/api/sheets/bulk-import/route.ts   (New - Bulk sync to Sheets)
/src/components/ProductManager.tsx         (Modify - Add import button)
```

### User Flow

1. In Product Manager, click "Import from CSV"
2. Upload CSV or paste from Excel
3. Map columns (or use template)
4. Preview products
5. Click "Import X Products"
6. Products appear in POS + sync to Google Sheets

### Testing Checklist

- [ ] Can upload Shopify export CSV
- [ ] Can upload Square export CSV
- [ ] Can handle missing columns (smart defaults)
- [ ] Can handle sizes/variants properly
- [ ] Validates prices and required fields
- [ ] Syncs to Google Sheets correctly
- [ ] Shows helpful errors for bad data

### Success Metrics

- Time to import 50 products: < 2 minutes
- Vendor feedback: "This saved me hours"
- Reduction in signup drop-off

---

## 🔮 Phase 3: Stripe Terminal Integration (Month 3-4, IF DEMAND EXISTS)

### Goal

Allow premium users to process credit cards directly in the app using Stripe Terminal.

### Validation First

Before building, need **10+ users** requesting this feature. Track in spreadsheet:

```
User Email | Current Payment Method | Would Pay $12/mo for Built-in Cards? | Notes
```

### Technical Requirements (If Validated)

**1. Stripe Connect OAuth**

- User clicks "Connect Stripe Account"
- OAuth flow to connect their Stripe account
- Store Stripe account ID in Supabase (requires user DB)

**2. Stripe Terminal SDK Integration**

- Support Stripe readers (WisePad 3, BBPOS Chipper 2X)
- Create payment intents
- Handle card present transactions
- Show transaction status in real-time

**3. Payment Recording**

- Transaction processed via Stripe
- Sale recorded in Merch Table
- Synced to Google Sheets with Stripe transaction ID
- Money goes to USER'S Stripe account (not ours)

**4. Hardware Setup**

- User purchases Stripe reader ($59-$299)
- Pairs via Bluetooth
- In-app tutorial for setup

### Business Model

- **Free Tier**: Manual payment tracking (current)
- **Pro Tier ($12/mo)**: Stripe Terminal integration, CSV import, priority support
- **Revenue**: $12/mo + Stripe referral fees (~$10-20/user/year)

### Prerequisites

- Supabase user database (to store Stripe account IDs)
- Subscription system (to gate Pro features)
- User testing with 5+ vendors

### Files to Create

```
/src/lib/stripe.ts                         (Stripe SDK initialization)
/src/components/StripeTerminal.tsx         (Reader connection UI)
/src/app/api/stripe/connect/route.ts       (OAuth callback)
/src/app/api/stripe/payment/route.ts       (Create payment intent)
/src/components/Settings.tsx               (Add Stripe connection section)
```

### Testing Checklist

- [ ] Can connect Stripe account via OAuth
- [ ] Can pair Stripe reader
- [ ] Can process test transaction
- [ ] Money goes to user's Stripe account (not ours)
- [ ] Sale recorded in Google Sheets
- [ ] Handles declined cards gracefully
- [ ] Works offline (queues transactions)

### Risks & Considerations

- **Complexity**: 10x more complex than CSV import
- **Support burden**: Hardware issues, connection problems
- **Market validation**: Do users actually want this?
- **Competition**: Competing with Square on their turf
- **Prerequisites**: Need user database + subscriptions first

### Decision Gate

Only proceed if:

- ✅ 10+ users request it explicitly
- ✅ 3+ users willing to pay $12/mo for it
- ✅ Supabase user DB is implemented
- ✅ CSV import is validated and working

---

## 📊 Future Considerations (Post Phase 3)

### Potential Features

- **Square Integration** (alternative to Stripe Terminal)
- **Multi-vendor booth splitting** (shared booth at markets)
- **Inventory alerts** ("Low stock on hoodies")
- **Customer database** (repeat buyers, email collection)
- **Tax export** (Year-end CSV for accountants)
- **Multi-event tracking** (Track each market/show separately)
- **Team access** (Multiple people managing same booth)

### Market Expansion

- Food trucks (same POS, different products)
- Street performers (tips-focused)
- Farmers markets (produce pricing by weight)
- Art galleries (consignment tracking)

---

## Success Metrics

### Phase 2 Success

- 5+ users successfully import products via CSV
- Average import time < 3 minutes
- User feedback: "This is so much easier"

### Phase 3 Go/No-Go Decision

- 10+ users request card processing
- 3+ commit to paying $12/mo
- Average vendor revenue > $500/event (makes fees worth it)

---

## Principles

1. **Ship messaging fixes immediately** (free, high impact)
2. **Build CSV import quickly** (solves real pain, low complexity)
3. **Validate Stripe demand before building** (avoid wasted effort)
4. **Keep it bootstrapped** (no VC pressure, no feature bloat)
5. **Serve real users** (build what they ask for, not what's cool)

---

Last Updated: October 29, 2025
