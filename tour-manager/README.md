# 🧡 FOLDING TABLE

**Road-ready POS for bands on tour.**

A modern, offline-first Point of Sale system for band merchandise sales. Built with Next.js 16, React 19, and Google Sheets integration. Track sales, manage inventory, stay focused on the show.## Getting Started

## ✨ FeaturesFirst, run the development server:

- **Fast POS Interface**: Quick product selection and checkout optimized for high-volume merch lines```bash

- **Offline-First**: Transactions saved locally with automatic sync when onlinenpm run dev

- **Product Management**: Easy setup interface to add/remove/edit merch inventory# or

- **Google Sheets Integration**: All sales data syncs to Google Sheets for easy reportingyarn dev

- **iPad Optimized**: Touch-friendly UI designed for tablet use# or

- **PWA Support**: Install as a standalone app on iPadpnpm dev

- **Payment Tracking**: Track payment methods (cash, card, Venmo, other)# or

- **No Transaction Processing**: Simple sales tracking without payment processing complexitybun dev

````

## 🚀 Quick Start

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Prerequisites

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

- Node.js 18+

- npm or pnpmThis project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

- Google Cloud account (for Sheets API)

## Learn More

### Installation

To learn more about Next.js, take a look at the following resources:

1. **Clone or download this project**

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.

```bash- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

git clone <your-repo-url>

cd tour-managerYou can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

````

## Deploy on Vercel

2. **Install dependencies**

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

```bash

npm installCheck out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

```

3. **Set up Google Sheets API** (see detailed instructions below)

4. **Configure environment variables**

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your credentials.

5. **Run development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📋 Google Sheets Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

### Step 2: Create a Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Name it (e.g., "merch-pos-sync") and create
4. Click on the service account you just created
5. Go to "Keys" tab
6. Click "Add Key" > "Create New Key"
7. Choose JSON format and download the file
8. **Keep this file secure!**

### Step 3: Create Your Google Sheet

1. Create a new Google Sheet
2. Create two sheets within it:
   - `Products` - for inventory
   - `Sales` - for sales records
3. Copy the spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
   ```
4. Share the sheet with your service account email:
   - Click "Share" button
   - Add the service account email (found in the JSON file: `client_email`)
   - Give it "Editor" permissions

### Step 4: Configure Environment Variables

In `.env.local`:

```bash
GOOGLE_SHEET_ID=your_spreadsheet_id_from_url

# Paste the entire JSON content from your service account key file
# Make sure it's on one line
GOOGLE_SERVICE_ACCOUNT_CREDENTIALS={"type":"service_account","project_id":"your-project",...}
```

## 📱 Using the App

### Initial Setup

1. **Product Setup Tab**:

   - The app comes with 8 default products (t-shirts, hoodies, vinyl, etc.)
   - Add your own products or modify existing ones
   - Click "Sync to Sheet" to save to Google Sheets

2. **Point of Sale Tab**:
   - Tap products to add to cart
   - Adjust quantities with +/- buttons
   - Select payment method
   - Click "Complete Sale"
   - Sales are saved locally and synced automatically when online

### Offline Mode

- All transactions are saved locally in IndexedDB
- Sync status bar shows pending sales count
- Automatically syncs when internet connection is restored
- Manual sync button available when pending sales exist

### Installing as PWA on iPad

1. Open the app in Safari
2. Tap the Share button
3. Tap "Add to Home Screen"
4. Name it "Merch POS"
5. Tap "Add"
6. App icon will appear on your home screen

## 🛠️ Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 📦 Project Structure

```
tour-manager/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── sync-sales/route.ts    # API for syncing sales
│   │   │   └── sync-products/route.ts # API for syncing products
│   │   ├── layout.tsx                 # Root layout with PWA config
│   │   └── page.tsx                   # Main app page
│   ├── components/
│   │   ├── POSInterface.tsx           # Main POS UI
│   │   ├── ProductManager.tsx         # Product setup UI
│   │   └── SyncStatusBar.tsx          # Sync status indicator
│   ├── lib/
│   │   ├── db.ts                      # IndexedDB operations
│   │   ├── sheets.ts                  # Google Sheets integration
│   │   └── defaultProducts.ts         # Default product catalog
│   └── types/
│       └── index.ts                   # TypeScript types
├── public/
│   └── manifest.json                  # PWA manifest
├── .env.example                       # Environment template
└── README.md
```

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub

2. Go to [Vercel](https://vercel.com)

3. Import your repository

4. Add environment variables in Vercel dashboard:

   - `GOOGLE_SHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS`

5. Deploy!

### Deploy to GitHub Pages

For static export:

```bash
npm run build
```

Note: Google Sheets sync requires server-side functionality, so GitHub Pages deployment will have limited functionality. Consider using Vercel, Netlify, or another platform that supports serverless functions.

## 📊 Google Sheets Data Structure

### Products Sheet

| ID            | Name                 | Price | Category | Description              |
| ------------- | -------------------- | ----- | -------- | ------------------------ |
| t-shirt-black | Band T-Shirt (Black) | 25    | Apparel  | Classic black tour shirt |

### Sales Sheet

| Timestamp            | Transaction ID  | Items                                | Total Qty | Total Amount | Payment Method |
| -------------------- | --------------- | ------------------------------------ | --------- | ------------ | -------------- |
| 2025-10-24T14:30:00Z | sale-1729780200 | Band T-Shirt (Black) (2), Poster (1) | 3         | 60.00        | card           |

## 🎯 Features Roadmap

- [x] Basic POS functionality
- [x] Offline-first architecture
- [x] Google Sheets sync
- [x] Product management
- [x] iPad optimization
- [ ] Sales analytics dashboard
- [ ] Barcode scanning support
- [ ] Multi-user support
- [ ] Export to CSV
- [ ] Inventory alerts

## 🐛 Troubleshooting

### Sync Not Working

1. Check internet connection
2. Verify Google Sheets credentials in `.env.local`
3. Confirm service account has Editor access to the sheet
4. Check browser console for errors

### Products Not Loading

1. Clear browser data (IndexedDB)
2. Refresh the page
3. Check that default products are defined in `src/lib/defaultProducts.ts`

### PWA Not Installing

1. Make sure you're using HTTPS (required for PWA)
2. Try using Safari on iOS (best PWA support)
3. Check that manifest.json is accessible

## 📄 License

MIT License - feel free to use this for your tour!

## 🤘 Built For

Band merch sales on the road. Keep that merch line moving! 🎸

---

Made with ❤️ for touring musicians
