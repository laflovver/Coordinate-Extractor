"use strict";

/**
 * Компоненты пользовательского интерфейса
 */
class UIComponents {
  
  /**
   * Утилиты для цветов и анимации
   */
  static Utils = class {
    
    /**
     * Генерирует случайный читаемый цвет
     * @returns {string} RGB цвет
     */
    static getRandomReadableColor() {
      const r = Math.floor(Math.random() * 128);
      const g = Math.floor(Math.random() * 128);
      const b = Math.floor(Math.random() * 128);
      return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Анимирует нажатие кнопки
     * @param {HTMLElement} btn - Элемент кнопки
     */
    static animateButton(btn) {
      if (!btn) return;
      btn.classList.add("key-animation", "stripe");
      setTimeout(() => btn.classList.remove("key-animation", "stripe"), 600);
    }

    /**
     * Плавная прокрутка до выравнивания по строкам
     * @param {HTMLElement} el - Элемент для прокрутки
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
   * Компонент логирования
   */
  static Logger = class {
    
    static _logContainer = null;

    /**
     * Инициализация логгера
     */
    static init() {
      this._logContainer = document.getElementById("log-output");
    }

    /**
     * Добавляет сообщение в лог
     * @param {string} msg - Сообщение
     * @param {string} type - Тип сообщения: "info", "error", "success"  
     */
    static log(msg, type = "info") {
      if (!this._logContainer) return;
      
      const span = document.createElement("span");
      span.className = `log-message log-${type}`;
      span.textContent = msg.replace(/\n/g, " ") + " ";
      
      this._logContainer.appendChild(span);
      this._logContainer.scrollTop = this._logContainer.scrollHeight;
    }
  };

  /**
   * Компонент для работы со слотами координат
   */
  static SlotRenderer = class {
    
    /**
     * Рендерит содержимое слота
     * @param {HTMLElement} element - Элемент слота
     * @param {string} text - Текст для отображения  
     * @param {string} [storedLabelColor] - Сохраненный цвет метки
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
     * Обновляет индикатор активного слота
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
     * Выбирает слот по номеру
     * @param {number} slotNumber - Номер слота (0-3)
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
          UIComponents.Logger.log("saved field " + inner.id + " selected.", "info");
        }
      }
    }
  };

  /**
   * Компонент для работы с буфером обмена
   */
  static Clipboard = class {
    
    /**
     * Копирует текст в буфер обмена
     * @param {string} text - Текст для копирования
     * @returns {Promise<boolean>} Успешность операции
     */
    static async copy(text) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        UIComponents.Logger.log("Clipboard write error: " + error, "error");
        return false;
      }
    }

    /**
     * Читает текст из буфера обмена
     * @returns {Promise<string|null>} Текст из буфера или null
     */
    static async read() {
      try {
        const text = await navigator.clipboard.readText();
        return text;
      } catch (error) {
        UIComponents.Logger.log("Clipboard read error: " + error, "error");
        return null;
      }
    }
  };

  /**
   * Компонент для отображения координат в CLI области
   */
  static CoordinateDisplay = class {
    
    static _cliOutput = null;

    /**
     * Инициализация компонента
     */
    static init() {
      this._cliOutput = document.getElementById("cli-output");
    }

    /**
     * Отображает координаты в CLI области
     * @param {Object} coords - Координаты для отображения
     */
    static display(coords) {
      if (!this._cliOutput || !window.CoordinateParser) return;
      
      const cliString = window.CoordinateParser.formatToCli(coords);
      this._cliOutput.value = cliString;
    }

    /**
     * Получает текст из CLI области
     * @returns {string} Текст из CLI области
     */
    static getText() {
      return this._cliOutput ? this._cliOutput.value : "";
    }

    /**
     * Очищает CLI область
     */
    static clear() {
      if (this._cliOutput) {
        this._cliOutput.value = "";
      }
    }
  };

  /**
   * Инициализация всех компонентов
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
