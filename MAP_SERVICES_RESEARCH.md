# 🗺️ Исследование форматов URL картографических сервисов

## 📋 Поддерживаемые форматы координат в URL

### 1. **Google Maps** ✅ (уже поддерживается)
```
https://www.google.com/maps/@48.85891,2.2768,13.75z
https://maps.google.com/@48.85891,2.2768,13.75z/data=...
https://www.google.com/maps/place/@48.85891,2.2768,13.75z
```
**Формат**: `/@{lat},{lon},{zoom}z`

### 2. **Google Earth** ✅ (частично поддерживается)
```
https://earth.google.com/web/@48.85891,2.2768,35000a,35y,39.32t/data=...
```
**Формат**: `/@{lat},{lon},{altitude}a,{yaw}y,{tilt}t`

### 3. **Mapbox** ⚠️ (нужно улучшить)
```
https://api.mapbox.com/styles/v1/mapbox/streets-v11#13.75/48.85891/2.2768
https://www.mapbox.com/maps#13.75/48.85891/2.2768
https://studio.mapbox.com/.../#13.75/48.85891/2.2768/0/45
```
**Формат**: `#{zoom}/{lat}/{lon}` или `#{zoom}/{lat}/{lon}/{bearing}/{pitch}`

### 4. **OpenStreetMap** ❌ (не поддерживается)
```
https://www.openstreetmap.org/#map=13/48.85891/2.2768
https://www.openstreetmap.org/?mlat=48.85891&mlon=2.2768#map=13/48.85891/2.2768
```
**Формат**: `#map={zoom}/{lat}/{lon}` или параметры `mlat`, `mlon`

### 5. **Yandex Maps** ❌ (не поддерживается)
```
https://yandex.ru/maps/?ll=2.2768%2C48.85891&z=13
https://maps.yandex.ru/?ll=2.276816,48.858934&z=13
```
**Формат**: параметры `ll={lon},{lat}&z={zoom}`

### 6. **Apple Maps** ❌ (не поддерживается)
```
https://maps.apple.com/?ll=48.85891,2.2768&z=13
```
**Формат**: параметры `ll={lat},{lon}&z={zoom}`

### 7. **Bing Maps** ❌ (не поддерживается) 
```
https://www.bing.com/maps?cp=48.85891~2.2768&lvl=13
https://www.bing.com/maps/?v=2&cp=48.85891~2.2768&style=r&lvl=13&sp=point.48.85891_2.2768
```
**Формат**: параметры `cp={lat}~{lon}&lvl={zoom}`

### 8. **Here Maps** ❌ (не поддерживается)
```
https://wego.here.com/?map=48.85891,2.2768,13,normal
https://share.here.com/r/mylocation/48.85891,2.2768?m=o
```
**Формат**: параметры или путь с координатами

### 9. **TomTom** ❌ (не поддерживается)
```
https://www.tomtom.com/mapshare/tools/status#pos=48.85891*2.2768*13
```
**Формат**: `#pos={lat}*{lon}*{zoom}`

### 10. **Leaflet (общий)** ❌ (не поддерживается)
```
https://example.com/map/#13/48.85891/2.2768
```
**Формат**: `#{zoom}/{lat}/{lon}` (как Mapbox)

## 🎯 Приоритеты для реализации

### Высокий приоритет:
1. ✅ **Google Maps** - уже поддерживается
2. ⚠️ **Mapbox** - нужно улучшить поддержку всех форматов
3. ❌ **OpenStreetMap** - очень популярен
4. ❌ **Yandex Maps** - популярен в России

### Средний приоритет:
5. ❌ **Apple Maps** - растущая популярность
6. ❌ **Bing Maps** - используется в Microsoft продуктах
7. ❌ **Here Maps** - корпоративное использование

### Низкий приоритет:
8. ❌ **TomTom** - специализированный
9. ❌ **Leaflet** - используется разработчиками

## 🔧 План реализации

### Этап 1: Улучшить Mapbox поддержку
- Добавить поддержку всех форматов Mapbox URL
- Добавить поддержку bearing/pitch параметров

### Этап 2: Добавить OpenStreetMap
- Поддержка #map= формата
- Поддержка mlat/mlon параметров

### Этап 3: Добавить Yandex Maps
- Поддержка ll= параметра (lon,lat порядок!)
- Поддержка z= параметра

### Этап 4: Добавить Apple Maps и Bing
- Apple: ll= параметр (lat,lon порядок)
- Bing: cp= параметр с ~ разделителем

## 📝 Тестовые URL для проверки

```javascript
const testUrls = [
  // Google Maps
  "https://www.google.com/maps/@48.85891,2.2768,13.75z",
  
  // Mapbox variants  
  "https://api.mapbox.com/styles/v1/mapbox/streets-v11#13.75/48.85891/2.2768",
  "https://studio.mapbox.com/#13.75/48.85891/2.2768/0/45",
  
  // OpenStreetMap
  "https://www.openstreetmap.org/#map=13/48.85891/2.2768",
  "https://www.openstreetmap.org/?mlat=48.85891&mlon=2.2768#map=13/48.85891/2.2768",
  
  // Yandex Maps
  "https://yandex.ru/maps/?ll=2.2768%2C48.85891&z=13",
  
  // Apple Maps
  "https://maps.apple.com/?ll=48.85891,2.2768&z=13",
  
  // Bing Maps
  "https://www.bing.com/maps?cp=48.85891~2.2768&lvl=13"
];
```

---

**Следующий шаг**: Реализация улучшенной поддержки Mapbox
