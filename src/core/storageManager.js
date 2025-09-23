"use strict";

/**
 * @typedef {Object} CoordinateSlot
 * @property {number} lat - Широта
 * @property {number} lon - Долгота
 * @property {number} zoom - Масштаб
 * @property {number} bearing - Направление
 * @property {number} pitch - Наклон
 * @property {string} [name] - Пользовательское имя слота
 * @property {string} [labelColor] - Цвет метки слота
 */

/**
 * Менеджер для работы с локальным хранилищем Chrome
 */
class StorageManager {
  
  static STORAGE_KEY = "recentCoordinates";
  static MAX_SLOTS = 4;

  /**
   * Получает все слоты координат из хранилища
   * @returns {Promise<CoordinateSlot[]>} Массив слотов
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
   * Получает конкретный слот по индексу
   * @param {number} slotIndex - Индекс слота (0-3)
   * @returns {Promise<CoordinateSlot|null>} Слот или null
   */
  static async getSlot(slotIndex) {
    if (slotIndex < 0 || slotIndex >= this.MAX_SLOTS) {
      throw new Error(`Invalid slot index: ${slotIndex}`);
    }
    
    const slots = await this.getAllSlots();
    return slots[slotIndex];
  }

  /**
   * Сохраняет слот координат
   * @param {number} slotIndex - Индекс слота (0-3)
   * @param {CoordinateSlot|null} slotData - Данные слота или null для очистки
   * @returns {Promise<boolean>} Успешность операции
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
   * Обновляет координаты в слоте
   * @param {number} slotIndex - Индекс слота 
   * @param {Object} coordinates - Новые координаты
   * @returns {Promise<boolean>} Успешность операции
   */
  static async updateSlotCoordinates(slotIndex, coordinates) {
    const currentSlot = await this.getSlot(slotIndex);
    const updatedSlot = currentSlot ? 
      { ...currentSlot, ...coordinates } : 
      { ...coordinates, name: "", labelColor: "" };
    
    return this.setSlot(slotIndex, updatedSlot);
  }

  /**
   * Обновляет метку слота
   * @param {number} slotIndex - Индекс слота
   * @param {string} name - Новое имя
   * @param {string} [labelColor] - Цвет метки
   * @returns {Promise<boolean>} Успешность операции
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
   * Очищает слот
   * @param {number} slotIndex - Индекс слота для очистки
   * @returns {Promise<boolean>} Успешность операции
   */
  static async clearSlot(slotIndex) {
    return this.setSlot(slotIndex, null);
  }

  /**
   * Очищает все слоты
   * @returns {Promise<boolean>} Успешность операции
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
   * Создает слот из CLI строки
   * @param {string} cliString - CLI строка с координатами
   * @param {string} [name] - Имя слота
   * @param {string} [labelColor] - Цвет метки
   * @returns {CoordinateSlot|null} Созданный слот или null если парсинг не удался
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
   * Форматирует слот в CLI строку
   * @param {CoordinateSlot} slot - Слот для форматирования
   * @returns {string} CLI строка
   */
  static formatSlotToCli(slot) {
    if (!slot || !window.CoordinateParser) {
      return "";
    }

    return window.CoordinateParser.formatToCli(slot);
  }

  /**
   * Получает отформатированный текст слота для отображения
   * @param {CoordinateSlot|null} slot - Слот
   * @param {number} slotIndex - Индекс слота
   * @returns {string} Форматированный текст
   */
  static getSlotDisplayText(slot, slotIndex) {
    if (!slot) {
      return `Coordinate slot ${slotIndex} ...`;
    }

    const cliStr = this.formatSlotToCli(slot);
    return slot.name ? `${slot.name} - ${cliStr}` : cliStr;
  }

  /**
   * Подписка на изменения в хранилище
   * @param {function} callback - Колбэк вызываемый при изменениях
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
