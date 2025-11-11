# Environment Configuration

This document explains how to configure API endpoints and other environment-specific settings for the monorepo.

## Environment Files (Root Level)

The project uses Vite's environment variable system at the **workspace root**:

- **`.env.development`** - Development-specific values (committed to git)
- **`.env.production`** - Production-specific values (committed to git)
- **`.env.local`** - Local overrides (NOT committed to git, use `.env.local.example` as template)

## Available Variables

| Variable | Description | Default (Dev) | Production |
|----------|-------------|---------------|------------|
| `VITE_GRF_API_BASE_URL` | Base URL for GRF API | `http://127.0.0.1:8000` | `https://api.yourdomain.com` |
| `VITE_GRF_API_ENDPOINT` | API endpoint path | `/api/grf/data/` | `/api/grf/data/` |

## Usage

### Development
Just run your dev server - it will use `.env.development` automatically:
```bash
npm run dev -w iGSDOF
# or
npm run dev -w iVentedBlast-js
```

### Production Build
Build command uses `.env.production`:
```bash
npm run build -w iGSDOF
```

### Local Overrides
Create a `.env.local` file at the **root** (copy from `.env.local.example`):
```bash
cp .env.local.example .env.local
```

Then edit `.env.local` at the root:
```env
VITE_GRF_API_BASE_URL=http://localhost:3000
VITE_GRF_API_ENDPOINT=/api/v2/grf/data/
```

## How It Works

1. **Vite reads environment files** in this priority order:
   - `.env.local` (highest priority, gitignored)
   - `.env.[mode]` (`.env.development` or `.env.production`)
   - `.env` (lowest priority)

2. **Variables prefixed with `VITE_`** are exposed to your code via `import.meta.env`

3. **TypeScript types** are defined in `src/vite-env.d.ts` for autocomplete

## In Code

The GRF API client automatically uses these variables:

```typescript
import { getGRFApi } from '@integralrsg/imath/ufc';

// Uses environment variables automatically
const data = await getGRFApi('02_154.GRF');
```

Or override programmatically:

```typescript
import { getGRFApi } from '@integralrsg/imath/ufc';

const data = await getGRFApi('02_154.GRF', {
  baseUrl: 'https://custom-api.example.com',
  endpoint: '/custom/endpoint/'
});
```

## Switching Environments

### Method 1: Use Vite modes
```bash
# Development (uses .env.development)
npm run dev -w iGSDOF

# Production (uses .env.production)
npm run build -w iGSDOF

# Custom mode (uses .env.staging)
npm run build -w iGSDOF -- --mode staging
```

### Method 2: Use .env.local
Create `.env.local` at the **root** with your custom values - this overrides everything else.

### Method 3: Programmatic configuration
```typescript
import { configureGRFApi } from '@integralrsg/imath/ufc';

// Set custom defaults at app startup
configureGRFApi({
  baseUrl: 'https://production-api.com',
  endpoint: '/v2/grf/'
});
```

## Security Notes

- ⚠️ **Never commit `.env.local`** - it's in `.gitignore`
- ⚠️ **Never put secrets in VITE_ variables** - they're exposed in client-side code
- ✅ Only put public API URLs in environment variables
- ✅ Use backend environment variables for API keys and secrets

## Updating Production URL

When ready for production:

1. Edit `.env.production` at the **root**:
   ```env
   VITE_GRF_API_BASE_URL=https://api.yourdomain.com
   ```

2. Build for production:
   ```bash
   npm run build -w iGSDOF
   ```

3. The built code will use the production URL automatically!

## Project Structure

```
ibest-js/                          # Root
├── .env.development              # Dev config (committed)
├── .env.production               # Prod config (committed)
├── .env.local                    # Local overrides (gitignored)
├── ENV_CONFIG.md                 # This file
├── iMath/                        # Library (no env files)
│   └── src/ufc/grfApi.ts        # Consumes env variables
├── iGSDOF/                       # Vite app (uses root env)
│   └── src/vite-env.d.ts        # Type definitions
└── iVentedBlast-js/              # Vite app (uses root env)
    └── src/vite-env.d.ts        # Type definitions
```
