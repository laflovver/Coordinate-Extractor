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

// Utility for creating coordinate objects without default values
function createCoordinateObject(lat, lon, zoom, bearing, pitch) {
  const coords = { lat, lon };
  if (zoom !== undefined && zoom !== null) coords.zoom = zoom;
  if (bearing !== undefined && bearing !== null) coords.bearing = bearing;
  if (pitch !== undefined && pitch !== null) coords.pitch = pitch;
  return coords;
}

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
    // Path extractor for URLs containing coordinates after "/@"
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
        const zoom = zoomMatch ? parseFloat(zoomMatch[1]) : undefined;
        let bearing, pitch;
        for (let i = 3; i < segments.length; i++) {
          if (segments[i].endsWith("h")) {
            bearing = parseFloat(segments[i].replace("h", ""));
          }
          if (segments[i].endsWith("t")) {
            pitch = parseFloat(segments[i].replace("t", ""));
          }
        }
        return createCoordinateObject(lat, lon, zoom, bearing, pitch);
      }
    };

    // Try to extract coordinates from URL parameters
    const params = new URLSearchParams(urlObj.search);
    const hashParams = new URLSearchParams(urlObj.hash.replace("#", "?"));
    let latStr = params.get("lat") || hashParams.get("lat");
    let lonStr = params.get("lon") || params.get("lng") || hashParams.get("lon") || hashParams.get("lng");
    let zoomStr = params.get("zoom") || hashParams.get("zoom");
    let pitchStr = params.get("pitch") || hashParams.get("pitch");
    let bearingStr = params.get("bearing") || hashParams.get("bearing");
    if (latStr && lonStr) {
      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);
      const zoom = zoomStr ? parseFloat(zoomStr) : undefined;
      const bearing = bearingStr ? parseFloat(bearingStr) : undefined;
      const pitch = pitchStr ? parseFloat(pitchStr) : undefined;
      return createCoordinateObject(lat, lon, zoom, bearing, pitch);
    }
    // Extended extractors for various mapping services
    const extractors = [
      // Google Maps and Google Earth
      pathExtractor,
      
      // OpenStreetMap
      {
        match: (u) => u.hostname.includes("openstreetmap.org"),
        transform: (u) => {
          // Format: #map=13/48.85891/2.2768
          if (u.hash && u.hash.includes("map=")) {
            const mapMatch = u.hash.match(/map=([0-9\.]+)\/([0-9\.\-]+)\/([0-9\.\-]+)/);
            if (mapMatch) {
              return createCoordinateObject(
                parseFloat(mapMatch[2]),
                parseFloat(mapMatch[3]),
                parseFloat(mapMatch[1])
              );
            }
          }
          // Format: ?mlat=48.85891&mlon=2.2768
          if (u.searchParams.has("mlat") && u.searchParams.has("mlon")) {
            const zoomFromHash = u.hash && u.hash.includes("map=") ? u.hash.match(/map=([0-9\.]+)/)?.[1] : undefined;
            const zoom = zoomFromHash ? parseFloat(zoomFromHash) : undefined;
            return createCoordinateObject(
              parseFloat(u.searchParams.get("mlat")),
              parseFloat(u.searchParams.get("mlon")),
              zoom
            );
          }
          return null;
        }
      },
      
      // Yandex Maps
      {
        match: (u) => u.hostname.includes("yandex.") && u.pathname.includes("maps"),
        transform: (u) => {
          // Format: ?ll=2.2768,48.85891&z=13 (note: lon,lat order!)
          if (u.searchParams.has("ll")) {
            const ll = u.searchParams.get("ll");
            const coords = ll.split(",");
            if (coords.length >= 2) {
              const zoomParam = u.searchParams.get("z");
              const zoom = zoomParam ? parseFloat(zoomParam) : undefined;
              return createCoordinateObject(
                parseFloat(coords[1]), // second element is lat
                parseFloat(coords[0]), // first element is lon
                zoom
              );
            }
          }
          return null;
        }
      },
      
      // Apple Maps
      {
        match: (u) => u.hostname.includes("maps.apple.com"),
        transform: (u) => {
          // Format: ?ll=48.85891,2.2768&z=13 (lat,lon order)
          if (u.searchParams.has("ll")) {
            const ll = u.searchParams.get("ll");
            const coords = ll.split(",");
            if (coords.length >= 2) {
              const zoomParam = u.searchParams.get("z");
              const zoom = zoomParam ? parseFloat(zoomParam) : undefined;
              return createCoordinateObject(
                parseFloat(coords[0]), // first element is lat
                parseFloat(coords[1]), // second element is lon
                zoom
              );
            }
          }
          return null;
        }
      },
      
      // Bing Maps
      {
        match: (u) => u.hostname.includes("bing.com") && u.pathname.includes("maps"),
        transform: (u) => {
          // Format: ?cp=48.85891~2.2768&lvl=13
          if (u.searchParams.has("cp")) {
            const cp = u.searchParams.get("cp");
            const coords = cp.split("~");
            if (coords.length >= 2) {
              const levelParam = u.searchParams.get("lvl");
              const zoom = levelParam ? parseFloat(levelParam) : undefined;
              return createCoordinateObject(
                parseFloat(coords[0]),
                parseFloat(coords[1]),
                zoom
              );
            }
          }
          return null;
        }
      },
      
      // Mapbox (specific rules)
      {
        match: (u) => u.hostname.includes("mapbox.com") || u.hostname.includes("api.mapbox.com"),
        transform: (u) => {
          // Format: #13.75/48.85891/2.2768 or #13.75/48.85891/2.2768/0/45
          if (u.hash) {
            const cleanHash = u.hash.replace(/^#\/?/, "");
            const segments = cleanHash.split("/");
            if (segments.length >= 3) {
              const bearing = segments.length >= 4 ? parseFloat(segments[3]) : undefined;
              const pitch = segments.length >= 5 ? parseFloat(segments[4]) : undefined;
              return createCoordinateObject(
                parseFloat(segments[1]),
                parseFloat(segments[2]),
                parseFloat(segments[0]),
                bearing,
                pitch
              );
            }
          }
          return null;
        }
      },
      
      // Here Maps
      {
        match: (u) => u.hostname.includes("here.com"),
        transform: (u) => {
          // Format: ?map=48.85891,2.2768,13,normal
          if (u.searchParams.has("map")) {
            const mapValue = u.searchParams.get("map");
            const parts = mapValue.split(",");
            if (parts.length >= 3) {
              return createCoordinateObject(
                parseFloat(parts[0]),
                parseFloat(parts[1]),
                parseFloat(parts[2])
              );
            }
          }
          return null;
        }
      },
      {
        match: (u) => u.hash.indexOf("?") !== -1,
        transform: (u) => {
          const hashQuery = u.hash.substring(u.hash.indexOf("?"));
          const hashQueryParams = new URLSearchParams(hashQuery);
          if (hashQueryParams.has("center")) {
            const parts = decodeURIComponent(hashQueryParams.get("center")).split("/");
            if (parts.length === 3) {
              return createCoordinateObject(
                parseFloat(parts[1]),
                parseFloat(parts[2]),
                parseFloat(parts[0])
              );
            }
          } else if (hashQueryParams.has("map")) {
            const parts = decodeURIComponent(hashQueryParams.get("map")).split("/");
            if (parts.length === 3) {
              return createCoordinateObject(
                parseFloat(parts[1]),
                parseFloat(parts[2]),
                parseFloat(parts[0])
              );
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
            return createCoordinateObject(
              parseFloat(segments[1]),
              parseFloat(segments[2]),
              parseFloat(segments[0])
            );
          }
          if (segments.length === 4) {
            return createCoordinateObject(
              parseFloat(segments[1]),
              parseFloat(segments[2]),
              parseFloat(segments[0]),
              parseFloat(segments[3])
            );
          }
          if (segments.length >= 5) {
            return createCoordinateObject(
              parseFloat(segments[1]),
              parseFloat(segments[2]),
              parseFloat(segments[0]),
              parseFloat(segments[3]),
              parseFloat(segments[4])
            );
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
  // Use new improved parser if available
  if (typeof window !== 'undefined' && window.CliParser) {
    return window.CliParser.parse(cliString);
  }
  
  // Fallback to original algorithm
  const parts = cliString.split(/\s+/);
  const result = {};
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith("--")) {
      const key = parts[i].substring(2);
      const value = parts[i + 1];
      if (value && !isNaN(parseFloat(value))) {
        result[key] = parseFloat(value);
      }
      i++;
    }
  }
  
  // Return only fields that are actually present
  if (!result.lon || !result.lat) {
    return null;
  }
  
  const coordinates = {
    lat: result.lat,
    lon: result.lon
  };
  
  // Add optional fields only if they exist
  if (typeof result.zoom === 'number') coordinates.zoom = result.zoom;
  if (typeof result.bearing === 'number') coordinates.bearing = result.bearing;
  if (typeof result.pitch === 'number') coordinates.pitch = result.pitch;
  
  return coordinates;
}

function displayCoordinates(coords) {
  // Format text with available fields only
  const parts = [`lat: ${coords.lat}`, `lon: ${coords.lon}`];
  if (coords.zoom !== undefined) parts.push(`zoom: ${coords.zoom}`);
  if (coords.bearing !== undefined) parts.push(`bearing: ${coords.bearing}`);
  if (coords.pitch !== undefined) parts.push(`pitch: ${coords.pitch}`);
  
  const coordText = parts.join(', ');
  const clipboardDataEl = document.getElementById("clipboard-data");
  if (clipboardDataEl) clipboardDataEl.textContent = coordText;
  
  // Format CLI string with available fields only
  const cliParts = [`--lon ${coords.lon}`, `--lat ${coords.lat}`];
  if (coords.zoom !== undefined) cliParts.push(`--zoom ${coords.zoom}`);
  if (coords.bearing !== undefined) cliParts.push(`--bearing ${coords.bearing}`);
  if (coords.pitch !== undefined) cliParts.push(`--pitch ${coords.pitch}`);
  
  const cliString = cliParts.join(' ');
  const cliOutputEl = document.getElementById("cli-output");
  if (cliOutputEl) cliOutputEl.value = cliString;
}