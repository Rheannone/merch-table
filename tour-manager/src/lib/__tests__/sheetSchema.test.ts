/**
 * Schema Constants Validation Tests
 *
 * These tests ensure our column mappings are correct and consistent
 */

import {
  SALES_COLUMNS,
  SALES_COL_LETTERS,
  SALES_HEADERS,
  PRODUCTS_COLUMNS,
  PRODUCTS_COL_LETTERS,
  PRODUCTS_HEADERS,
  INSIGHTS_FIXED_COLUMNS,
  INSIGHTS_COL_LETTERS,
  normalizePaymentMethod,
  getColumnLetter,
} from "../sheetSchema";

describe("Sales Sheet Schema", () => {
  test("Column indices match column letters", () => {
    expect(getColumnLetter(SALES_COLUMNS.ID)).toBe(SALES_COL_LETTERS.ID);
    expect(getColumnLetter(SALES_COLUMNS.DATE)).toBe(SALES_COL_LETTERS.DATE);
    expect(getColumnLetter(SALES_COLUMNS.PAYMENT_METHOD)).toBe(
      SALES_COL_LETTERS.PAYMENT_METHOD
    );
    expect(getColumnLetter(SALES_COLUMNS.TIPS)).toBe(SALES_COL_LETTERS.TIPS);
  });

  test("Column count matches header count", () => {
    expect(Object.keys(SALES_COLUMNS).length).toBe(SALES_HEADERS.length);
  });

  test("Critical columns are in expected positions", () => {
    expect(SALES_COLUMNS.PAYMENT_METHOD).toBe(6); // Column G (0-based = 6)
    expect(SALES_COL_LETTERS.PAYMENT_METHOD).toBe("G");

    expect(SALES_COLUMNS.TIPS).toBe(10); // Column K (0-based = 10)
    expect(SALES_COL_LETTERS.TIPS).toBe("K");

    expect(SALES_COLUMNS.DATE).toBe(1); // Column B (0-based = 1)
    expect(SALES_COL_LETTERS.DATE).toBe("B");

    expect(SALES_COLUMNS.ACTUAL_AMOUNT).toBe(4); // Column E (0-based = 4)
    expect(SALES_COL_LETTERS.ACTUAL_AMOUNT).toBe("E");
  });
});

describe("Products Sheet Schema", () => {
  test("Column indices match column letters", () => {
    expect(getColumnLetter(PRODUCTS_COLUMNS.ID)).toBe(PRODUCTS_COL_LETTERS.ID);
    expect(getColumnLetter(PRODUCTS_COLUMNS.NAME)).toBe(
      PRODUCTS_COL_LETTERS.NAME
    );
    expect(getColumnLetter(PRODUCTS_COLUMNS.PRICE)).toBe(
      PRODUCTS_COL_LETTERS.PRICE
    );
  });

  test("Column count matches header count", () => {
    expect(Object.keys(PRODUCTS_COLUMNS).length).toBe(PRODUCTS_HEADERS.length);
  });
});

describe("Insights Sheet Schema", () => {
  test("Tips is always in column D (fixed position)", () => {
    expect(INSIGHTS_FIXED_COLUMNS.TIPS).toBe(3); // Column D (0-based = 3)
    expect(INSIGHTS_COL_LETTERS.TIPS).toBe("D");
  });

  test("Fixed columns are sequential from A", () => {
    expect(INSIGHTS_FIXED_COLUMNS.DATE).toBe(0); // A
    expect(INSIGHTS_FIXED_COLUMNS.SALES_COUNT).toBe(1); // B
    expect(INSIGHTS_FIXED_COLUMNS.REVENUE).toBe(2); // C
    expect(INSIGHTS_FIXED_COLUMNS.TIPS).toBe(3); // D
  });

  test("Payment methods start at column E", () => {
    expect(INSIGHTS_COL_LETTERS.FIRST_PAYMENT_METHOD).toBe("E");
  });
});

describe("Payment Method Normalization", () => {
  test("Normalizes lowercase to Title Case", () => {
    expect(normalizePaymentMethod("cash")).toBe("Cash");
    expect(normalizePaymentMethod("venmo")).toBe("Venmo");
    expect(normalizePaymentMethod("beer")).toBe("Beer");
  });

  test("Normalizes uppercase to Title Case", () => {
    expect(normalizePaymentMethod("CASH")).toBe("Cash");
    expect(normalizePaymentMethod("VENMO")).toBe("Venmo");
  });

  test("Handles multi-word payment methods", () => {
    expect(normalizePaymentMethod("credit card")).toBe("Credit Card");
    expect(normalizePaymentMethod("APPLE PAY")).toBe("Apple Pay");
  });

  test("Handles already normalized input", () => {
    expect(normalizePaymentMethod("Cash")).toBe("Cash");
    expect(normalizePaymentMethod("Venmo")).toBe("Venmo");
  });

  test("Handles mixed case input", () => {
    expect(normalizePaymentMethod("cAsH")).toBe("Cash");
    expect(normalizePaymentMethod("VeNmO")).toBe("Venmo");
  });
});

describe("Column Letter Utility", () => {
  test("Converts indices to correct letters", () => {
    expect(getColumnLetter(0)).toBe("A");
    expect(getColumnLetter(1)).toBe("B");
    expect(getColumnLetter(2)).toBe("C");
    expect(getColumnLetter(3)).toBe("D");
    expect(getColumnLetter(4)).toBe("E");
    expect(getColumnLetter(6)).toBe("G"); // Payment Method
    expect(getColumnLetter(10)).toBe("K"); // Tips
    expect(getColumnLetter(25)).toBe("Z");
  });
});

describe("Schema Consistency", () => {
  test("Sales column G is PAYMENT_METHOD", () => {
    // This is critical - if G isn't payment method, formulas break
    const gIndex = 6; // G is the 7th column (0-based = 6)
    expect(SALES_COLUMNS.PAYMENT_METHOD).toBe(gIndex);
    expect(SALES_COL_LETTERS.PAYMENT_METHOD).toBe("G");
  });

  test("Sales column K is TIPS", () => {
    // This is critical - if K isn't tips, formulas break
    const kIndex = 10; // K is the 11th column (0-based = 10)
    expect(SALES_COLUMNS.TIPS).toBe(kIndex);
    expect(SALES_COL_LETTERS.TIPS).toBe("K");
  });

  test("Sales column E is ACTUAL_AMOUNT", () => {
    // This is used in payment revenue formulas
    const eIndex = 4; // E is the 5th column (0-based = 4)
    expect(SALES_COLUMNS.ACTUAL_AMOUNT).toBe(eIndex);
    expect(SALES_COL_LETTERS.ACTUAL_AMOUNT).toBe("E");
  });

  test("Sales column B is DATE", () => {
    // This is used for date filtering in formulas
    const bIndex = 1; // B is the 2nd column (0-based = 1)
    expect(SALES_COLUMNS.DATE).toBe(bIndex);
    expect(SALES_COL_LETTERS.DATE).toBe("B");
  });

  test("Sales column I is PRODUCT_NAMES", () => {
    // Used in Top Item formula
    const iIndex = 8; // I is the 9th column (0-based = 8)
    expect(SALES_COLUMNS.PRODUCT_NAMES).toBe(iIndex);
    expect(SALES_COL_LETTERS.PRODUCT_NAMES).toBe("I");
  });

  test("Sales column J is SIZES", () => {
    // Used in Top Size formula
    const jIndex = 9; // J is the 10th column (0-based = 9)
    expect(SALES_COLUMNS.SIZES).toBe(jIndex);
    expect(SALES_COL_LETTERS.SIZES).toBe("J");
  });
});
