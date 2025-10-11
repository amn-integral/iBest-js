# Debug Configuration for iVented and iMath

This workspace now includes comprehensive debugging configurations for both iVented (React/Vite frontend) and iMath (TypeScript library) projects using Brave browser.

## Available Debug Configurations

### 1. **Launch iVented in Brave**

- Launches the iVented React app in Brave browser with debugging enabled
- Automatically starts the Vite dev server before launching
- Uses port 9222 for remote debugging
- Source maps are enabled for TypeScript debugging

### 2. **Debug iVented (Attach to Running)**

- Attaches to an already running Brave instance with debugging enabled
- Useful when you want to debug an already open browser session

### 3. **Debug iMath Library Tests**

- Debugs the iMath TypeScript library directly in Node.js
- Useful for testing library functions and debugging compilation issues

### 4. **Debug iMath Build Process**

- Debugs the tsup build process for the iMath library
- Helpful for troubleshooting build configuration issues

### 5. **Debug iVented Full Stack** (Compound)

- Runs both iVented and iMath debugging simultaneously
- Best for full-stack debugging scenarios

## Available Tasks

### Development Tasks

- `vite:dev` - Starts the Vite development server for iVented
- `iMath:dev` - Starts the iMath library in watch mode
- `iMath:build` - Builds the iMath library

### Utility Tasks

- `Kill All Dev Servers` - Stops all running Node.js processes (useful for cleanup)

## How to Use

### For iVented React App Debugging:

1. Open the Debug panel in VS Code (Ctrl+Shift+D)
2. Select "Launch iVented in Brave" from the dropdown
3. Press F5 or click the green play button
4. Set breakpoints in your React/TypeScript code
5. The app will launch in Brave with debugging enabled

### For iMath Library Debugging:

1. Select "Debug iMath Library Tests"
2. Press F5
3. Set breakpoints in your iMath TypeScript files
4. Debug your library code directly

### For Full-Stack Debugging:

1. Select "Debug iVented Full Stack"
2. Press F5
3. Both iVented and iMath will be available for debugging

## Browser Configuration

- **Browser Path**: `C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`
- **Debug Profile**: Isolated profile created at `.vscode/brave-debug-profile-ivented`
- **Debug Port**: 9222
- **Dev Server**: http://localhost:5173

## Tips

- Breakpoints set in TypeScript files will work thanks to source map support
- The debug profile is isolated, so your personal Brave data won't be affected
- Use the integrated terminal to run additional commands while debugging
- The configurations support hot reload - code changes will be reflected automatically

## Troubleshooting

- If Brave doesn't launch, verify the path: `C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`
- If debugging doesn't work, ensure the Vite dev server is running on port 5173
- Clear the debug profile folder if you encounter browser-related issues: `.vscode/brave-debug-profile-ivented`
