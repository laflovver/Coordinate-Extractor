# 🧭 Coordinate Extractor

Coordinate Extractor is a lightweight Chrome extension that automatically extracts geographic coordinates (latitude, longitude, zoom, pitch, bearing) from URLs — whether they’re in query parameters, hash fragments, or paths containing `@`. Quickly copy, paste, modify, and navigate to coordinates with one click or keyboard shortcuts.

---

## 🚀 Installation

1. Download or clone this repository (including `manifest.json`, `popup.html`, `popup.js`, `background.js`, `image.png`).  
2. Unzip (if applicable) and note the folder location.  
3. Open Chrome and navigate to `chrome://extensions/`.  
4. Enable **Developer mode** (toggle in the top‑right).  
5. Click **Load unpacked**, select the extension folder, and click **Open**.  
6. The Coordinate Extractor icon will appear in your toolbar — you’re ready to go!

---

## 🔍 Main Features

### 1️⃣ Automatic Coordinate Extraction  
- Parses the active tab’s URL on open  
- Supports query parameters, hash fragments, and `/@lat,lon,zoom…` paths  
- Displays extracted values in the Status Log or an error message if none found  

### 2️⃣ Copy to Clipboard  
Click **Copy to Clipboard** to copy coordinates in CLI format:  –lon  –lat  –zoom  –pitch  –bearing 

### 3️⃣ Paste from Clipboard  
Click **Paste Clipboard‑Coordinates** to populate fields from a CLI‑formatted string (e.g., `--lon 2.2768 --lat 48.85891 --zoom 13.75`).

### 4️⃣ Move to Coordinates  
Click **Move to Coordinates** to update the active tab’s URL — the map will reposition if supported by the website.

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
| Ctrl+Shift+G (Cmd+Shift+G on Mac) | Open extension popup |
| C | Copy current coordinates |
| V | Paste from clipboard |
| G | Update URL with selected slot’s coordinates |
| E | Edit selected slot’s label |
| Digit1 / Digit2 / Digit3 | Select slot 1 / 2 / 3 |

---

## 📚 Usage Examples

### Google Maps  
URL:  https://www.google.com/maps/@48.85891,2.2768,13.75z
Extracted CLI:  –lon 2.2768 –lat 48.85891 –zoom 13.75

### Mapbox  
URL:  https://api.mapbox.com/…#13.75/48.85891/2.2768
Extracted CLI:  –lon 2.2768 –lat 48.85891 –zoom 13.75

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