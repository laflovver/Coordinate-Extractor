chrome.action.onClicked.addListener(async () => {
  console.log("Extension icon clicked");
  try {
    await chrome.action.openPopup();
    console.log("Popup opened successfully");
  } catch (error) {
    console.log("Popup not available, trying to open in new tab...", error.message);
    try {
      await chrome.tabs.create({ 
        url: chrome.runtime.getURL('popup.html'),
        active: true 
      });
      console.log("Extension opened in new tab");
    } catch (tabError) {
      console.error("Error opening extension:", tabError);
    }
  }
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
    
    try {
      // For Arc Browser compatibility: try chrome.action.openPopup first
      // Chrome doesn't support this from commands, but Arc might
      try {
        await chrome.action.openPopup();
        console.log("Popup opened via action.openPopup (Arc Browser?)");
        // Set fallback timeout to stop animation if popup doesn't send message
        setTimeout(() => stopLoadingAnimation(), 3000);
        return;
      } catch (popupError) {
        console.log("action.openPopup not available, using window method");
      }
      
      // chrome.action.openPopup() doesn't work from commands in Chrome
      // Create a popup window (type: 'popup') which looks like extension popup (no browser UI)
      const extensionUrl = chrome.runtime.getURL('popup.html');
      console.log("Extension URL:", extensionUrl);
      
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
        // Stop animation when focusing existing window
        stopLoadingAnimation();
      } else {
        // Create popup window (looks like extension popup, no browser UI)
        // Get current window position to position popup near it
        let currentWindow;
        try {
          currentWindow = await chrome.windows.getCurrent();
        } catch (e) {
          // Fallback if getCurrent fails (Arc Browser might handle this differently)
          currentWindow = { left: 100, top: 100, width: 1200 };
          console.log("Using default window position");
        }
        
        // Calculate position to appear near the extension icon area (top-right of browser)
        const popupWidth = 680;
        const popupHeight = 720;
        const left = currentWindow.left + Math.max(0, (currentWindow.width || 1200) - popupWidth - 50);
        const top = currentWindow.top + 50;
        
        const popupWindow = await chrome.windows.create({
          url: extensionUrl,
          type: 'popup', // This creates a window without browser UI (address bar, buttons, etc.)
          width: popupWidth,
          height: popupHeight,
          focused: true,
          left: left,
          top: top,
          // Don't set state, let it be window-like but minimal
        });
        console.log("Extension opened in popup window, window ID:", popupWindow.id);
        // Set fallback timeout to stop animation if popup doesn't send message
        setTimeout(() => stopLoadingAnimation(), 3000);
      }
    } catch (windowError) {
      console.error("Error opening extension via command:", windowError);
      // Stop animation on error
      stopLoadingAnimation();
      
      // Fallback: try opening in a tab if popup fails
      try {
        const extensionUrl = chrome.runtime.getURL('popup.html');
        await chrome.tabs.create({ 
          url: extensionUrl,
          active: true 
        });
        console.log("Fallback: Extension opened in new tab");
        // Set fallback timeout for tab as well
        setTimeout(() => stopLoadingAnimation(), 3000);
      } catch (tabError) {
        console.error("Error opening extension in tab:", tabError);
        stopLoadingAnimation();
      }
    }
  } else {
    console.log("Unknown command:", command);
  }
});
