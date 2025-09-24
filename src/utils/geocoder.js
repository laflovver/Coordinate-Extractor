"use strict";

/**
 * Геокодер для получения названий мест по координатам
 */
class Geocoder {
  
  /**
   * Получает название места по координатам
   * @param {number} lat - Широта
   * @param {number} lon - Долгота
   * @returns {Promise<string|null>} Название места или null
   */
  static async reverseGeocode(lat, lon) {
    try {
      // Сначала пробуем OpenStreetMap Nominatim (бесплатный)
      const osmResult = await this._queryOSM(lat, lon);
      if (osmResult) {
        return osmResult;
      }
      
      // Если OSM не сработал, пробуем Mapbox (требует API ключ)
      const mapboxResult = await this._queryMapbox(lat, lon);
      if (mapboxResult) {
        return mapboxResult;
      }
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }
  
  /**
   * Запрос к OpenStreetMap Nominatim
   * @param {number} lat - Широта
   * @param {number} lon - Долгота
   * @returns {Promise<string|null>} Название места
   */
  static async _queryOSM(lat, lon) {
    try {
      // Сначала пробуем найти достопримечательности с высоким рейтингом
      const poiUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&extratags=1&accept-language=en&namedetails=1&polygon_geojson=0`;
      
      const response = await fetch(poiUrl, {
        headers: {
          'User-Agent': 'Coordinate-Extractor/1.0',
          'Accept-Language': 'en'
        }
      });
      
      if (!response.ok) {
        throw new Error(`OSM API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.display_name) {
        const result = this._formatOSMName(data);
        console.log('OSM Geocoding result:', {
          original: data.display_name,
          address: data.address,
          extratags: data.extratags,
          namedetails: data.namedetails,
          result: result,
          landmark: this._findLandmark(data.address, data.extratags, data.namedetails),
          streetInfo: this._getStreetInfo(data.address)
        });
        return result;
      }
      
      return null;
    } catch (error) {
      console.error('OSM geocoding error:', error);
      return null;
    }
  }
  
  /**
   * Запрос к Mapbox Geocoding API
   * @param {number} lat - Широта
   * @param {number} lon - Долгота
   * @returns {Promise<string|null>} Название места
   */
  static async _queryMapbox(lat, lon) {
    try {
      // Нужен API ключ Mapbox
      const apiKey = this._getMapboxApiKey();
      if (!apiKey) {
        return null;
      }
      
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${apiKey}&types=place,locality,neighborhood,address&language=en`;
      
      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'en'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Mapbox API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.features && data.features.length > 0) {
        return this._formatMapboxName(data.features[0]);
      }
      
      return null;
    } catch (error) {
      console.error('Mapbox geocoding error:', error);
      return null;
    }
  }
  
  /**
   * Форматирует название из OSM данных
   * @param {Object} data - Данные от OSM
   * @returns {string} Отформатированное название
   */
  static _formatOSMName(data) {
    const address = data.address || {};
    const extratags = data.extratags || {};
    const namedetails = data.namedetails || {};
    
    // 1. ПРИОРИТЕТ: Ищем достопримечательности и важные места
    const landmark = this._findLandmark(address, extratags, namedetails);
    if (landmark) {
      return landmark;
    }
    
    // 2. ЗАПАСНОЙ ВАРИАНТ: Улица и номер дома
    const streetInfo = this._getStreetInfo(address);
    if (streetInfo) {
      return streetInfo;
    }
    
    // 3. ПОСЛЕДНИЙ ВАРИАНТ: Город или общее название
    const city = address.city || address.town || address.village || address.hamlet || address.municipality;
    const region = address.state || address.region || address.county;
    const country = address.country;
    
    if (city) {
      return city;
    } else if (region) {
      return region;
    } else if (country) {
      return country;
    } else {
      return data.display_name.split(',')[0].trim();
    }
  }
  
  /**
   * Ищет достопримечательности и важные места
   */
  static _findLandmark(address, extratags, namedetails) {
    // 1. Сначала ищем название в namedetails (самое точное)
    const nameKeys = ['name:en', 'name', 'name:official', 'name:short'];
    for (const key of nameKeys) {
      if (namedetails[key] && namedetails[key].length > 2) {
        return namedetails[key];
      }
    }
    
    // 2. Ищем в address по приоритету
    const highPriorityFields = [
      'name', 'house_name', 'building', 'amenity', 'tourism', 
      'leisure', 'sport', 'historic', 'religion', 'shop', 
      'craft', 'office', 'healthcare', 'education'
    ];
    
    for (const field of highPriorityFields) {
      if (address[field] && address[field] !== 'yes' && address[field].length > 2) {
        return address[field];
      }
    }
    
    // 3. Ищем в extratags по приоритету
    const landmarkTypes = [
      'name', 'name:en', 'name:official', 'name:short',
      'tourism', 'amenity', 'leisure', 'sport', 'historic', 
      'religion', 'shop', 'craft', 'office', 'healthcare', 
      'education', 'building', 'natural', 'waterway', 
      'aeroway', 'railway', 'highway'
    ];
    
    for (const type of landmarkTypes) {
      if (extratags[type] && typeof extratags[type] === 'string' && 
          extratags[type].length > 2 && extratags[type] !== 'yes') {
        return extratags[type];
      }
    }
    
    // 4. Ищем в других полях extratags
    for (const [key, value] of Object.entries(extratags)) {
      if (typeof value === 'string' && value.length > 3 && 
          !key.includes('website') && !key.includes('phone') && 
          !key.includes('email') && !key.includes('opening_hours') &&
          !key.includes('capacity') && !key.includes('surface') &&
          value !== 'yes' && value !== 'no') {
        return value;
      }
    }
    
    return null;
  }
  
  /**
   * Получает информацию об улице и номере дома
   */
  static _getStreetInfo(address) {
    const street = address.road || address.street || address.pedestrian || 
                   address.footway || address.path || address.cycleway;
    const houseNumber = address.house_number;
    const suburb = address.suburb || address.neighbourhood || 
                   address.quarter || address.district;
    const city = address.city || address.town || address.village || 
                 address.hamlet || address.municipality;
    
    if (!street) {
      return null;
    }
    
    let result = street;
    
    // Добавляем номер дома
    if (houseNumber) {
      result += ` ${houseNumber}`;
    }
    
    // Добавляем район
    if (suburb && suburb !== city) {
      result += `, ${suburb}`;
    }
    
    // Добавляем город
    if (city) {
      result += `, ${city}`;
    }
    
    return result;
  }
  
  /**
   * Форматирует название из Mapbox данных
   * @param {Object} feature - Feature от Mapbox
   * @returns {string} Отформатированное название
   */
  static _formatMapboxName(feature) {
    const context = feature.context || [];
    const placeName = feature.place_name || feature.text;
    
    // Ищем различные типы мест в контексте
    const city = context.find(c => c.id.startsWith('place.'));
    const region = context.find(c => c.id.startsWith('region.'));
    const neighborhood = context.find(c => c.id.startsWith('neighborhood.'));
    const street = context.find(c => c.id.startsWith('street.'));
    const address = context.find(c => c.id.startsWith('address.'));
    
    let result = feature.text;
    
    // Если это не конкретное место, а улица или адрес, добавляем контекст
    if (street && street.text !== result) {
      result += `, ${street.text}`;
    } else if (neighborhood && neighborhood.text !== result) {
      result += `, ${neighborhood.text}`;
    } else if (city && city.text !== result) {
      result += `, ${city.text}`;
    } else if (region && region.text !== result) {
      result += `, ${region.text}`;
    }
    
    return result;
  }
  
  /**
   * Получает API ключ Mapbox из настроек
   * @returns {string|null} API ключ или null
   */
  static _getMapboxApiKey() {
    // Можно добавить настройку для API ключа
    // Пока возвращаем null, чтобы использовать только OSM
    return null;
  }
  
  /**
   * Создает короткое название для слота
   * @param {string} fullName - Полное название места
   * @returns {string} Короткое название
   */
  static createShortName(fullName) {
    if (!fullName) return '';
    
    // Разбиваем на части
    const parts = fullName.split(',').map(p => p.trim()).filter(p => p);
    
    if (parts.length === 0) return '';
    
    // Если есть только одна часть, используем её
    if (parts.length === 1) {
      let short = parts[0];
      if (short.length > 20) {
        short = short.substring(0, 17) + '...';
      }
      return short;
    }
    
    // Приоритет для короткого названия:
    // 1. Первая часть (обычно улица + номер дома или название места)
    // 2. Если первая часть слишком длинная, берем вторую часть (район/город)
    let short = parts[0];
    
    // Если первая часть слишком длинная, попробуем вторую
    if (short.length > 25 && parts.length > 1) {
      short = parts[1];
    }
    
    // Если все еще слишком длинная, обрезаем
    if (short.length > 20) {
      short = short.substring(0, 17) + '...';
    }
    
    return short;
  }
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Geocoder;
} else {
  window.Geocoder = Geocoder;
}
