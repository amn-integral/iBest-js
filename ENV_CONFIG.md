# Environment Configuration

This workspace uses environment variables for API configuration.

## Files

- `.env.development` - Development environment (local API server)
- `.env.production` - Production environment (production API server)

## Variables

```bash
VITE_GRF_API_BASE_URL=http://127.0.0.1:8000
VITE_GRF_API_ENDPOINT=/api/grf/data/
```

## How It Works

1. **Development** (`npm run dev`): Uses `.env.development` automatically
2. **Production** (`npm run build`): Uses `.env.production` automatically
3. **Local overrides** (optional): Create `.env.local` to override any setting
4. **Priority**: `.env.local` > `.env.[mode]`
5. **Access in code**: `import.meta.env.VITE_GRF_API_BASE_URL`

## Creating Local Overrides

If you need different settings locally (different port, custom API):

```bash
# Create .env.local at workspace root
echo "VITE_GRF_API_BASE_URL=http://localhost:8080" > .env.local
```

Note: `.env.local` is gitignored and won't be committed.

## Type Safety

Environment variables are typed in `iGSDOF/src/vite-env.d.ts` for TypeScript autocomplete.
