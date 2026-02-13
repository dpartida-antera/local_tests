# Report Builder Test Guide

This document explains how the report builder test fetches API metadata, normalizes it, and compares it to the UI table headers.

## Why this test exists
The Sales Report UI shows a selectable list of columns. We want to verify that those UI columns are backed by API field definitions, and surface any gaps so we can keep the report builder aligned with backend metadata.

## High-level flow
1. Open the report builder and collect UI column names from the multiselect dropdown.
2. Fetch field definitions from the general field list endpoint.
3. Fetch order-specific fields from the orders fields endpoint.
4. Normalize all labels to handle newline and whitespace issues from the API.
5. Merge labels into a single lookup set.
6. Compare the UI column labels against that set.
7. Ignore allowlisted missing columns that are known to be virtual or unavailable.
8. Fail only if there are missing columns not on the allowlist.

## API endpoints used

### 1) General field list
- URL: https://dev.anterasaas.com/protected/content/get-fields-list
- Method: POST
- Body: { "module": "orders" }
- Behavior: returns fields across multiple modules, not just orders.

### 2) Orders fields
- URL: https://dev.anterasaas.com/protected/api/v1/orders/fields
- Method: GET
- Behavior: returns additional order-specific fields missing from the general list.

Both endpoints use Basic Auth. The test builds the Authorization header from the same username string used by Postman.

## Normalization rules
API fields often contain embedded newlines in label values (for example: "First Order\nDate"). To ensure consistent comparison, labels are normalized by:
- Replacing newlines, tabs, and carriage returns with a space.
- Collapsing multiple spaces into a single space.
- Trimming leading and trailing whitespace.

This normalization is applied to:
- API field labels (labelName only, not defaultLabelName)
- UI column labels

## Comparison logic
- Each UI column label is normalized.
- Each normalized UI label is checked against the merged API label set.
- Missing labels are collected and filtered through the allowlist.
- The test fails only if any missing labels remain after allowlist filtering.

## Allowlist
Some columns are known to be missing from both APIs (often calculated or virtual). These are allowlisted so the test remains actionable.

The allowlist lives here:
- docs: none
- code: helper/report-builder-columns.ts

To update it:
- Add or remove labels in REPORT_BUILDER_MISSING_COLUMNS_ALLOWLIST.
- Use the exact UI label text; normalization is applied automatically.

## Where to look in code
- Main test: tests/report_builder_test_modified.spec.ts
- API helpers: helper/api-fields-helper.ts
- Allowlist + normalizer: helper/report-builder-columns.ts

## Troubleshooting tips
- If many columns are missing, verify the orders endpoint is reachable and returning data.
- If labels appear to differ only by spacing or line breaks, normalization should already handle that.
- If labels differ by punctuation or abbreviations, consider adding a small mapping layer.

## Next improvements (optional)
- Add a mapping table for known label mismatches (for example, "PO" vs "P.O.").
- Cache API responses per test run to reduce time.
- Move logging behind a debug flag to reduce noise in CI.
