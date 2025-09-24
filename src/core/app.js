"use strict";

/**
 * Main Coordinate Extractor application class
 * Coordinates all modules
 */
class CoordinateExtractorApp {
  
  constructor() {
    this.activeSlotId = "saved-coords-0";
    this.hotkeysDisabled = false;
    this.clipboardCoords = null;
    
    this.slotIds = [
      "saved-coords-0",
      "saved-coords-1", 
      "saved-coords-2",
      "saved-coords-3"
    ];
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      // Check if required modules are available
      console.log('App init - checking modules:');
      console.log('CoordinateParser:', typeof CoordinateParser);
      console.log('StorageManager:', typeof StorageManager);
      console.log('BrowserManager:', typeof BrowserManager);
      console.log('UIComponents:', typeof UIComponents);
      
      if (typeof CoordinateParser === 'undefined') {
        throw new Error("CoordinateParser is not defined");
      }
      if (typeof StorageManager === 'undefined') {
        throw new Error("StorageManager is not defined");
      }
      if (typeof BrowserManager === 'undefined') {
        throw new Error("BrowserManager is not defined");
      }
      if (typeof UIComponents === 'undefined') {
        throw new Error("UIComponents is not defined");
      }
      
      // Initialize UI components
      UIComponents.init();
      // Load and display saved coordinates
      await this.loadStoredCoordinates();
      
      // Auto-extract coordinates from active tab
      await this.extractCurrentTabCoordinates();
      
      // Setup event handlers
      this.setupEventListeners();
    } catch (error) {
      // UIComponents.Logger.log("Failed to initialize app: " + error.message, "error");
      console.error("App initialization error:", error);
    }
  }


  /**
   * Load saved coordinates from storage
   */
  async loadStoredCoordinates() {
    const slots = await StorageManager.getAllSlots();
    
    this.slotIds.forEach((id, index) => {
      const element = document.getElementById(id);
      if (element) {
        const slot = slots[index];
        const displayText = StorageManager.getSlotDisplayText(slot, index);
        
        if (slot) {
          UIComponents.SlotRenderer.renderContent(element, displayText, slot.labelColor || "");
        } else {
          // Clear the slot completely
          element.innerHTML = "";
          element.textContent = displayText;
        }
      }
    });

    this.attachSlotEventListeners();
    this.attachEditFunctionality();
    this.setupScrollSnapping();
    
    UIComponents.SlotRenderer.updateActiveIndicator();
  }

  /**
   * Handle keys in input fields
   */
  handleInputFieldKeys(e) {
    if ((e.code === "Delete" || e.code === "Backspace") && this.activeSlotId) {
      e.preventDefault();
      this.clearActiveSlot();
    }
  }

  /**
   * Handle global hotkeys
   */
  handleGlobalHotkeys(e) {
    switch (e.code) {
      case "KeyC":
        e.preventDefault();
        this.handleCopyToClipboard();
        break;
      case "KeyV":
        e.preventDefault();
        this.handlePasteFromClipboard();
        break;
      case "KeyG":
        e.preventDefault();
        this.handleNavigateToCoordinates();
        break;
      case "KeyE":
      case "KeyУ": // Russian layout
        e.preventDefault();
        this.handleEditSlot();
        break;
      case "KeyQ":
      case "KeyЙ": // Russian layout
        e.preventDefault();
        this.selectSlot(0);
        break;
      case "Digit1":
        e.preventDefault();
        this.selectSlot(1);
        break;
      case "Digit2":
        e.preventDefault();
        this.selectSlot(2);
        break;
      case "Digit3":
        e.preventDefault();
        this.selectSlot(3);
        break;
      case "Backspace":
      case "Delete":
        e.preventDefault();
        console.log('Clear slot hotkey pressed, activeSlotId:', this.activeSlotId);
        this.clearActiveSlot();
        break;
    }
  }

  /**
   * Copy coordinates to clipboard
   */
  async handleCopyToClipboard() {
    try {
      const coords = this.getActiveSlotCoordinates();
      if (!coords) {
        return;
      }

      const cliString = this.formatCoordinatesAsCLI(coords);
      await navigator.clipboard.writeText(cliString);
    } catch (error) {
      console.error("Clipboard error:", error);
    }
  }


  /**
   * Add location name to coordinates
   * @param {Object} coords - Coordinates
   * @param {number} slotIndex - Slot index
   */
  async addLocationName(coords, slotIndex) {
    try {
      if (typeof Geocoder === 'undefined') {
        return;
      }
      
      // Check if name was changed by user
      const currentSlot = await StorageManager.getSlot(slotIndex);
      if (currentSlot && currentSlot.userNamed) {
        console.log('Slot has user-defined name, skipping geocoding');
        return;
      }
      
      // Show loading indicator
      const slotElement = document.getElementById(`saved-coords-${slotIndex}`);
      if (slotElement) {
        slotElement.textContent = 'Loading location...';
      }
      
      // Get location name
      const locationName = await Geocoder.reverseGeocode(coords.lat, coords.lon);
      
      if (locationName) {
        const shortName = Geocoder.createShortName(locationName);
        
        // Update coordinates with name (reset userNamed when coordinates change)
        const updatedCoords = {
          ...coords,
          name: shortName,
          fullName: locationName,
          labelColor: "",
          userNamed: false // Auto-generated name
        };
        
        await StorageManager.setSlot(slotIndex, updatedCoords);
        
        // Update UI after adding name
        this.refreshUI();
      }
    } catch (error) {
      console.error('Error adding location name:', error);
    }
  }
  
  
  /**
   * Navigation to coordinates
   */
  async handleNavigateToCoordinates() {
    const coords = this.getActiveSlotCoordinates();
    if (!coords) {
      return;
    }

    try {
      await BrowserManager.updateActiveTabWithCoordinates(coords);
    } catch (error) {
      console.error("Navigation error:", error);
    }
  }

  /**
   * Slot editing
   */
  handleEditSlot() {
    const slotIndex = this.getActiveSlotIndex();
    if (slotIndex === 0) return; // Slot 0 is not editable

    const slotId = `saved-coords-${slotIndex}`;
    const slotElement = document.getElementById(slotId);
    if (slotElement) {
      UIComponents.startSlotEdit(slotElement, slotIndex);
    }
  }

  /**
   * Slot selection
   */
  selectSlot(slotIndex) {
    this.activeSlotId = `saved-coords-${slotIndex}`;
    this.updateSlotSelection();
  }

  /**
   * Clear active slot
   */
  async clearActiveSlot() {
    if (!this.activeSlotId) {
      console.log('No active slot to clear');
      return;
    }

    const slotIndex = this.getActiveSlotIndex();
    console.log('Clearing slot:', slotIndex);
    await StorageManager.setSlot(slotIndex, null);
    this.refreshUI();
  }

  /**
   * Get active slot coordinates
   */
  getActiveSlotCoordinates() {
    const slotIndex = this.getActiveSlotIndex();
    return StorageManager.getSlot(slotIndex);
  }

  /**
   * Get active slot index
   */
  getActiveSlotIndex() {
    return parseInt(this.activeSlotId.split('-').pop());
  }

  /**
   * Update slot visual selection
   */
  updateSlotSelection() {
    // Remove previous selection
    document.querySelectorAll('.saved-slot-item').forEach(item => {
      item.classList.remove('selected-saved');
    });

    // Add selection to active slot
    const activeSlot = document.getElementById(`slot-${this.activeSlotId}`);
    if (activeSlot) {
      activeSlot.classList.add('selected-saved');
    }
  }

  /**
   * Format coordinates as CLI
   */
  formatCoordinatesAsCLI(coords) {
    const parts = [`--lon ${coords.lon}`, `--lat ${coords.lat}`];
    if (coords.zoom !== undefined) parts.push(`--zoom ${coords.zoom}`);
    if (coords.bearing !== undefined) parts.push(`--bearing ${coords.bearing}`);
    if (coords.pitch !== undefined) parts.push(`--pitch ${coords.pitch}`);
    return parts.join(' ');
  }

  /**
   * Parse CLI string to coordinates
   */
  parseCLIString(cliString) {
    if (typeof window !== 'undefined' && window.CliParser) {
      return window.CliParser.parse(cliString);
    }
    
    // Fallback parsing
    const parts = cliString.split(/\s+/);
    const result = {};
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].startsWith("--")) {
        const key = parts[i].substring(2);
        const value = parts[i + 1];
        if (value && !isNaN(parseFloat(value))) {
          result[key] = parseFloat(value);
        }
      }
    }
    return Object.keys(result).length > 0 ? result : null;
  }

  /**
   * Update UI
   */
  refreshUI() {
    this.loadStoredCoordinates();
  }

  /**
   * Extract coordinates from active tab URL
   */
  async extractCurrentTabCoordinates() {
    const currentUrl = await BrowserManager.getActiveTabUrl();
    
    if (!currentUrl) {
      return;
    }

    const coords = CoordinateParser.extractFromUrl(currentUrl);
    
    if (coords) {
      // Save to slot 0 and display
      await StorageManager.setSlot(0, { ...coords, name: "", labelColor: "" });
      UIComponents.CoordinateDisplay.display(coords);
      
      // Update slot 0 display
      const slot0Element = document.getElementById("saved-coords-0");
      if (slot0Element) {
        const cliString = CoordinateParser.formatToCli(coords);
        UIComponents.SlotRenderer.renderContent(slot0Element, cliString);
      }
      
      // Slot 0 should not auto-determine location name
    } else {
      const slot0Element = document.getElementById("saved-coords-0");
      if (slot0Element) {
        slot0Element.textContent = "Coordinates not found";
      }
    }
  }

  /**
   * Setup event handlers for main buttons
   */
  setupEventListeners() {
    this.setupCopyButton();
    this.setupPasteButton();
    this.setupNavigateButton();
    this.setupKeyboardShortcuts();
  }

  setupCopyButton() {
    const copyBtn = document.getElementById("copy-cli");
    if (!copyBtn) return;

    copyBtn.addEventListener("click", async () => {
      UIComponents.Utils.animateButton(copyBtn);
      
      let textToCopy = "";
      
      // Determine source to copy from
      if (this.activeSlotId && this.activeSlotId !== "saved-coords-0") {
        const element = document.getElementById(this.activeSlotId);
        if (element) {
          const coordsSpan = element.querySelector(".slot-coords");
          textToCopy = coordsSpan ? coordsSpan.textContent : element.textContent;
        }
      } else {
        textToCopy = UIComponents.CoordinateDisplay.getText();
      }

      await UIComponents.Clipboard.copy(textToCopy);
    });
  }

  setupPasteButton() {
    const pasteBtn = document.getElementById("paste-coords");
    if (!pasteBtn) return;

    pasteBtn.addEventListener("click", async () => {
      UIComponents.Utils.animateButton(pasteBtn);
      
      const text = await UIComponents.Clipboard.read();
      if (!text) return;

      const coords = CoordinateParser.parseFromCli(text);
      if (coords) {
        const formatted = CoordinateParser.formatToCli(coords);
        
        if (this.activeSlotId && this.activeSlotId !== "saved-coords-0") {
          // Save to active slot
          const slotIndex = parseInt(this.activeSlotId.split("-").pop(), 10);
          const currentSlot = await StorageManager.getSlot(slotIndex);
          
          // For slots 1, 2, 3 add automatic naming
          if (slotIndex > 0 && coords.lat && coords.lon) {
            await this.addLocationName(coords, slotIndex);
          } else {
            await StorageManager.setSlot(slotIndex, {
              ...coords,
              name: currentSlot?.name || "",
              labelColor: currentSlot?.labelColor || "",
              userNamed: false // Reset flag when coordinates change
            });
            
            const element = document.getElementById(this.activeSlotId);
            if (element) {
              const displayText = StorageManager.getSlotDisplayText(await StorageManager.getSlot(slotIndex), slotIndex);
              UIComponents.SlotRenderer.renderContent(element, displayText, currentSlot?.labelColor);
            }
          }
        } else {
          // Display in slot 0
          const element = document.getElementById("saved-coords-0");
          if (element) {
            UIComponents.SlotRenderer.renderContent(element, formatted);
          }
        }
        
        this.clipboardCoords = coords;
        UIComponents.Logger.log("Coordinates pasted from clipboard", "success");
      } else {
        UIComponents.Logger.log("Failed to parse coordinates", "error");
      }
    });
  }

  setupNavigateButton() {
    const navigateBtn = document.getElementById("navigate-url");
    if (!navigateBtn) return;

    navigateBtn.addEventListener("click", async () => {
      UIComponents.Utils.animateButton(navigateBtn);
      
      let coordsToUse = null;

      // Get coordinates from active slot
      if (this.activeSlotId && this.activeSlotId !== "saved-coords-0") {
        const slotIndex = parseInt(this.activeSlotId.split("-").pop(), 10);
        const slot = await StorageManager.getSlot(slotIndex);
        if (slot) {
          coordsToUse = slot;
        }
      }

      // If no coordinates in slot, use from buffer
      if (!coordsToUse) {
        coordsToUse = this.clipboardCoords;
      }

      if (!coordsToUse) {
        UIComponents.Logger.log("No coordinates available", "error");
        return;
      }

      // UIComponents.Logger.log("Navigating with coordinates: " + JSON.stringify(coordsToUse), "info");
      
      const success = await BrowserManager.updateActiveTabWithCoordinates(coordsToUse);
      if (!success) {
        UIComponents.Logger.log("URL structure not supported", "error");
      } else {
        UIComponents.Logger.log("URL updated successfully", "success");
      }
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      if (this.hotkeysDisabled) return;
      
      const tag = e.target.tagName.toLowerCase();
      if ((tag === "input" || tag === "textarea") && e.target.id !== this.activeSlotId) {
        return;
      }

      switch (e.code) {
        case "KeyC":
          e.preventDefault();
          // UIComponents.Logger.log("Hotkey 'C' pressed.", "info");
          document.getElementById("copy-cli")?.click();
          break;
          
        case "KeyV":
          e.preventDefault();
          // UIComponents.Logger.log("Hotkey 'V' pressed.", "info");
          document.getElementById("paste-coords")?.click();
          break;
          
        case "KeyG":
          e.preventDefault();
          // UIComponents.Logger.log("Hotkey 'G' pressed.", "info");
          document.getElementById("navigate-url")?.click();
          break;
          
        case "KeyE":
          e.preventDefault();
          this.editActiveSlotLabel();
          break;
          
        case "Digit1":
        case "Digit2":
        case "Digit3":
          e.preventDefault();
          const slotNumber = parseInt(e.code.replace("Digit", ""), 10);
          this.selectSlot(slotNumber);
          break;
      }
    });
  }

  /**
   * Setup event handlers for coordinate slots
   */
  attachSlotEventListeners() {
    this.slotIds.forEach((innerId, index) => {
      const inner = document.getElementById(innerId);
      if (!inner) return;

      inner.setAttribute("tabindex", "0");
      const slotContainer = inner.closest(".saved-slot-item");
      
      if (slotContainer) {
        slotContainer.addEventListener("click", () => {
          this.selectSlot(index);
        });

        slotContainer.addEventListener("keydown", (e) => {
          if (e.code === "Delete") {
            this.clearSlot(index);
          }
        });
      }
    });
  }


  /**
   * Clear slot by index
   * @param {number} slotIndex - Slot index to clear
   */
  async clearSlot(slotIndex) {
    await StorageManager.clearSlot(slotIndex);
    
    const element = document.getElementById(`saved-coords-${slotIndex}`);
    if (element) {
      element.textContent = `Coordinate slot ${slotIndex} ...`;
    }
    
    UIComponents.Logger.log(`Slot ${slotIndex} cleared`, "info");
  }

  /**
   * Edit active slot label
   */
  editActiveSlotLabel() {
    const activeSlot = document.querySelector(".saved-slot-item.selected-saved");
    if (activeSlot && activeSlot.id !== "slot-saved-coords-0") {
      const editIcon = activeSlot.querySelector(".edit-icon");
      if (editIcon) {
        editIcon.click();
      }
    }
  }

  /**
   * Setup slot label editing functionality
   */
  attachEditFunctionality() {
    // Add hotkey handler for editing
    document.addEventListener("keydown", (e) => {
      if (e.code === "KeyE" && !this.hotkeysDisabled) {
        this.editActiveSlotLabel();
      }
    });

    // Setup handlers for edit icons
    document.querySelectorAll(".saved-slot-item .edit-icon").forEach((icon) => {
      const slot = icon.closest(".saved-slot-item");
      
      // Hide icon for slot 0
      if (slot && slot.id === "slot-saved-coords-0") {
        icon.style.display = "none";
        return;
      }

      icon.addEventListener("click", (e) => {
        e.stopPropagation();
        this.startEditingSlotLabel(icon, slot);
      });
    });
  }

  /**
   * Start slot label editing process
   * @param {HTMLElement} icon - Edit icon
   * @param {HTMLElement} slot - Slot element
   */
  startEditingSlotLabel(icon, slot) {
    if (!slot || slot.querySelector(".label-input")) return;

    // Icon animation
    icon.classList.add("edit-animate");
    icon.addEventListener("animationend", () => {
      icon.classList.remove("edit-animate");
    }, { once: true });

    this.hotkeysDisabled = true;

    const inner = slot.querySelector(".slot-inner") || slot;
    
    // Get current label
    let currentLabel = "";
    const labelSpan = inner.querySelector(".slot-label");
    if (labelSpan) {
      currentLabel = labelSpan.textContent.replace(" - ", "");
    } else if (icon.dataset.label) {
      currentLabel = icon.dataset.label;
    }

    // Create input field
    const input = document.createElement("input");
    input.type = "text";
    input.value = currentLabel;
    
    const randomColor = UIComponents.Utils.getRandomReadableColor();
    icon.dataset.labelColor = randomColor;
    
    Object.assign(input.style, {
      position: "absolute",
      left: "20px",
      top: "50%",
      transform: "translateY(-50%)",
      width: "60px",
      padding: "2px",
      fontSize: "14px",
      boxSizing: "border-box",
      zIndex: "10",
      color: randomColor
    });
    
    input.classList.add("label-input");
    slot.insertBefore(input, inner);
    input.focus();
    input.setSelectionRange(0, 0);

    // Handle edit completion
    const finishEditing = async () => {
      const newLabel = input.value.trim();
      icon.dataset.label = newLabel;
      
      const slotIndex = parseInt(inner.id.split("-").pop(), 10);
      await StorageManager.updateSlotLabel(slotIndex, newLabel, icon.dataset.labelColor);
      
      // Redraw slot
      const slot = await StorageManager.getSlot(slotIndex);
      if (slot) {
        const displayText = StorageManager.getSlotDisplayText(slot, slotIndex);
        UIComponents.SlotRenderer.renderContent(inner, displayText, icon.dataset.labelColor);
      }
      
      if (slot.contains(input)) {
        slot.removeChild(input);
      }
      this.hotkeysDisabled = false;
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        finishEditing();
      }
    });

    input.addEventListener("blur", finishEditing);
  }

  /**
   * Setup snap scrolling for slots
   */
  setupScrollSnapping() {
    document.querySelectorAll(".saved-slot-item .slot-inner").forEach((inner) => {
      inner.addEventListener("scroll", () => {
        clearTimeout(inner.snapTimeout);
        inner.snapTimeout = setTimeout(() => {
          UIComponents.Utils.snapScroll(inner);
        }, 100);
      });
    });
  }



}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CoordinateExtractorApp;
} else {
  window.CoordinateExtractorApp = CoordinateExtractorApp;
}
