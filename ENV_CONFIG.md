# API Configuration

## Simple & Elegant

The API defaults are **hardcoded in the code**:
- Base URL: `http://127.0.0.1:8000`
- Endpoint: `/api/grf/data/`

Everything just works. No setup needed.

## Override If Needed

Pass config directly to the function:

```typescript
import { getGRFApi } from '@integralrsg/imath/ufc';

// Use defaults
const data = await getGRFApi("02_154.GRF");

// Or override
const data = await getGRFApi("02_154.GRF", {
  baseUrl: "https://api.production.com",
  endpoint: "/api/v2/grf/data/"
});
```

## Reference

Default values (also in `config.development.env`):
```bash
VITE_GRF_API_BASE_URL=http://127.0.0.1:8000
VITE_GRF_API_ENDPOINT=/api/grf/data/
```
