"use strict";

/**
 * @typedef {Object} CoordinateSlot
 * @property {number} lat - Latitude
 * @property {number} lon - Longitude
 * @property {number} zoom - Zoom level
 * @property {number} bearing - Bearing
 * @property {number} pitch - Pitch
 * @property {string} [name] - User-defined slot name
 * @property {string} [labelColor] - Label color
 * @property {boolean} [userNamed] - Flag that name was changed by user
 */

/**
 * Manager for Chrome local storage
 */
class StorageManager {
  
  static STORAGE_KEY = "recentCoordinates";
  static MAX_SLOTS = 4;

  /**
   * Get all coordinate slots from storage
   * @returns {Promise<CoordinateSlot[]>} Array of slots
   */
  static async getAllSlots() {
    try {
      const result = await chrome.storage.local.get({ [this.STORAGE_KEY]: [] });
      const slots = result[this.STORAGE_KEY] || [];
      
      // Ensure we have all 4 slots
      while (slots.length < this.MAX_SLOTS) {
        slots.push(null);
      }
      
      return slots;
    } catch (error) {
      console.error("Error getting slots from storage:", error);
      return new Array(this.MAX_SLOTS).fill(null);
    }
  }

  /**
   * Get specific slot by index
   * @param {number} slotIndex - Slot index (0-3)
   * @returns {Promise<CoordinateSlot|null>} Slot or null
   */
  static async getSlot(slotIndex) {
    if (slotIndex < 0 || slotIndex >= this.MAX_SLOTS) {
      throw new Error(`Invalid slot index: ${slotIndex}`);
    }
    
    const slots = await this.getAllSlots();
    return slots[slotIndex];
  }

  /**
   * Save coordinate slot
   * @param {number} slotIndex - Slot index (0-3)
   * @param {CoordinateSlot|null} slotData - Slot data or null for clearing
   * @returns {Promise<boolean>} Operation success
   */
  static async setSlot(slotIndex, slotData) {
    if (slotIndex < 0 || slotIndex >= this.MAX_SLOTS) {
      throw new Error(`Invalid slot index: ${slotIndex}`);
    }

    try {
      const slots = await this.getAllSlots();
      slots[slotIndex] = slotData;
      
      await chrome.storage.local.set({ [this.STORAGE_KEY]: slots });
      return true;
    } catch (error) {
      console.error("Error saving slot to storage:", error);
      return false;
    }
  }

  /**
   * Update coordinates in slot
   * @param {number} slotIndex - Slot index 
   * @param {Object} coordinates - New coordinates
   * @returns {Promise<boolean>} Operation success
   */
  static async updateSlotCoordinates(slotIndex, coordinates) {
    const currentSlot = await this.getSlot(slotIndex);
    const updatedSlot = currentSlot ? 
      { ...currentSlot, ...coordinates } : 
      { ...coordinates, name: "", labelColor: "" };
    
    return this.setSlot(slotIndex, updatedSlot);
  }

  /**
   * Update slot label
   * @param {number} slotIndex - Slot index
   * @param {string} name - New name
   * @param {string} [labelColor] - Label color
   * @returns {Promise<boolean>} Operation success
   */
  static async updateSlotLabel(slotIndex, name, labelColor = "") {
    if (slotIndex === 0) {
      console.warn("Cannot update label for slot 0 (auto-extracted)");
      return false;
    }

    const currentSlot = await this.getSlot(slotIndex);
    if (!currentSlot) {
      console.warn(`Cannot update label for empty slot ${slotIndex}`);
      return false;
    }

    const updatedSlot = { 
      ...currentSlot, 
      name: name.trim(),
      labelColor: labelColor || currentSlot.labelColor || ""
    };
    
    return this.setSlot(slotIndex, updatedSlot);
  }

  /**
   * Clear slot
   * @param {number} slotIndex - Slot index to clear
   * @returns {Promise<boolean>} Operation success
   */
  static async clearSlot(slotIndex) {
    return this.setSlot(slotIndex, null);
  }

  /**
   * Clear all slots
   * @returns {Promise<boolean>} Operation success
   */
  static async clearAllSlots() {
    try {
      await chrome.storage.local.set({ [this.STORAGE_KEY]: new Array(this.MAX_SLOTS).fill(null) });
      return true;
    } catch (error) {
      console.error("Error clearing all slots:", error);
      return false;
    }
  }

  /**
   * Create slot from CLI string
   * @param {string} cliString - CLI string with coordinates
   * @param {string} [name] - Slot name
   * @param {string} [labelColor] - Label color
   * @returns {CoordinateSlot|null} Created slot or null if parsing failed
   */
  static createSlotFromCli(cliString, name = "", labelColor = "") {
    if (!window.CoordinateParser) {
      console.error("CoordinateParser not available");
      return null;
    }

    const coordinates = window.CoordinateParser.parseFromCli(cliString);
    if (!coordinates) {
      return null;
    }

    return {
      ...coordinates,
      name: name.trim(),
      labelColor: labelColor
    };
  }

  /**
   * Format slot to CLI string
   * @param {CoordinateSlot} slot - Slot to format
   * @returns {string} CLI string
   */
  static formatSlotToCli(slot) {
    if (!slot || !window.CoordinateParser) {
      return "";
    }

    return window.CoordinateParser.formatToCli(slot);
  }

  /**
   * Get formatted slot text for display
   * @param {CoordinateSlot|null} slot - Slot
   * @param {number} slotIndex - Slot index
   * @returns {string} Formatted text
   */
  static getSlotDisplayText(slot, slotIndex) {
    if (!slot) {
      return `Coordinate slot ${slotIndex} ...`;
    }

    const cliStr = this.formatSlotToCli(slot);
    return slot.name ? `${slot.name} - ${cliStr}` : cliStr;
  }

  /**
   * Subscribe to storage changes
   * @param {function} callback - Callback called on changes
   */
  static onStorageChanged(callback) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes[this.STORAGE_KEY]) {
        callback(changes[this.STORAGE_KEY].newValue || []);
      }
    });
  }
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
} else {
  window.StorageManager = StorageManager;
}
