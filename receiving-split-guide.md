# Receiving suite split guide

## Objective

Split `receiving.spec.ts` so each non-serial test lives in its own file, while serial suites stay grouped in a single file.

## What was done

1. Removed the original combined file:
   - `test/scripts/receiving.spec.ts`

2. Created one file per standalone test:
   - `test/scripts/receiving-general-search.spec.ts`
     - `receiving_general_search`
   - `test/scripts/receiving-individual-checkbox.spec.ts`
     - `should receive by selecting individual checkbox`
   - `test/scripts/receiving-all-checkbox.spec.ts`
     - `should receive by selecting all checkbox`
   - `test/scripts/receiving-partial.spec.ts`
     - `PartialReceiving`
   - `test/scripts/receiving-work-order-numbers.spec.ts`
     - `CorrectWorkOrderNumbersInReceiving`

3. Kept serial suites together in dedicated files:
   - `test/scripts/receiving-order-activities.serial.spec.ts`
     - `test.describe.serial('Order Activities', ...)`
   - `test/scripts/receiving-production-tags.serial.spec.ts`
     - `test.describe.serial('Production Tags', ...)`

## Rules followed

- Every standalone `test(...)` moved to its own spec file.
- Every `test.describe.serial(...)` block remained intact in one file.
- Existing test logic, names, and helper calls were kept the same.
- `test.describe.configure({ timeout: 350000, retries: 0 })` was preserved in each new file.

## How to repeat this in another branch

1. Checkout your target branch.
2. Delete `test/scripts/receiving.spec.ts`.
3. Create the 7 files listed above.
4. Copy the corresponding test blocks into each file.
5. Keep imports minimal per file (only what each file uses).
6. Run the receiving specs to validate discovery and syntax.

## Suggested validation commands

- Run only receiving split files:
  - `npx playwright test test/scripts/receiving-*.spec.ts`
- Or run one file at a time for troubleshooting:
  - `npx playwright test test/scripts/receiving-order-activities.serial.spec.ts`
