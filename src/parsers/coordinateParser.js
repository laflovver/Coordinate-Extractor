"use strict";

/**
 * @typedef {Object} Coordinates
 * @property {number} lat - Latitude
 * @property {number} lon - Longitude  
 * @property {number} zoom - Zoom level
 * @property {number} bearing - Bearing (optional)
 * @property {number} pitch - Pitch (optional)
 * 
 * Version: 2.1 - Simplified universal parser
 */

/**
 * Precompiled regular expressions for better performance
 */
const REGEX_PATTERNS = {
  // Path format: /@lat,lon,zoom
  pathFormat: /@(-?\d+\.?\d*),(-?\d+\.?\d*),(\d+\.?\d*)([a-z])?/,
  
  // Hash formats
  hashMapFormat: /#map=(\d+\.?\d*)\/(-?\d+\.?\d*)\/(-?\d+\.?\d*)/,  // #map=zoom/lat/lon
  hashSlashFormat: /#(\d+\.?\d*)\/(-?\d+\.?\d*)\/(-?\d+\.?\d*)(?:\/(-?\d+\.?\d*))?(?:\/(-?\d+\.?\d*))?/,  // #zoom/lat/lon or #zoom/lat/lon/bearing/pitch
  
  // Query parameters
  latLonParams: /[?&#](?:lat|latitude)=(-?\d+\.?\d*)[&]?.*?(?:lon|lng|longitude)=(-?\d+\.?\d*)/i,
  lonLatParams: /[?&#](?:lon|lng|longitude)=(-?\d+\.?\d*)[&]?.*?(?:lat|latitude)=(-?\d+\.?\d*)/i,
  
  // Center parameter (Mapbox style)
  centerParam: /center=([^&]+)/,
  
  // Special formats
  llParam: /[?&]ll=(-?\d+\.?\d*)[,~%2C](-?\d+\.?\d*)/i,  // ll=lon,lat or ll=lon~lat
  cpParam: /[?&]cp=(-?\d+\.?\d*)[~%7E](-?\d+\.?\d*)/i,   // cp=lat~lon (Bing)
  
  // Mapbox Console Directions Debug: map=lon,lat,zoom
  mapboxConsoleMap: /[&#]map=(-?\d+\.?\d*),(-?\d+\.?\d*),([\d\.]+)([z]?)/,
  
  // Mapbox Console Directions Debug: route=lon1,lat1;lon2,lat2;...
  mapboxConsoleRoute: /[&#]route=([^&]+)/,
  
  // Satellites.pro format: #lat,lon,zoom
  satellitesProFormat: /#(\d+\.?\d*),(\d+\.?\d*),(\d+)/,
  
  // Mapillary format: ?lat=X&lng=Y&z=Z
  mapillaryFormat: /[?&]lat=(-?\d+\.?\d*)[&]?.*?[?&]lng=(-?\d+\.?\d*)/i,
  
  // Planet.com format: /mosaic/MOSAIC_NAME/center/lon/lat/zoom
  planetFormat: /\/mosaic\/[^\/]+\/center\/(-?\d+\.?\d*)\/(-?\d+\.?\d*)\/(\d+)/,
  
  // Zoom parameter
  zoomParam: /[?&](?:z|zoom|lvl)=(\d+)/i,
};

/**
 * Main Coordinate Parser class
 */
class CoordinateParser {
  
  /**
   * Extract coordinates from URL
   * @param {string} url - URL to parse
   * @returns {Coordinates|null} Extracted coordinates or null
   */
  static extractFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const fullUrl = urlObj.href;
      
      // Try different extraction methods in order
      let coords = null;
      
      // 1. Try path format (/@lat,lon,zoom)
      coords = this._extractFromPath(fullUrl);
      if (coords && this._validateCoordinates(coords)) {
        return this._normalizeCoordinates(coords);
      }
      
      // 1.5. Try Planet.com format
      coords = this._extractFromPlanet(fullUrl);
      if (coords && this._validateCoordinates(coords)) {
        return this._normalizeCoordinates(coords);
      }
      
      // 2. Try hash formats
      coords = this._extractFromHash(urlObj);
      if (coords && this._validateCoordinates(coords)) {
        return this._normalizeCoordinates(coords);
      }
      
      // 3. Try query parameters
      coords = this._extractFromQueryParams(urlObj);
      if (coords && this._validateCoordinates(coords)) {
        return this._normalizeCoordinates(coords);
      }
      
      // 4. Try special formats (ll, cp, center)
      coords = this._extractFromSpecialParams(urlObj, fullUrl);
      if (coords && this._validateCoordinates(coords)) {
        return this._normalizeCoordinates(coords);
      }
      
      return null;
    } catch (e) {
      console.error("Error parsing URL:", e);
      return null;
    }
  }
  
  /**
   * Extract from path format (/@lat,lon,zoom)
   */
  static _extractFromPath(url) {
    const match = url.match(REGEX_PATTERNS.pathFormat);
    if (!match) return null;
    
    return {
      lat: parseFloat(match[1]),
      lon: parseFloat(match[2]),
      zoom: parseFloat(match[3]),
      bearing: 0,
      pitch: 0
    };
  }
  
  /**
   * Extract from Planet.com format
   */
  static _extractFromPlanet(url) {
    const match = url.match(REGEX_PATTERNS.planetFormat);
    if (!match) return null;
    
    return {
      lon: parseFloat(match[1]),
      lat: parseFloat(match[2]),
      zoom: parseFloat(match[3])
    };
  }
  
  /**
   * Extract from hash formats
   */
  static _extractFromHash(urlObj) {
    const hash = urlObj.hash;
    if (!hash) return null;
    
    // Try #map=zoom/lat/lon
    let match = hash.match(REGEX_PATTERNS.hashMapFormat);
    if (match) {
      return {
        zoom: parseFloat(match[1]),
        lat: parseFloat(match[2]),
        lon: parseFloat(match[3]),
        bearing: 0,
        pitch: 0
      };
    }
    
    // Try #zoom/lat/lon or #zoom/lat/lon/bearing/pitch
    match = hash.match(REGEX_PATTERNS.hashSlashFormat);
    if (match) {
      const result = {
        zoom: parseFloat(match[1]),
        lat: parseFloat(match[2]),
        lon: parseFloat(match[3])
      };
      
      if (match[4]) result.bearing = parseFloat(match[4]);
      if (match[5]) result.pitch = parseFloat(match[5]);
      
      return result;
    }
    
    // Try center parameter in hash
    if (hash.includes('center=')) {
      match = hash.match(REGEX_PATTERNS.centerParam);
      if (match) {
        const centerValue = match[1];
        const parts = centerValue.split(/%2F|\//).filter(p => {
          const trimmed = p.trim();
          return trimmed !== '' && !isNaN(parseFloat(trimmed));
        });
        
        if (parts.length >= 3) {
          // Mapbox format: lon/lat/zoom
          return {
            lon: parseFloat(parts[0]),
            lat: parseFloat(parts[1]),
            zoom: parseFloat(parts[2]),
            bearing: parts[3] ? parseFloat(parts[3]) : 0,
            pitch: parts[4] ? parseFloat(parts[4]) : 0
          };
        }
      }
    }
    
    return null;
  }
  
  /**
   * Extract from query parameters
   */
  static _extractFromQueryParams(urlObj) {
    const url = urlObj.href;
    
    // Try lat/lon parameters
    let match = url.match(REGEX_PATTERNS.latLonParams);
    if (match) {
      const result = {
        lat: parseFloat(match[1]),
        lon: parseFloat(match[2])
      };
      
      const zoomMatch = url.match(REGEX_PATTERNS.zoomParam);
      result.zoom = zoomMatch ? parseFloat(zoomMatch[1]) : 15;
      
      return result;
    }
    
    // Try lon/lat order
    match = url.match(REGEX_PATTERNS.lonLatParams);
    if (match) {
      const result = {
        lon: parseFloat(match[1]),
        lat: parseFloat(match[2])
      };
      
      const zoomMatch = url.match(REGEX_PATTERNS.zoomParam);
      result.zoom = zoomMatch ? parseFloat(zoomMatch[1]) : 15;
      
      return result;
    }
    
    return null;
  }
  
  /**
   * Extract from special parameter formats
   */
  static _extractFromSpecialParams(urlObj, fullUrl) {
    // Try Mapbox Console Directions Debug: calculate average point from route
    let match = fullUrl.match(REGEX_PATTERNS.mapboxConsoleRoute);
    if (match) {
      const routeValue = match[1];
      const points = routeValue.split(';');
      
      // Parse all points and calculate average
      const coords = points.map(point => {
        const parts = point.split(',');
        if (parts.length >= 2) {
          return {
            lon: parseFloat(parts[0]),
            lat: parseFloat(parts[1])
          };
        }
        return null;
      }).filter(c => c !== null);
      
      if (coords.length > 0) {
        // Calculate average coordinates
        const avgLon = coords.reduce((sum, c) => sum + c.lon, 0) / coords.length;
        const avgLat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
        
        // Try to get zoom from map parameter
        let zoom = 15; // default
        const mapMatch = fullUrl.match(REGEX_PATTERNS.mapboxConsoleMap);
        if (mapMatch) {
          zoom = parseFloat(mapMatch[3]);
        }
        
        return {
          lon: avgLon,
          lat: avgLat,
          zoom: zoom
        };
      }
    }
    
    // Try Mapbox Console Directions Debug format: map=lon,lat,zoom (fallback)
    match = fullUrl.match(REGEX_PATTERNS.mapboxConsoleMap);
    if (match) {
      return {
        lon: parseFloat(match[1]),
        lat: parseFloat(match[2]),
        zoom: parseFloat(match[3])
      };
    }
    
    // Try ll parameter (ll=lon,lat or ll=lon~lat)
    match = fullUrl.match(REGEX_PATTERNS.llParam);
    if (match) {
      const result = {
        lon: parseFloat(match[1]),
        lat: parseFloat(match[2])
      };
      
      const zoomMatch = fullUrl.match(REGEX_PATTERNS.zoomParam);
      result.zoom = zoomMatch ? parseFloat(zoomMatch[1]) : 15;
      
      return result;
    }
    
    // Try cp parameter (cp=lat~lon)
    match = fullUrl.match(REGEX_PATTERNS.cpParam);
    if (match) {
      const result = {
        lat: parseFloat(match[1]),
        lon: parseFloat(match[2])
      };
      
      const zoomMatch = fullUrl.match(REGEX_PATTERNS.zoomParam);
      result.zoom = zoomMatch ? parseFloat(zoomMatch[1]) : 15;
      
      return result;
    }
    
    // Try Satellites.pro format (#lat,lon,zoom)
    match = fullUrl.match(REGEX_PATTERNS.satellitesProFormat);
    if (match) {
      return {
        lat: parseFloat(match[1]),
        lon: parseFloat(match[2]),
        zoom: parseFloat(match[3])
      };
    }
    
    // Try Mapillary format (?lat=X&lng=Y&z=Z)
    match = fullUrl.match(REGEX_PATTERNS.mapillaryFormat);
    if (match) {
      const result = {
        lat: parseFloat(match[1]),
        lon: parseFloat(match[2])
      };
      
      const zoomMatch = fullUrl.match(REGEX_PATTERNS.zoomParam);
      result.zoom = zoomMatch ? parseFloat(zoomMatch[1]) : 15;
      
      return result;
    }
    
    // Try center parameter in query
    if (fullUrl.includes('center=')) {
      match = fullUrl.match(REGEX_PATTERNS.centerParam);
      if (match) {
        const centerValue = match[1];
        const parts = centerValue.split(/[,/]/).filter(p => {
          const trimmed = p.trim();
          return trimmed !== '' && !isNaN(parseFloat(trimmed));
        });
        
        if (parts.length >= 2) {
          return {
            lon: parseFloat(parts[0]),
            lat: parseFloat(parts[1]),
            zoom: parts[2] ? parseFloat(parts[2]) : 15
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Parse coordinates from CLI string
   * @param {string} cliString - String in format --lon X --lat Y --zoom Z
   * @returns {Coordinates|null} Extracted coordinates or null
   */
  static parseFromCli(cliString) {
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
    
    return (result.lon && result.lat) ? this._normalizeCoordinates(result) : null;
  }

  /**
   * Format coordinates to CLI string
   * @param {Coordinates} coords - Coordinates to format
   * @returns {string} CLI string
   */
  static formatToCli(coords) {
    if (!coords || typeof coords !== 'object') {
      return '';
    }

    const parts = [];
    
    if (typeof coords.lon === 'number') parts.push(`--lon ${coords.lon}`);
    if (typeof coords.lat === 'number') parts.push(`--lat ${coords.lat}`);
    if (typeof coords.zoom === 'number') parts.push(`--zoom ${coords.zoom}`);
    // Only add pitch and bearing if they are non-zero
    if (typeof coords.pitch === 'number' && coords.pitch !== 0) parts.push(`--pitch ${coords.pitch}`);
    if (typeof coords.bearing === 'number' && coords.bearing !== 0) parts.push(`--bearing ${coords.bearing}`);
    
    return parts.join(' ');
  }

  /**
   * Validate coordinates
   */
  static _validateCoordinates(coords) {
    return coords && 
           typeof coords.lat === 'number' && 
           typeof coords.lon === 'number' &&
           coords.lat >= -90 && coords.lat <= 90 &&
           coords.lon >= -180 && coords.lon <= 180 &&
           !isNaN(coords.lat) && !isNaN(coords.lon);
  }

  /**
   * Normalize coordinates (ensure all fields are present)
   */
  static _normalizeCoordinates(coords) {
    const normalized = {
      lat: coords.lat || 0,
      lon: coords.lon || 0,
      zoom: coords.zoom || 0
    };
    
    // Only add bearing and pitch if they exist and are non-zero
    if (coords.bearing && coords.bearing !== 0) {
      normalized.bearing = coords.bearing;
    }
    if (coords.pitch && coords.pitch !== 0) {
      normalized.pitch = coords.pitch;
    }
    
    return normalized;
  }
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CoordinateParser;
} else {
  window.CoordinateParser = CoordinateParser;
}

// Also make it available globally for popup
if (typeof window !== 'undefined') {
  window.CoordinateParser = CoordinateParser;
}
