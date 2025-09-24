"use strict";

/**
 * User interface components
 */
class UIComponents {
  
  /**
   * Color and animation utilities
   */
  static Utils = class {
    
    /**
     * Generate random readable color
     * @returns {string} RGB color
     */
    static getRandomReadableColor() {
      const r = Math.floor(Math.random() * 128);
      const g = Math.floor(Math.random() * 128);
      const b = Math.floor(Math.random() * 128);
      return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Animate button press
     * @param {HTMLElement} btn - Button element
     */
    static animateButton(btn) {
      if (!btn) return;
      btn.classList.add("key-animation", "stripe");
      setTimeout(() => btn.classList.remove("key-animation", "stripe"), 600);
    }

    /**
     * Smooth scroll to line alignment
     * @param {HTMLElement} el - Element to scroll
     */
    static snapScroll(el) {
      const computedStyle = window.getComputedStyle(el);
      let lineHeight = parseFloat(computedStyle.lineHeight);
      if (isNaN(lineHeight)) {
        lineHeight = 21;
      }
      const twoLines = lineHeight * 2;
      const remainder = el.scrollTop % twoLines;
      const adjustment = remainder < twoLines / 2 ? -remainder : twoLines - remainder;
      el.scrollTo({ top: el.scrollTop + adjustment, behavior: "smooth" });
    }
  };

  /**
   * Logging component
   */
  static Logger = class {
    
    static _logContainer = null;
    static _lastMessages = [];
    
    /**
     * Logger initialization
     */
    static init() {
      this._logContainer = document.getElementById("log-output");
    }

    /**
     * Add message to log
     * @param {string} msg - Message
     * @param {string} type - Message type: "info", "error", "success"  
     */
    static log(msg, type = "info") {
      if (!this._logContainer) return;
      
      // Check for duplicate messages in the last 3 entries
      const recentMessages = this._lastMessages.slice(-3);
      const isDuplicate = recentMessages.some(entry => 
        entry.msg === msg && entry.type === type
      );
      
      if (isDuplicate) {
        return; // Skip duplicate message
      }
      
      // Store message for duplicate checking
      this._lastMessages.push({ msg, type });
      if (this._lastMessages.length > 10) {
        this._lastMessages = this._lastMessages.slice(-10);
      }
      
      const span = document.createElement("span");
      span.className = `log-message log-${type}`;
      span.textContent = msg.replace(/\n/g, " ") + " ";
      
      this._logContainer.appendChild(span);
      this._logContainer.scrollTop = this._logContainer.scrollHeight;
    }
  };

  /**
   * Component for coordinate slots
   */
  static SlotRenderer = class {
    
    /**
     * Render slot content
     * @param {HTMLElement} element - Slot element
     * @param {string} text - Text to display  
     * @param {string} [storedLabelColor] - Stored label color
     */
    static renderContent(element, text, storedLabelColor = "") {
      if (!element) return;
      
      let label = "";
      let coords = text;
      
      if (text.indexOf(" - ") !== -1) {
        const parts = text.split(" - ");
        label = parts[0].trim();
        coords = parts.slice(1).join(" - ").trim();
      }
      
      const labelColor = storedLabelColor || "";
      
      // Clear content
      element.innerHTML = "";
      
      if (label) {
        // Remove existing "..." from label if it exists
        const cleanLabel = label.replace(/^\.\.\.\s*/, '');
        
        // Add visual indicator before label
        const indicatorSpan = document.createElement("span");
        indicatorSpan.className = "slot-indicator";
        indicatorSpan.textContent = "...";
        element.appendChild(indicatorSpan);
        
        const labelSpan = document.createElement("span");
        labelSpan.className = "slot-label";
        labelSpan.textContent = cleanLabel;
        if (labelColor) {
          labelSpan.style.color = labelColor;
        }
        element.appendChild(labelSpan);
        
        // Don't show coordinates when there's a label - they will be shown on hover
        // The coordinates are stored in data attribute for later use
        element.dataset.coordinates = coords;
      } else {
        // Add normal coordinates when there's no label
        const coordsSpan = document.createElement("span");
        coordsSpan.className = "slot-coords";
        coordsSpan.textContent = coords;
        element.appendChild(coordsSpan);
      }
      
      // Add hidden coordinates that appear on hover
      const hiddenCoordsSpan = document.createElement("span");
      hiddenCoordsSpan.className = "slot-coords-hidden";
      hiddenCoordsSpan.textContent = coords;
      element.appendChild(hiddenCoordsSpan);
      
      // Add hover event to scroll to end of coordinates (like cli-output)
      const slotItem = element.closest('.saved-slot-item');
      if (slotItem) {
        slotItem.addEventListener('mouseenter', () => {
          // Simple scroll to end like cli-output
          hiddenCoordsSpan.scrollLeft = hiddenCoordsSpan.scrollWidth;
        });
      }
      
      element.scrollTop = 0;
    }

    /**
     * Update active slot indicator
     */
    static updateActiveIndicator() {
      const indicator = document.getElementById("slot-indicator");
      const activeSlot = document.querySelector(".saved-slot-item.selected-saved");
      
      if (indicator && activeSlot) {
        indicator.style.position = "absolute";
        indicator.style.top = activeSlot.offsetTop + "px";
        indicator.style.left = activeSlot.offsetLeft + "px";
        indicator.style.width = activeSlot.offsetWidth + "px";
        indicator.style.height = activeSlot.offsetHeight + "px";
        indicator.style.pointerEvents = "none";
      }
    }

    /**
     * Select slot by number
     * @param {number} slotNumber - Slot number (0-3)
     */
    static selectSlot(slotNumber) {
      // Remove selection from all slots
      document.querySelectorAll(".saved-slot-item").forEach((slot) => {
        slot.classList.remove("selected-saved");
      });
      
      // Select the target slot
      const activeSlot = document.getElementById("slot-saved-coords-" + slotNumber);
      if (activeSlot) {
        activeSlot.classList.add("selected-saved");
        this.updateActiveIndicator();
        
        const inner = activeSlot.querySelector(".slot-inner") || activeSlot;
        if (inner) {
          // Store active slot in global variable for compatibility
          if (typeof window !== 'undefined') {
            window.activeSavedFieldId = inner.id;
          }
          UIComponents.Logger.log(`Slot ${slotNumber} selected`, "info");
        }
      }
    }
  };

  /**
   * Clipboard component
   */
  static Clipboard = class {
    
    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise<boolean>} Operation success
     */
    static async copy(text) {
      try {
        await navigator.clipboard.writeText(text);
        UIComponents.Logger.log("Coordinates copied to clipboard", "success");
        return true;
      } catch (error) {
        UIComponents.Logger.log("Clipboard write error", "error");
        return false;
      }
    }

    /**
     * Read text from clipboard
     * @returns {Promise<string|null>} Text from clipboard or null
     */
    static async read() {
      try {
        const text = await navigator.clipboard.readText();
        return text;
      } catch (error) {
        // UIComponents.Logger.log("Clipboard read error: " + error, "error");
        return null;
      }
    }
  };

  /**
   * Component for displaying coordinates in CLI area
   */
  static CoordinateDisplay = class {
    
    static _cliOutput = null;

    /**
     * Component initialization
     */
    static init() {
      this._cliOutput = document.getElementById("cli-output");
    }

    /**
     * Display coordinates in CLI area
     * @param {Object} coords - Coordinates to display
     */
    static display(coords) {
      if (!this._cliOutput || !window.CoordinateParser) return;
      
      const cliString = window.CoordinateParser.formatToCli(coords);
      this._cliOutput.value = cliString;
    }

    /**
     * Get text from CLI area
     * @returns {string} Text from CLI area
     */
    static getText() {
      return this._cliOutput ? this._cliOutput.value : "";
    }

    /**
     * Clear CLI area
     */
    static clear() {
      if (this._cliOutput) {
        this._cliOutput.value = "";
      }
    }
  };

  /**
   * Initialize all components
   */
  static init() {
    this.Logger.init();
    this.CoordinateDisplay.init();
  }
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIComponents;
} else {
  window.UIComponents = UIComponents;
}
