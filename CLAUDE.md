# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome/Chromium browser extension that provides a fast, searchable interface for Chrome bookmarks. It injects an overlay UI on any webpage, allowing users to search, open, edit, and delete bookmarks via keyboard shortcuts.

**Manifest Version**: 3
**Technology**: Vanilla JavaScript (no build system)
**Permissions**: bookmarks, activeTab, scripting

## Architecture

The extension follows a simple two-script architecture:

### `background.js` (Service Worker)
- **Location**: `/Users/eli/Documents/github/search-bookmark-extension/background.js:1`
- **Purpose**: Handles extension lifecycle and bookmark operations
- **Key Functions**:
  - `loadBookmarks()`: Fetches and flattens the Chrome bookmark tree
  - Message listener for actions:
    - `openTab`: Opens a bookmark in a new tab
    - `editBookmark`: Updates a bookmark's title and URL
    - `deleteBookmark`: Removes a bookmark
    - `getBookmarks`: Returns the full bookmark list
  - Click handler that injects bookmark data and loads content script

### `content.js` (Content Script)
- **Location**: `/Users/eli/Documents/github/search-bookmark-extension/content.js:1`
- **Purpose**: Injects and manages the search UI overlay
- **Key Features**:
  - Creates dark-themed overlay modal (positioned at 20% from top)
  - Real-time search filtering (title and URL, case-insensitive, max 20 results)
  - Keyboard navigation (↑/↓ to select, Enter to open, Esc to close)
  - Edit mode for bookmark title and URL
  - Delete confirmation
  - Click-outside-to-close behavior
  - HTML escaping for XSS prevention

### `manifest.json`
- **Location**: `/Users/eli/Documents/github/search-bookmark-extension/manifest.json:1`
- **Purpose**: Extension configuration
- **Action**: No popup (icon click triggers search on current page)

## Development Workflow

### Loading the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the extension directory: `/Users/eli/Documents/github/search-bookmark-extension`
5. The extension icon will appear in the toolbar

### Using the Extension

1. Click the extension icon on any webpage
2. Search overlay appears with your bookmarks
3. Type to filter results
4. Use ↑/↓ arrows to navigate, Enter to open
5. Hover over results to see Edit/Delete buttons

### Testing Changes

Since there's no build system:
1. Make changes to source files
2. Go to `chrome://extensions/`
3. Click the refresh button on the "Bookmark Search" extension
4. Test on a webpage

**Note**: No linting, type-checking, or test framework is configured.

## Common Development Tasks

### Adding New Bookmark Actions
- Add handler in `background.js` (lines 48-73)
- Send message from `content.js` using `chrome.runtime.sendMessage()`
- Implement UI in content script if needed

### Modifying Search Behavior
- Update `searchBookmarks()` function in `content.js:215`
- Currently searches title and URL, returns first 20 matches
- Case-insensitive matching

### Styling Changes
- CSS is embedded in `content.js` createOverlay() function (lines 23-144)
- Dark theme (#1a1a1a background, #2a2a2a inputs)
- Currently positioned at 20% from top, 600px wide (90vw max)

### Handling Edge Cases
- Prevents multiple overlays via `window.bookmarkSearchExtensionLoaded` flag
- Escape HTML to prevent XSS when rendering bookmark data
- Confirm dialog before deletion

## Important Notes

- **No build process**: Direct JavaScript modification
- **No tests**: Manual testing only
- **No linting**: Follow existing code style (camelCase, ES6 syntax)
- **Manifest V3**: Service worker background script (not persistent background page)
- **Single context injection**: Bookmarks passed via `window.injectedBookmarks` then removed
- **Permission model**: Uses activeTab + scripting instead of full tab access
