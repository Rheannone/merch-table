# Pre-Deployment Checklist

**Deployment Date:** [Fill in date]  
**Active Users:** 3 bands on tour  
**Risk Level:** Medium (major image upload refactor, sync timing changes)

---

## ✅ Code Review Status

### Build Verification

- [ ] **Production Build Passes** - `npm run build` completes without errors
- [ ] **No TypeScript Compilation Errors** - Only linting warnings present (safe to ignore)
- [ ] **Bundle Size Reasonable** - Check output for unusual size increases
- [ ] **All Routes Compile** - Home, app, auth, privacy, terms all built successfully

### Static Analysis Results

✅ **73 linting warnings identified** (all non-blocking):

- img tags (should use next/image) - cosmetic issue
- Apostrophes in JSX - cosmetic issue
- `any` types in Google Picker callbacks - acceptable for third-party API
- Unused variables - minor cleanup needed later

---

## 🔴 CRITICAL: Image Upload Testing

### Recent Changes

- Complete rewrite of image compression system
- Unified logic in `/src/lib/imageCompression.ts`
- Dynamic quality adjustment (80% → 30%)
- Client + server validation for 50k char limit
- New processImageForUpload() function

### Test Cases - Product Images

**Test 1: Small Image (< 1MB)**

- [ ] Upload a small product image (500KB JPEG)
- [ ] **Expected:** Quick upload, no compression needed
- [ ] **Verify:** Image appears in product card immediately
- [ ] **Check:** Toast shows compression stats
- [ ] **Confirm:** Image syncs to Google Sheets correctly

**Test 2: Medium Image (1-3MB)**

- [ ] Upload a 2MB product photo
- [ ] **Expected:** Compresses to ~30-40KB, shows "(2.1 MB → 24 KB)" toast
- [ ] **Verify:** Image quality acceptable in UI
- [ ] **Check:** No console errors
- [ ] **Confirm:** Sync completes without "pending sync" bar flashing

**Test 3: Large Image (> 5MB)**

- [ ] Upload a high-res 6MB photo
- [ ] **Expected:** Aggressive compression, may take 2-3 seconds
- [ ] **Verify:** Image still usable after compression
- [ ] **Check:** base64 string < 50,000 characters
- [ ] **Confirm:** Google Sheets accepts the data

**Test 4: Multiple Rapid Uploads**

- [ ] Add image to Product A
- [ ] Immediately add image to Product B
- [ ] **Expected:** Debounced sync (1.5s delay), single sync operation
- [ ] **Verify:** NO "pending sync" bar flash between uploads
- [ ] **Check:** Both images saved correctly
- [ ] **Confirm:** Only ONE sync happens after 1.5s, not two

**Test 5: Oversized Image Edge Case**

- [ ] Try uploading 10MB+ image
- [ ] **Expected:** Compression attempts, quality reduces to 30%
- [ ] **Verify:** If still too large after 30% quality, error message shown
- [ ] **Check:** Error is user-friendly, suggests using smaller image
- [ ] **Confirm:** App doesn't crash, can retry with different image

### Test Cases - QR Code Images

**Test 6: Payment QR Code Upload**

- [ ] Go to Settings tab
- [ ] Add payment method with QR code image
- [ ] **Expected:** Same compression behavior as products
- [ ] **Verify:** QR code remains scannable after compression
- [ ] **Check:** Settings save successfully
- [ ] **Confirm:** QR code loads on next page refresh

**Test 7: Replace Existing QR Code**

- [ ] Replace QR code in existing payment method
- [ ] **Expected:** Old image replaced, new one compressed
- [ ] **Verify:** No orphaned data in sheets
- [ ] **Check:** Sync bar appears briefly then clears

---

## 🟡 MEDIUM PRIORITY: Sync Debouncing

### Recent Changes

- Added 1.5 second debounce to product syncs
- productSyncTimeoutRef prevents overlapping syncs
- Cleanup function in useEffect prevents memory leaks

### Test Cases

**Test 8: Rapid Product Changes**

- [ ] Add new product
- [ ] Immediately update its price
- [ ] Immediately change its name
- [ ] Delete a different product
- [ ] **Expected:** Only ONE sync after 1.5s of inactivity
- [ ] **Verify:** Sync bar shows once, not flickering
- [ ] **Check:** All changes reflected in Google Sheets after sync
- [ ] **Confirm:** No duplicate API calls in Network tab

**Test 9: Navigation During Pending Sync**

- [ ] Add a product (starts 1.5s timer)
- [ ] Navigate to Analytics tab before timer completes
- [ ] **Expected:** Sync completes in background OR timeout clears gracefully
- [ ] **Verify:** No memory leaks
- [ ] **Check:** Navigate back, product is saved
- [ ] **Confirm:** No console errors about unmounted components

**Test 10: Page Refresh Safety**

- [ ] Make several product changes
- [ ] Wait for sync to complete
- [ ] Refresh the page
- [ ] **Expected:** All products load correctly from IndexedDB
- [ ] **Verify:** Sync on load still happens (safety mechanism)
- [ ] **Check:** No duplicate products in sheets

---

## 🟢 LOW PRIORITY: Beta Interest Forms

### Recent Changes

- Added beta form to marketing page (/)
- Added beta form to signin page (/auth/signin)
- Uses /api/beta-interest endpoint with Resend

### Test Cases

**Test 11: Marketing Page Form**

- [ ] Navigate to homepage as logged-out user
- [ ] Fill in name (optional) and email
- [ ] Submit form
- [ ] **Expected:** Success message "Thanks! We'll be in touch soon."
- [ ] **Verify:** Form clears after submission
- [ ] **Check:** Email received at rheannone@gmail.com
- [ ] **Confirm:** Can submit again with different email

**Test 12: Signin Page Form**

- [ ] Navigate to /auth/signin
- [ ] Scroll to beta form section
- [ ] Submit with email only (no name)
- [ ] **Expected:** Form accepts submission
- [ ] **Verify:** Success message appears
- [ ] **Check:** Email notification received

**Test 13: Form Validation**

- [ ] Try submitting with invalid email format
- [ ] **Expected:** Helpful error message
- [ ] **Verify:** Form doesn't clear on error
- [ ] **Check:** Can correct and resubmit

---

## 💰 Currency Switching (Existing Feature)

### Test Cases

**Test 14: Currency Display Toggle**

- [ ] Go to Settings → Currency tab
- [ ] Switch from USD to CAD
- [ ] Enter custom rate (e.g., 1.40)
- [ ] Save settings
- [ ] **Expected:** All prices update immediately in POS
- [ ] **Verify:** USD prices stored in database unchanged
- [ ] **Check:** Display shows CA$ symbol and converted prices
- [ ] **Confirm:** Settings persist after page refresh

**Test 15: Multiple Currency Sales**

- [ ] Set display to EUR
- [ ] Create a sale with 3 products
- [ ] **Expected:** Sale total calculated in EUR
- [ ] **Verify:** Google Sheets stores sale in USD (base currency)
- [ ] **Check:** Conversion math is accurate
- [ ] **Confirm:** Analytics shows correct totals

**Test 16: Custom Currency Prices**

- [ ] Set product with custom currency prices:
  - USD: $20
  - CAD: $27
  - EUR: €18
- [ ] Switch between currencies in Settings
- [ ] **Expected:** Product shows custom price for each currency (not converted)
- [ ] **Verify:** POS respects custom pricing
- [ ] **Check:** Sales recorded correctly

---

## 🔒 Data Safety Checks

### Existing User Data

**Test 17: Existing Products Load**

- [ ] Login as existing user with products
- [ ] **Expected:** All products load from Google Sheets
- [ ] **Verify:** Product images still display
- [ ] **Check:** Product names, prices, categories intact
- [ ] **Confirm:** Inventory counts correct

**Test 18: Existing Sales Load**

- [ ] Check Analytics tab as existing user
- [ ] **Expected:** Historical sales data loads
- [ ] **Verify:** Daily/weekly/monthly charts show correctly
- [ ] **Check:** Top products list accurate
- [ ] **Confirm:** Export CSV includes all historical data

**Test 19: Settings Persistence**

- [ ] Verify existing payment methods load
- [ ] Check QR codes display correctly
- [ ] Confirm currency settings preserved
- [ ] **Expected:** No data loss or corruption

---

## 📱 Mobile & Offline Testing

**Test 20: Mobile Device**

- [ ] Open app on mobile phone
- [ ] Test image upload from camera
- [ ] **Expected:** Image compression works on mobile
- [ ] **Verify:** Touch interactions smooth
- [ ] **Check:** No layout issues

**Test 21: Offline Mode**

- [ ] Disable internet connection
- [ ] Create sales offline
- [ ] Add/edit products
- [ ] **Expected:** Changes saved to IndexedDB
- [ ] **Verify:** "Offline" indicator appears
- [ ] **Check:** Enable internet, changes sync automatically

**Test 22: PWA Installation**

- [ ] Install app as PWA on mobile
- [ ] Use as standalone app
- [ ] **Expected:** All features work
- [ ] **Verify:** Can use completely offline
- [ ] **Check:** Syncs when connection restored

---

## 🚀 Deployment Steps

### Pre-Deployment

1. [ ] **Backup Production Database** (if applicable)
2. [ ] **Document Current Version** - Git commit hash: ****\_\_****
3. [ ] **Alert Active Users** - Message 3 bands about brief downtime if needed
4. [ ] **Check Vercel/Hosting Status** - No ongoing incidents

### Deployment

5. [ ] **Push to Production Branch**
   ```bash
   git checkout main
   git pull origin main
   git push origin main
   ```
6. [ ] **Monitor Build Logs** - Watch Vercel/hosting build process
7. [ ] **Check Build Success** - Ensure deployment completes
8. [ ] **Test Production URL** - Verify app loads

### Post-Deployment

9. [ ] **Smoke Test Critical Flows**
   - [ ] Can login with Google
   - [ ] Products load
   - [ ] Can create sale
   - [ ] Image upload works
10. [ ] **Monitor Error Logs** - Check Sentry/logging for 1 hour
11. [ ] **User Confirmation** - Message 3 bands: "Update complete, please refresh"
12. [ ] **Watch for Issues** - Be available for next 24h

---

## 🔄 Rollback Plan

If critical issues occur:

### Immediate Rollback

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# OR rollback in Vercel dashboard
# Go to Deployments → Find previous working version → "Redeploy"
```

### Partial Rollback

If only image upload is broken:

- Revert `/src/lib/imageCompression.ts` to previous version
- Revert `/src/components/ProductManager.tsx` image upload section
- Revert `/src/components/Settings.tsx` QR upload section
- Revert `/src/app/api/sheets/sync-products/route.ts` validation
- Keep debouncing and beta forms (isolated features)

### Communication

- [ ] Notify 3 bands immediately if rollback needed
- [ ] Post mortem: Document what went wrong
- [ ] Fix in development, test thoroughly before re-deploying

---

## 📊 Success Metrics

**Day 1 Post-Deployment:**

- [ ] Zero critical errors in logs
- [ ] All 3 bands report smooth operation
- [ ] No data loss reported
- [ ] Image uploads working reliably

**Week 1 Post-Deployment:**

- [ ] No sync failures
- [ ] Currency switching working across tours
- [ ] Beta form submissions received
- [ ] App performance stable

---

## 🐛 Known Issues (Acceptable)

These are linting warnings that don't affect functionality:

- ⚠️ img tags should use next/image (cosmetic)
- ⚠️ Apostrophes in JSX should escape (cosmetic)
- ⚠️ `any` types in Google Picker callbacks (third-party limitation)
- ⚠️ Unused variables in some components (cleanup later)

**These DO NOT block deployment.**

---

## 📝 Notes

### High Confidence Areas

✅ **Currency System** - No changes, stable code
✅ **Auth/OAuth** - No changes, working reliably
✅ **IndexedDB** - No schema changes
✅ **Google Sheets Integration** - Only validation added (improvement)

### Medium Confidence Areas

⚠️ **Image Compression** - Complete rewrite but well-tested logic
⚠️ **Sync Debouncing** - Timing change, needs real-world validation

### Test Environment Limitations

- ⚠️ Can't fully test with 3 different users simultaneously
- ⚠️ Can't test high-traffic scenarios
- ⚠️ Mobile testing requires actual devices

### Recommendation

✅ **SAFE TO DEPLOY** if:

- Production build succeeds
- Manual testing of image uploads passes (Tests 1-5)
- Rapid sync test passes (Test 8)
- Can monitor for first 1-2 hours post-deployment

🛑 **DELAY DEPLOYMENT** if:

- Build fails
- Image upload fails in testing
- Debouncing causes sync to stop working
- Memory leaks detected in navigation test

---

## Contact Info

**If Issues Arise:**

- Check Vercel logs immediately
- Check browser console for errors
- Contact users to gather specific error messages
- Be prepared to rollback quickly

**Current Active Users:**

- Band 1: [Name/Contact]
- Band 2: [Name/Contact]
- Band 3: [Name/Contact]

---

**Checklist Completed By:** ****\_\_\_\_****  
**Date:** ****\_\_\_\_****  
**Deployment Approved:** [ ] YES [ ] NO
