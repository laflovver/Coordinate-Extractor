"use strict";

// === MESSAGE CONSTANTS ===
const MESSAGES = {
  // System messages
  READY: "ready",
  CHROME_API_UNAVAILABLE: "Chrome API unavailable",
  CHROME_TABS_API_UNAVAILABLE: "Chrome tabs API unavailable", 
  CHROME_API_AVAILABLE: "Chrome API available",
  EXECUTING_TABS_QUERY: "Executing chrome.tabs.query...",
  
  // Tab information
  TABS_QUERY_ERROR: "chrome.tabs.query error:",
  TABS_QUERY_EXECUTED: "tabs query executed, found",
  NO_ACTIVE_TAB: "no active tab found",
  TAB_ID: "tab id:",
  TAB_TITLE: "tab title:",
  TAB_STATUS: "tab status:",
  TAB_URL: "tab url:",
  TAB_URL_UNDEFINED: "tab.url is undefined - check you're on http/https page",
  SPECIAL_PAGE_INFO: "if on chrome:// or special page, go to normal website",
  ACTIVE_TAB_URL: "active tab url:",
  
  // Coordinate parsing
  URL_EMPTY: "URL is empty - testing with sample URLs",
  TESTING_PARSER: "Testing coordinate parser...",
  COORDINATES_EXTRACTED: "coordinates extracted:",
  COORDINATES_NOT_FOUND: "coordinates not found in url",
  COORDINATES_PARSED: "coordinates parsed from clipboard:",
  COORDINATES_PARSE_FAILED: "failed to parse coordinates from clipboard",
  NO_COORDINATES_AVAILABLE: "no coordinates available",
  NAVIGATING_WITH_COORDINATES: "navigating with coordinates:",
  SKIPPING_EXTRACTION: "skipping coordinate extraction for chrome internal page",
  
  // Success messages
  PARSER_SUCCESS: "✅",
  PARSER_FAILED: "❌",
  COPIED_TO_CLIPBOARD: "cli string copied to clipboard",
  COORDINATES_COPIED: "coordinates copied to clipboard",
  
  // Error messages
  CLIPBOARD_WRITE_ERROR: "clipboard write error:",
  CLIPBOARD_ERROR: "clipboard error:",
  GEOCODING_ERROR: "Geocoding error:",
  
  // Field operations
  FIELD_SELECTED: "saved field",
  FIELD_CLEARED: "saved field",
  SELECTED: "selected",
  CLEARED: "cleared",
  
  // Hotkeys
  HOTKEY_C_PRESSED: "hotkey 'C' pressed",
  HOTKEY_V_PRESSED: "hotkey 'V' pressed", 
  HOTKEY_G_PRESSED: "hotkey 'G' pressed",
  
  // Permissions
  PERMISSIONS: "permissions:",
  
  // Location
  UNKNOWN_LOCATION: "Unknown Location"
};

const getRandomReadableColor = () => {
  const r = Math.floor(Math.random() * 128);
  const g = Math.floor(Math.random() * 128);
  const b = Math.floor(Math.random() * 128);
  return `rgb(${r}, ${g}, ${b})`;
};

// Function to get city/district name from coordinates
const getCityNameFromCoords = async (lat, lon) => {
  try {
    // Use OpenStreetMap Nominatim API for reverse geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1&accept-language=en`
    );
    
    if (response.ok) {
      const data = await response.json();
      const address = data.address;
      
      // Build a nice name
      let cityName = "";
      
      if (address.city) {
        cityName = address.city;
      } else if (address.town) {
        cityName = address.town;
      } else if (address.village) {
        cityName = address.village;
      } else if (address.suburb) {
        cityName = address.suburb;
      } else if (address.neighbourhood) {
        cityName = address.neighbourhood;
      }
      
      // Add country if available
      if (cityName && address.country) {
        cityName += `, ${address.country}`;
      }
      
      // If nothing found, use display_name
      if (!cityName && data.display_name) {
        const parts = data.display_name.split(',');
        cityName = parts.slice(0, 2).join(',').trim();
      }
      
      return cityName || MESSAGES.UNKNOWN_LOCATION;
    }
  } catch (error) {
    console.log(MESSAGES.GEOCODING_ERROR, error);
  }
  
  return null;
};

const animateButton = (btn) => {
  if (!btn) return;
  btn.classList.add("key-animation");
  setTimeout(() => btn.classList.remove("key-animation"), 200);
};

// Store log history
let logHistory = [];

const logMessage = (msg, type = "info") => {
  const logOutput = document.getElementById("log-output");
  if (!logOutput) return;
  
  // Skip verbose/unnecessary messages
  if (msg.includes(MESSAGES.TABS_QUERY_EXECUTED) || 
      msg.includes("Chrome API") || 
      msg.includes("Getting current tab") ||
      msg.includes(MESSAGES.PERMISSIONS) ||
      msg.includes(MESSAGES.TESTING_PARSER)) {
    return;
  }
  
  // Add to history
  const timestamp = new Date().toLocaleTimeString();
  logHistory.push({ msg: msg.replace(/\n/g, " "), type, timestamp });
  
  // Keep only last 50 messages (more for terminal-like behavior)
  if (logHistory.length > 50) {
    logHistory = logHistory.slice(-50);
  }
  
  // Create new message element
  const span = document.createElement('span');
  span.className = `log-message log-${type}`;
  span.textContent = `[${timestamp}] ${msg.replace(/\n/g, " ")}`;
  
  // Add new message to the end
  logOutput.appendChild(span);
  
  // Remove old messages if we have too many (keep only last 20 visible)
  const messages = logOutput.querySelectorAll('.log-message');
  if (messages.length > 20) {
    for (let i = 0; i < messages.length - 20; i++) {
      messages[i].remove();
    }
  }
  
  // Always scroll to bottom (terminal behavior)
  setTimeout(() => {
    logOutput.scrollTop = logOutput.scrollHeight;
  }, 50);
  
  // Auto-clear success messages after 5 seconds
  if (type === "success") {
    setTimeout(() => {
      if (logHistory.length > 0 && logHistory[logHistory.length - 1].msg === msg.replace(/\n/g, " ")) {
        logMessage(MESSAGES.READY, "info");
      }
    }, 5000);
  }
};

function displayCoordinates(coords) {
  if (!coords) return;
  
  // Check if DOM is ready
  if (document.readyState !== 'complete') {
    setTimeout(() => displayCoordinates(coords), 100);
    return;
  }
  
  // Format coordinates as CLI string
  const cliParts = [`--lon ${coords.lon}`, `--lat ${coords.lat}`];
  if (coords.zoom !== undefined) cliParts.push(`--zoom ${coords.zoom}`);
  if (coords.bearing !== undefined) cliParts.push(`--bearing ${coords.bearing}`);
  if (coords.pitch !== undefined) cliParts.push(`--pitch ${coords.pitch}`);
  const cliString = cliParts.join(' ');
  
  // Update CLI output
  const cliOutput = document.getElementById("cli-output");
  if (cliOutput) {
    cliOutput.value = cliString;
  }
  
  // Update slot 0
  const slot0Element = document.getElementById("saved-coords-0");
  if (slot0Element) {
    // Clear existing content first
    slot0Element.innerHTML = '';
    renderSlotContent(slot0Element, cliString);
    
    // Debug: check if hidden coordinates element was created
    const hiddenCoords = slot0Element.querySelector('.slot-coords-hidden');
    console.log('Hidden coordinates element created:', !!hiddenCoords);
    if (hiddenCoords) {
      console.log('Hidden coordinates content:', hiddenCoords.textContent);
    }
  }
}

const renderSlotContent = (el, text, storedLabelColor = "") => {
  if (!el) return;
  let label = "";
  let coords = text;
  if (text.indexOf(" - ") !== -1) {
    const parts = text.split(" - ");
    label = parts[0].trim();
    coords = parts.slice(1).join(" - ").trim();
  }
  
  // Clear content
  el.innerHTML = "";
  
  // If we have a label, show only the label (coordinates are hidden)
  if (label) {
    // Remove existing "..." from label if it exists
    const cleanLabel = label.replace(/^\.\.\.\s*/, '');
    
    // Add visual indicator before label
    const indicatorSpan = document.createElement("span");
    indicatorSpan.className = "slot-indicator";
    indicatorSpan.textContent = "...";
    el.appendChild(indicatorSpan);
    
    const labelSpan = document.createElement("span");
    labelSpan.className = "slot-label";
    labelSpan.textContent = cleanLabel;
    const labelColor = storedLabelColor || "";
    if (labelColor) {
      labelSpan.style.color = labelColor;
    }
    el.appendChild(labelSpan);
    
    // Don't show coordinates when there's a label - they will be shown on hover
    // The coordinates are stored in data attribute for later use
    el.dataset.coordinates = coords;
    
  } else {
    // If no label, show coordinates normally
    const coordsSpan = document.createElement("span");
    coordsSpan.className = "slot-coords";
    coordsSpan.textContent = coords;
    el.appendChild(coordsSpan);
    
    // Add hidden coordinates that appear on hover (same as labeled slots)
    const hiddenCoordsSpan = document.createElement("span");
    hiddenCoordsSpan.className = "slot-coords-hidden";
    hiddenCoordsSpan.textContent = coords;
    el.appendChild(hiddenCoordsSpan);
    
    
    // Add hover event to scroll to end of coordinates with debouncing
    const slotItem = el.closest('.saved-slot-item');
    if (slotItem) {
      let scrollTimeout;
      slotItem.addEventListener('mouseenter', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          hiddenCoordsSpan.scrollLeft = hiddenCoordsSpan.scrollWidth;
        }, 400); // Wait for animation to complete
      });
      
      // Add smooth scrolling on wheel
      hiddenCoordsSpan.addEventListener('wheel', (e) => {
        e.preventDefault();
        const scrollAmount = e.deltaY > 0 ? 20 : -20;
        hiddenCoordsSpan.scrollTo({
          left: hiddenCoordsSpan.scrollLeft + scrollAmount,
          behavior: 'smooth'
        });
      });
    }
    
    // Store coordinates in data attribute for later use
    el.dataset.coordinates = coords;
  }
  
  // Add hidden coordinates that appear on hover for all slots
  const hiddenCoordsSpan = document.createElement("span");
  hiddenCoordsSpan.className = "slot-coords-hidden";
  hiddenCoordsSpan.textContent = coords;
  el.appendChild(hiddenCoordsSpan);
  
  // Add hover event to scroll to end of coordinates
  const slotItem = el.closest('.saved-slot-item');
  if (slotItem) {
    slotItem.addEventListener('mouseenter', () => {
      // Simple scroll to end like cli-output
      hiddenCoordsSpan.scrollLeft = hiddenCoordsSpan.scrollWidth;
    });
    
    // Add smooth scrolling on wheel
    hiddenCoordsSpan.addEventListener('wheel', (e) => {
      e.preventDefault();
      const scrollAmount = e.deltaY > 0 ? 50 : -50;
      hiddenCoordsSpan.scrollLeft += scrollAmount;
    });
  }
  
  el.scrollTop = 0;
};

// Function to clear slot label when new coordinates are inserted
const clearSlotLabel = (slotId) => {
  const inner = document.getElementById(slotId);
  if (!inner) return;
  
  // If slot has a label, clear it and show coordinates
  if (inner.dataset.coordinates) {
    const coords = inner.dataset.coordinates;
    inner.innerHTML = `<span class="slot-coords">${coords}</span>`;
    delete inner.dataset.coordinates;
  }
};

const snapScroll = (el) => {
  const computedStyle = window.getComputedStyle(el);
  let lineHeight = parseFloat(computedStyle.lineHeight);
  if (isNaN(lineHeight)) {
    lineHeight = 21;
  }
  const twoLines = lineHeight * 2;
  const remainder = el.scrollTop % twoLines;
  const adjustment = remainder < twoLines / 2 ? -remainder : twoLines - remainder;
  
  // Add bounce effect with custom easing
  const startScroll = el.scrollTop;
  const targetScroll = startScroll + adjustment;
  const distance = targetScroll - startScroll;
  
  if (Math.abs(distance) > 0) {
    // Custom bounce animation
    let startTime = null;
    const duration = 200; // 200ms for quick bounce
    
    const bounceEase = (t) => {
      // Bounce easing function
      if (t < 0.5) {
        return 2 * t * t;
      } else {
        return 1 - Math.pow(-2 * t + 2, 2) / 2;
      }
    };
    
    const animateScroll = (currentTime) => {
      if (startTime === null) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easedProgress = bounceEase(progress);
      const currentScroll = startScroll + (distance * easedProgress);
      
      el.scrollTop = currentScroll;
      
      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };
    
    requestAnimationFrame(animateScroll);
  }
};

const updateSavedField = (fieldId, textValue) =>
  chrome.storage.local.get({ recentCoordinates: [] }, (result) => {
    let recent = result.recentCoordinates || [];
    const index = parseInt(fieldId.split("-").pop(), 10);
    if (index >= 0 && index < 4) {
      let labelColor = "";
      if (index !== 0) {
        const slotContainer = document.getElementById("slot-saved-coords-" + index);
        const editBtn = slotContainer ? slotContainer.querySelector(".edit-btn") : null;
        labelColor = editBtn ? editBtn.dataset.labelColor : "";
      }
      recent[index] =
        textValue.trim() === ""
          ? null
          : (() => {
              const parts = textValue.split(" - ");
              const name = parts.length > 1 ? parts[0].trim() : "";
              const coordsStr = parts.length > 1 ? parts.slice(1).join(" - ").trim() : textValue.trim();
              const coords = parseCliString(coordsStr);
              return coords ? Object.assign({}, coords, { name, labelColor, userNamed: true }) : null;
            })();
      chrome.storage.local.set({ recentCoordinates: recent }, renderRecentCoordinates);
    }
  });

const saveCoordinatesToSlot = (coords) => {
  if (!window.activeSavedFieldId || window.activeSavedFieldId === "saved-coords-0")
    return;
  
  // Format CLI string with available fields only
  const cliParts = [`--lon ${coords.lon}`, `--lat ${coords.lat}`];
  if (coords.zoom !== undefined) cliParts.push(`--zoom ${coords.zoom}`);
  if (coords.pitch !== undefined) cliParts.push(`--pitch ${coords.pitch}`);
  if (coords.bearing !== undefined) cliParts.push(`--bearing ${coords.bearing}`);
  const formatted = cliParts.join(' ');
  
  updateSavedField(window.activeSavedFieldId, formatted);
};

const attachEditHotkey = () => {
  document.addEventListener("keydown", (e) => {
    if ((e.code === "KeyE" || e.code === "KeyУ") && !window.hotkeysDisabled) {
      const activeSlot = document.querySelector(".saved-slot-item.selected-saved");
      if (activeSlot) {
        const editBtn = activeSlot.querySelector(".edit-btn");
        if (editBtn) {
          editBtn.click();
        }
      }
    }
  });
};

// === EDIT BUTTONS CONSTANTS ===
const EDIT_BUTTONS = {
  DELETE: {
    text: '⌫',
    title: 'Delete (Backspace)',
    key: 'Backspace',
    modifier: 'ctrlKey'
  },
  APPLY: {
    text: 's', 
    title: 'Submit (Enter)',
    key: 'Enter',
    modifier: null
  }
};

const EDIT_STYLES = {
  button: `
    height: 16px;
    padding: 0 var(--space-xs);
    background: var(--text-light);
    color: var(--white);
    border-radius: 3px;
    font-family: 'Roboto Mono', monospace;
    font-size: 8px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.6;
    transition: opacity 0.2s ease;
    text-transform: lowercase;
    backdrop-filter: blur(4px);
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
    border: none;
    outline: none;
    user-select: none;
  `,
  container: `
    display: flex;
    gap: var(--space-xs);
    align-items: center;
    flex-shrink: 0;
    position: absolute;
    right: 32px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 15;
  `,
  inputContainer: `
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    background: var(--white);
    border: 1px solid var(--border-focus);
    border-radius: var(--border-radius);
    z-index: 10;
    display: flex;
    align-items: center;
    padding: var(--space-md);
    padding-right: 50px;
    box-sizing: border-box;
  `
};

// === EDIT BUTTONS HELPER FUNCTIONS ===
const createEditButton = (type, onClick) => {
  const config = EDIT_BUTTONS[type];
  const button = document.createElement("button");
  
  button.innerHTML = config.text;
  button.title = config.title;
  button.style.cssText = EDIT_STYLES.button;
  
  // Enhanced hover effects with smooth animations
  button.addEventListener("mouseenter", () => {
    button.style.opacity = "1";
    button.style.transform = "scale(1.02)";
    button.style.boxShadow = "0 4px 12px rgba(145, 154, 168, 0.4)";
    button.style.transition = "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
  });
  button.addEventListener("mouseleave", () => {
    button.style.opacity = "0.6";
    button.style.transform = "scale(1)";
    button.style.boxShadow = "0 0 8px rgba(255, 255, 255, 0.3)";
    button.style.transition = "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
  });
  button.addEventListener("mousedown", () => {
    button.style.transform = "scale(0.98)";
  });
  button.addEventListener("mouseup", () => {
    button.style.transform = "scale(1.02)";
  });
  
  // Click handler with event prevention
  button.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });
  
  // Prevent focus on click
  button.addEventListener("mousedown", (e) => {
    e.preventDefault();
  });
  
  return button;
};

const createEditButtonsContainer = (deleteHandler, applyHandler) => {
  const container = document.createElement("div");
  container.style.cssText = EDIT_STYLES.container;
  
  const deleteBtn = createEditButton('DELETE', deleteHandler);
  const applyBtn = createEditButton('APPLY', applyHandler);
  
  container.appendChild(deleteBtn);
  container.appendChild(applyBtn);
  
  return { container, deleteBtn, applyBtn };
};

const createEditInputContainer = (input, buttonsContainer) => {
  const container = document.createElement("div");
  container.style.cssText = EDIT_STYLES.inputContainer;
  
  container.appendChild(input);
  if (buttonsContainer) {
    container.appendChild(buttonsContainer);
  }
  
  return container;
};

const setupEditInputHandlers = (input, deleteBtn, applyBtn, cleanup) => {
  input.addEventListener("keydown", (ev) => {
    if (ev.key === EDIT_BUTTONS.APPLY.key) {
      applyBtn.click();
    } else if (ev.key === EDIT_BUTTONS.DELETE.key && ev.ctrlKey) {
      deleteBtn.click();
    }
  });
  
  input.addEventListener("blur", () => {
    cleanup();
  });
};

const attachEditIconListeners = () => {
  document.querySelectorAll(".saved-slot-item .edit-btn").forEach((btn) => {
    const slot = btn.closest(".saved-slot-item");
    
    // Skip slot 0 (no edit button)
    if (slot && slot.id === "slot-saved-coords-0") {
      btn.style.display = "none";
      return;
    }
    
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      startEditMode(btn, slot);
    });
  });
};

const startEditMode = (btn, slot) => {
  // Animation and state
  btn.classList.add("edit-animate");
  btn.addEventListener("animationend", () => {
    btn.classList.remove("edit-animate");
  }, { once: true });
  
  window.hotkeysDisabled = true;
  
  // Get slot elements
  const inner = slot.querySelector(".slot-inner") || slot;
  if (!inner || slot.querySelector(".label-input")) return;
  
  // Get current label
  const currentLabel = getCurrentSlotLabel(inner, btn);
  
  // Create input
  const input = createEditInput(currentLabel, btn);
  
  // Hide original content
  inner.style.display = "none";
  
  // Create input container
  const inputContainer = createEditInputContainer(input, null);
  
  // Flag to prevent multiple cleanup calls
  let isCleanedUp = false;
  
  // Setup cleanup function
  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    
    if (slot.contains(inputContainer)) {
      inner.style.display = "flex";
      slot.removeChild(inputContainer);
    }
    window.hotkeysDisabled = false;
  };
  
  // Create buttons and handlers after cleanup is defined
  const { container: buttonsContainer, deleteBtn, applyBtn } = createEditButtonsContainer(
    () => clearInput(input),
    () => {
      if (isCleanedUp) return;
      const newLabel = input.value.trim();
      const coordText = inner.dataset.coordinates || 
        (inner.querySelector(".slot-coords") ? inner.querySelector(".slot-coords").textContent : inner.textContent);
      // Add "..." prefix to the label only if it doesn't already have it
      const labelWithPrefix = newLabel ? (newLabel.startsWith("...") ? newLabel : "..." + newLabel) : "";
      const newText = (labelWithPrefix ? labelWithPrefix + " - " : "") + coordText;
      
      renderSlotContent(inner, newText, btn.dataset.labelColor);
      updateSavedField(inner.id, newText);
      cleanup();
    }
  );
  
  // Add buttons to container
  inputContainer.appendChild(buttonsContainer);
  
  // Setup event handlers
  setupEditInputHandlers(input, deleteBtn, applyBtn, cleanup);
  
  // Add to DOM and focus
  slot.appendChild(inputContainer);
  input.focus();
  input.setSelectionRange(0, 0);
};

const getCurrentSlotLabel = (inner, btn) => {
  const labelSpan = inner.querySelector(".slot-label");
  if (labelSpan) {
    return labelSpan.textContent.replace(" - ", "");
  }
  return btn.dataset.label || "";
};

const createEditInput = (currentLabel, btn) => {
  const input = document.createElement("input");
  input.type = "text";
  // Remove "..." from current label if it exists, we'll add it back
  const cleanLabel = currentLabel.replace(/^\.\.\.\s*/, '');
  input.value = cleanLabel;
  input.classList.add("label-input");
  
  const randomColor = getRandomReadableColor();
  btn.dataset.labelColor = randomColor;
  
  Object.assign(input.style, {
    flex: 1,
    fontSize: "11px",
    fontFamily: "'Roboto Mono', monospace",
    color: randomColor,
    background: "transparent",
    border: "none",
    outline: "none",
    padding: "0",
    margin: "0",
    transition: "all 0.2s ease"
  });
  
  // Add typing animation
  input.addEventListener("input", () => {
    input.style.animation = "typingGlow 0.5s ease-out";
    setTimeout(() => {
      input.style.animation = "";
    }, 500);
  });
  
  return input;
};

const clearInput = (input) => {
  input.value = "";
  input.focus();
};


const renderRecentCoordinates = () =>
  chrome.storage.local.get({ recentCoordinates: [] }, (result) => {
    const recent = result.recentCoordinates || [];
    const fields = ["saved-coords-0", "saved-coords-1", "saved-coords-2", "saved-coords-3"];
    fields.forEach((id, index) => {
      const inner = document.getElementById(id);
      if (inner) {
        if (!recent[index]) {
          inner.textContent = `Coordinate slot ${index} ...`;
        } else {
          // Format CLI string with available fields only
          const cliParts = [`--lon ${recent[index].lon}`, `--lat ${recent[index].lat}`];
          if (recent[index].zoom !== undefined) cliParts.push(`--zoom ${recent[index].zoom}`);
          if (recent[index].pitch !== undefined) cliParts.push(`--pitch ${recent[index].pitch}`);
          if (recent[index].bearing !== undefined) cliParts.push(`--bearing ${recent[index].bearing}`);
          const cliStr = cliParts.join(' ');
          
          const label = recent[index].name ? recent[index].name : "";
          const fullText = label ? label + " - " + cliStr : cliStr;
          renderSlotContent(inner, fullText, recent[index].labelColor || "");
        }
      }
    });
    attachEditIconListeners();
    attachEditHotkey();
    document.querySelectorAll(".saved-slot-item .slot-inner").forEach((inner) => {
      inner.addEventListener("scroll", () => {
        clearTimeout(inner.snapTimeout);
        inner.snapTimeout = setTimeout(() => {
          snapScroll(inner);
        }, 100);
      });
    });
    updateSlotIndicator();
  });

const updateSlotIndicator = () => {
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
};

const selectSlot = (slotNumber) => {
  document.querySelectorAll(".saved-slot-item").forEach((slot) => {
    slot.classList.remove("selected-saved");
  });
  const activeSlot = document.getElementById("slot-saved-coords-" + slotNumber);
  if (activeSlot) {
    activeSlot.classList.add("selected-saved");
    updateSlotIndicator();
    const inner = activeSlot.querySelector(".slot-inner") || activeSlot;
    if (inner) {
      window.activeSavedFieldId = inner.id;
      logMessage("saved field " + inner.id + " selected.", "info");
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  logMessage(MESSAGES.READY, "info");
  
  // Initialize immediately
  if (typeof CoordinateExtractorApp !== 'undefined') {
    const app = new CoordinateExtractorApp();
    app.init().catch(error => {
      console.error('Failed to initialize app:', error);
    });
  } else {
    // Fallback: use legacy coordinate extraction
    if (typeof extractCoordinates !== 'undefined') {
      extractCurrentTabCoordinates();
    }
  }

  // Auto-scroll to bottom when log expands
  const coordsSection = document.querySelector('.coords-section');
  const logContainer = document.getElementById('log-output');
  
  if (coordsSection && logContainer) {
    coordsSection.addEventListener('mouseenter', () => {
      setTimeout(() => {
        logContainer.scrollTop = logContainer.scrollHeight;
      }, 100);
    });
  }
  
  // Check Chrome API availability
  if (typeof chrome === 'undefined') {
    logMessage(MESSAGES.CHROME_API_UNAVAILABLE, "error");
    return;
  }
  
  if (typeof chrome.tabs === 'undefined') {
    logMessage(MESSAGES.CHROME_TABS_API_UNAVAILABLE, "error");
    return;
  }
  
  logMessage(MESSAGES.CHROME_API_AVAILABLE, "success");
  
  renderRecentCoordinates();
  window.activeSavedFieldId = "saved-coords-0";
  window.hotkeysDisabled = false;
  
  const slotContainerIds = [
    "saved-coords-0",
    "saved-coords-1",
    "saved-coords-2",
    "saved-coords-3"
  ];
  slotContainerIds.forEach((innerId) => {
    const inner = document.getElementById(innerId);
    if (inner) {
      inner.setAttribute("tabindex", "0");
      const slotContainer = inner.closest(".saved-slot-item");
      if (slotContainer) {
        slotContainer.addEventListener("click", () => {
          document.querySelectorAll(".saved-slot-item").forEach((slot) => {
            slot.classList.remove("selected-saved");
          });
          slotContainer.classList.add("selected-saved");
          updateSlotIndicator();
          window.activeSavedFieldId = inner.id;
          logMessage(MESSAGES.FIELD_SELECTED + " " + inner.id + " " + MESSAGES.SELECTED + ".", "info");
        });
      }
    }
  });
  
  logMessage(MESSAGES.EXECUTING_TABS_QUERY, "info");
  
  // Check permissions
  if (chrome.permissions) {
    chrome.permissions.getAll((permissions) => {
      logMessage(MESSAGES.PERMISSIONS + " " + JSON.stringify(permissions), "info");
    });
  }
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    // Check for Chrome API errors
    if (chrome.runtime.lastError) {
      logMessage("chrome.tabs.query error: " + chrome.runtime.lastError.message, "error");
      return;
    }
    
    logMessage("tabs query executed, found " + (tabs ? tabs.length : 0) + " tabs", "info");
    
    if (!tabs || !tabs.length) {
      logMessage("no active tab found.", "error");
      return;
    }
    
    const tab = tabs[0];
    logMessage("tab id: " + tab.id, "info");
    logMessage("tab title: " + (tab.title || "no title"), "info");
    logMessage("tab status: " + tab.status, "info");
    logMessage("tab url: " + (tab.url || "undefined"), tab.url ? "success" : "error");
    
    if (!tab.url) {
      logMessage("tab.url is undefined - check you're on http/https page", "error");
      logMessage("if on chrome:// or special page, go to normal website", "info");
    }
    
    const currentUrl = tab.url;
    logMessage("active tab url: " + currentUrl, "info");
    const currentUrlEl = document.getElementById("current-url");
    if (currentUrlEl) currentUrlEl.textContent = currentUrl;
    
    // Check if URL is valid before parsing (only for Chrome internal pages)
    if (!currentUrl) {
      logMessage("URL is empty - testing with sample URLs", "error");
      
      // Temporarily test parser with sample URLs
      logMessage("Тестируем парсер координат...", "info");
      const sampleUrls = [
        "https://www.google.com/maps/@48.85891,2.2768,13.75z",
        "https://api.mapbox.com/styles/v1/mapbox/streets-v11#13.75/48.85891/2.2768",
        "https://www.openstreetmap.org/#map=13/48.85891/2.2768",
        "https://sites.mapbox.com/mbx-3dbuilding-tools-staging/#/model-slots/2022-10-10/review/?center=17%2F139.82942805372113%2F35.732227090774394&jira_summary=&jira_status=&jira_issue_id=&jira_labels=&jira_fix_versions=bmw_br&env=stg-styled&city=&lights=day&colorization="
      ];
      
      sampleUrls.forEach((testUrl, index) => {
        const testResult = CoordinateParser.extractFromUrl(testUrl);
        const serviceName = testUrl.includes('google.com') ? 'Google Maps' :
                           testUrl.includes('mapbox.com') ? 'Mapbox' :
                           testUrl.includes('openstreetmap.org') ? 'OpenStreetMap' : 'Unknown';
        
        if (testResult) {
          logMessage(`✅ ${serviceName}: lat=${testResult.lat}, lon=${testResult.lon}, zoom=${testResult.zoom}`, "success");
          if (index === 0) {
            // Show first successful result
            displayCoordinates(testResult);
            const inner = document.getElementById("saved-coords-0");
            if (inner) {
              // Format CLI string with available fields only
            const cliParts = [`--lon ${testResult.lon}`, `--lat ${testResult.lat}`];
            if (testResult.zoom !== undefined) cliParts.push(`--zoom ${testResult.zoom}`);
            if (testResult.bearing !== undefined) cliParts.push(`--bearing ${testResult.bearing}`);
            if (testResult.pitch !== undefined) cliParts.push(`--pitch ${testResult.pitch}`);
            const cliString = cliParts.join(' ');
              // Clear label when inserting new coordinates
              clearSlotLabel(inner.id);
              renderSlotContent(inner, cliString);
            }
          }
        } else {
          logMessage(`❌ ${serviceName}: parsing failed`, "error");
        }
      });
      return;
    }
    
    if (currentUrl.startsWith('chrome://') || currentUrl.startsWith('chrome-extension://')) {
      logMessage("skipping coordinate extraction for chrome internal page", "info");
      const inner = document.getElementById("saved-coords-0");
      if (inner) inner.textContent = "chrome internal page";
      return;
    }
    
    // Try CoordinateParser first, then fallback to legacy extractCoordinates
    let coords = null;
    
    if (typeof CoordinateParser !== 'undefined') {
      coords = CoordinateParser.extractFromUrl(currentUrl);
    } else if (typeof extractCoordinates !== 'undefined') {
      coords = extractCoordinates(currentUrl);
    }
    
    if (coords) {
      logMessage("coordinates extracted: " + JSON.stringify(coords), "success");
      displayCoordinates(coords);
    } else {
      logMessage("coordinates not found in url.", "error");
      const inner = document.getElementById("saved-coords-0");
      if (inner) inner.textContent = "coordinates not found";
    }
  });
  
  
  
  // Initialize the main application
  console.log('Checking for CoordinateExtractorApp:', typeof CoordinateExtractorApp);
  console.log('Checking for CoordinateParser:', typeof CoordinateParser);
  console.log('Checking for StorageManager:', typeof StorageManager);
  console.log('Checking for BrowserManager:', typeof BrowserManager);
  console.log('Checking for UIComponents:', typeof UIComponents);
  
  // Initialize immediately
  if (typeof CoordinateExtractorApp !== 'undefined') {
    console.log('Initializing CoordinateExtractorApp...');
    const app = new CoordinateExtractorApp();
    app.init().catch(error => {
      console.error('Failed to initialize app:', error);
    });
  } else {
    console.log('CoordinateExtractorApp not available, falling back to legacy initialization');
    
    // Fallback: use legacy coordinate extraction
    if (typeof extractCoordinates !== 'undefined') {
      console.log('Using legacy extractCoordinates function');
      // Call legacy coordinate extraction
      extractCurrentTabCoordinates();
    } else {
      console.log('No coordinate extraction available');
    }
  }
  
  // Fallback function for coordinate extraction
  function extractCurrentTabCoordinates() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        logMessage("no active tab found.", "error");
        return;
      }
      
      const currentUrl = tabs[0].url;
      logMessage("active tab url: " + currentUrl, "info");
      
      if (currentUrl.startsWith('chrome://') || currentUrl.startsWith('chrome-extension://')) {
        logMessage("skipping coordinate extraction for chrome internal page", "info");
        const inner = document.getElementById("saved-coords-0");
        if (inner) inner.textContent = "chrome internal page";
        return;
      }
      
      const coords = extractCoordinates(currentUrl);
      if (coords) {
        logMessage("coordinates extracted: " + JSON.stringify(coords), "success");
        displayCoordinates(coords);
      } else {
        logMessage("coordinates not found in url.", "error");
        const inner = document.getElementById("saved-coords-0");
        if (inner) inner.textContent = "coordinates not found";
      }
    });
  }
});