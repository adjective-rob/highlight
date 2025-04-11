# Highlight Saver Pro

Highlight Saver Pro is a lightweight Chrome extension to capture, organize, and export text highlights from any webpage.

With this extension, you can save selected text directly to a local CSV file, organize highlights by categories, and manage your notes from a simple popup interface.

## Features

- Right-click to save highlighted text from any webpage
- Organize highlights into custom categories
- Export all highlights as a CSV
- Track highlight counts and recent activity
- Clean, responsive popup UI
- Loading spinners and async-safe operations to prevent bugs
- Local-first: all data stays in your browser

## Installation (Development)

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/highlight-saver-pro.git
   cd highlight-saver-pro
2. Open Chrome and go to:
```bash
chrome://extensions
```
3. Enable Developer mode (toggle in the top right).

4. Click "Load unpacked" and select this folder.

5. Start using the extension:

    Right-click selected text → Save Highlight → Select a category.

    Open the popup to manage highlights.

Development Notes
Manifest Version: V3

Technologies:

Vanilla JavaScript

Chrome Storage API

Context Menus API

Download API

Folder structure:

```bash
/background.js       # Handles storage and context menu logic
/popup.html          # Main extension popup
/popup.js            # Frontend logic for popup UI
/content.js          # (Optional future use for on-page actions)
/manifest.json       # Chrome extension manifest
/images/             # Extension icons
```

## Roadmap:

Auto-backup settings (currently UI only)

Import/export data feature (stubbed in UI)

Cloud sync (optional)

Highlight styling on page (future enhancement)
