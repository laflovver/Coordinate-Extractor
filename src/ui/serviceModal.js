"use strict";

/**
 * Service Modal Manager
 * Handles modal for service selection
 */
class ServiceModal {
  
  constructor() {
    this.modal = null;
    this.serviceGrid = null;
    this.customServices = [];
    this.hiddenServices = new Set();
    
    // Standard services configuration
    this.standardServices = [
      { name: 'Mapbox Standard', urlTemplate: 'https://labs.mapbox.com/standard-style/#{{zoom}}/{{lat}}/{{lon}}', color: '#1A73E8', backgroundImage: 'https://labs.mapbox.com/favicon.ico' },
      { name: '3D Buildings Box', urlTemplate: 'https://hey.mapbox.com/3D-Buildings-Box/#{{zoom}}/{{lat}}/{{lon}}/{{bearing}}/{{pitch}}', color: '#FF9800', backgroundImage: 'file:///Users/yauhenitabolich/Downloads/mapbox-pin-star.png' },
      { name: '3DLN Demo Style', urlTemplate: 'https://api.mapbox.com/styles/v1/mapbox-3dln/mbx-3d-line-navigation-demo-style.html?title=view&access_token=pk.eyJ1IjoibWFwYm94LTNkbG4iLCJhIjoiY200djloOGQ2MDBmNDJpc2J5OHVtdDVkNCJ9.-Lbyn-czRBlAxwl-yNWdTg&zoomwheel=true&fresh=true#{{zoom}}/{{lat}}/{{lon}}', color: '#E91E63', backgroundImage: 'https://www.mapbox.com/favicon.ico' },
      { name: 'Google Maps', urlTemplate: 'https://www.google.com/maps/@{{lat}},{{lon}},{{zoom}}z', color: '#4285F4', backgroundImage: 'https://www.google.com/favicon.ico' },
      { name: 'Google Earth', urlTemplate: 'https://earth.google.com/web/@{{lat}},{{lon}},{{zoom}}a,0y,0h,0t,0r', color: '#FF9800', backgroundImage: 'https://earth.google.com/favicon.ico' },
      { name: 'Direction Debug', urlTemplate: 'https://console.mapbox.com/directions-debug/#map={{lon}},{{lat}},{{zoom}}z', color: '#00BCD4', backgroundImage: 'https://www.mapbox.com/favicon.ico' },
      { name: 'OpenStreetMap', urlTemplate: 'https://www.openstreetmap.org/#map={{zoom}}/{{lat}}/{{lon}}', color: '#7EBC6F', backgroundImage: 'https://www.openstreetmap.org/favicon.ico' },
      { name: 'Bing Maps', urlTemplate: 'https://www.bing.com/maps?cp={{lat}}~{{lon}}&lvl={{zoom}}', color: '#008373', backgroundImage: 'https://www.bing.com/favicon.ico' },
      { name: 'Yandex Maps', urlTemplate: 'https://yandex.by/maps/?ll={{lon}},{{lat}}&z={{zoom}}', color: '#FF0000', backgroundImage: 'https://yandex.by/favicon.ico' },
    ];
  }
  
  /**
   * Initialize modal
   */
  async init() {
    this.serviceGrid = document.getElementById('service-grid');
    
    if (!this.serviceGrid) {
      console.error('Service grid not found');
      return;
    }
    
    this.loadCustomServices();
    this.loadHiddenServices();
    await this.renderServices();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const addCustomBtn = document.getElementById('add-custom-service');
    
    if (addCustomBtn) {
      addCustomBtn.addEventListener('click', () => this.promptAddCustomService());
    }
  }
  
  /**
   * Get current coordinates
   */
  async getCurrentCoordinates() {
    try {
      // Get coordinates from active slot
      const app = window.appInstance;
      if (app && app.getActiveSlotCoordinates) {
        const coords = app.getActiveSlotCoordinates();
        if (coords && coords.lat && coords.lon) {
          return coords;
        }
      }
      
      // Fallback: get from slot 0 or extract from current tab
      const slot = await StorageManager.getSlot(0);
      if (slot && slot.lat && slot.lon) {
        return slot;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting coordinates:', error);
      return null;
    }
  }
  
  /**
   * Render service buttons
   */
  async renderServices() {
    if (!this.serviceGrid) return;
    
    // Get current coordinates
    this.currentCoords = await this.getCurrentCoordinates();
    
    this.serviceGrid.innerHTML = '';
    
    // Get visible services order from localStorage
    const visibleOrder = this.getVisibleServicesOrder();
    
    // Render all services in order
    visibleOrder.forEach((serviceName, index) => {
      const service = this.standardServices.find(s => s.name === serviceName) || 
                     this.customServices.find(s => s.name === serviceName);
      if (service && !this.hiddenServices.has(serviceName)) {
        const btn = this.createServiceButton(service, this.customServices.includes(service), index);
        btn.draggable = true;
        btn.dataset.dragIndex = index;
        this.serviceGrid.appendChild(btn);
      }
    });
    
    // Setup drag and drop
    this.setupDragAndDrop();
  }
  
  /**
   * Setup drag and drop for reordering services
   */
  setupDragAndDrop() {
    const buttons = this.serviceGrid.querySelectorAll('.service-btn');
    
    buttons.forEach(button => {
      button.addEventListener('dragstart', (e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', button.dataset.serviceName);
        button.style.opacity = '0.5';
        button.style.cursor = 'grabbing';
        
        // Add a placeholder indicator
        const rect = button.getBoundingClientRect();
        button.dataset.originalHeight = rect.height;
      });
      
      button.addEventListener('dragend', (e) => {
        button.style.opacity = '1';
        button.style.cursor = 'grab';
        button.style.marginTop = '0';
        
        // Remove all drop indicators
        buttons.forEach(btn => {
          btn.classList.remove('drop-target');
        });
      });
      
      button.addEventListener('dragenter', (e) => {
        const draggedButton = document.querySelector('.service-btn[style*="opacity: 0.5"]');
        if (!draggedButton) return;
        
        const currentButton = e.target.closest('.service-btn');
        
        if (currentButton && currentButton !== draggedButton) {
          // Remove all existing drop indicators
          this.serviceGrid.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());
          
          // Determine if we should show indicator above or below
          const rect = currentButton.getBoundingClientRect();
          const mouseY = e.clientY;
          const insertBefore = mouseY < rect.top + rect.height / 2;
          
          // Create drop indicator
          const indicator = document.createElement('div');
          indicator.className = 'drop-indicator';
          indicator.style.width = '100%';
          indicator.style.height = '2px';
          indicator.style.background = '#919AA8';
          indicator.style.margin = '0 0 -2px 0';
          indicator.style.transition = 'all 0.2s ease';
          
          if (insertBefore) {
            currentButton.parentNode.insertBefore(indicator, currentButton);
          } else {
            currentButton.parentNode.insertBefore(indicator, currentButton.nextSibling);
          }
        }
      });
      
      button.addEventListener('dragleave', (e) => {
        // Check if we're leaving the button area
        const relatedTarget = e.relatedTarget;
        if (!relatedTarget || !button.contains(relatedTarget)) {
          button.parentElement.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());
        }
      });
      
      button.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const draggedButton = document.querySelector('.service-btn[style*="opacity: 0.5"]');
        if (!draggedButton) return;
        
        const targetButton = e.target.closest('.service-btn');
        if (targetButton && targetButton !== draggedButton) {
          const allButtons = Array.from(this.serviceGrid.querySelectorAll('.service-btn'));
          const draggedIndex = allButtons.indexOf(draggedButton);
          const targetIndex = allButtons.indexOf(targetButton);
          
          // Determine position
          const rect = targetButton.getBoundingClientRect();
          const mouseY = e.clientY;
          const halfHeight = rect.height / 2;
          const insertAfter = mouseY > rect.top + halfHeight;
          
          if (insertAfter && draggedIndex < targetIndex) {
            this.serviceGrid.insertBefore(draggedButton, targetButton.nextSibling);
          } else if (!insertAfter && draggedIndex > targetIndex) {
            this.serviceGrid.insertBefore(draggedButton, targetButton);
          }
        }
      });
      
      button.addEventListener('drop', (e) => {
        e.preventDefault();
        const draggedName = e.dataTransfer.getData('text/plain');
        
        // Update order in localStorage
        const newOrder = Array.from(this.serviceGrid.querySelectorAll('.service-btn')).map(btn => btn.dataset.serviceName);
        this.saveServicesOrder(newOrder);
        
        // Re-render to update hotkey badges
        this.renderServices();
      });
    });
  }
  
  /**
   * Toggle service visibility (hide/show)
   */
  toggleServiceVisibility(serviceName) {
    if (this.hiddenServices.has(serviceName)) {
      this.hiddenServices.delete(serviceName);
    } else {
      this.hiddenServices.add(serviceName);
    }
    this.saveHiddenServices();
    this.renderServices();
  }
  
  /**
   * Get visible services order
   */
  getVisibleServicesOrder() {
    try {
      const saved = localStorage.getItem('coordinate_extractor_services_order');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading services order:', error);
    }
    
    // Default order: all standard services + custom
    return [
      ...this.standardServices.map(s => s.name),
      ...this.customServices.map(s => s.name)
    ];
  }
  
  /**
   * Save visible services order
   */
  saveServicesOrder(order) {
    try {
      localStorage.setItem('coordinate_extractor_services_order', JSON.stringify(order));
    } catch (error) {
      console.error('Error saving services order:', error);
    }
  }
  
  /**
   * Save hidden services
   */
  saveHiddenServices() {
    try {
      localStorage.setItem('coordinate_extractor_hidden_services', JSON.stringify(Array.from(this.hiddenServices)));
    } catch (error) {
      console.error('Error saving hidden services:', error);
    }
  }
  
  /**
   * Load hidden services
   */
  loadHiddenServices() {
    try {
      const saved = localStorage.getItem('coordinate_extractor_hidden_services');
      if (saved) {
        this.hiddenServices = new Set(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading hidden services:', error);
      this.hiddenServices = new Set();
    }
  }
  
  /**
   * Create service button
   */
  createServiceButton(service, isCustom = false, index = null) {
    const btn = document.createElement('button');
    btn.className = 'service-btn';
    
    // Create left content
    const leftContent = document.createElement('div');
    leftContent.style.display = 'flex';
    leftContent.style.alignItems = 'center';
    leftContent.style.gap = '6px';
    
    // Add hotkey badge for first 9 services
    if (index !== null && index < 9) {
      const hotkeyBadge = document.createElement('span');
      hotkeyBadge.textContent = index + 1;
      hotkeyBadge.className = 'service-hotkey-badge';
      hotkeyBadge.style.background = 'rgba(145, 154, 168, 0.30)';
      hotkeyBadge.style.color = '#4F5D75';
      hotkeyBadge.style.fontSize = '11px';
      hotkeyBadge.style.fontWeight = '600';
      hotkeyBadge.style.padding = '2px 6px';
      hotkeyBadge.style.borderRadius = '3px';
      leftContent.appendChild(hotkeyBadge);
    }
    
    const serviceName = document.createElement('span');
    serviceName.textContent = service.name;
    serviceName.style.flex = '1';
    leftContent.appendChild(serviceName);
    
    btn.appendChild(leftContent);
    btn.dataset.serviceName = service.name;
    
    // Set button to have relative positioning for absolute children
    btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    
    // Add background image with blur and grain effect
    if (service.backgroundImage) {
      // Create background layer
      const bgOverlay = document.createElement('div');
      bgOverlay.className = 'service-bg-image';
      bgOverlay.style.position = 'absolute';
      bgOverlay.style.width = '100%';
      bgOverlay.style.height = '100%';
      bgOverlay.style.top = '0';
      bgOverlay.style.right = '0';
      bgOverlay.style.backgroundImage = `url(${service.backgroundImage})`;
      bgOverlay.style.backgroundSize = 'auto 120px';
      bgOverlay.style.backgroundPosition = '90% center';
      bgOverlay.style.backgroundRepeat = 'no-repeat';
      bgOverlay.style.filter = 'blur(30px) opacity(0.4) brightness(0.5)';
      bgOverlay.style.pointerEvents = 'none';
      bgOverlay.style.zIndex = '1';
      btn.appendChild(bgOverlay);
      
      // Add separate grain overlay layer
      const grainLayer = document.createElement('div');
      grainLayer.className = 'service-grain';
      grainLayer.style.position = 'absolute';
      grainLayer.style.width = '100%';
      grainLayer.style.height = '100%';
      grainLayer.style.top = '0';
      grainLayer.style.left = '0';
      grainLayer.style.background = `
        repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, transparent 1px),
        repeating-linear-gradient(90deg, rgba(0,0,0,0.03) 0px, transparent 1px),
        repeating-linear-gradient(45deg, rgba(255,255,255,0.01) 0px, transparent 2px)
      `;
      grainLayer.style.pointerEvents = 'none';
      grainLayer.style.zIndex = '2';
      btn.appendChild(grainLayer);
    }
    
    // Ensure content is above background
    leftContent.style.position = 'relative';
    leftContent.style.zIndex = '3';
    leftContent.style.backgroundColor = 'transparent';
    
    // Add colored left border and background tint
    this.getServiceColor(service.urlTemplate).then(color => {
      if (color) {
        btn.style.borderLeft = `3px solid ${color}`;
        btn.style.paddingLeft = '11px';
        
        // Add subtle background tint overlay
        const colorRGB = color.match(/\d+/g);
        if (colorRGB && colorRGB.length >= 3) {
          const r = parseInt(colorRGB[0]);
          const g = parseInt(colorRGB[1]);
          const b = parseInt(colorRGB[2]);
          
          const colorOverlay = document.createElement('div');
          colorOverlay.style.position = 'absolute';
          colorOverlay.style.width = '100%';
          colorOverlay.style.height = '100%';
          colorOverlay.style.top = '0';
          colorOverlay.style.left = '0';
          colorOverlay.style.background = `linear-gradient(to right, rgba(${r}, ${g}, ${b}, 0.08) 0%, transparent 30%, transparent 100%)`;
          colorOverlay.style.pointerEvents = 'none';
          colorOverlay.style.zIndex = '1';
          btn.appendChild(colorOverlay);
        }
      } else {
        // Fallback to service.color if available
        if (service.color) {
          btn.style.borderLeft = `3px solid ${service.color}`;
          btn.style.paddingLeft = '11px';
        }
      }
    }).catch(() => {
      // Fallback to service.color if fetch fails
      if (service.color) {
        btn.style.borderLeft = `3px solid ${service.color}`;
        btn.style.paddingLeft = '11px';
      }
    });
    
    
    if (isCustom) {
      btn.style.borderTop = '2px solid #FF9800';
      btn.style.borderBottom = '2px solid #FF9800';
      btn.style.borderRight = '2px solid #FF9800';
    }
    
    btn.addEventListener('click', () => {
      this.openService(service);
    });
    
    // Add delete button for all services
    const deleteBtn = document.createElement('span');
    deleteBtn.textContent = '×';
    deleteBtn.className = 'service-delete-btn';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleServiceVisibility(service.name);
    });
    btn.appendChild(deleteBtn);
    
    return btn;
  }
  
  /**
   * Open service in new tab
   */
  openService(service) {
    if (!this.currentCoords) {
      UIComponents.Logger.log("No coordinates available", "error");
      return;
    }
    
    const url = this.buildServiceUrl(service.urlTemplate, this.currentCoords);
    
    if (url) {
      window.open(url, '_blank');
      UIComponents.Logger.log(`Opening ${service.name}`, "success");
      this.close();
    } else {
      UIComponents.Logger.log("Failed to build URL", "error");
    }
  }
  
  /**
   * Get service color from URL theme
   */
  async getServiceColor(urlTemplate) {
    try {
      // Extract domain from URL template
      const urlMatch = urlTemplate.match(/https?:\/\/([^\/\s]+)/);
      if (!urlMatch) return null;
      
      const domain = urlMatch[1];
      
      // Try to get favicon and extract dominant color
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Calculate dominant color
            let r = 0, g = 0, b = 0, count = 0;
            for (let i = 0; i < data.length; i += 4) {
              r += data[i];
              g += data[i + 1];
              b += data[i + 2];
              count++;
            }
            
            if (count > 0) {
              r = Math.floor(r / count);
              g = Math.floor(g / count);
              b = Math.floor(b / count);
              resolve(`rgb(${r}, ${g}, ${b})`);
            } else {
              resolve(null);
            }
          } catch (e) {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = faviconUrl;
      });
    } catch (error) {
      console.error('Error getting service color:', error);
      return null;
    }
  }
  
  /**
   * Build service URL from template
   */
  buildServiceUrl(template, coords) {
    try {
      if (!coords || !coords.lat || !coords.lon) {
        console.error('Invalid coordinates:', coords);
        return null;
      }
      
      // Replace basic coordinates
      let url = template
        .replace(/\{\{lat\}\}/g, coords.lat || '')
        .replace(/\{\{lon\}\}/g, coords.lon || '')
        .replace(/\{\{zoom\}\}/g, coords.zoom || '15');
      
      // Handle pitch and bearing for Mapbox-style URLs (#zoom/lat/lon/bearing/pitch)
      const hasBearing = coords.bearing !== undefined && coords.bearing !== null;
      const hasPitch = coords.pitch !== undefined && coords.pitch !== null;
      
      if (url.includes('/{{bearing}}/{{pitch}}')) {
        if (hasBearing && hasPitch) {
          url = url.replace(/\{\{bearing\}\}/g, coords.bearing);
          url = url.replace(/\{\{pitch\}\}/g, coords.pitch);
        } else {
          // Remove the /bearing/pitch part if not available
          url = url.replace(/\/\{\{bearing\}\}\/\{\{pitch\}\}/g, '');
        }
      } else {
        // Individual replacements
        if (hasPitch) {
          url = url.replace(/\{\{pitch\}\}/g, coords.pitch);
        } else if (url.includes('{{pitch}}')) {
          url = url.replace(/\{\{pitch\}\}/g, '');
        }
        
        if (hasBearing) {
          url = url.replace(/\{\{bearing\}\}/g, coords.bearing);
        } else if (url.includes('{{bearing}}')) {
          url = url.replace(/\{\{bearing\}\}/g, '');
        }
      }
      
      // Clean up any double slashes that might have been created
      url = url.replace(/([^:]\/)\/+/g, '$1');
      
      console.log('Built URL:', url);
      return url;
    } catch (error) {
      console.error('Error building URL:', error);
      return null;
    }
  }
  
  /**
   * Prompt user to add custom service
   */
  promptAddCustomService() {
    const name = prompt('Enter service name:');
    if (!name) return;
    
    const url = prompt('Enter URL (with coordinates as example):');
    if (!url) return;
    
    // Try to detect and create template automatically
    const urlTemplate = this.detectUrlTemplate(url);
    
    if (!urlTemplate) {
      alert('Could not detect URL pattern. Please use a URL with coordinates.');
      return;
    }
    
    const service = {
      name: name,
      urlTemplate: urlTemplate
    };
    
    this.customServices.push(service);
    this.saveCustomServices();
    this.renderServices();
    UIComponents.Logger.log(`Added custom service: ${name}`, "success");
  }
  
  /**
   * Detect URL template from example URL
   */
  detectUrlTemplate(url) {
    // Try to detect common patterns
    const patterns = [
      // Google Maps style: /@lat,lon,zoomz
      { regex: /@([\d\.-]+),([\d\.-]+),(\d+)z/, template: url.replace(/@[\d\.-]+,[\d\.-]+,\d+z/, '@{{lat}},{{lon}},{{zoom}}z') },
      
      // OSM style: #map=zoom/lat/lon
      { regex: /#map=(\d+)\/([\d\.-]+)\/([\d\.-]+)/, template: url.replace(/#map=\d+\/[\d\.-]+\/[\d\.-]+/, '#map={{zoom}}/{{lat}}/{{lon}}') },
      
      // Bing style: cp=lat~lon&lvl=zoom
      { regex: /cp=([\d\.-]+)~([\d\.-]+)&lvl=(\d+)/, template: url.replace(/cp=[\d\.-]+~[\d\.-]+&lvl=\d+/, 'cp={{lat}}~{{lon}}&lvl={{zoom}}') },
      
      // Yandex style: ll=lon,lat&z=zoom
      { regex: /ll=([\d\.-]+),([\d\.-]+)&z=(\d+)/, template: url.replace(/ll=[\d\.-]+,[\d\.-]+&z=\d+/, 'll={{lon}},{{lat}}&z={{zoom}}') },
      
      // Generic pattern: lat=...&lng=...&z=...
      { regex: /lat=([\d\.-]+)[&?]/i, template: url.replace(/lat=[\d\.-]+/gi, 'lat={{lat}}').replace(/lng=[\d\.-]+/gi, 'lng={{lon}}').replace(/[?&]z=(\d+)/g, '&z={{zoom}}') },
      
      // Try to replace any decimal numbers in URL paths
      { regex: /(\d+\.?\d*)/, template: url.replace(/(\d+\.?\d*)/g, '{{coords}}') }
    ];
    
    for (const pattern of patterns) {
      if (pattern.regex.test(url)) {
        // Transform the specific numbers to template
        let template = url;
        template = template.replace(/([\d\.-]+)\s*,\s*([\d\.-]+)\s*,\s*(\d+)z/g, '{{lat}},{{lon}},{{zoom}}z');
        template = template.replace(/#map=(\d+)\/([\d\.-]+)\/([\d\.-]+)/g, '#map={{zoom}}/{{lat}}/{{lon}}');
        template = template.replace(/cp=([\d\.-]+)~([\d\.-]+)&lvl=(\d+)/g, 'cp={{lat}}~{{lon}}&lvl={{zoom}}');
        template = template.replace(/ll=([\d\.-]+),([\d\.-]+)&z=(\d+)/g, 'll={{lon}},{{lat}}&z={{zoom}}');
        template = template.replace(/lat=([\d\.-]+)/gi, 'lat={{lat}}');
        template = template.replace(/lng=([\d\.-]+)/gi, 'lng={{lon}}');
        template = template.replace(/[?&]z=(\d+)/g, '&z={{zoom}}');
        
        if (template.includes('{{')) {
          return template;
        }
      }
    }
    
    // Fallback: just replace numbers with placeholders
    let template = url;
    template = template.replace(/(-?\d+\.\d+)/g, '{{lat}}');
    template = template.replace(/(-?\d+\.\d+)/g, '{{lon}}');
    template = template.replace(/\/(\d+)\//g, '/{{zoom}}/');
    
    return template;
  }
  
  /**
   * Delete custom service
   */
  deleteCustomService(name) {
    if (confirm(`Delete "${name}"?`)) {
      this.customServices = this.customServices.filter(s => s.name !== name);
      this.saveCustomServices();
      this.renderServices();
      UIComponents.Logger.log(`Deleted custom service: ${name}`, "info");
    }
  }
  
  /**
   * Load custom services from storage
   */
  loadCustomServices() {
    try {
      const saved = localStorage.getItem('coordinate_extractor_custom_services');
      if (saved) {
        this.customServices = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading custom services:', error);
      this.customServices = [];
    }
  }
  
  /**
   * Save custom services to storage
   */
  saveCustomServices() {
    try {
      localStorage.setItem('coordinate_extractor_custom_services', JSON.stringify(this.customServices));
    } catch (error) {
      console.error('Error saving custom services:', error);
    }
  }
  
  /**
   * Setup keyboard shortcuts for services (1-5)
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', async (e) => {
      // Only work when popup is open and not in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      const key = e.key;
      
      // Check if pressing 1-9
      if (key >= '1' && key <= '9') {
        const index = parseInt(key) - 1;
        const services = this.serviceGrid.querySelectorAll('.service-btn');
        
        if (services[index]) {
          e.preventDefault();
          const serviceName = services[index].dataset.serviceName;
          const service = this.standardServices.find(s => s.name === serviceName) || 
                         this.customServices.find(s => s.name === serviceName);
          
          if (service) {
            this.currentCoords = await this.getCurrentCoordinates();
            this.openService(service);
          }
        }
      }
    });
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ServiceModal;
} else {
  window.ServiceModal = ServiceModal;
}

