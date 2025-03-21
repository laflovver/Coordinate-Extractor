"use strict";

const getRandomReadableColor = () => {
  const r = Math.floor(Math.random() * 128);
  const g = Math.floor(Math.random() * 128);
  const b = Math.floor(Math.random() * 128);
  return `rgb(${r}, ${g}, ${b})`;
};

const animateButton = (btn) => {
  if (!btn) return;
  btn.classList.add("key-animation", "stripe");
  setTimeout(() => btn.classList.remove("key-animation", "stripe"), 600);
};

const logMessage = (msg, type = "info") => {
  const logOutput = document.getElementById("log-output");
  if (!logOutput) return;
  const span = document.createElement("span");
  span.className = `log-message log-${type}`;
  span.textContent = msg.replace(/\n/g, " ") + " ";
  logOutput.appendChild(span);
  logOutput.scrollTop = logOutput.scrollHeight;
};

const renderSlotContent = (el, text, storedLabelColor = "") => {
  if (!el) return;
  let label = "";
  let coords = text;
  if (text.indexOf(" - ") !== -1) {
    const parts = text.split(" - ");
    label = parts[0].trim();
    coords = parts.slice(1).join(" - ").trim();
  }
  const labelColor = storedLabelColor || (label ? getRandomReadableColor() : "");
  el.innerHTML = label
    ? `<span class="slot-label" style="color: ${labelColor};">${label} - </span><span class="slot-coords">${coords}</span>`
    : `<span class="slot-coords">${coords}</span>`;
  el.scrollTop = 0;
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
  el.scrollTo({ top: el.scrollTop + adjustment, behavior: "smooth" });
};

const updateSavedField = (fieldId, textValue) =>
  chrome.storage.local.get({ recentCoordinates: [] }, (result) => {
    let recent = result.recentCoordinates || [];
    const index = parseInt(fieldId.split("-").pop(), 10);
    if (index >= 0 && index < 4) {
      let labelColor = "";
      if (index !== 0) {
        const slotContainer = document.getElementById("slot-saved-coords-" + index);
        const editIcon = slotContainer ? slotContainer.querySelector(".edit-icon") : null;
        labelColor = editIcon ? editIcon.dataset.labelColor : "";
      }
      recent[index] =
        textValue.trim() === ""
          ? null
          : (() => {
              const parts = textValue.split(" - ");
              const name = parts.length > 1 ? parts[0].trim() : "";
              const coordsStr = parts.length > 1 ? parts.slice(1).join(" - ").trim() : textValue.trim();
              const coords = parseCliString(coordsStr);
              return coords ? Object.assign({}, coords, { name, labelColor }) : null;
            })();
      chrome.storage.local.set({ recentCoordinates: recent }, renderRecentCoordinates);
    }
  });

const saveCoordinatesToSlot = (coords) => {
  if (!window.activeSavedFieldId || window.activeSavedFieldId === "saved-coords-0")
    return;
  const formatted = `--lon ${coords.lon} --lat ${coords.lat} --zoom ${coords.zoom} --pitch ${coords.pitch} --bearing ${coords.bearing}`;
  updateSavedField(window.activeSavedFieldId, formatted);
};

const attachEditHotkey = () => {
  document.addEventListener("keydown", (e) => {
    if (e.code === "KeyE" && !window.hotkeysDisabled) {
      const activeSlot = document.querySelector(".saved-slot-item.selected-saved");
      if (activeSlot) {
        const editIcon = activeSlot.querySelector(".edit-icon");
        if (editIcon) {
          editIcon.click();
        }
      }
    }
  });
};

const attachEditIconListeners = () => {
  document.querySelectorAll(".saved-slot-item .edit-icon").forEach((icon) => {
    const slot = icon.closest(".saved-slot-item");
    if (slot && slot.id === "slot-saved-coords-0") {
      icon.style.display = "none";
      return;
    }
    icon.addEventListener("click", (e) => {
      e.stopPropagation();
      icon.classList.add("edit-animate");
      icon.addEventListener("animationend", () => {
        icon.classList.remove("edit-animate");
      }, { once: true });
      window.hotkeysDisabled = true;
      if (!slot) return;
      const inner = slot.querySelector(".slot-inner") || slot;
      if (!inner || slot.querySelector(".label-input")) return;
      let currentLabel = "";
      const labelSpan = inner.querySelector(".slot-label");
      if (labelSpan) {
        currentLabel = labelSpan.textContent.replace(" - ", "");
      } else if (icon.dataset.label) {
        currentLabel = icon.dataset.label;
      }
      const input = document.createElement("input");
      input.type = "text";
      input.value = currentLabel;
      const randomColor = getRandomReadableColor();
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
      input.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") {
          const newLabel = input.value.trim();
          icon.dataset.label = newLabel;
          let coordText = "";
          const coordsSpan = inner.querySelector(".slot-coords");
          if (coordsSpan) {
            coordText = coordsSpan.textContent;
          }
          const newText = (newLabel ? newLabel + " - " : "") + coordText;
          renderSlotContent(inner, newText, icon.dataset.labelColor);
          updateSavedField(inner.id, newText);
          slot.removeChild(input);
          window.hotkeysDisabled = false;
        }
      });
      input.addEventListener("blur", () => {
        if (slot.contains(input)) {
          slot.removeChild(input);
          window.hotkeysDisabled = false;
        }
      });
    });
  });
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
          const cliStr = `--lon ${recent[index].lon} --lat ${recent[index].lat} --zoom ${recent[index].zoom} --pitch ${recent[index].pitch} --bearing ${recent[index].bearing}`;
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
  logMessage("ui.js loaded.", "info");
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
          logMessage("saved field " + inner.id + " selected.", "info");
        });
        slotContainer.addEventListener("keydown", (e) => {
          if (e.code === "Delete") {
            inner.textContent = "";
            updateSavedField(inner.id, "");
            logMessage("saved field " + inner.id + " cleared.", "info");
          }
        });
      }
    }
  });
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs.length) {
      logMessage("no active tab found.", "error");
      return;
    }
    const currentUrl = tabs[0].url;
    logMessage("active tab url: " + currentUrl, "info");
    const currentUrlEl = document.getElementById("current-url");
    if (currentUrlEl) currentUrlEl.textContent = currentUrl;
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
  
  const copyCliBtn = document.getElementById("copy-cli");
  if (copyCliBtn) {
    copyCliBtn.addEventListener("click", () => {
      animateButton(copyCliBtn);
      let textToCopy = "";
      if (window.activeSavedFieldId && window.activeSavedFieldId !== "saved-coords-0") {
        const inner = document.getElementById(window.activeSavedFieldId);
        if (inner) {
          const coordsSpan = inner.querySelector(".slot-coords");
          textToCopy = coordsSpan ? coordsSpan.textContent : inner.textContent;
        }
      } else {
        const cliOutput = document.getElementById("cli-output");
        textToCopy = cliOutput ? cliOutput.value : "";
      }
      navigator.clipboard
        .writeText(textToCopy)
        .then(() => logMessage("cli string copied to clipboard.", "success"))
        .catch((err) => logMessage("clipboard write error: " + err, "error"));
    });
  }
  
  const pasteCoordsBtn = document.getElementById("paste-coords");
  if (pasteCoordsBtn) {
    pasteCoordsBtn.addEventListener("click", async () => {
      animateButton(pasteCoordsBtn);
      try {
        const text = await navigator.clipboard.readText();
        logMessage("clipboard text: " + text, "info");
        const coords = parseCliString(text);
        if (coords) {
          const formatted = `--lon ${coords.lon} --lat ${coords.lat} --zoom ${coords.zoom} --pitch ${coords.pitch} --bearing ${coords.bearing}`;
          if (window.activeSavedFieldId && window.activeSavedFieldId !== "saved-coords-0") {
            const inner = document.getElementById(window.activeSavedFieldId);
            if (inner) {
              renderSlotContent(inner, formatted);
              updateSavedField(inner.id, formatted);
            }
          } else {
            const inner = document.getElementById("saved-coords-0");
            if (inner) renderSlotContent(inner, formatted);
          }
          window.clipboardCoords = coords;
          logMessage("coordinates parsed from clipboard: " + JSON.stringify(coords), "success");
        } else {
          alert("failed to parse coordinates from clipboard.");
          logMessage("failed to parse coordinates from clipboard.", "error");
        }
      } catch (err) {
        logMessage("clipboard error: " + err, "error");
        alert("clipboard error: " + err);
      }
    });
  }
  
  const navigateUrlBtn = document.getElementById("navigate-url");
  if (navigateUrlBtn) {
    navigateUrlBtn.addEventListener("click", () => {
      animateButton(navigateUrlBtn);
      let coordsToUse = null;
      if (window.activeSavedFieldId && window.activeSavedFieldId !== "saved-coords-0") {
        const inner = document.getElementById(window.activeSavedFieldId);
        if (inner && inner.textContent.trim() !== "") {
          if (inner.textContent.indexOf(" - ") !== -1) {
            const coordsSpan = inner.querySelector(".slot-coords");
            coordsToUse = parseCliString(coordsSpan ? coordsSpan.textContent : inner.textContent);
          } else {
            coordsToUse = parseCliString(inner.textContent);
          }
        }
      }
      if (!coordsToUse) {
        coordsToUse = window.clipboardCoords || null;
        if (!coordsToUse) {
          alert("please paste coordinates from clipboard first.");
          logMessage("no coordinates available.", "error");
          return;
        }
      }
      logMessage("navigating with coordinates: " + JSON.stringify(coordsToUse), "info");
      updateActiveTabUrlWithCoordinates(coordsToUse);
    });
  }
  
  document.addEventListener("keydown", (e) => {
    if (window.hotkeysDisabled) return;
    const tag = e.target.tagName.toLowerCase();
    if ((tag === "input" || tag === "textarea") && e.target.id !== window.activeSavedFieldId) {
      if (e.code === "Delete" && window.activeSavedFieldId) {
        const inner = document.getElementById(window.activeSavedFieldId);
        if (inner) {
          inner.textContent = "";
          updateSavedField(inner.id, "");
          logMessage("saved field " + inner.id + " cleared.", "info");
        }
      }
      return;
    }
    switch (e.code) {
      case "KeyC":
        e.preventDefault();
        logMessage("hotkey 'C' pressed.", "info");
        copyCliBtn && (animateButton(copyCliBtn), copyCliBtn.click());
        break;
      case "KeyV":
        e.preventDefault();
        logMessage("hotkey 'V' pressed.", "info");
        pasteCoordsBtn && (animateButton(pasteCoordsBtn), pasteCoordsBtn.click());
        break;
      case "KeyG":
        e.preventDefault();
        logMessage("hotkey 'G' pressed.", "info");
        navigateUrlBtn && (animateButton(navigateUrlBtn), navigateUrlBtn.click());
        break;
      case "KeyE":
        e.preventDefault();
        const activeSlot = document.querySelector(".saved-slot-item.selected-saved");
        if (activeSlot) {
          const editIcon = activeSlot.querySelector(".edit-icon");
          if (editIcon) {
            editIcon.click();
          }
        }
        break;
      case "Digit1":
      case "Digit2":
      case "Digit3":
        e.preventDefault();
        selectSlot(e.code.replace("Digit", ""));
        break;
    }
  });
});