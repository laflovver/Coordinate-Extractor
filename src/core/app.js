"use strict";

/**
 * Главный класс приложения Coordinate Extractor
 * Координирует работу всех модулей
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
   * Инициализация приложения
   */
  async init() {
    try {
      // Initialize UI components
      UIComponents.init();
      UIComponents.Logger.log("Coordinate Extractor loaded.", "info");
      
      // Load and display saved coordinates
      await this.loadStoredCoordinates();
      
      // Auto-extract coordinates from active tab
      await this.extractCurrentTabCoordinates();
      
      // Setup event handlers
      this.setupEventListeners();
      
      UIComponents.Logger.log("Application initialized successfully.", "success");
    } catch (error) {
      UIComponents.Logger.log("Failed to initialize app: " + error.message, "error");
      console.error("App initialization error:", error);
    }
  }

  /**
   * Загружает сохраненные координаты из хранилища
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
   * Извлекает координаты из URL активной вкладки
   */
  async extractCurrentTabCoordinates() {
    const currentUrl = await BrowserManager.getActiveTabUrl();
    
    if (!currentUrl) {
      UIComponents.Logger.log("No active tab found.", "error");
      return;
    }

    UIComponents.Logger.log("Active tab URL: " + currentUrl, "info");
    
    const coords = CoordinateParser.extractFromUrl(currentUrl);
    if (coords) {
      UIComponents.Logger.log("Coordinates extracted: " + JSON.stringify(coords), "success");
      
      // Save to slot 0 and display
      await StorageManager.setSlot(0, { ...coords, name: "", labelColor: "" });
      UIComponents.CoordinateDisplay.display(coords);
      
      // Update slot 0 display
      const slot0Element = document.getElementById("saved-coords-0");
      if (slot0Element) {
        const cliString = CoordinateParser.formatToCli(coords);
        UIComponents.SlotRenderer.renderContent(slot0Element, cliString);
      }
    } else {
      UIComponents.Logger.log("Coordinates not found in URL.", "error");
      const slot0Element = document.getElementById("saved-coords-0");
      if (slot0Element) {
        slot0Element.textContent = "Coordinates not found";
      }
    }
  }

  /**
   * Настраивает обработчики событий для основных кнопок
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
          
          await StorageManager.setSlot(slotIndex, {
            ...coords,
            name: currentSlot?.name || "",
            labelColor: currentSlot?.labelColor || ""
          });
          
          const element = document.getElementById(this.activeSlotId);
          if (element) {
            const displayText = StorageManager.getSlotDisplayText(await StorageManager.getSlot(slotIndex), slotIndex);
            UIComponents.SlotRenderer.renderContent(element, displayText, currentSlot?.labelColor);
          }
        } else {
          // Display in slot 0
          const element = document.getElementById("saved-coords-0");
          if (element) {
            UIComponents.SlotRenderer.renderContent(element, formatted);
          }
        }
        
        this.clipboardCoords = coords;
        UIComponents.Logger.log("Coordinates parsed from clipboard: " + JSON.stringify(coords), "success");
      } else {
        UIComponents.Logger.log("Failed to parse coordinates from clipboard.", "error");
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
        UIComponents.Logger.log("No coordinates available.", "error");
        return;
      }

      UIComponents.Logger.log("Navigating with coordinates: " + JSON.stringify(coordsToUse), "info");
      
      const success = await BrowserManager.updateActiveTabWithCoordinates(coordsToUse);
      if (!success) {
        UIComponents.Logger.log("This site's URL structure is not supported for automatic coordinate substitution.", "error");
      } else {
        UIComponents.Logger.log("URL updated successfully.", "success");
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
          UIComponents.Logger.log("Hotkey 'C' pressed.", "info");
          document.getElementById("copy-cli")?.click();
          break;
          
        case "KeyV":
          e.preventDefault();
          UIComponents.Logger.log("Hotkey 'V' pressed.", "info");
          document.getElementById("paste-coords")?.click();
          break;
          
        case "KeyG":
          e.preventDefault();
          UIComponents.Logger.log("Hotkey 'G' pressed.", "info");
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
   * Настраивает обработчики для слотов координат
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
   * Выбирает слот по индексу
   * @param {number} slotIndex - Индекс слота
   */
  selectSlot(slotIndex) {
    UIComponents.SlotRenderer.selectSlot(slotIndex);
    this.activeSlotId = `saved-coords-${slotIndex}`;
  }

  /**
   * Очищает слот по индексу
   * @param {number} slotIndex - Индекс слота для очистки
   */
  async clearSlot(slotIndex) {
    await StorageManager.clearSlot(slotIndex);
    
    const element = document.getElementById(`saved-coords-${slotIndex}`);
    if (element) {
      element.textContent = `Coordinate slot ${slotIndex} ...`;
    }
    
    UIComponents.Logger.log(`Saved field saved-coords-${slotIndex} cleared.`, "info");
  }

  /**
   * Редактирование метки активного слота
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
   * Настраивает функционал редактирования меток слотов
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
   * Начинает процесс редактирования метки слота
   * @param {HTMLElement} icon - Иконка редактирования
   * @param {HTMLElement} slot - Элемент слота
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
   * Настраивает snap-скроллинг для слотов
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
