"use strict";

/**
 * @typedef {Object} Coordinates
 * @property {number} lat - Широта
 * @property {number} lon - Долгота  
 * @property {number} zoom - Масштаб
 * @property {number} bearing - Направление
 * @property {number} pitch - Наклон
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
        this._createPathExtractor(),
        this._createHashQueryExtractor(),
        this._createHashExtractor(),
        this._createSearchParamsExtractor(urlObj)
      ];

      for (const extractor of extractors) {
        if (extractor.match(urlObj)) {
          const result = extractor.transform(urlObj);
          if (result && this._validateCoordinates(result)) {
            return result;
          }
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

  static _createPathExtractor() {
    return {
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
      match: (u) => Boolean(u.hash),
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
