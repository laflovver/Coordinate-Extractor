# 🧭 Coordinate Extractor v3.1.0

A powerful Chrome extension that automatically extracts geographic coordinates (latitude, longitude, zoom, pitch, bearing) from map URLs. Works with most popular mapping services.

## ✨ Features

- **⚡ Fast Coordinate Extraction**: Automatically parses coordinates from URLs
- **🌍 Universal Support**: Works with various URL formats and mapping services
- **📋 4 Storage Slots**: Save and manage up to 4 coordinate sets
- **⌨️ Keyboard Shortcuts**: Quick actions with hotkeys
- **🌐 Automatic Location Names**: Uses OpenStreetMap geocoding for slots 1-3
- **🎨 Color-Coded Labels**: Customize slot names with colors

---

## 🚀 Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right)
4. Click **Load unpacked** and select the extension folder
5. The Coordinate Extractor icon will appear in your toolbar

---

## 🔍 How It Works

### Automatic Extraction
When you open the popup, the extension automatically extracts coordinates from the current tab's URL. Supported formats:
- Path format: `/@lat,lon,zoom`
- Hash format: `#zoom/lat/lon` or `#map=zoom/lat/lon`
- Query parameters: `?lat=X&lon=Y&zoom=Z`
- Special formats: `ll=`, `cp=`, `center=`

### Storage Slots
- **Slot 0**: Always shows coordinates from the current URL (read-only)
- **Slots 1-3**: Save custom coordinates with editable names and colors

---

## ⌨️ Hotkeys

| Shortcut | Action |
|----------|--------|
| **Ctrl+Shift+F** | Open extension popup |
| **C** | Copy coordinates to clipboard |
| **V** | Paste coordinates from clipboard |
| **G** | Navigate to coordinates (update URL) |
| **E** | Edit active slot's label |
| **Q** | Select slot 0 |
| **1, 2, 3** | Select slot 1, 2, or 3 |
| **Delete/Backspace** | Clear active slot |

---

## 📚 Usage Examples

### Example 1: Extract Coordinates
1. Navigate to any map website
2. Click the extension icon
3. Coordinates are automatically displayed in slot 0

### Example 2: Save Location
1. Extract coordinates (or paste from clipboard)
2. Select slot 1, 2, or 3
3. Press **V** to paste
4. Location name appears automatically
5. Click the ✏️ icon to customize the name

### Example 3: Navigate
1. Select a slot with saved coordinates
2. Navigate to a map website
3. Press **G** to update the URL with those coordinates

---

## 🛠️ CLI Format

Coordinates are stored in CLI format:
```
--lon 2.2768 --lat 48.85891 --zoom 13.75
```

With rotation and tilt (when needed):
```
--lon 2.2768 --lat 48.85891 --zoom 13.75 --bearing 45 --pitch 60
```

**Note**: Bearing and pitch are only included when non-zero to ensure compatibility with all mapping services.

---

## 🌍 Geocoding

Slots 1-3 automatically fetch location names using OpenStreetMap's Nominatim API:
- Shows "Loading location..." while fetching
- Displays short, readable location names
- Names are editable and persist across sessions
- Color-coded for easy identification

---

## ⚠️ Common Issues

| Issue | Solution |
|-------|----------|
| Coordinates not found | Ensure the URL contains valid coordinate data |
| Clipboard error | Allow clipboard access in Chrome settings |
| Wrong coordinates | Some services use different coordinate orders - try a different slot |
| Location not loading | Wait a moment or edit the name manually |

---

## 🏗️ Technical Details

### Architecture
```
src/
├── core/
│   ├── app.js              # Main application logic
│   ├── browserManager.js   # Tab and URL management
│   └── storageManager.js   # Chrome storage API wrapper
├── parsers/
│   └── coordinateParser.js # Universal coordinate parser
├── ui/
│   └── uiComponents.js     # UI rendering and interactions
└── utils/
    ├── cliParser.js        # CLI string parsing
    └── geocoder.js         # Location name fetching
```

### Performance
- Fast URL parsing (~0.1-0.5ms average)
- Precompiled regex patterns
- Efficient coordinate validation
- Minimal memory footprint

---

## 📝 Changelog

### v3.1.0
- Improved coordinate parser (universal support)
- Fixed bearing/pitch handling (only added when non-zero)
- Better compatibility with various mapping services
- Simplified codebase for easier maintenance

### v3.0.0
- Modular architecture refactoring
- Automatic location naming with geocoding
- Enhanced UI with animations
- 4-slot storage system
- Comprehensive keyboard shortcuts

---

## 📄 License

MIT License - see LICENSE file for details.

---

## 🙏 Acknowledgments

- OpenStreetMap for the Nominatim geocoding API
- All mapping service providers
- Chrome Extension API

---

**Enjoy seamless coordinate extraction!** 🌍🎯
