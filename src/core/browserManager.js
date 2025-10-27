"use strict";

/**
 * Manager for Chrome API and browser tabs
 */
class BrowserManager {
  
  /**
   * Get active tab URL
   * @returns {Promise<string|null>} Active tab URL or null
   */
  static async getActiveTabUrl() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      return tabs && tabs.length ? tabs[0].url : null;
    } catch (error) {
      console.error("Error getting active tab URL:", error);
      return null;
    }
  }

  /**
   * Update active tab URL with new coordinates
   * @param {Object} coords - Coordinates to insert
   * @returns {Promise<boolean>} Operation success
   */
  static async updateActiveTabWithCoordinates(coords) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs || !tabs.length) {
        console.error("No active tab for URL update.");
        return false;
      }

      const tab = tabs[0];
      const currentUrlStr = tab.url;
      if (!currentUrlStr) {
        console.error("Tab URL is undefined.");
        return false;
      }

      let currentUrl;
      try {
        currentUrl = new URL(currentUrlStr);
      } catch (e) {
        console.error("Invalid URL format: " + currentUrlStr, e);
        return false;
      }

      const updatedUrl = this._generateUpdatedUrl(currentUrl, currentUrlStr, coords);
      if (!updatedUrl) {
        console.error("URL structure not supported: " + currentUrlStr);
        return false;
      }

      console.log("Updated URL:", updatedUrl);
      await chrome.tabs.update(tab.id, { url: updatedUrl });
      return true;
    } catch (error) {
      console.error("Error updating tab URL:", error);
      return false;
    }
  }

  /**
   * Open extension in new tab
   * @returns {Promise<boolean>} Operation success  
   */
  static async openExtensionInTab() {
    try {
      const popupUrl = chrome.runtime.getURL("popup.html");
      
      // Check if extension tab is already open
      const tabs = await chrome.tabs.query({ url: popupUrl });
      
      if (tabs.length > 0) {
        // If tab already open, switch to it
        await chrome.tabs.update(tabs[0].id, { active: true });
        await chrome.windows.update(tabs[0].windowId, { focused: true });
      } else {
        // Open new extension tab
        await chrome.tabs.create({ 
          url: popupUrl,
          active: true 
        });
      }
      return true;
    } catch (error) {
      console.error("Error opening extension in tab:", error);
      return false;
    }
  }

  // Private methods for URL updating

  static _generateUpdatedUrl(currentUrl, currentUrlStr, coords) {
    const hostname = currentUrl.hostname;
    const mainPart = currentUrl.origin + currentUrl.pathname + (currentUrl.search || "");
    
    const rules = [
      this._createGoogleEarthRule(currentUrlStr, coords),
      this._createGoogleMapsRule(currentUrlStr, coords),
      this._createMapboxRule(currentUrl, mainPart, coords),
      this._createMapboxConsoleRule(currentUrlStr, coords),
      this._createHashMapRule(currentUrlStr, coords),
      this._createHashCenterRule(currentUrlStr, coords),
      this._createHashSlashRule(currentUrl, mainPart, coords),
      this._createSearchParamsRule(currentUrl, coords)
    ];

    for (const rule of rules) {
      if (rule.match(currentUrl)) {
        const updatedUrl = rule.transform(currentUrl);
        if (updatedUrl) return updatedUrl;
      }
    }

    return null;
  }

  static _createGoogleEarthRule(currentUrlStr, coords) {
    return {
      match: (url) => url.hostname.includes("earth.google.com") && url.pathname.includes("/@"),
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
    };
  }

  static _createGoogleMapsRule(currentUrlStr, coords) {
    return {
      match: (url) => url.hostname.includes("google.com") && url.pathname.includes("/@"),
      transform: (url) => {
        // Match the pattern /@lat,lon,zoom followed by optional parameters
        const match = currentUrlStr.match(/^(.+\/@)[^\/]+(.*)$/);
        if (match) {
          const prefix = match[1];
          const suffix = match[2];
          const newCoordinatesSegment = `${coords.lat},${coords.lon},${coords.zoom}z`;
          return prefix + newCoordinatesSegment + suffix;
        }
        return null;
      }
    };
  }

  static _createMapboxRule(currentUrl, mainPart, coords) {
    return {
      match: (url) => (url.hostname.includes("mapbox.com") || url.hostname.includes("api.mapbox.com")) && url.hash,
      transform: (url) => {
        const cleanHash = url.hash.replace(/^#\/?/, "");
        const segments = cleanHash.split("/");
        
        // Build hash based on available coordinates
        let hash = `#${coords.zoom}/${coords.lat}/${coords.lon}`;
        
        // Only add bearing and pitch if they exist in the original URL or are non-zero
        if (segments.length >= 4 || (coords.bearing && coords.bearing !== 0)) {
          hash += `/${coords.bearing || 0}`;
        }
        if (segments.length >= 5 || (coords.pitch && coords.pitch !== 0)) {
          hash += `/${coords.pitch || 0}`;
        }
        
        return mainPart + hash;
      }
    };
  }

  static _createMapboxConsoleRule(currentUrlStr, coords) {
    return {
      match: (url) => url.hostname.includes("console.mapbox.com") && currentUrlStr.includes('directions-debug'),
      transform: (url) => {
        // Format: #route=11.59,48.17;11.73,48.17;11.69,48.13&map=11.66,48.16,13.16z
        const newMapParam = `map=${coords.lon},${coords.lat},${coords.zoom}z`;
        
        // Replace the map parameter in the hash
        const updatedUrl = currentUrlStr.replace(/map=[^&]+/, newMapParam);
        
        return updatedUrl;
      }
    };
  }

  static _createHashMapRule(currentUrlStr, coords) {
    return {
      match: (url) => url.hash.includes("map="),
      transform: (url) => currentUrlStr.replace(/(map=)[^&]+/, `$1${coords.zoom}/${coords.lat}/${coords.lon}`)
    };
  }

  static _createHashCenterRule(currentUrlStr, coords) {
    return {
      match: (url) => url.hash.includes("center="),
      transform: (url) => currentUrlStr.replace(/(center=)[^&]+/, `$1${coords.lon}/${coords.lat}/${coords.zoom}`)
    };
  }

  static _createHashSlashRule(currentUrl, mainPart, coords) {
    return {
      match: (url) => {
        // Match universal hash format: #zoom/lat/lon or #zoom/lat/lon/bearing/pitch
        const hashPattern = /#\d+\.?\d*\/-?\d+\.?\d*\/-?\d+\.?\d*/;
        return url.hash && hashPattern.test(url.hash);
      },
      transform: (url) => {
        const cleanHash = url.hash.replace(/^#\/?/, "");
        const segments = cleanHash.split("/");
        
        // Build new hash
        let hash = `#${coords.zoom}/${coords.lat}/${coords.lon}`;
        
        // Preserve bearing and pitch if they existed in original URL
        if (segments.length >= 4 || (coords.bearing && coords.bearing !== 0)) {
          hash += `/${coords.bearing || 0}`;
        }
        if (segments.length >= 5 || (coords.pitch && coords.pitch !== 0)) {
          hash += `/${coords.pitch || 0}`;
        }
        
        return mainPart + hash;
      }
    };
  }

  static _createSearchParamsRule(currentUrl, coords) {
    return {
      match: (url) => url.searchParams.has("lat") || url.searchParams.has("lon"),
      transform: (url) => {
        url.searchParams.set("lat", String(coords.lat));
        url.searchParams.set("lon", String(coords.lon));
        if (coords.zoom) url.searchParams.set("zoom", String(coords.zoom));
        // Only add pitch and bearing if they exist and are non-zero
        if (coords.pitch && coords.pitch !== 0) url.searchParams.set("pitch", String(coords.pitch));
        if (coords.bearing && coords.bearing !== 0) url.searchParams.set("bearing", String(coords.bearing));
        return url.toString();
      }
    };
  }
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BrowserManager;
} else {
  window.BrowserManager = BrowserManager;
}
