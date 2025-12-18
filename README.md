## Tests

Make sure the GRF API server is running on `http://127.0.0.1:8000` before running the tests.

Running the Tests

Using tsx (TypeScript execution):


```bash 
npx tsx iMath/tests/ufc/grfPipeline.test.ts
```

Test after After building:
```bash
npm run build -w iMath
node iMath/tests/ufc/grfPipeline.test.mjs
```