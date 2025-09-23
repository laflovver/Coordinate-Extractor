"use strict";

/**
 * @typedef {Object} Coords
 * @property {number} lat
 * @property {number} lon
 * @property {number} zoom
 * @property {number} bearing
 * @property {number} pitch
 */

/**
 * @typedef {Object} Logger
 * @property {(message?: any, ...optionalParams: any[]) => void} log
 * @property {(message?: any, ...optionalParams: any[]) => void} error
 */

const logger = {
  log: console.log.bind(console),
  error: console.error.bind(console)
};

function updateActiveTabUrlWithCoordinates(coords) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs.length) {
      logger.error("No active tab for URL update.");
      return;
    }
    const tab = tabs[0];
    const currentUrlStr = tab.url;
    if (!currentUrlStr) {
      logger.error("Tab URL is undefined.");
      return;
    }
    let currentUrl;
    try {
      currentUrl = new URL(currentUrlStr);
    } catch (e) {
      logger.error("Invalid URL format: " + currentUrlStr, e);
      alert("Invalid URL format.");
      return;
    }
    const hostname = currentUrl.hostname;
    const mainPart = currentUrl.origin + currentUrl.pathname + (currentUrl.search || "");
    const rules = [
      {
        match: (url) => hostname.includes("earth.google.com") && url.pathname.includes("/@"),
        transform: (url) => {
          const parts = currentUrlStr.split("/@");
          if (parts.length > 1) {
            const segments = parts[1].split(",");
            if (segments.length >= 2) {
              segments[0] = String(coords.lat);
              segments[1] = String(coords.lon);
              if (segments.length >= 3) {
                const seg2 = segments[2];
                const match = seg2.match(/^([0-9\.]+)([a-zA-Z]*)/);
                segments[2] = match ? String(coords.zoom) + (match[2] || "a") : String(coords.zoom) + "a";
              }
              return parts[0] + "/@" + segments.join(",");
            }
          }
          return null;
        }
      },
      {
        match: (url) => hostname.includes("google.com") && url.pathname.includes("/@"),
        transform: (url) => {
          const parts = currentUrlStr.split("/@");
          if (parts.length > 1) {
            const segments = parts[1].split("/");
            const newCoordinatesSegment = `${coords.lat},${coords.lon},${coords.zoom}z`;
            return parts[0] + "/@" + newCoordinatesSegment + "/" + segments.slice(1).join("/");
          }
          return null;
        }
      },
      {
        match: (url) =>
          (hostname.includes("mapbox.com") || hostname.includes("api.mapbox.com")) && url.hash,
        transform: (url) => {
          const cleanHash = url.hash.replace(/^#\/?/, "");
          const segments = cleanHash.split("/");
          if (segments.length === 3) {
            return mainPart + `#${coords.zoom}/${coords.lat}/${coords.lon}/0/0`;
          } else if (segments.length === 4) {
            return mainPart + `#${coords.zoom}/${coords.lat}/${coords.lon}/${coords.bearing}/0`;
          } else if (segments.length >= 5) {
            return mainPart + `#${coords.zoom}/${coords.lat}/${coords.lon}/${coords.bearing}/${coords.pitch}`;
          }
          return null;
        }
      },
      {
        match: (url) => url.hash.includes("map="),
        transform: (url) =>
          currentUrlStr.replace(/(map=)[^&]+/, `$1${coords.zoom}/${coords.lon}/${coords.lat}`)
      },
      {
        match: (url) => url.hash.includes("center="),
        transform: (url) =>
          currentUrlStr.replace(/(center=)[^&]+/, `$1${coords.zoom}/${coords.lon}/${coords.lat}`)
      },
      {
        match: (url) => url.searchParams.has("lat") || url.searchParams.has("lon"),
        transform: (url) => {
          url.searchParams.set("lat", String(coords.lat));
          url.searchParams.set("lon", String(coords.lon));
          url.searchParams.set("zoom", String(coords.zoom));
          url.searchParams.set("pitch", String(coords.pitch));
          url.searchParams.set("bearing", String(coords.bearing));
          return url.toString();
        }
      }
    ];
    let updatedUrl = null;
    for (const rule of rules) {
      if (rule.match(currentUrl)) {
        updatedUrl = rule.transform(currentUrl);
        if (updatedUrl) break;
      }
    }
    if (!updatedUrl) {
      alert("This site's URL structure is not supported for automatic coordinate substitution.");
      logger.error("URL structure not supported: " + currentUrlStr);
      return;
    }
    logger.log("Updated URL:", updatedUrl);
    chrome.tabs.update(tab.id, { url: updatedUrl });
  });
}

function extractCoordinates(url) {
  try {
    const urlObj = new URL(url);
    // Новый экстрактор для URL, содержащих координаты в пути после "/@"
    const pathExtractor = {
      match: (u) => u.pathname.includes("/@"),
      transform: (u) => {
        const parts = u.pathname.split("/@");
        if (parts.length < 2) return null;
        const coordsPart = parts[1].split("/")[0];
        const segments = coordsPart.split(",");
        if (segments.length < 3) return null;
        const lat = parseFloat(segments[0]);
        const lon = parseFloat(segments[1]);
        const zoomMatch = segments[2].match(/^([0-9\.]+)/);
        const zoom = zoomMatch ? parseFloat(zoomMatch[1]) : 0;
        let bearing = 0, pitch = 0;
        for (let i = 3; i < segments.length; i++) {
          if (segments[i].endsWith("h")) {
            bearing = parseFloat(segments[i].replace("h", ""));
          }
          if (segments[i].endsWith("t")) {
            pitch = parseFloat(segments[i].replace("t", ""));
          }
        }
        return { lat, lon, zoom, bearing, pitch };
      }
    };

    // Попытка извлечь координаты из параметров URL
    const params = new URLSearchParams(urlObj.search);
    const hashParams = new URLSearchParams(urlObj.hash.replace("#", "?"));
    let latStr = params.get("lat") || hashParams.get("lat");
    let lonStr = params.get("lon") || params.get("lng") || hashParams.get("lon") || hashParams.get("lng");
    let zoomStr = params.get("zoom") || hashParams.get("zoom");
    let pitchStr = params.get("pitch") || hashParams.get("pitch");
    let bearingStr = params.get("bearing") || hashParams.get("bearing");
    if (latStr && lonStr) {
      return {
        zoom: parseFloat(zoomStr || "0"),
        lat: parseFloat(latStr),
        lon: parseFloat(lonStr),
        bearing: parseFloat(bearingStr || "0"),
        pitch: parseFloat(pitchStr || "0")
      };
    }
    // Массив экстракторов (новый экстрактор добавлен первым)
    const extractors = [
      pathExtractor,
      {
        match: (u) => u.hash.indexOf("?") !== -1,
        transform: (u) => {
          const hashQuery = u.hash.substring(u.hash.indexOf("?"));
          const hashQueryParams = new URLSearchParams(hashQuery);
          if (hashQueryParams.has("center")) {
            const parts = decodeURIComponent(hashQueryParams.get("center")).split("/");
            if (parts.length === 3) {
              return {
                zoom: parseFloat(parts[0]),
                lat: parseFloat(parts[1]),
                lon: parseFloat(parts[2]),
                bearing: 0,
                pitch: 0
              };
            }
          } else if (hashQueryParams.has("map")) {
            const parts = decodeURIComponent(hashQueryParams.get("map")).split("/");
            if (parts.length === 3) {
              return {
                zoom: parseFloat(parts[0]),
                lat: parseFloat(parts[1]),
                lon: parseFloat(parts[2]),
                bearing: 0,
                pitch: 0
              };
            }
          }
          return null;
        }
      },
      {
        match: (u) => Boolean(u.hash),
        transform: (u) => {
          const cleanHash = u.hash.replace(/^#\/?/, "");
          const segments = cleanHash.split("/");
          if (segments.length === 3) {
            return {
              zoom: parseFloat(segments[0]),
              lat: parseFloat(segments[1]),
              lon: parseFloat(segments[2]),
              bearing: 0,
              pitch: 0
            };
          }
          if (segments.length === 4) {
            return {
              zoom: parseFloat(segments[0]),
              lat: parseFloat(segments[1]),
              lon: parseFloat(segments[2]),
              bearing: parseFloat(segments[3]),
              pitch: 0
            };
          }
          if (segments.length >= 5) {
            return {
              zoom: parseFloat(segments[0]),
              lat: parseFloat(segments[1]),
              lon: parseFloat(segments[2]),
              bearing: parseFloat(segments[3]),
              pitch: parseFloat(segments[4])
            };
          }
          return null;
        }
      }
    ];
    for (const extractor of extractors) {
      if (extractor.match(urlObj)) {
        const result = extractor.transform(urlObj);
        if (result) return result;
      }
    }
    return null;
  } catch (e) {
    logger.error("Error parsing URL:", e);
    return null;
  }
}

function parseCliString(cliString) {
  const parts = cliString.split(/\s+/);
  const result = {};
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith("--")) {
      const key = parts[i].substring(2);
      const value = parts[i + 1];
      result[key] = value;
      i++;
    }
  }
  return result.lon && result.lat ? result : null;
}

function displayCoordinates(coords) {
  const coordText = `lat: ${coords.lat}, lon: ${coords.lon}, zoom: ${coords.zoom}, bearing: ${coords.bearing}, pitch: ${coords.pitch}`;
  const clipboardDataEl = document.getElementById("clipboard-data");
  if (clipboardDataEl) clipboardDataEl.textContent = coordText;
  const cliString = `--lon ${coords.lon} --lat ${coords.lat} --zoom ${coords.zoom} --bearing ${coords.bearing} --pitch ${coords.pitch}`;
  const cliOutputEl = document.getElementById("cli-output");
  if (cliOutputEl) cliOutputEl.value = cliString;
}