# 🧭 Coordinate Extractor v3.0.0

Coordinate Extractor is a powerful Chrome extension that automatically extracts geographic coordinates (latitude, longitude, zoom, pitch, bearing) from URLs — whether they're in query parameters, hash fragments, or paths containing `@`. Quickly copy, paste, modify, and navigate to coordinates with one click or keyboard shortcuts.

## ✨ What's New in v3.0.0

- **🏗️ Completely Refactored Architecture**: Modular design with separate components for better maintainability
- **🌍 Automatic Location Naming**: Slots 1-3 automatically get location names using OpenStreetMap geocoding
- **🎨 Enhanced UI**: Improved visual design with better animations and hover effects
- **📱 Better Responsiveness**: Smoother scrolling and more responsive interactions
- **🔧 Improved Error Handling**: Better error messages and graceful fallbacks
- **⚡ Performance Optimizations**: Faster loading and more efficient coordinate parsing
- **🌐 Extended URL Support**: Enhanced support for Mapbox Labs, API URLs, and more mapping services

---

## 🚀 Installation

1. Download or clone this repository (including `manifest.json`, `popup.html`, `ui.js`, `background.js`, `image.png`).  
2. Unzip (if applicable) and note the folder location.  
3. Open Chrome and navigate to `chrome://extensions/`.  
4. Enable **Developer mode** (toggle in the top‑right).  
5. Click **Load unpacked**, select the extension folder, and click **Open**.  
6. The Coordinate Extractor icon will appear in your toolbar — you’re ready to go!

---

## 🔍 Main Features

### 1️⃣ Automatic Coordinate Extraction  
- Parses the active tab's URL on open  
- Supports query parameters, hash fragments, and `/@lat,lon,zoom…` paths  
- Enhanced support for Mapbox Labs, API URLs, and Google Maps
- Displays extracted values in the Status Log or an error message if none found  

### 2️⃣ Copy to Clipboard  
Click **Copy to Clipboard** to copy coordinates in CLI format: `--lon --lat --zoom --pitch --bearing`

### 3️⃣ Paste from Clipboard  
Click **Paste Clipboard‑Coordinates** to populate fields from a CLI‑formatted string (e.g., `--lon 2.2768 --lat 48.85891 --zoom 13.75`).

### 4️⃣ Move to Coordinates  
Click **Move to Coordinates** to update the active tab's URL — the map will reposition if supported by the website.

### 5️⃣ Automatic Location Naming (NEW!)
- Slots 1-3 automatically get location names when coordinates are pasted
- Uses OpenStreetMap geocoding for accurate location identification
- Shows "Loading location..." while geocoding is in progress
- Displays location names with color-coded labels

---

## 📦 Slots System

Store up to **4 coordinate sets** (slots 0–3):

| Slot | Usage | Editable Label | Hotkey |
|:----:|:-----|:--------------:|:-------:|
| 0 | Default / extracted | ❌ | — |
| 1–3 | Custom saves | ✔️ | `Digit1`, `Digit2`, `Digit3` |

- Click a slot (or press its hotkey) to select.  
- Click the ✏️ icon (slots 1–3) to rename.  
- Use Copy / Paste / Move buttons on the selected slot.

---

## ⌨️ Hotkeys

| Shortcut | Action |
|----------|--------|
| Ctrl+Shift+F (Ctrl+Shift+F on Mac) | Open extension popup |
| C | Copy current coordinates |
| V | Paste from clipboard |
| G | Update URL with selected slot's coordinates |
| E | Edit selected slot's label |
| Q | Select slot 0 (default) |
| Digit1 / Digit2 / Digit3 | Select slot 1 / 2 / 3 |
| Backspace / Delete | Clear selected slot |

---

## 📚 Usage Examples

### Google Maps  
URL:  `https://www.google.com/maps/@48.85891,2.2768,13.75z`  
Extracted CLI:  `--lon 2.2768 --lat 48.85891 --zoom 13.75`

### Mapbox Labs  
URL:  `https://labs.mapbox.com/standard-style/#13.75/48.85891/2.2768/0/45`  
Extracted CLI:  `--lon 2.2768 --lat 48.85891 --zoom 13.75 --bearing 0 --pitch 45`

### Mapbox API  
URL:  `https://api.mapbox.com/styles/v1/mapbox-3dln/demo-3dln-style-eu.html#13.75/48.85891/2.2768/0/45`  
Extracted CLI:  `--lon 2.2768 --lat 48.85891 --zoom 13.75 --bearing 0 --pitch 45`

### Mapbox Sites  
URL:  `https://sites.mapbox.com/mbx-3dbuilding-tools-staging/#/model-slots/2022-10-10/map/?center=2.2768%2F48.85891%2F13.75`  
Extracted CLI:  `--lon 2.2768 --lat 48.85891 --zoom 13.75`

---

## 🏗️ Technical Details

### Architecture
- **Modular Design**: Separate components for parsing, UI, storage, and navigation
- **Event-Driven**: Clean separation of concerns with event managers
- **Error Handling**: Comprehensive error handling with graceful fallbacks
- **Performance**: Optimized for fast coordinate extraction and UI updates

### Supported Services
- Google Maps (all formats)
- Mapbox Labs
- Mapbox API
- Mapbox Sites
- OpenStreetMap-based services
- Custom coordinate formats

### Geocoding
- Uses OpenStreetMap Nominatim API for location naming
- Automatic fallback to Mapbox Geocoding API (if configured)
- Smart location name shortening for better display

---

## ⚠️ Errors & Fixes

| Error Message | Cause | Solution |
|--------------|-------|----------|
| Coordinates not found in URL | URL lacks valid coordinate data | Verify URL format contains lat/lon |
| Clipboard read error | Clipboard permissions denied | Allow clipboard access in Chrome settings |
| Unsupported URL structure | Extension can’t parse current URL | Try a supported mapping service |

---

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

Enjoy seamless coordinate extraction! 🎯