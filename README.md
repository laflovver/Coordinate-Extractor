# 🧭 Coordinate Extractor v3.1.0

A powerful Chrome extension that automatically extracts geographic coordinates (latitude, longitude, zoom, pitch, bearing) from map URLs. Works with most popular mapping services.

## ✨ Features

- **⚡ Fast Coordinate Extraction**: Automatically parses coordinates from URLs
- **🌍 Universal Support**: Works with various URL formats and mapping services
- **📋 4 Storage Slots**: Save and manage up to 4 coordinate sets with instant saving
- **⌨️ Keyboard Shortcuts**: Quick actions with hotkeys
- **🌐 Automatic Location Names**: Background geocoding for slots 1-3 (coordinates save immediately)
- **🎨 Color-Coded Labels**: Customize slot names with colors
- **🗺️ Service Navigation**: Quick access to multiple map services with drag-and-drop reordering
- **🎯 Hotkeys for Services**: Direct navigation to services with keys 1-9
- **🎨 Service Visual Identity**: Colored borders and background images based on service branding
- **✨ Visual Feedback**: Icon rotation animation shows when extension is loading

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

### Coordinate Slots
| Shortcut | Action |
|----------|--------|
| **Command+Shift+E** (Mac) / **Ctrl+Shift+E** (Windows/Linux) | Open extension popup |
| **Option+1, 2, 3, 4** | Select slot 0, 1, 2, or 3 |
| **C** | Copy coordinates to clipboard |
| **V** | Paste coordinates from clipboard |
| **G** | Open service navigation modal |
| **E** | Edit active slot's label |
| **Q** | Select slot 0 |
| **Delete/Backspace** | Clear active slot |

### Service Navigation
| Shortcut | Action |
|----------|--------|
| **1-9** | Navigate directly to service 1-9 |
| **Drag & Drop** | Reorder services to your preference |

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
4. Coordinates are saved immediately
5. Location name appears automatically in the background (via geocoding)
6. Click the ✏️ icon to customize the name

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
- **Coordinates save immediately** - no waiting for geocoding
- Location names are fetched in the background after coordinates are saved
- Shows "Loading location..." while fetching the name
- Displays short, readable location names
- Names are editable and persist across sessions
- Color-coded for easy identification
- Coordinates are preserved even if geocoding fails or is slow

---

## 🗺️ Supported Map Services

The extension supports navigation to multiple map services:
- **Mapbox Standard** - Standard Mapbox style
- **3D Buildings Box** - 3D building visualizations
- **Labs HD Roads** - High-definition road mapping
- **HD Roads Prod** - Production HD roads tileset
- **3DLN Demo Style** - 3D line navigation demo
- **Google Maps** - Street and satellite imagery
- **Google Earth** - 3D Earth view
- **3D Model Slots** - 3D model visualization
- **OpenStreetMap** - Open-source map data
- **Bing Maps** - Microsoft mapping service
- **Yandex Maps** - Russian mapping service

You can add custom services by clicking the "+ Add Custom Service" button and providing a service name and URL template with example coordinates.

---

## ⚠️ Common Issues

| Issue | Solution |
|-------|----------|
| Coordinates not found | Ensure the URL contains valid coordinate data |
| Clipboard error | Allow clipboard access in Chrome settings |
| Wrong coordinates | Some services use different coordinate orders - try a different slot |
| Location name not loading | Coordinates are saved; name will appear when geocoding completes. You can edit the name manually if needed |
| Extension icon spinning | The icon rotates while the extension popup is loading |

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
│   ├── uiComponents.js     # UI rendering and interactions
│   └── serviceModal.js     # Service navigation with drag-and-drop
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

### v3.1.0 (Latest)
- **Icon rotation animation**: Extension icon rotates while popup is loading for visual feedback
- **Improved coordinate saving**: Coordinates in slots 1-3 save immediately; location names are fetched in the background
- **Better reliability**: Coordinates are preserved even if geocoding fails or takes too long
- Changed hotkey from Command+Shift+F to **Command+Shift+E** (Mac) / Ctrl+Shift+E (Windows/Linux)
- Added 3D Model Slots service
- Reordered quick access services (3D Model Slots at 8th, OpenStreetMap at 9th, Bing Maps at 10th)
- Log panel now displays all console logs for better debugging
- Fixed hotkey conflicts between slot selection and service navigation
- Improved popup window appearance and positioning
- Added service navigation modal with drag-and-drop reordering
- Implemented hotkeys 1-9 for direct service navigation
- Added color-coded service buttons based on service branding
- Added background images with blur effects for visual service identity
- Support for pitch and bearing parameters in 3D map services
- Service visibility toggle and custom service addition
- Improved UI/UX with modern design inspired by 3D Buildings Box
- Updated hotkeys: Option+1,2,3,4 for slot selection
- Persistent service order and preferences in localStorage

### v3.0.0
- Improved coordinate parser (universal support)
- Fixed bearing/pitch handling (only added when non-zero)
- Better compatibility with various mapping services
- Simplified codebase for easier maintenance
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
