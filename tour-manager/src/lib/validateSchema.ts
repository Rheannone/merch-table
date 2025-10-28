/**
 * Schema Validation Script
 * Run with: npx tsx src/lib/validateSchema.ts
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
  DEFAULT_PAYMENT_METHODS,
  normalizePaymentMethod,
  getColumnLetter,
} from "./sheetSchema";

console.log("🔍 Validating Sheet Schema Constants...\n");

let errors = 0;
let warnings = 0;

// Test 1: Critical Sales columns match expected positions
console.log("📋 Test 1: Sales Sheet Critical Columns");
const criticalTests = [
  {
    name: "PAYMENT_METHOD",
    expected: 6,
    expectedLetter: "G",
    actual: SALES_COLUMNS.PAYMENT_METHOD,
    actualLetter: SALES_COL_LETTERS.PAYMENT_METHOD,
  },
  {
    name: "TIPS",
    expected: 10,
    expectedLetter: "K",
    actual: SALES_COLUMNS.TIPS,
    actualLetter: SALES_COL_LETTERS.TIPS,
  },
  {
    name: "DATE",
    expected: 1,
    expectedLetter: "B",
    actual: SALES_COLUMNS.DATE,
    actualLetter: SALES_COL_LETTERS.DATE,
  },
  {
    name: "ACTUAL_AMOUNT",
    expected: 4,
    expectedLetter: "E",
    actual: SALES_COLUMNS.ACTUAL_AMOUNT,
    actualLetter: SALES_COL_LETTERS.ACTUAL_AMOUNT,
  },
  {
    name: "PRODUCT_NAMES",
    expected: 8,
    expectedLetter: "I",
    actual: SALES_COLUMNS.PRODUCT_NAMES,
    actualLetter: SALES_COL_LETTERS.PRODUCT_NAMES,
  },
  {
    name: "SIZES",
    expected: 9,
    expectedLetter: "J",
    actual: SALES_COLUMNS.SIZES,
    actualLetter: SALES_COL_LETTERS.SIZES,
  },
];

criticalTests.forEach((test) => {
  if (test.actual !== test.expected) {
    console.log(
      `  ❌ ${test.name}: Expected index ${test.expected}, got ${test.actual}`
    );
    errors++;
  } else if (test.actualLetter !== test.expectedLetter) {
    console.log(
      `  ❌ ${test.name}: Expected letter ${test.expectedLetter}, got ${test.actualLetter}`
    );
    errors++;
  } else {
    console.log(
      `  ✅ ${test.name}: Column ${test.expectedLetter} (index ${test.expected})`
    );
  }
});

// Test 2: Column letter conversion
console.log("\n📋 Test 2: Column Letter Conversion");
const letterTests = [
  { index: 0, expected: "A" },
  { index: 3, expected: "D" },
  { index: 4, expected: "E" },
  { index: 6, expected: "G" },
  { index: 10, expected: "K" },
];

letterTests.forEach((test) => {
  const result = getColumnLetter(test.index);
  if (result !== test.expected) {
    console.log(
      `  ❌ getColumnLetter(${test.index}): Expected ${test.expected}, got ${result}`
    );
    errors++;
  } else {
    console.log(`  ✅ getColumnLetter(${test.index}) = ${result}`);
  }
});

// Test 3: Payment method normalization
console.log("\n📋 Test 3: Payment Method Normalization");
const normTests = [
  { input: "cash", expected: "Cash" },
  { input: "VENMO", expected: "Venmo" },
  { input: "beer", expected: "Beer" },
  { input: "credit card", expected: "Credit Card" },
  { input: "Cash", expected: "Cash" },
];

normTests.forEach((test) => {
  const result = normalizePaymentMethod(test.input);
  if (result !== test.expected) {
    console.log(
      `  ❌ normalizePaymentMethod("${test.input}"): Expected "${test.expected}", got "${result}"`
    );
    errors++;
  } else {
    console.log(`  ✅ "${test.input}" → "${result}"`);
  }
});

// Test 4: Insights fixed columns
console.log("\n📋 Test 4: Insights Fixed Columns");
const insightsTests = [
  { name: "DATE", expected: 0, actual: INSIGHTS_FIXED_COLUMNS.DATE },
  {
    name: "SALES_COUNT",
    expected: 1,
    actual: INSIGHTS_FIXED_COLUMNS.SALES_COUNT,
  },
  { name: "REVENUE", expected: 2, actual: INSIGHTS_FIXED_COLUMNS.REVENUE },
  { name: "TIPS", expected: 3, actual: INSIGHTS_FIXED_COLUMNS.TIPS },
];

insightsTests.forEach((test) => {
  if (test.actual !== test.expected) {
    console.log(
      `  ❌ ${test.name}: Expected ${test.expected}, got ${test.actual}`
    );
    errors++;
  } else {
    console.log(
      `  ✅ ${test.name}: Column ${getColumnLetter(test.expected)} (index ${
        test.expected
      })`
    );
  }
});

if (INSIGHTS_COL_LETTERS.FIRST_PAYMENT_METHOD !== "E") {
  console.log(
    `  ❌ FIRST_PAYMENT_METHOD: Expected E, got ${INSIGHTS_COL_LETTERS.FIRST_PAYMENT_METHOD}`
  );
  errors++;
} else {
  console.log(`  ✅ Payment methods start at column E`);
}

// Test 5: Header count validation
console.log("\n📋 Test 5: Header Count Validation");
const salesColCount = Object.keys(SALES_COLUMNS).length;
const salesHeaderCount = SALES_HEADERS.length;

if (salesColCount !== salesHeaderCount) {
  console.log(
    `  ⚠️  Sales: ${salesColCount} column constants but ${salesHeaderCount} headers`
  );
  warnings++;
} else {
  console.log(
    `  ✅ Sales: ${salesColCount} columns match ${salesHeaderCount} headers`
  );
}

const productsColCount = Object.keys(PRODUCTS_COLUMNS).length;
const productsHeaderCount = PRODUCTS_HEADERS.length;

if (productsColCount !== productsHeaderCount) {
  console.log(
    `  ⚠️  Products: ${productsColCount} column constants but ${productsHeaderCount} headers`
  );
  warnings++;
} else {
  console.log(
    `  ✅ Products: ${productsColCount} columns match ${productsHeaderCount} headers`
  );
}

// Test 6: Default payment methods
console.log("\n📋 Test 6: Default Payment Methods");
console.log(`  ℹ️  Default methods: ${DEFAULT_PAYMENT_METHODS.join(", ")}`);

DEFAULT_PAYMENT_METHODS.forEach((method) => {
  const normalized = normalizePaymentMethod(method);
  if (normalized !== method) {
    console.log(
      `  ⚠️  "${method}" is not normalized (would become "${normalized}")`
    );
    warnings++;
  } else {
    console.log(`  ✅ "${method}" is properly normalized`);
  }
});

// Summary
console.log("\n" + "=".repeat(50));
if (errors === 0 && warnings === 0) {
  console.log("✅ All validation checks passed!");
  console.log("🚀 Schema constants are correct and consistent.");
  process.exit(0);
} else {
  if (errors > 0) {
    console.log(`❌ ${errors} error(s) found`);
  }
  if (warnings > 0) {
    console.log(`⚠️  ${warnings} warning(s) found`);
  }
  process.exit(errors > 0 ? 1 : 0);
}
