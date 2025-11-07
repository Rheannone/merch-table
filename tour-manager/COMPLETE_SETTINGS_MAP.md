# Complete Settings Migration Map

## 📋 All User Settings

### 1. Payment Methods (Array of Objects)

**Supabase Column:** `payment_methods` (JSONB)
**Sheet Location:** `POS Settings!A2:E100` (columns A-E)
**Structure:**

```typescript
{
  paymentType: "cash" | "venmo" | "credit" | "other" | "custom1" | "custom2" | "custom3",
  enabled: boolean,
  displayName: string,
  transactionFee?: number,  // decimal, e.g. 0.03 for 3%
  qrCodeUrl?: string        // base64 data URI or URL
}
```

**Default (7 items):**

```javascript
[
  { paymentType: "cash", enabled: true, displayName: "Cash" },
  { paymentType: "venmo", enabled: true, displayName: "Venmo" },
  {
    paymentType: "credit",
    enabled: false,
    displayName: "Credit",
    transactionFee: 0.03,
  },
  { paymentType: "other", enabled: true, displayName: "Other" },
  { paymentType: "custom1", enabled: false, displayName: "Custom 1" },
  { paymentType: "custom2", enabled: false, displayName: "Custom 2" },
  { paymentType: "custom3", enabled: false, displayName: "Custom 3" },
];
```

**Sheet Format:**

- Column A: Payment Type (cash, venmo, etc.)
- Column B: Enabled ("Yes"/"No")
- Column C: Display Name
- Column D: Transaction Fee % (decimal as string)
- Column E: QR Code URL (can be VERY long base64 string)

---

### 2. Product Categories (Array of Strings)

**Supabase Column:** `categories` (TEXT[])
**Sheet Location:** `POS Settings!G2:G50` (column G)
**Default:** `["Apparel", "Merch", "Music"]`

**Sheet Format:**

- One category per row starting at G2

---

### 3. Tip Jar Toggle

**Supabase Column:** `show_tip_jar` (BOOLEAN)
**Sheet Location:** Not explicitly stored in Sheet (implied true if missing)
**Default:** `true`

---

### 4. Theme

**Supabase Column:** `theme_id` (TEXT)
**Sheet Location:** `POS Settings!H2` (column H, row 2)
**Default:** `"default"`
**Options:** "default", "sunset", "midnight", "forest", "ocean" (see themes.ts)

---

### 5. Currency

**Supabase Column:** `currency` (TEXT)
**Sheet Location:** `POS Settings!I2` (column I, row 2)
**Default:** `"USD"`
**Options:** "USD", "EUR", "GBP", "CAD", "AUD", "JPY", etc. (see currency.ts)

---

### 6. Exchange Rate

**Supabase Column:** `exchange_rate` (NUMERIC(10,4))
**Sheet Location:** `POS Settings!J2` (column J, row 2)
**Default:** `1.0`
**Format:** Decimal with up to 4 decimal places (e.g., 1.3456)

---

### 7. Email Signup - Enabled

**Supabase Column:** `email_signup_enabled` (BOOLEAN)
**Sheet Location:** `POS Settings!K2` (column K, row 2)
**Default:** `false`
**Sheet Format:** "Yes"/"No" or "TRUE"/"FALSE"

---

### 8. Email Signup - Prompt Message

**Supabase Column:** `email_signup_prompt_message` (TEXT)
**Sheet Location:** `POS Settings!L2` (column L, row 2)
**Default:** `"Want to join our email list?"`

---

### 9. Email Signup - Collect Name

**Supabase Column:** `email_signup_collect_name` (BOOLEAN)
**Sheet Location:** `POS Settings!M2` (column M, row 2)
**Default:** `false`
**Sheet Format:** "Yes"/"No" or "TRUE"/"FALSE"

---

### 10. Email Signup - Collect Phone

**Supabase Column:** `email_signup_collect_phone` (BOOLEAN)
**Sheet Location:** `POS Settings!N2` (column N, row 2)
**Default:** `false`
**Sheet Format:** "Yes"/"No" or "TRUE"/"FALSE"

---

### 11. Email Signup - Auto Dismiss Seconds

**Supabase Column:** `email_signup_auto_dismiss_seconds` (INTEGER)
**Sheet Location:** `POS Settings!O2` (column O, row 2)
**Default:** `10`
**Format:** Integer (number of seconds before modal auto-closes)

---

## 🔄 Migration Logic

### For Existing Users (has Sheet ID):

1. **Load ALL settings from Sheet:**

   ```typescript
   const response = await fetch("/api/sheets/settings/load", {
     body: JSON.stringify({ spreadsheetId }),
   });
   const sheetData = await response.json();
   ```

2. **Map to Supabase structure:**

   ```typescript
   {
     user_id: userId,
     payment_methods: sheetData.paymentSettings,
     categories: sheetData.categories,
     show_tip_jar: sheetData.showTipJar ?? true,
     currency: sheetData.currency.displayCurrency,
     exchange_rate: sheetData.currency.exchangeRate,
     theme_id: sheetData.theme,
     email_signup_enabled: sheetData.emailSignup.enabled,
     email_signup_prompt_message: sheetData.emailSignup.promptMessage,
     email_signup_collect_name: sheetData.emailSignup.collectName,
     email_signup_collect_phone: sheetData.emailSignup.collectPhone,
     email_signup_auto_dismiss_seconds: sheetData.emailSignup.autoDismissSeconds,
     migrated_from_sheets: true
   }
   ```

3. **Insert into Supabase**

### For New Users (no Sheet):

1. **Create row with ALL defaults:**
   ```sql
   INSERT INTO user_settings (
     user_id,
     payment_methods,
     categories,
     show_tip_jar,
     currency,
     exchange_rate,
     theme_id,
     email_signup_enabled,
     email_signup_prompt_message,
     email_signup_collect_name,
     email_signup_collect_phone,
     email_signup_auto_dismiss_seconds
   ) VALUES (
     $1,
     $2::jsonb,  -- DEFAULT_PAYMENT_SETTINGS array
     $3,         -- ["Apparel", "Merch", "Music"]
     true,
     'USD',
     1.0,
     'default',
     false,
     'Want to join our email list?',
     false,
     false,
     10
   )
   ```

---

## 📊 Complete Default Values Reference

```typescript
export const DEFAULT_USER_SETTINGS = {
  payment_methods: [
    { paymentType: "cash", enabled: true, displayName: "Cash" },
    { paymentType: "venmo", enabled: true, displayName: "Venmo" },
    {
      paymentType: "credit",
      enabled: false,
      displayName: "Credit",
      transactionFee: 0.03,
    },
    { paymentType: "other", enabled: true, displayName: "Other" },
    { paymentType: "custom1", enabled: false, displayName: "Custom 1" },
    { paymentType: "custom2", enabled: false, displayName: "Custom 2" },
    { paymentType: "custom3", enabled: false, displayName: "Custom 3" },
  ],
  categories: ["Apparel", "Merch", "Music"],
  show_tip_jar: true,
  currency: "USD",
  exchange_rate: 1.0,
  theme_id: "default",
  email_signup_enabled: false,
  email_signup_prompt_message: "Want to join our email list?",
  email_signup_collect_name: false,
  email_signup_collect_phone: false,
  email_signup_auto_dismiss_seconds: 10,
};
```

---

## ✅ Settings Verification Checklist

Before running migration, verify:

- [ ] All 11 settings have Supabase columns
- [ ] All defaults match current app behavior
- [ ] Payment methods array supports all 7 types
- [ ] QR code URLs can be very long (50k+ chars)
- [ ] Categories support variable length arrays
- [ ] Email signup fields are separate (not nested object)
- [ ] Migration tracks `migrated_from_sheets` flag

---

## 🎯 When Settings Component Loads

### Current (Sheet-based):

```typescript
loadSettings() → Fetch from Sheet API → Parse columns A-O → setState
```

### New (Supabase-based):

```typescript
useSupabaseSettings() → Query Supabase → Map to component state → Cache in localStorage
```

### Mapping:

```typescript
// From Supabase to Settings Component
const settings = await getUserSettings(userId);

setPaymentSettings(settings.payment_methods);
setCategories(settings.categories);
setShowTipJar(settings.show_tip_jar);
setSelectedThemeId(settings.theme_id);
setSelectedCurrency(settings.currency as CurrencyCode);
setExchangeRate(settings.exchange_rate.toString());
setEmailSignupSettings({
  enabled: settings.email_signup_enabled,
  promptMessage: settings.email_signup_prompt_message,
  collectName: settings.email_signup_collect_name,
  collectPhone: settings.email_signup_collect_phone,
  autoDismissSeconds: settings.email_signup_auto_dismiss_seconds,
});
```
