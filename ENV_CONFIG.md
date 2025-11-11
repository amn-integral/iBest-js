# Environment Configuration

This workspace uses named config files that are committed to git.

## Files

- `config.development.env` - Development environment (committed to git)
- `config.production.env` - Production environment (committed to git)
- `.env.local` - Local overrides (NOT committed, optional)

## Variables

```bash
VITE_GRF_API_BASE_URL=http://127.0.0.1:8000
VITE_GRF_API_ENDPOINT=/api/grf/data/
```

## How to Use

### Development

Copy the dev config before running:
```bash
cp config.development.env .env.development
npm run dev
```

### Production

Copy the production config before building:
```bash
cp config.production.env .env.production
npm run build
```

### Local Overrides (Optional)

Create `.env.local` for personal settings:
```bash
echo "VITE_GRF_API_BASE_URL=http://localhost:8080" > .env.local
```

The `.env.local` file is gitignored and won't be committed.

## Why This Approach?

- ✅ `config.*.env` files are committed (safe defaults for everyone)
- ✅ `.env.*` files are gitignored (no risk of committing secrets)
- ✅ Copy command is explicit and visible in scripts
- ✅ Clear separation between templates and active configs

## Type Safety

Environment variables are typed in `iGSDOF/src/vite-env.d.ts` for TypeScript autocomplete.
