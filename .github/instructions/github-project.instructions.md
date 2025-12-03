---
applyTo: "**"
---

# GitHub Project Instructions — iBest-js

## Project Overview
**iBest-js** is a TypeScript monorepo for blast engineering analysis applications. It contains multiple workspaces with React-based visualization tools and mathematical computation libraries.

## Monorepo Structure
This is an **npm workspaces** monorepo with the following packages:
- **iMath**: Core mathematical computation library (Newmark solver, UFC GRF interpolation, array statistics)
- **iUIComponents**: Shared React UI components library
- **iGSDOF**: Single Degree of Freedom analysis React application
- **iCubicle**: 3D cubicle blast analysis React application with Three.js rendering

## Workspace Dependencies
- `iGSDOF` depends on `iMath` and `iUIComponents`
- `iCubicle` depends on `iUIComponents`
- Internal packages use workspace linking via npm workspaces
- **ALWAYS** run `npm run setup-links` or `npm install` after modifications to ensure workspace links are correct

## Build Order & Scripts
Follow this build order when working across workspaces:
1. Build `iMath` first (if modified): `npm run build_iMath`
2. Build `iUIComponents` (if modified): `npm run build_iUIComponents`
3. Build applications: `npm run build_iGSDOF` or similar

### Root-level scripts:
- `npm run sync-builds` — Syncs built packages across workspace dependencies
- `npm run setup-links` — Sets up workspace symlinks (auto-runs on postinstall)
- `npm run format` — Format all code with Prettier
- `npm run lint` — Lint all code with ESLint
- `npm run clean` — Remove all dist folders

## TypeScript Configuration
- Root `tsconfig.base.json` provides shared compiler options
- Each workspace has its own `tsconfig.json` extending the base
- Library packages have separate `tsconfig.build.json` and `tsconfig.dev.json`
- **Always** maintain type safety — no `any` types unless absolutely necessary

## Key Technologies
- **React 19.x**: UI framework for applications
- **Vite**: Build tool and dev server
- **Three.js**: 3D rendering (iCubicle)
- **Chart.js**: Data visualization
- **TypeScript 5.x**: Type-safe development

## Code Style & Standards
- Use **ESM** (`type: "module"`) throughout
- Prefer **named exports** over default exports
- Use **absolute imports** from workspace packages (e.g., `@integralrsg/imath`)
- Follow existing **folder structure conventions** (see folder-structure.ms.instructions.md)
- Keep functions **pure and testable** in iMath
- Use **CSS Modules** for component styling (`.module.css`)

## Development Workflow
1. Make changes in source files
2. For library changes, rebuild: `npm run build -w <workspace>`
3. Run `npm run sync-builds` to propagate changes
4. Test in dependent applications via their dev servers
5. Format and lint before committing: `npm run format && npm run lint`

## iMath Library Conventions
- Keep computational logic separate from UI
- Export modular functions with clear single responsibilities
- Include JSDoc comments for complex algorithms
- Maintain backwards compatibility for existing exports
- Test numerical accuracy for mathematical functions

## iGSDOF & iCubicle Application Conventions
- Use React hooks for state management
- Extract reusable logic into custom hooks (in `hooks/` directory)
- Keep components focused and composable
- Use TypeScript types from `types.ts` files
- API calls go in `api.ts` files
- Constants and configuration in `constants.ts`

## Three.js Geometry (iCubicle specific)
- Geometry utilities are in `src/lib/geometry/`
- Use `plane-native.ts` for creating planes with optional openings
- Use `cubicle-native.ts` for creating complete cubicles
- Follow existing parameter patterns (PlaneOptions, CubicleOptions)
- Export types from `types.ts` and functions from `index.ts`

## File Naming Conventions
- React components: PascalCase (e.g., `AnalysisResults.tsx`)
- Utilities/functions: camelCase (e.g., `validateSolverInput.ts`)
- CSS Modules: ComponentName.module.css (e.g., `Scene3D.module.css`)
- Types: Usually in `types.ts` per workspace
- Index files: Use `index.ts` to re-export public API

## Environment & Configuration
- Environment files are **locked** — do not edit or read them
- Configuration goes in workspace-specific files, not hardcoded
- Use `vite.config.ts` for build configuration per workspace
- Each application has its own `index.html` entry point

## Testing & Validation
- iMath has test files in `tests/` directory
- Run tests with `npm test` in the iMath workspace
- Verify builds before committing: `npm run build` in each workspace
- Check for type errors: `npm run typecheck`

## Deployment & Sync
- Built applications sync to remote servers via WSL rsync
- Sync commands are in package.json `sync` scripts
- Do **not** modify sync paths without understanding deployment setup

## Git & Version Control
- Main branch: `main`
- Keep commits focused and atomic
- Reference issue numbers in commit messages when applicable
- Don't commit `dist/`, `node_modules/`, or environment files

## Dependencies Management
- Root package.json has shared dependencies (three, chart.js, etc.)
- Workspace-specific dependencies go in workspace package.json
- Use `npm install` at root to install all workspace dependencies
- Keep dependency versions consistent across workspaces

## Performance Considerations
- iMath library exports are tree-shakeable
- Use dynamic imports for large dependencies when possible
- Chart rendering uses WebGL for performance (webgl-plot)
- Optimize bundle sizes with Vite's code splitting

## Common Pitfalls to Avoid
- ❌ Don't directly edit files in `dist/` folders
- ❌ Don't import from `src/` of other workspaces — use package names
- ❌ Don't skip `npm run sync-builds` after library changes
- ❌ Don't commit with type errors or lint errors
- ❌ Don't hardcode API endpoints or secrets
- ❌ Don't modify workspace links manually — use setup-links script

## When Making Changes
1. **Identify affected workspaces** — changes in iMath affect downstream apps
2. **Maintain backwards compatibility** — other workspaces depend on stable APIs
3. **Update types** — TypeScript types should match runtime behavior
4. **Test integration** — verify dependent workspaces still work
5. **Document breaking changes** — if API changes, note it clearly
6. **Run format and lint** — before committing

## Special Instructions for AI/Copilot
- Read `copilot.instructions.md` for code lock markers and general guidelines
- Read `folder-structure.ms.instructions.md` for geometry/3D rendering details
- Respect the monorepo architecture — changes should be surgical and workspace-aware
- When proposing changes to shared libraries, consider impact on all consumers
- Always verify import paths use package names, not relative paths across workspaces
- Check if `npm run sync-builds` is needed after your changes
