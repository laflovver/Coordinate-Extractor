// Icon click opens popup via manifest default_popup, no need for manual handling
// chrome.action.onClicked is only called when default_popup is not set in manifest
// Since we have default_popup in manifest.json, this listener won't be called
// But keeping it empty to avoid any potential issues
chrome.action.onClicked.addListener(async () => {
  // Popup is handled by manifest default_popup
  // This listener is only called if default_popup is not set
  console.log("Extension icon clicked (popup handled by manifest)");
});

// Ensure service worker stays alive and listens for commands
console.log("Background service worker loaded");

// Loading animation state
let loadingAnimationInterval = null;
let loadingAnimationStep = 0;
let originalIconPath = null;
let iconBitmap = null;
const ANIMATION_STEPS = 12; // 12 steps = 30 degrees per step
const ANIMATION_SPEED = 100; // ms per step

/**
 * Load original icon image as ImageBitmap
 */
async function loadOriginalIcon() {
  if (iconBitmap) return iconBitmap;
  
  try {
    const iconUrl = chrome.runtime.getURL('image.png');
    const response = await fetch(iconUrl);
    const blob = await response.blob();
    iconBitmap = await createImageBitmap(blob);
    
    return iconBitmap;
  } catch (error) {
    console.error('Error loading icon:', error);
    return null;
  }
}

/**
 * Start loading animation by rotating icon
 */
async function startLoadingAnimation() {
  // Clear any existing animation
  await stopLoadingAnimation();
  
  // Store original icon path
  if (!originalIconPath) {
    originalIconPath = chrome.runtime.getURL('image.png');
  }
  
  // Load icon if not loaded
  const bitmap = await loadOriginalIcon();
  
  if (!bitmap) {
    console.error('Failed to load icon for animation');
    return;
  }
  
  // Start animation
  loadingAnimationStep = 0;
  loadingAnimationInterval = setInterval(async () => {
    const degrees = (loadingAnimationStep * 360) / ANIMATION_STEPS;
    
    try {
      const canvas = new OffscreenCanvas(128, 128);
      const ctx = canvas.getContext('2d');
      
      // Clear canvas
      ctx.clearRect(0, 0, 128, 128);
      
      // Rotate and draw
      ctx.save();
      ctx.translate(64, 64); // Move to center
      ctx.rotate((degrees * Math.PI) / 180); // Rotate
      ctx.drawImage(bitmap, -64, -64); // Draw centered
      ctx.restore();
      
      const imageData = ctx.getImageData(0, 0, 128, 128);
      await chrome.action.setIcon({ imageData: { 128: imageData } });
    } catch (error) {
      console.error('Error rotating icon:', error);
    }
    
    loadingAnimationStep = (loadingAnimationStep + 1) % ANIMATION_STEPS;
  }, ANIMATION_SPEED);
}

/**
 * Stop loading animation and restore original icon
 */
async function stopLoadingAnimation() {
  if (loadingAnimationInterval) {
    clearInterval(loadingAnimationInterval);
    loadingAnimationInterval = null;
  }
  
  // Restore original icon
  if (originalIconPath) {
    try {
      await chrome.action.setIcon({ path: originalIconPath });
    } catch (error) {
      console.error('Error restoring icon:', error);
    }
  } else {
    try {
      await chrome.action.setIcon({ path: 'image.png' });
    } catch (error) {
      console.error('Error restoring icon:', error);
    }
  }
}

// Listen for installation/update to ensure commands are registered
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed/updated, commands should be registered");
  stopLoadingAnimation();
});

// Listen for messages from popup when it's ready and other events
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received in background:", message);
  
  if (message === 'popup-ready' || message.type === 'popup-ready') {
    // Stop loading animation when popup is ready
    stopLoadingAnimation();
    sendResponse({ status: 'ok' });
    return true;
  }
  
  return true;
});

// Listen for all commands
chrome.commands.onCommand.addListener(async (command) => {
  console.log("Command received:", command);
  
  if (command === "open-extension") {
    console.log("Opening extension via keyboard shortcut...");
    
    // Start loading animation
    startLoadingAnimation();
    
    const extensionUrl = chrome.runtime.getURL('popup.html');
    
    // Check if extension popup window is already open
    const windows = await chrome.windows.getAll({ populate: true });
    const existingPopup = windows.find(win => {
      if (win.type === 'popup' && win.tabs && win.tabs.length > 0) {
        return win.tabs.some(tab => tab.url === extensionUrl);
      }
      return false;
    });
    
    if (existingPopup) {
      // If popup window exists, focus it and bring to front
      await chrome.windows.update(existingPopup.id, { focused: true });
      console.log("Focused existing popup window");
      stopLoadingAnimation();
      return;
    }
    
    // Try to open popup window
    try {
      // For Arc Browser compatibility: try chrome.action.openPopup first
      // Chrome doesn't support this from commands, but Arc might
      try {
        await chrome.action.openPopup();
        console.log("Popup opened via action.openPopup (Arc Browser?)");
        setTimeout(() => stopLoadingAnimation(), 3000);
        return;
      } catch (popupError) {
        console.log("action.openPopup not available, using window method");
      }
      
      // chrome.action.openPopup() doesn't work from commands in Chrome
      // Create a popup window (type: 'popup') which looks like extension popup (no browser UI)
      // Let browser position it automatically (no manual positioning)
      const popupWindow = await chrome.windows.create({
        url: extensionUrl,
        type: 'popup',
        width: 680,
        height: 720,
        focused: true
        // No left/top - let browser position it
      });
      console.log("Extension opened in popup window, window ID:", popupWindow.id);
      setTimeout(() => stopLoadingAnimation(), 3000);
    } catch (windowError) {
      console.error("Error opening extension via command:", windowError);
      stopLoadingAnimation();
    }
  } else {
    console.log("Unknown command:", command);
  }
});
