# Category System Testing Guide

## Quick Test Script

### Test 1: Create Category in ProductManager ⭐ NEW FEATURE

1. Go to "Setup" tab (inventory/products)
2. Click "Add New Product"
3. In the Category field, **type a brand new category name** (e.g., "Accessories")
4. Click/tab out of the field (trigger onBlur)
5. ✅ **Expected**: Toast notification appears: "Category 'Accessories' added successfully"
6. Go to "Settings" tab
7. ✅ **Expected**: "Accessories" appears in Product Categories list
8. Return to "Setup" tab
9. Click "Add New Product" again
10. ✅ **Expected**: "Accessories" now appears in the category dropdown suggestions

### Test 2: Delete Category With Products 🛡️ NEW PROTECTION

1. Make sure you have at least one product with category "Merch" (or any category)
2. Go to "Settings" tab
3. Scroll to "Product Categories"
4. Try to delete "Merch" category
5. ✅ **Expected**: Alert message: "Cannot delete 'Merch'. It's being used by X product(s)"
6. Category NOT deleted
7. Products still have their category

### Test 3: Delete Unused Category

1. Go to "Settings" tab → "Product Categories"
2. Add a test category: "TestDelete"
3. Try to delete "TestDelete"
4. ✅ **Expected**: Confirmation dialog: "Are you sure you want to remove 'TestDelete'?"
5. Click OK
6. ✅ **Expected**: Category removed from list
7. Go to "Setup" tab → "Add New Product"
8. ✅ **Expected**: "TestDelete" no longer in category suggestions

### Test 4: Category Sync Between Screens

1. Go to "Settings" → Add category "VIP Items"
2. Go to "Setup" tab
3. ✅ **Expected**: "VIP Items" available in product category dropdown
4. Go to "Setup" → Click "Add New Product"
5. Type new category "Last Minute" in category field
6. Tab out of field
7. Wait for toast notification
8. Go to "Settings"
9. ✅ **Expected**: "Last Minute" appears in category list

### Test 5: Edit Product Category (Create New)

1. Go to "Setup" tab
2. Click edit (pencil icon) on any existing product
3. Change category to a NEW category name (e.g., "Limited Edition")
4. Tab/click out of category field
5. ✅ **Expected**: Toast notification appears
6. Click "Save Product"
7. Go to "Settings"
8. ✅ **Expected**: "Limited Edition" in categories list

## Browser Console Checks

### Successful Category Creation

Look for these log messages:

```
✅ New category added and synced: Accessories
✅ Settings saved for organization {org-id}
```

### Category Deletion Attempt

If category in use:

```
Category 'Merch' is in use by 3 product(s)
```

If category not in use:

```
✅ Removed category: TestDelete
```

## Edge Cases to Test

### Duplicate Category

1. Add category "Apparel" in Settings
2. Go to ProductManager, try to create another "Apparel"
3. ✅ **Expected**: No error, no duplicate, silently ignored
4. Console shows: "Category already exists: Apparel"

### Empty/Whitespace Category

1. Try to create product with empty category field
2. ✅ **Expected**: HTML5 validation prevents submission (required field)

### Special Characters

1. Create category with special chars: "T-Shirts & Hoodies"
2. ✅ **Expected**: Works normally, saved and synced correctly

### Rapid Category Creation

1. Add product with category "Cat1" - tab out quickly
2. Immediately add another product with "Cat2" - tab out
3. ✅ **Expected**: Both categories created, both toasts appear
4. Both appear in Settings

### Offline Category Creation

1. Turn off network (DevTools → Network → Offline)
2. Add product with new category "OfflineCat"
3. Tab out of field
4. ✅ **Expected**: May show error toast (can't save to Supabase)
5. Turn network back on
6. Trigger sync (refresh page or manual sync)
7. ✅ **Expected**: Category should sync to Supabase

## Visual Checks

### ProductManager Category Input

- [ ] Shows placeholder: "Select or type a category"
- [ ] Shows hint: "💡 Select from list or type a new category"
- [ ] Autocomplete dropdown appears when typing
- [ ] Can select from existing categories
- [ ] Can type completely new category
- [ ] Red outline when required but empty

### Settings Category List

- [ ] Shows all categories in order
- [ ] Add category button works
- [ ] Delete button (X) appears for each category
- [ ] Reorder buttons work (up/down arrows)
- [ ] Category count is accurate

### Toast Notifications

- [ ] Success toast (green) when category created
- [ ] Error toast (red) if save fails
- [ ] Toast auto-dismisses after a few seconds
- [ ] Toast can be manually closed

## Multi-Org Testing (If applicable)

1. Switch to different organization
2. Add category "OrgSpecific" in Settings
3. ✅ **Expected**: Category only appears for this org
4. Switch back to first organization
5. ✅ **Expected**: "OrgSpecific" NOT in category list (org-specific)

## Data Verification

### Check IndexedDB

1. Open DevTools → Application → IndexedDB → tourManager → settings
2. Look for your user/org settings entry
3. ✅ **Expected**: `categories` array includes all created categories

### Check Supabase

1. Go to Supabase Dashboard → Table Editor → organization_settings
2. Find your organization's row
3. Look at `settings` JSON column
4. ✅ **Expected**: `categories` array matches what you see in app

## Performance Testing

1. Create 20+ categories (mix via Settings and ProductManager)
2. ✅ **Expected**: App remains responsive
3. ✅ **Expected**: Dropdowns load quickly
4. ✅ **Expected**: All categories appear in correct order

## Regression Testing (Make sure we didn't break anything)

- [ ] Can still add products normally
- [ ] Can still edit products normally
- [ ] Can still delete products
- [ ] Settings save/load works for other fields
- [ ] Currency settings still work
- [ ] Sales tracking still works
- [ ] Sync still works

## Known Limitations

1. **No category renaming**: If you need to rename a category, you must:

   - Add new category with desired name
   - Edit all products to use new category
   - Delete old category

2. **No bulk reassignment**: Changing many products from one category to another requires individual edits

3. **No undo**: Deleted categories can be re-added but require manual reassignment to products

## Troubleshooting

### Category not appearing after creation

- Check browser console for errors
- Verify you're online (check network tab)
- Try refreshing the page
- Check Supabase dashboard for data

### Can't delete category that appears unused

- Refresh the page to get latest product data
- Check if any hidden/archived products use the category
- Check browser console for error messages

### Duplicate categories appearing

- This shouldn't happen with current validation
- If it does, report as a bug with steps to reproduce
- Workaround: Delete duplicates from Settings

---

**Happy Testing! 🎉**

Found a bug? Check the browser console and note:

1. What you did (steps to reproduce)
2. What you expected
3. What actually happened
4. Any error messages in console
