# Migration System - Updated for Multi-Organization

## Overview

The Google Sheets → Supabase migration has been updated to work with the new multi-organization architecture.

## Changes Made

### 1. API Route (`/api/sheets/migrate-to-supabase`)

**Before:**

- Migrated data to `user_id` column
- No organization context

**After:**

- Requires `organizationId` parameter
- Migrates data to `organization_id` column
- Verifies user has admin/owner role in that organization
- Only admins and owners can migrate data

### 2. Database Schema Updates

**Products:**

```sql
-- OLD
user_id → users.id

-- NEW
organization_id → organizations.id
```

**Sales:**

```sql
-- OLD
user_id → users.id

-- NEW
organization_id → organizations.id
```

**Settings:**

```sql
-- OLD
settings.user_id → users.id (personal settings)

-- NEW
organization_settings.organization_id → organizations.id (org-wide settings)
```

### 3. Frontend Changes

The migration button in Settings now:

- Checks that an organization is selected
- Passes `organizationId` in the request
- Shows which organization data will be imported to
- Displays: `"Imported X items to {Organization Name}"`

## How It Works Now

### Migration Flow:

1. **User clicks "Migrate from Google Sheets"**

   - Must have a Google Sheet selected
   - Must have a current organization selected
   - Confirmation dialog shows: `"Import to {Org Name}?"`

2. **Permission Check**

   - Verifies user is admin or owner of the organization
   - Regular members cannot migrate data

3. **Data Import**

   - Products → `organization_id`
   - Sales → `organization_id`
   - Settings → `organization_settings` table

4. **Success**
   - All data now belongs to the organization
   - Visible to all members of that organization
   - Isolated from other organizations

## Usage Example

```typescript
// Frontend call
const response = await fetch("/api/sheets/migrate-to-supabase", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    spreadsheetId: "abc123...",
    organizationId: "org_xyz...",
  }),
});
```

## Security

- ✅ Only authenticated users can migrate
- ✅ Only org members can migrate to that org
- ✅ Only admins/owners have migration permission
- ✅ RLS policies enforce organization isolation
- ✅ Data cannot leak between organizations

## Migrating Multiple Organizations

If you have data for multiple bands/sellers:

1. Create separate organizations for each
2. Switch to the organization
3. Run migration for that org's Google Sheet
4. Repeat for each organization

## What Gets Migrated

### Products

- Name, price, category, description
- Images
- Inventory tracking
- Currency prices
- Sold count

### Sales

- Timestamp, total, payment method
- Items (cart contents)
- Currency and exchange rate
- Location (venue/city)

### Settings (Organization-wide)

- Product categories
- Payment methods
- Default currency
- Default location

## What Doesn't Get Migrated

### User Settings (Personal)

These remain user-specific:

- Theme preference
- Personal preferences

## Troubleshooting

### "Organization ID not provided"

- Make sure you're viewing an organization before migrating
- Check that `currentOrganization` exists in context

### "You do not have access to this organization"

- You must be a member of the organization
- Ask an owner to add you first

### "Only admins and owners can migrate data"

- Regular members cannot migrate
- Ask an admin/owner to perform migration
- Or have them promote you to admin

### Data appears in wrong organization

- Double-check which org was selected during migration
- Migration imports to the `currentOrganization`
- Use organization switcher before migrating

## Next Steps

After migration completes:

1. ✅ All data is now in Supabase
2. ✅ Data is scoped to your organization
3. ✅ Team members can collaborate
4. ✅ Google Sheets are now optional
5. ✅ Offline mode works with local IndexedDB cache

You can continue using Google Sheets sync if desired, but it's no longer required!
