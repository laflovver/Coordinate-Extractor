# 🔍 Анализ существующего кода

## 📊 Карта функций

### ui.js (419 строк, 12 функций)

| Функция | Строки | Тип | Зависимости | Сложность |
|---------|--------|-----|-------------|-----------|
| `getRandomReadableColor()` | 3-8 | Утилита | Нет | 🟢 Низкая |
| `animateButton(btn)` | 10-14 | Утилита | DOM | 🟢 Низкая |
| `logMessage(msg, type)` | 16-24 | UI | DOM | 🟢 Низкая |
| `renderSlotContent(el, text, color)` | 26-40 | UI | DOM, getRandomReadableColor | 🟡 Средняя |
| `snapScroll(el)` | 42-52 | Утилита | DOM | 🟢 Низкая |
| `updateSavedField(fieldId, textValue)` | 54-77 | Storage | Chrome Storage, parseCliString | 🟡 Средняя |
| `saveCoordinatesToSlot(coords)` | 79-84 | Storage | updateSavedField | 🟡 Средняя |
| `attachEditHotkey()` | 86-98 | События | DOM | 🟡 Средняя |
| `attachEditIconListeners()` | 100-169 | События | DOM, updateSavedField, renderSlotContent | 🔴 Высокая |
| `renderRecentCoordinates()` | 171-199 | UI+Storage | Chrome Storage, attachEditIconListeners | 🔴 Высокая |
| `updateSlotIndicator()` | 201-212 | UI | DOM | 🟢 Низкая |
| `selectSlot(slotNumber)` | 214-228 | UI | DOM, updateSlotIndicator, logMessage | 🟡 Средняя |

### urlUtils.js (282 строки, 5 функций)

| Функция | Строки | Тип | Зависимости | Сложность |
|---------|--------|-----|-------------|-----------|
| `logger` | 18-21 | Утилита | console | 🟢 Низкая |
| `updateActiveTabUrlWithCoordinates(coords)` | 23-131 | Browser API | Chrome Tabs API, alert | 🔴 Высокая |
| `extractCoordinates(url)` | 133-260 | Парсер | URL API | 🔴 Высокая |
| `parseCliString(cliString)` | 262-274 | Парсер | Нет | 🟢 Низкая |
| `displayCoordinates(coords)` | 276-282 | UI | DOM | 🟢 Низкая |

## 🎯 Приоритеты миграции

### Этап 1: Независимые утилиты (🟢)
**Риск: Минимальный**
- `parseCliString()` - парсер CLI
- `getRandomReadableColor()` - генерация цветов
- `snapScroll()` - прокрутка
- `animateButton()` - анимация
- `logMessage()` - логирование
- `updateSlotIndicator()` - индикатор слота

### Этап 2: Простые парсеры (🟡)  
**Риск: Низкий**
- `extractCoordinates()` - парсинг URL (большая, но независимая)
- `displayCoordinates()` - отображение

### Этап 3: UI компоненты (🟡)
**Риск: Средний**
- `renderSlotContent()` - рендеринг слотов
- `selectSlot()` - выбор слота

### Этап 4: Storage функции (🟡)
**Риск: Средний** 
- `updateSavedField()` - сохранение поля
- `saveCoordinatesToSlot()` - сохранение в слот

### Этап 5: Browser API (🔴)
**Риск: Высокий**
- `updateActiveTabUrlWithCoordinates()` - обновление URL

### Этап 6: Сложные UI (🔴)
**Риск: Высокий**
- `attachEditIconListeners()` - обработка редактирования
- `renderRecentCoordinates()` - рендеринг + события
- `attachEditHotkey()` - горячие клавиши

## 🧪 План тестирования

### Тестовые URL для проверки парсеров:
```
https://www.google.com/maps/@48.85891,2.2768,13.75z
https://api.mapbox.com/styles/v1/mapbox/streets-v11#13.75/48.85891/2.2768
https://earth.google.com/web/@48.85891,2.2768,35000a,35y,39.32t/data=somehash
```

### Тестовые CLI строки:
```
--lon 2.2768 --lat 48.85891 --zoom 13.75 --pitch 0 --bearing 0
--lon -74.0060 --lat 40.7128 --zoom 11.5
```

## 🔄 Стратегия замены

### Подход "Адаптер":
1. Создаем новые модули
2. Создаем адаптеры для совместимости
3. Постепенно заменяем вызовы
4. Удаляем адаптеры в конце

### Пример адаптера:
```javascript
// В ui.js временно добавляем:
function extractCoordinates(url) {
  return window.CoordinateParser.extractFromUrl(url);
}
```

## 📝 Следующие шаги

1. **Начать с parseCliString()** - простая, независимая функция
2. **Протестировать замену** на нескольких примерах  
3. **Перейти к следующей функции** только после успешного тестирования

---

**Готов к началу Этапа 2: Подготовка к миграции**
