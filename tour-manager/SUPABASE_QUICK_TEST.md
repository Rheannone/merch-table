# Supabase Quick Test Guide

Once you've completed the setup in `SUPABASE_SETUP_GUIDE.md` and run the migrations, use this guide to test that everything is working!

## Step 1: Add Environment Variables

Make sure your `.env.local` file has these variables (with your actual values):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 2: Test the Connection

Create a simple test page to verify Supabase is working:

1. Create a new file `src/app/test-supabase/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function TestSupabase() {
  const [status, setStatus] = useState("Testing connection...");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function testConnection() {
      try {
        const supabase = createClient();

        // Test 1: Check if client is created
        if (!supabase) {
          setStatus("❌ Failed to create Supabase client");
          return;
        }

        // Test 2: Try to fetch user
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error && error.message !== "Auth session missing!") {
          setStatus(`❌ Error: ${error.message}`);
          return;
        }

        if (user) {
          setUser(user);
          setStatus("✅ Connected! You are signed in.");
        } else {
          setStatus("✅ Connected! (Not signed in yet)");
        }
      } catch (error) {
        setStatus(`❌ Error: ${error}`);
      }
    }

    testConnection();
  }, []);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Supabase Connection Test</h1>

      <div className="bg-gray-100 p-4 rounded-lg mb-4">
        <p className="text-lg">{status}</p>
      </div>

      {user && (
        <div className="bg-green-50 p-4 rounded-lg">
          <h2 className="font-bold mb-2">User Info:</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-8 space-y-2">
        <h2 className="font-bold text-xl mb-4">Next Steps:</h2>
        <p>✅ Supabase client is working</p>
        <p>⏳ Set up authentication (sign in/sign up)</p>
        <p>⏳ Test database operations</p>
        <p>⏳ Migrate products from Google Sheets</p>
      </div>
    </div>
  );
}
```

2. Visit `http://localhost:3000/test-supabase` in your browser

## Step 3: Test Database Operations

Once the connection test passes, try these operations in the browser console:

```javascript
// Import the queries (you'll need to be on a page that uses them)
import { getProducts, addProduct } from "@/lib/supabase/queries";

// Test 1: Fetch products (should return empty array initially)
const products = await getProducts();
console.log("Products:", products);

// Test 2: Add a test product
const newProduct = await addProduct({
  name: "Test T-Shirt",
  price: 20,
  quantity: 10,
  category: "Apparel",
});
console.log("Added product:", newProduct);

// Test 3: Fetch products again (should include the new product)
const updatedProducts = await getProducts();
console.log("Updated products:", updatedProducts);
```

## Step 4: Check Supabase Dashboard

1. Go to your Supabase project dashboard
2. Click **Table Editor** in the sidebar
3. Click on the `products` table
4. You should see the test product you just added!

## Step 5: Test Real-Time Updates

Open two browser tabs side-by-side and run this in both:

```javascript
import { subscribeToProducts } from "@/lib/supabase/queries";

// Subscribe to product changes
const unsubscribe = subscribeToProducts((products) => {
  console.log("Products updated:", products);
});

// When you're done testing:
// unsubscribe()
```

Now add a product in one tab, and watch the other tab's console update in real-time! 🎉

## Common Issues

### "Error: Invalid API key"

- Double-check your `.env.local` file
- Make sure you copied the `anon` key (not the `service_role` key)
- Restart your dev server: `npm run dev`

### "Error: relation 'products' does not exist"

- You haven't run the migrations yet
- Go to SQL Editor in Supabase and run the migration files

### "Error: Auth session missing"

- This is normal! It just means you're not signed in yet
- We'll integrate NextAuth with Supabase later

### "Error: row level security"

- Make sure you ran migration 002 (RLS policies)
- Check that RLS is enabled on all tables in Table Editor → Settings

## What's Next?

Once everything is working:

1. **Integrate with NextAuth** - Connect your existing OAuth to Supabase auth
2. **Create a migration script** - Move existing Google Sheets data to Supabase
3. **Update your components** - Use Supabase queries instead of Google Sheets
4. **Add real-time features** - Live product updates, multi-device sync
5. **Test offline mode** - Combine IndexedDB with Supabase for offline-first

Take it one step at a time! 🚀

## Getting Help

If you run into issues:

1. Check the Supabase logs (Dashboard → Logs)
2. Check your browser console for errors
3. Review the migration files to ensure they ran successfully
4. Ask for help - I'm here to guide you through this!
