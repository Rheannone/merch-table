# Supabase Setup Guide - Don't Panic! 🚀

This guide will walk you through setting up Supabase step-by-step. Take it slow, and you'll be up and running in no time!

## Step 1: Create Your Supabase Project (5 minutes)

1. **Go to [supabase.com](https://supabase.com)** and sign up/log in
2. **Click "New Project"**
3. **Fill in the details:**

   - Project Name: `merch-table` (or whatever you like)
   - Database Password: Create a strong password and **SAVE IT** somewhere safe
   - Region: Choose one close to your users (e.g., US East, US West, EU West)
   - Pricing Plan: Start with the **Free tier** (you get 500MB database, 2GB bandwidth, 50MB file storage)

4. **Wait 2-3 minutes** for your project to be created (Supabase is setting up your database!)

## Step 2: Get Your API Keys (2 minutes)

Once your project is ready:

1. Go to **Settings** (gear icon in sidebar) → **API**
2. You'll see two important values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (this is safe to use in your frontend)
3. Copy these values - we'll add them to your `.env.local` file next!

## Step 3: Add Environment Variables

Add these to your existing `.env.local` file (at the root of your project):

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace `your-project-url-here` and `your-anon-key-here` with the actual values from Step 2.

## Step 4: Understanding What We'll Build

We're going to create a database with these tables:

1. **users** - Store user profile information
2. **products** - Your merch inventory (replaces Google Sheets)
3. **sales** - Sales records (replaces Google Sheets)
4. **user_sheets** - Maps users to their Google Sheets (for migration period)

### Benefits You'll Get:

✅ **Real-time sync** - Changes appear instantly across devices
✅ **Offline support** - Works with IndexedDB, syncs when back online
✅ **Better security** - Row Level Security means users only see their own data
✅ **Easier scaling** - No Google Sheets API limits
✅ **Team features** - Multiple users can access same data
✅ **Better queries** - SQL is more powerful than spreadsheets

## Step 5: Create Database Tables (Next Step)

I've prepared SQL migration files for you. Once you have your Supabase project set up:

1. Go to **SQL Editor** in your Supabase dashboard
2. Run the migration files in order (I'll show you which ones)
3. Enable Row Level Security (RLS) policies

## What's Row Level Security (RLS)?

Think of it like this: RLS ensures that:

- Users can only see/edit their own products and sales
- No one can accidentally (or maliciously) access someone else's data
- You don't need to write complex permission logic in your app

It's automatically enforced at the database level! 🔒

## Migration Strategy (Don't Worry, We'll Go Slow)

We won't flip a switch and break everything. Here's the plan:

1. **Phase 1**: Set up Supabase alongside Google Sheets (both work)
2. **Phase 2**: Add "sync to Supabase" feature (optional for users)
3. **Phase 3**: Make Supabase the primary, keep Sheets as backup
4. **Phase 4**: Eventually deprecate Sheets (months from now)

You can test everything locally first before any users see it!

## Common Questions

**Q: Will this break my current app?**
A: Nope! We're adding Supabase alongside your existing system.

**Q: What about my Google Sheets integration?**
A: We'll keep it! Users can choose which backend to use, or use both.

**Q: Is the free tier enough?**
A: Yes! The free tier handles:

- 500MB database (thousands of products/sales)
- 2GB bandwidth (plenty for starting out)
- 50,000 monthly active users
- Unlimited API requests

You'll only need to upgrade when you're successful and have lots of users! 💰

**Q: What if I mess up?**
A: Supabase has automatic backups, and we'll test everything locally first. Plus, your Google Sheets are still there as backup!

## Next Steps

Once you've completed Steps 1-3 above, let me know and I'll help you with:

- Creating the database schema
- Setting up authentication integration
- Writing the migration code
- Testing everything

Take your time - there's no rush! 🎯
