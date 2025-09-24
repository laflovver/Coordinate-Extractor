"use strict";

/**
 * @typedef {Object} Coordinates
 * @property {number} lat - Широта
 * @property {number} lon - Долгота  
 * @property {number} zoom - Масштаб
 * @property {number} bearing - Направление
 * @property {number} pitch - Наклон
 * 
 * Version: 1.1 - Fixed hashQueryParams error
 */

/**
 * Парсер координат из различных URL форматов
 */
class CoordinateParser {
  
  /**
   * Извлекает координаты из URL
   * @param {string} url - URL для парсинга
   * @returns {Coordinates|null} Извлеченные координаты или null
   */
  static extractFromUrl(url) {
    try {
      const urlObj = new URL(url);
      
      // Array of extractors for different URL formats
      const extractors = [
        this._createMapboxExtractor(),
        this._createPathExtractor(),
        this._createHashQueryExtractor(),
        this._createHashExtractor(),
        this._createSearchParamsExtractor(urlObj)
      ];

      for (const extractor of extractors) {
        try {
          if (extractor.match(urlObj)) {
            const result = extractor.transform(urlObj);
            
            if (result && this._validateCoordinates(result)) {
              return result;
            }
          }
        } catch (extractorError) {
          console.error('Error in extractor', extractor.name || 'unnamed', ':', extractorError);
        }
      }
      
      return null;
    } catch (e) {
      console.error("Error parsing URL:", e);
      return null;
    }
  }

  /**
   * Парсит координаты из CLI строки
   * @param {string} cliString - Строка в формате --lon X --lat Y --zoom Z
   * @returns {Coordinates|null} Извлеченные координаты или null
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
   * Форматирует координаты в CLI строку
   * @param {Coordinates} coords - Координаты для форматирования
   * @returns {string} CLI строка
   */
  static formatToCli(coords) {
    if (!coords || typeof coords !== 'object') {
      return '';
    }

    const parts = [];
    
    if (typeof coords.lon === 'number') parts.push(`--lon ${coords.lon}`);
    if (typeof coords.lat === 'number') parts.push(`--lat ${coords.lat}`);
    if (typeof coords.zoom === 'number') parts.push(`--zoom ${coords.zoom}`);
    if (typeof coords.pitch === 'number') parts.push(`--pitch ${coords.pitch}`);
    if (typeof coords.bearing === 'number') parts.push(`--bearing ${coords.bearing}`);
    
    return parts.join(' ');
  }

  // Private methods for extractors

  static _createMapboxExtractor() {
    return {
      name: 'Mapbox',
      match: (u) => {
        // Check if it's a Mapbox URL
        const isMapbox = (u.hostname.includes('mapbox.com') || u.hostname.includes('sites.mapbox.com') || u.hostname.includes('labs.mapbox.com'));
        const hasCenterInHash = u.hash.includes('center=');
        const hasCenterInSearch = u.search.includes('center=');
        const hasQuery = u.hash.includes('?') || u.search.includes('?');
        const hasHashCoords = u.hash.match(/#[\d\.]+\/[\d\.]+\/[\d\.]+/); // Format: #zoom/lat/lon
        const hasStandardStyleCoords = u.hash.match(/#\d+\.?\d*\/\d+\.?\d*\/-?\d+\.?\d*\/\d+\.?\d*(?:\/\d+\.?\d*)?/); // Format: #zoom/lat/lon/bearing/pitch or #zoom/lat/lon/bearing
        
        return isMapbox && ((hasCenterInHash || hasCenterInSearch) && hasQuery || hasHashCoords || hasStandardStyleCoords);
      },
      transform: (u) => {
        // Check for standard style coordinates format: #zoom/lat/lon/bearing/pitch
        const standardStyleMatch = u.hash.match(/#(\d+\.?\d*)\/(\d+\.?\d*)\/(-?\d+\.?\d*)\/(\d+\.?\d*)\/(\d+\.?\d*)/);
        if (standardStyleMatch) {
          const zoom = parseFloat(standardStyleMatch[1]);
          const lat = parseFloat(standardStyleMatch[2]);
          const lon = parseFloat(standardStyleMatch[3]);
          const bearing = parseFloat(standardStyleMatch[4]);
          const pitch = parseFloat(standardStyleMatch[5]);
          
          return { lat, lon, zoom, bearing, pitch };
        }

        // Check for standard style coordinates format with 4 parameters: #zoom/lat/lon/bearing
        const standardStyleMatch4 = u.hash.match(/#(\d+\.?\d*)\/(\d+\.?\d*)\/(-?\d+\.?\d*)\/(\d+\.?\d*)/);
        if (standardStyleMatch4) {
          const zoom = parseFloat(standardStyleMatch4[1]);
          const lat = parseFloat(standardStyleMatch4[2]);
          const lon = parseFloat(standardStyleMatch4[3]);
          const bearing = parseFloat(standardStyleMatch4[4]);
          
          return { lat, lon, zoom, bearing };
        }

        // Check for hash coordinates format: #zoom/lat/lon/bearing/pitch
        const hashCoordsMatch = u.hash.match(/#([\d\.]+)\/([\d\.]+)\/([\d\.]+)(?:\/([\d\.]+))?(?:\/([\d\.]+))?/);
        if (hashCoordsMatch) {
          const zoom = parseFloat(hashCoordsMatch[1]);
          const lat = parseFloat(hashCoordsMatch[2]);
          const lon = parseFloat(hashCoordsMatch[3]);
          const bearing = hashCoordsMatch[4] ? parseFloat(hashCoordsMatch[4]) : 0;
          const pitch = hashCoordsMatch[5] ? parseFloat(hashCoordsMatch[5]) : 0;
          
          return { lat, lon, zoom, bearing, pitch };
        }
        
        // Try to get center parameter from hash first, then from search
        let centerValue = null;
        let queryParams = null;
        
        if (u.hash.includes('?')) {
          const hashQuery = u.hash.substring(u.hash.indexOf('?'));
          queryParams = new URLSearchParams(hashQuery);
          if (queryParams.has('center')) {
            centerValue = queryParams.get('center');
            console.log('Found center in hash:', centerValue);
            // URLSearchParams decodes %2F to /, so we need to split by /
            if (centerValue && centerValue.includes('/')) {
              centerValue = centerValue.replace(/\//g, '%2F');
              console.log('Converted / to %2F:', centerValue);
            }
          }
        }
        
        if (!centerValue && u.search.includes('center=')) {
          queryParams = new URLSearchParams(u.search);
          if (queryParams.has('center')) {
            centerValue = queryParams.get('center');
            console.log('Found center in search:', centerValue);
            // URLSearchParams decodes %2F to /, so we need to split by /
            if (centerValue && centerValue.includes('/')) {
              centerValue = centerValue.replace(/\//g, '%2F');
              console.log('Converted / to %2F:', centerValue);
            }
          }
        }
        
        if (centerValue) {
          
          // Split by %2F directly since URLSearchParams doesn't decode %2F
          let parts = centerValue.split('%2F');
          
          // Filter out empty parts and non-numeric parts
          parts = parts.filter(part => {
            const trimmed = part.trim();
            return trimmed !== '' && !isNaN(parseFloat(trimmed));
          });
          
          // If we don't have enough numeric parts, try a different approach
          if (parts.length < 3) {
            // Try to extract coordinates from the hash directly
            const hashMatch = u.hash.match(/center=([^&]+)/);
            if (hashMatch) {
              const centerParam = hashMatch[1];
              parts = centerParam.split('%2F');
              parts = parts.filter(part => {
                const trimmed = part.trim();
                return trimmed !== '' && !isNaN(parseFloat(trimmed));
              });
            }
          }
          
          // If we still don't have enough parts, try splitting the entire hash
          if (parts.length < 3) {
            const hashParts = u.hash.split('%2F');
            parts = hashParts.filter(part => {
              const trimmed = part.trim();
              return trimmed !== '' && !isNaN(parseFloat(trimmed));
            });
          }
          
          // If we still don't have enough parts, try a more aggressive approach
          if (parts.length < 3) {
            // Extract all numeric values from the hash
            const numericMatches = u.hash.match(/\d+\.?\d*/g);
            if (numericMatches && numericMatches.length >= 3) {
              parts = numericMatches.slice(0, 3);
            }
          }
          
          // If we still don't have enough parts, try extracting from the center parameter more carefully
          if (parts.length < 3) {
            const centerMatch = u.hash.match(/center=([^&]+)/);
            if (centerMatch) {
              const centerParam = centerMatch[1];
              // Try different splitting approaches
              const splitAttempts = [
                centerParam.split('%2F'),
                centerParam.split('/'),
                centerParam.split(/\D+/)
              ];
              
              for (const attempt of splitAttempts) {
                const filtered = attempt.filter(part => {
                  const trimmed = part.trim();
                  return trimmed !== '' && !isNaN(parseFloat(trimmed));
                });
                if (filtered.length >= 3) {
                  parts = filtered;
                  break;
                }
              }
            }
          }
          
          if (parts.length >= 3) {
            // Mapbox format: lon/lat/zoom (first value is longitude, second is latitude)
            // But in this URL format, it seems to be lat/lon/zoom, so we need to swap them
            const lat = parseFloat(parts[0]);
            const lon = parseFloat(parts[1]);
            const zoom = parseFloat(parts[2]);
            
            // Validate coordinates
            if (isNaN(lon) || isNaN(lat) || isNaN(zoom)) {
              return null;
            }
            
            // Additional parameters that might be present in center
            let bearing = 0, pitch = 0;
            if (parts.length >= 4) {
              bearing = parseFloat(parts[3]) || 0;
            }
            if (parts.length >= 5) {
              pitch = parseFloat(parts[4]) || 0;
            }
            
            // Check for additional parameters in URL
            let urlBearing = null;
            let urlPitch = null;
            
            if (queryParams) {
              urlBearing = queryParams.get('bearing');
              urlPitch = queryParams.get('pitch');
            }
            
            if (urlBearing) {
              bearing = parseFloat(urlBearing) || bearing;
            }
            if (urlPitch) {
              pitch = parseFloat(urlPitch) || pitch;
            }
            
            const result = {
              lat: lat,
              lon: lon,
              zoom: zoom,
              bearing: bearing,
              pitch: pitch
            };
            
            
            return result;
          }
        }
        
        return null;
      }
    };
  }

  static _createPathExtractor() {
    return {
      name: 'Path',
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
  }

  static _createSearchParamsExtractor(urlObj) {
    return {
      name: 'SearchParams',
      match: (u) => {
        const params = new URLSearchParams(u.search);
        const hashParams = new URLSearchParams(u.hash.replace("#", "?"));
        return !!(params.get("lat") || hashParams.get("lat")) && 
               !!(params.get("lon") || params.get("lng") || hashParams.get("lon") || hashParams.get("lng"));
      },
      transform: (u) => {
        const params = new URLSearchParams(u.search);
        const hashParams = new URLSearchParams(u.hash.replace("#", "?"));
        
        return {
          lat: parseFloat(params.get("lat") || hashParams.get("lat")),
          lon: parseFloat(params.get("lon") || params.get("lng") || hashParams.get("lon") || hashParams.get("lng")),
          zoom: parseFloat(params.get("zoom") || hashParams.get("zoom") || "0"),
          bearing: parseFloat(params.get("bearing") || hashParams.get("bearing") || "0"),
          pitch: parseFloat(params.get("pitch") || hashParams.get("pitch") || "0")
        };
      }
    };
  }

  static _createHashQueryExtractor() {
    return {
      name: 'HashQuery',
      match: (u) => {
        // Don't match Mapbox URLs - they should be handled by Mapbox extractor
        const isMapbox = (u.hostname.includes('mapbox.com') || u.hostname.includes('sites.mapbox.com'));
        if (isMapbox) {
          return false;
        }
        return u.hash.indexOf("?") !== -1;
      },
      transform: (u) => {
        const hashQuery = u.hash.substring(u.hash.indexOf("?"));
        const hashQueryParams = new URLSearchParams(hashQuery);
        
        if (hashQueryParams.has("center")) {
          const centerValue = hashQueryParams.get("center");
          // Split by %2F (URL-encoded forward slash) for Mapbox format
          const parts = centerValue.split("%2F");
          if (parts.length >= 3) {
            const bearing = parts.length >= 4 ? parseFloat(parts[3]) : 0;
            const pitch = parts.length >= 5 ? parseFloat(parts[4]) : 0;
            return {
              lon: parseFloat(parts[0]), // longitude first
              lat: parseFloat(parts[1]), // latitude second
              zoom: parseFloat(parts[2]), // zoom third
              bearing: bearing,
              pitch: pitch
            };
          }
        }
        
        if (hashQueryParams.has("map")) {
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
    };
  }

  static _createHashExtractor() {
    return {
      name: 'Hash',
      match: (u) => {
        // Don't match Mapbox URLs - they should be handled by Mapbox extractor
        const isMapbox = (u.hostname.includes('mapbox.com') || u.hostname.includes('sites.mapbox.com'));
        if (isMapbox) {
          return false;
        }
        return Boolean(u.hash);
      },
      transform: (u) => {
        const cleanHash = u.hash.replace(/^#\/?/, "");
        const segments = cleanHash.split("/");
        
        if (segments.length >= 3) {
          return {
            zoom: parseFloat(segments[0]),
            lat: parseFloat(segments[1]),
            lon: parseFloat(segments[2]),
            bearing: segments.length >= 4 ? parseFloat(segments[3]) : 0,
            pitch: segments.length >= 5 ? parseFloat(segments[4]) : 0
          };
        }
        
        return null;
      }
    };
  }

  static _validateCoordinates(coords) {
    return coords && 
           typeof coords.lat === 'number' && 
           typeof coords.lon === 'number' &&
           coords.lat >= -90 && coords.lat <= 90 &&
           coords.lon >= -180 && coords.lon <= 180;
  }

  static _normalizeCoordinates(coords) {
    return {
      lat: coords.lat || 0,
      lon: coords.lon || 0,
      zoom: coords.zoom || 0,
      bearing: coords.bearing || 0,
      pitch: coords.pitch || 0
    };
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
