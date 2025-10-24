# 🎸 Quick Start Guide - Band Merch POS

## First Time Setup (5 minutes)

### 1. Open the App

- Navigate to http://localhost:3000 (or your deployed URL)
- You should see the POS interface with 8 default products

### 2. Test the POS (No Setup Required!)

The app works immediately with default products:

**Try a Test Sale:**

1. Click on "Band T-Shirt (Black)" - it adds to cart
2. Click the "+" button to add more quantity
3. Select a payment method (Cash, Card, Venmo, or Other)
4. Click "Complete Sale"
5. ✅ Your first sale is recorded!

**Check the Sync Status:**

- Look at the top bar - it shows "1 sale pending sync"
- Sales are saved locally in your browser's IndexedDB
- They'll sync to Google Sheets once you set that up (optional for now!)

### 3. Customize Your Products

1. Click the "Product Setup" tab at the top
2. Click "Add Product" button
3. Fill in:
   - Name: "Tour Patch"
   - Price: 8
   - Category: Merch
   - Description: "Embroidered patch"
4. Click "Save Product"
5. Go back to "Point of Sale" tab - your new product is there!

### 4. Use on iPad (Recommended)

1. Open in Safari on iPad
2. Tap the Share button (square with arrow)
3. Tap "Add to Home Screen"
4. Name it "Merch POS"
5. Tap "Add"
6. Now you have a full-screen app icon!

## Optional: Connect Google Sheets (for data backup)

### Why Connect Google Sheets?

- Backup all sales data
- View/analyze sales in spreadsheet format
- Access sales history from anywhere
- Export data easily

### Setup Steps:

**1. Create Google Sheet**

- Go to [Google Sheets](https://sheets.google.com)
- Create a new sheet named "Tour Merch Sales"
- Add two tabs: "Products" and "Sales"

**2. Get Google Cloud Credentials**

- Follow the detailed instructions in the main README.md
- Create a service account
- Download the JSON key file
- Share your sheet with the service account email

**3. Add to Environment**

- Create `.env.local` file
- Add your credentials (see README.md)

**4. Test Sync**

- In Product Setup, click "Sync to Sheet"
- Check your Google Sheet - products appear!
- Make a sale, click "Sync Now" - sale appears!

## Offline Mode (Works Automatically!)

The app is **offline-first** which means:

✅ **Works WITHOUT internet:**

- Make sales
- Add/edit products
- Everything saved locally

✅ **Syncs when online:**

- Automatic sync when internet returns
- Manual sync button if needed
- Shows pending sales count

Perfect for venues with spotty WiFi!

## Tips for Fast Merch Sales

### Speed Tricks:

1. **Tap-tap-done**: Product → Payment Method → Complete Sale (3 taps!)
2. **Common bundles**: Memorize your common combos (T-shirt + Vinyl = $55)
3. **Keep iPad charged**: Bring a battery pack for long shows
4. **Test before doors**: Do a test sale before fans arrive

### Product Organization:

- Put best-sellers in "Apparel" category (shows first)
- Keep prices simple ($5, $10, $20, $25, $30, $45)
- Use clear product names ("Tour Hoodie" not "Merchandise Item 3")

### Payment Methods:

- **Cash**: Traditional, always works
- **Card**: Square/Stripe reader
- **Venmo**: Super popular with younger fans
- **Other**: Zelle, CashApp, etc.

## Troubleshooting

### "Cart is empty" after reloading?

✅ This is normal - cart clears on refresh. Sales are still saved!

### Can't see my products?

✅ Check "Product Setup" tab - they should be there

### Sync not working?

✅ Check if you're online. If offline, it'll sync later automatically.

### Want to start fresh?

✅ Clear browser data for the site (clears local database)

## Tour Day Workflow

**Before the Show:**

1. Charge iPad fully
2. Open app (works offline)
3. Check product list is correct
4. Do a test sale and delete it

**During Merch Rush:**

1. Stay in "Point of Sale" tab
2. Fast taps: Product → Quantity → Payment → Complete
3. Don't worry about syncing - it happens automatically

**After the Show:**

1. Let app sync when you get WiFi
2. Check Google Sheet for total sales
3. Count cash vs. what the app says
4. Pack up and celebrate a great show! 🎸

## Need Help?

Check the main README.md for:

- Detailed Google Sheets setup
- Deployment instructions
- Full feature documentation
- Troubleshooting guide

---

**Ready to rock!** 🤘 Your merch line will move faster than ever!
