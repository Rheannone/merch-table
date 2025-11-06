# Running Database Migrations

Once you've created your Supabase project, follow these steps to set up your database:

## Step 1: Access SQL Editor

1. Open your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. You'll see a blank SQL editor

## Step 2: Run Migrations in Order

Run each migration file one at a time, in order:

### Migration 1: Initial Schema

1. Open `supabase/migrations/001_initial_schema.sql`
2. Copy the entire contents
3. Paste into the SQL Editor
4. Click **Run** (or press Cmd/Ctrl + Enter)
5. You should see: "Migration 1 completed successfully! Tables created."

### Migration 2: Row Level Security

1. Open `supabase/migrations/002_rls_policies.sql`
2. Copy the entire contents
3. Paste into the SQL Editor
4. Click **Run**
5. You should see: "Migration 2 completed successfully! Row Level Security enabled."

### Migration 3: Helper Functions

1. Open `supabase/migrations/003_functions_and_triggers.sql`
2. Copy the entire contents
3. Paste into the SQL Editor
4. Click **Run**
5. You should see: "Migration 3 completed successfully!"

## Step 3: Verify Tables Were Created

1. Go to **Table Editor** in the left sidebar
2. You should see these tables:

   - users
   - products
   - sales
   - user_sheets

3. Click on any table to see its structure and columns

## Step 4: Test RLS Policies

1. Go to **Authentication** → **Policies** in the left sidebar
2. You should see policies for each table (users, products, sales, user_sheets)
3. Each table should have policies for SELECT, INSERT, UPDATE, and DELETE

## What Each Migration Does

### Migration 1: Initial Schema

- Creates the core tables (users, products, sales, user_sheets)
- Sets up relationships between tables
- Creates indexes for faster queries
- Adds automatic `updated_at` timestamp triggers

### Migration 2: Row Level Security (RLS)

- Enables RLS on all tables
- Creates policies so users can only access their own data
- Prevents unauthorized access at the database level

### Migration 3: Helper Functions

- Adds useful functions for analytics (total sales, top products, etc.)
- Creates a trigger to auto-decrease product quantity when sales are recorded
- Sets up automatic user profile creation when someone signs up

## Troubleshooting

**Error: "relation already exists"**

- This means you've already run the migration. You can skip it or drop the tables and re-run.

**Error: "permission denied"**

- Make sure you're logged into your Supabase project
- Check that you have the right project selected

**Error: "syntax error"**

- Make sure you copied the ENTIRE SQL file
- Check that you didn't accidentally modify the SQL

## Next Steps

Once migrations are complete, you're ready to:

1. Test the Supabase connection in your app
2. Start migrating features from Google Sheets to Supabase
3. Add real-time subscriptions for instant updates

Need help? Let me know which step you're on!
