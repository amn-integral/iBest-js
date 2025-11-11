# UFC (Unified Facilities Criteria) Module Tests

Tests for the GRF (Gas Response Function) curve interpolation and pipeline functionality.

## Prerequisites

Make sure the GRF API server is running on `http://127.0.0.1:8000` before running the tests.

## Running the Tests

### Using tsx (TypeScript execution):
```bash
npx tsx iMath/tests/ufc/grfPipeline.test.ts
```

### After building:
```bash
npm run build -w iMath
node iMath/tests/ufc/grfPipeline.test.mjs
```

## What the Tests Cover

### 1. Full Pipeline Test
- Fetches multiple GRF curves from the API
- Filters curves by parameter values (N=2)
- Interpolates curves at a specific Za value (90.0)
- Evaluates the interpolated curve at a target point (L/RA = 6.0)
- Validates that the result is a finite number

### 2. Filter Extraction Test
- Tests the `extractFiltersFromFilename` utility
- Verifies correct parsing of key-value pairs from filenames
- Example: `"(W/Vf = 0.002, i/W^(1/3) = 100)"` → `{W/Vf: 0.002, i/W^(1/3): 100}`

## Test Data

The tests use sample GRF files:
- `02_073A.GRF`
- `02_073B.GRF`
- `02_073C.GRF`

These files are fetched from the API and filtered by:
- `N` (number parameter) = 2
- `l/L` (length ratio)
- `h/H` (height ratio)
- `L/H` (overall ratio)

## Expected Output

```
============================================================
NATIVE GRF RESOLVER - FULL PIPELINE TEST
============================================================

Parameters: N=2, Za=90.0

Loading 3 test curves...
  ✓ 02_073A.GRF: N=2, l/L=0.375, h/H=0.375, L/H=2.0
  ...

Filtered to X curves with N=2

Step 1: Interpolating X curves at Za=90.0...
  ✓ Interpolated curve: ...

Step 2: Evaluating first interpolated curve at L/RA=6.0...
  ✓ Result: Pr = X.XXXXXXe+XX

============================================================
TEST SUMMARY
============================================================
✅ Successfully loaded and filtered curves
✅ Successfully interpolated X curves using native functions
✅ Successfully evaluated curve at target point

📊 Final result: Pr at L/RA=6.0 is X.XXXXXXe+XX
============================================================

🎉 Native implementation works correctly!
   All functions use pure TypeScript (no external math libs)
============================================================
```

## Notes

- All interpolation is done in log-log space
- The implementation uses only native TypeScript/JavaScript (no numpy/scipy equivalents)
- Functions support both interpolation and extrapolation
