// Content script to update URL without full page reload
// This allows maps to react to URL changes

(function() {
  'use strict';

  // Listen for messages from popup/background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateUrl') {
      try {
        const { url } = request;
        
        // Try to update URL using History API (no reload)
        if (window.history && window.history.replaceState) {
          // Parse the new URL
          const newUrl = new URL(url);
          const currentUrl = new URL(window.location.href);
          
          // Only update if domain matches (security)
          if (newUrl.origin === currentUrl.origin) {
            const oldHref = window.location.href;
            
            // Update URL without reload
            window.history.replaceState({}, '', url);
            
            // Dispatch hashchange event if hash changed (many maps listen to this)
            if (newUrl.hash !== currentUrl.hash) {
              // Create hashchange event (cross-browser compatible)
              let hashChangeEvent;
              if (typeof HashChangeEvent !== 'undefined') {
                hashChangeEvent = new HashChangeEvent('hashchange', {
                  oldURL: currentUrl.href,
                  newURL: url
                });
              } else {
                // Fallback for older browsers
                hashChangeEvent = document.createEvent('HashChangeEvent');
                hashChangeEvent.initHashChangeEvent('hashchange', false, false, currentUrl.href, url);
              }
              window.dispatchEvent(hashChangeEvent);
            }
            
            // Dispatch popstate event (some maps listen to this)
            const popStateEvent = new PopStateEvent('popstate', {
              state: {}
            });
            window.dispatchEvent(popStateEvent);
            
            // Some maps read window.location directly, so we need to trigger a check
            // But we can't directly modify window.location without reload
            // Instead, dispatch a custom event that maps might listen to
            const locationChangeEvent = new CustomEvent('locationchange', {
              detail: { href: url, oldHref: oldHref }
            });
            window.dispatchEvent(locationChangeEvent);
            
            sendResponse({ success: true, method: 'history' });
            return true;
          } else {
            // Different origin - need to use tabs.update (will reload)
            sendResponse({ success: false, reason: 'different_origin', needsReload: true });
            return true;
          }
        } else {
          // History API not available - need reload
          sendResponse({ success: false, reason: 'no_history_api', needsReload: true });
          return true;
        }
      } catch (error) {
        console.error('Error updating URL:', error);
        sendResponse({ success: false, error: error.message, needsReload: true });
        return true;
      }
    }
  });
})();

