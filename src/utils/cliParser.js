"use strict";

/**
 * Modern CLI string parser
 * Improved version of parseCliString with better validation and error handling
 */
class CliParser {
  
  /**
   * Parse CLI string to coordinates object
   * @param {string} cliString - CLI string in format "--lon X --lat Y --zoom Z"
   * @returns {Object|null} Coordinates object or null
   */
  static parse(cliString) {
    if (!cliString || typeof cliString !== 'string') {
      return null;
    }

    const parts = cliString.trim().split(/\s+/);
    const result = {};
    
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].startsWith("--")) {
        const key = parts[i].substring(2);
        const value = parts[i + 1];
        
        if (value && !value.startsWith("--")) {
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            result[key] = numValue;
          }
          i++; // Skip the value in the next iteration
        }
      }
    }
    
        // Validate required fields
    if (!result.lon || !result.lat) {
      return null;
    }
    
        // Return only the fields that are actually present
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

  /**
   * Format coordinates object to CLI string
   * @param {Object} coords - Coordinates object
   * @returns {string} CLI string
   */
  static format(coords) {
    if (!coords || typeof coords !== 'object') {
      return '';
    }

    const parts = [];
    
    if (typeof coords.lon === 'number') parts.push(`--lon ${coords.lon}`);
    if (typeof coords.lat === 'number') parts.push(`--lat ${coords.lat}`);
    if (typeof coords.zoom === 'number') parts.push(`--zoom ${coords.zoom}`);
    if (typeof coords.bearing === 'number') parts.push(`--bearing ${coords.bearing}`);
    if (typeof coords.pitch === 'number') parts.push(`--pitch ${coords.pitch}`);
    
    return parts.join(' ');
  }

  /**
   * Check CLI string validity
   * @param {string} cliString - CLI string to check
   * @returns {boolean} true if string is valid
   */
  static validate(cliString) {
    const parsed = this.parse(cliString);
    return parsed !== null && 
           typeof parsed.lat === 'number' && 
           typeof parsed.lon === 'number' &&
           parsed.lat >= -90 && parsed.lat <= 90 &&
           parsed.lon >= -180 && parsed.lon <= 180;
  }
}

// Export for compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CliParser;
} else {
  window.CliParser = CliParser;
}
