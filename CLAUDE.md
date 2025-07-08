# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal Blocklist is a browser extension that allows users to block specific domains from appearing in Google search results. It's a partial fork of the discontinued "Personal Blocklist (By Google)" extension.

## Key Commands

### Development
```bash
# Install dependencies
npm install

# Run development mode (watches both React app and extension files)
npm run dev

# Start development environment with web-ext
npm run dev:start-env
```

### Building
```bash
# Build for production
npm run build:production

# Build only (without packaging)
npm run build
```

### Testing
```bash
# Run tests
npm test
```

## Architecture

The project consists of two main parts:

1. **Browser Extension Core** (`/public/`)
   - `manifest.json`: Extension configuration (Manifest V2)
   - `background.js`: Background script handling extension logic
   - `content_script.js`: Injected into Google search pages to hide blocked domains
   - `common.js`: Shared utilities between background and content scripts
   - `_locales/`: Internationalization files for 22 languages

2. **React Management Interface** (`/src/`)
   - `App.js`: Main app component with routing
   - `AllPatterns.js`: Displays and manages blocked domain patterns
   - `ImportPage.js`: Import blocklist functionality
   - `ExportPage.js`: Export blocklist functionality
   - `api.js`: Communication bridge with extension storage APIs

## Development Workflow

1. The React app is built into the `/build` directory
2. Public files are copied to `/build` after React build
3. `web-ext` is used for testing in Firefox/Chrome
4. The extension uses Chrome/Firefox storage APIs to persist blocklist data

## Important Notes

- Uses React 16.10.2 (older version)
- Manifest V2 (consider migrating to V3 for future Chrome compatibility)
- No TypeScript support
- Minimal test coverage
- jQuery is included for compatibility with older code

## Package Management

- Use yarn for dependency management