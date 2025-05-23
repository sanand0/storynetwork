// Main application logic
const app = {
  config: null,
  currentStory: null,
  storyContent: null,
  sections: [],
  entityColors: {},
  entityCounts: {},
  correlationData: null,
  maxCorrelation: 0,
  
  /**
   * Initialize the application
   */
  async init() {
    try {
      // Load configuration
      this.config = await this.loadConfig();
      this.renderDemoCards();
      
      // Set up event listeners
      document.getElementById('back-button').addEventListener('click', () => this.showDemoSelection());
      
      // Set up Bootstrap components
      const toastElList = document.querySelectorAll('.toast');
      toastElList.forEach(toastEl => new bootstrap.Toast(toastEl));
    } catch (error) {
      this.showError(`Failed to initialize: ${error.message}`);
    }
  },
  
  /**
   * Load configuration from config.json
   */
  async loadConfig() {
    const response = await fetch('config.json');
    if (!response.ok) throw new Error(`Failed to load config: ${response.status}`);
    return await response.json();
  },
  
  /**
   * Render demo cards based on config
   */
  renderDemoCards() {
    const container = document.getElementById('demo-selection');
    const html = this.config.demos.map((demo, index) => `
      <div class="col">
        <div class="card h-100 shadow-sm" data-index="${index}">
          <div class="card-body text-center">
            <iconify-icon icon="${demo.icon}" width="48" height="48" class="mb-3"></iconify-icon>
            <h5 class="card-title">${demo.name}</h5>
            <p class="card-text">${demo.notes}</p>
          </div>
          <div class="card-footer bg-transparent border-top-0">
            <button class="btn btn-primary w-100 select-demo">Explore</button>
          </div>
        </div>
      </div>
    `).join('');
    
    container.innerHTML = html;
    
    // Add event listeners to demo cards
    document.querySelectorAll('.select-demo').forEach(button => {
      button.addEventListener('click', (e) => {
        const card = e.target.closest('.card');
        const index = parseInt(card.dataset.index);
        this.loadStory(this.config.demos[index]);
      });
    });
  },
  
  /**
   * Show demo selection screen
   */
  showDemoSelection() {
    document.getElementById('demo-selection').classList.remove('d-none');
    document.getElementById('story-view').classList.add('d-none');
    
    // Clear entity markers when going back to demo selection
    document.querySelectorAll('.entity-marker').forEach(marker => {
      marker.remove();
    });
    
    // Reset entity toggle buttons
    document.querySelectorAll('.entity-toggle').forEach(button => {
      button.classList.remove('active');
      button.classList.add('btn-outline-secondary');
      button.classList.remove('text-white');
    });
  },
  
  /**
   * Load and display a story
   */
  async loadStory(story) {
    try {
      this.currentStory = story;
      
      // Update UI
      document.getElementById('story-title').textContent = story.name;
      document.getElementById('story-notes').innerHTML = marked.parse(story.notes);
      document.getElementById('demo-selection').classList.add('d-none');
      document.getElementById('story-view').classList.remove('d-none');
      
      // Load story content
      const response = await fetch(story.file);
      if (!response.ok) throw new Error(`Failed to load story: ${response.status}`);
      this.storyContent = await response.text();
      
      // Parse sections
      this.parseStoryContent();
      
      // Assign colors to entities
      this.assignEntityColors(story.entities);
      
      // Calculate entity counts
      this.calculateEntityCounts();
      
      // Calculate correlation data
      this.calculateCorrelationData();
      
      // Render visualizations
      this.renderPresenceVisualization();
      this.renderEntityToggles();
      this.renderCorrelationVisualization();
      
      // Set up correlation slider
      document.getElementById('correlation-threshold').max = this.maxCorrelation;
      document.getElementById('max-correlation').textContent = this.maxCorrelation;
      document.getElementById('correlation-threshold').addEventListener('input', (e) => {
        this.updateCorrelationVisualization(parseInt(e.target.value));
      });
    } catch (error) {
      this.showError(`Failed to load story: ${error.message}`);
    }
  },
  
  /**
   * Parse story content into sections
   */
  parseStoryContent() {
    // Split by H1 sections
    const h1Sections = this.storyContent.split(/\n# /);
    
    this.sections = [];
    let globalIndex = 0;
    
    h1Sections.forEach((h1Section, h1Index) => {
      if (h1Index === 0 && !h1Section.startsWith('# ')) {
        // Handle the case where the first section doesn't start with #
        h1Section = '# ' + h1Section;
      }
      
      // Split by H2 sections
      const h2Sections = h1Section.split(/\n## /);
      const h1Title = h2Sections[0].split('\n')[0].replace(/^# /, '');
      
      // Process each H2 section
      for (let i = 1; i < h2Sections.length; i++) {
        const section = h2Sections[i];
        const title = section.split('\n')[0];
        const content = section;
        
        this.sections.push({
          h1Index,
          h1Title,
          title,
          content: '## ' + content,
          index: globalIndex++,
          length: content.length
        });
      }
    });
  },
  
  /**
   * Assign colors to entities using D3 color scheme
   */
  assignEntityColors(entities) {
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
    entities.forEach((entity, i) => {
      this.entityColors[entity] = colorScale(i);
    });
  },
  
  /**
   * Calculate entity counts in each section
   */
  calculateEntityCounts() {
    this.entityCounts = {};
    
    // Initialize counts
    Object.keys(this.entityColors).forEach(entity => {
      this.entityCounts[entity] = {
        total: 0,
        sections: {},
        positions: {}
      };
    });
    
    // Count occurrences and positions
    this.sections.forEach(section => {
      Object.keys(this.entityColors).forEach(entity => {
        const regex = new RegExp(`\\b${entity}\\b`, 'gi');
        const matches = [...section.content.matchAll(regex)];
        
        this.entityCounts[entity].sections[section.index] = matches.length;
        if (matches.length > 0) {
          this.entityCounts[entity].total += matches.length;
          this.entityCounts[entity].positions[section.index] = matches.map(match => match.index);
        }
      });
    });
  },
  
  /**
   * Calculate correlation data between entities
   */
  calculateCorrelationData() {
    const entities = Object.keys(this.entityColors).sort();
    this.correlationData = {};
    this.maxCorrelation = 0;
    
    // Initialize correlation data
    entities.forEach(entity1 => {
      this.correlationData[entity1] = {};
      entities.forEach(entity2 => {
        this.correlationData[entity1][entity2] = 0;
      });
    });
    
    // Calculate correlations
    this.sections.forEach(section => {
      const entitiesInSection = entities.filter(entity => 
        this.entityCounts[entity].sections[section.index] > 0
      );
      
      // For each pair of entities in this section, increment correlation
      for (let i = 0; i < entitiesInSection.length; i++) {
        for (let j = i + 1; j < entitiesInSection.length; j++) {
          const entity1 = entitiesInSection[i];
          const entity2 = entitiesInSection[j];
          
          this.correlationData[entity1][entity2]++;
          this.correlationData[entity2][entity1]++;
          
          // Update max correlation
          this.maxCorrelation = Math.max(
            this.maxCorrelation, 
            this.correlationData[entity1][entity2]
          );
        }
      }
    });
  },
  
  /**
   * Render presence visualization
   */
  renderPresenceVisualization() {
    const container = document.getElementById('presence-viz');
    container.innerHTML = '';
    
    // Calculate max section length for scaling
    const maxLength = Math.max(...this.sections.map(s => s.length));
    const maxWidth = 250;
    
    // Group sections by h1
    const h1Groups = {};
    this.sections.forEach(section => {
      if (!h1Groups[section.h1Index]) {
        h1Groups[section.h1Index] = [];
      }
      h1Groups[section.h1Index].push(section);
    });
    
    // Create SVG for each H1 group
    Object.entries(h1Groups).forEach(([h1Index, sections]) => {
      const h1Title = sections[0].h1Title;
      const h1Div = document.createElement('div');
      h1Div.className = 'mb-4';
      h1Div.innerHTML = `<h4 class="mb-2">${h1Title}</h4>`;
      container.appendChild(h1Div);
      
      // Create SVGs for each section
      sections.forEach(section => {
        const width = Math.max(30, (section.length / maxLength) * maxWidth);
        
        // Create SVG
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('data-index', section.index);
        svg.setAttribute('class', 'me-2 mb-2 section-rect');
        svg.setAttribute('width', width);
        svg.setAttribute('height', '24'); // Increased height to 24
        svg.setAttribute('viewBox', `0 0 ${width} 24`);
        svg.setAttribute('title', section.title);
        
        // Create background rect
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', width);
        rect.setAttribute('height', '24'); // Make rect take full height
        rect.setAttribute('y', '0'); // Start from top
        rect.setAttribute('fill', 'var(--bs-tertiary-bg)');
        rect.setAttribute('rx', '2');
        svg.appendChild(rect);
        
        // Add entity markers (circles) - hidden by default
        Object.entries(this.entityCounts).forEach(([entity, data]) => {
          if (data.positions[section.index]) {
            data.positions[section.index].forEach(pos => {
              const x = (pos / section.length) * width;
              const y = 12 + (Math.random() * 4 - 2); // Random jitter centered in the SVG
              
              const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
              circle.setAttribute('cx', x);
              circle.setAttribute('cy', y);
              circle.setAttribute('r', '3'); // Increased circle size to 3
              circle.setAttribute('fill', this.entityColors[entity]);
              circle.setAttribute('class', `entity-marker entity-${this.sanitizeId(entity)}`);
              circle.setAttribute('style', 'display: none;');
              svg.appendChild(circle);
            });
          }
        });
        
        h1Div.appendChild(svg);
        
        // Add click event to show section content
        svg.addEventListener('click', () => this.showSectionModal(section));
      });
    });
  },
  
  /**
   * Render entity toggle buttons
   */
  renderEntityToggles() {
    const container = document.getElementById('entity-toggles');
    container.innerHTML = '<div class="d-flex flex-wrap gap-2 mb-2">';
    
    // Sort entities by count (descending)
    const sortedEntities = Object.keys(this.entityCounts)
      .sort((a, b) => this.entityCounts[b].total - this.entityCounts[a].total);
    
    const html = sortedEntities.map(entity => {
      const color = this.entityColors[entity];
      const count = this.entityCounts[entity].total;
      const sanitizedId = this.sanitizeId(entity);
      
      // Create button with entity color as outline
      return `
        <button class="btn btn-outline-secondary entity-toggle" 
                data-entity="${sanitizedId}"
                style="--bs-btn-border-color: ${color}; --bs-btn-color: ${color}; --bs-btn-hover-bg: ${color}; --bs-btn-hover-border-color: ${color}; --bs-btn-active-bg: ${color};">
          ${entity} <span class="badge bg-secondary rounded-pill">${count}</span>
        </button>
      `;
    }).join('');
    
    container.innerHTML = html;
    
    // Add event listeners to toggle entity visibility
    document.querySelectorAll('.entity-toggle').forEach(button => {
      button.addEventListener('click', () => {
        const entity = button.dataset.entity;
        const markers = document.querySelectorAll(`.entity-${entity}`);
        const isVisible = markers[0]?.style.display !== 'none';
        
        markers.forEach(marker => {
          marker.style.display = isVisible ? 'none' : 'block';
        });
        
        // Toggle active state
        button.classList.toggle('active');
        if (button.classList.contains('active')) {
          button.classList.remove('btn-outline-secondary');
          button.classList.add('text-white');
        } else {
          button.classList.add('btn-outline-secondary');
          button.classList.remove('text-white');
        }
      });
    });
  },
  
  /**
   * Render correlation visualization
   */
  renderCorrelationVisualization() {
    const container = document.getElementById('correlation-viz');
    container.innerHTML = '';
    
    const entities = Object.keys(this.entityColors).sort();
    
    // Create responsive table wrapper
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-responsive';
    
    // Create table
    const table = document.createElement('table');
    table.className = 'correlation-table table table-bordered';
    
    // Create header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th></th>'; // Empty corner cell
    
    entities.forEach(entity => {
      const th = document.createElement('th');
      th.className = 'column-header';
      th.textContent = entity;
      th.setAttribute('scope', 'col');
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body rows
    const tbody = document.createElement('tbody');
    
    entities.forEach(rowEntity => {
      const row = document.createElement('tr');
      
      // Row header
      const th = document.createElement('th');
      th.className = 'row-header';
      th.textContent = rowEntity;
      th.setAttribute('scope', 'row');
      row.appendChild(th);
      
      // Data cells
      entities.forEach(colEntity => {
        const td = document.createElement('td');
        const count = this.correlationData[rowEntity][colEntity];
        
        if (count > 0) {
          td.textContent = count;
          
          // Color cell based on count
          const colorScale = d3.scaleSequential(d3.interpolateBlues)
            .domain([0, this.maxCorrelation]);
          
          const bgColor = colorScale(count);
          td.style.backgroundColor = bgColor;
          
          // Ensure text contrast
          const textColor = this.getContrastColor(bgColor);
          td.style.color = textColor;
          
          // Add data attributes for filtering
          td.setAttribute('data-count', count);
        } else {
          td.textContent = '';
          td.setAttribute('data-count', '0');
        }
        
        row.appendChild(td);
      });
      
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);
  },
  
  /**
   * Update correlation visualization based on threshold
   */
  updateCorrelationVisualization(threshold) {
    document.querySelectorAll('.correlation-table td').forEach(cell => {
      const count = parseInt(cell.getAttribute('data-count') || '0');
      cell.style.display = count >= threshold ? '' : 'none';
    });
  },
  
  /**
   * Show section content in modal
   */
  showSectionModal(section) {
    const modal = new bootstrap.Modal(document.getElementById('section-modal'));
    const title = document.getElementById('section-modal-label');
    const content = document.getElementById('section-content');
    const entitiesContainer = document.getElementById('section-entities');
    
    title.textContent = section.title;
    content.innerHTML = marked.parse(section.content);
    
    // Show entities in this section
    const entitiesInSection = Object.keys(this.entityColors).filter(entity => 
      this.entityCounts[entity].sections[section.index] > 0
    );
    
    const entitiesHtml = entitiesInSection.map(entity => {
      const count = this.entityCounts[entity].sections[section.index];
      return `
        <span class="entity-pill" style="background-color: ${this.entityColors[entity]}; color: ${this.getContrastColor(this.entityColors[entity])}">
          ${entity} (${count})
        </span>
      `;
    }).join('');
    
    entitiesContainer.innerHTML = entitiesHtml;
    
    modal.show();
  },
  
  /**
   * Show error message in toast
   */
  showError(message) {
    const errorToast = document.getElementById('error-toast');
    const errorMessage = document.getElementById('error-message');
    
    errorMessage.textContent = message;
    const toast = new bootstrap.Toast(errorToast);
    toast.show();
  },
  
  /**
   * Get contrasting text color (black or white) for a background color
   */
  getContrastColor(bgColor) {
    // Convert hex to RGB
    let color;
    if (bgColor.startsWith('#')) {
      const r = parseInt(bgColor.slice(1, 3), 16);
      const g = parseInt(bgColor.slice(3, 5), 16);
      const b = parseInt(bgColor.slice(5, 7), 16);
      color = [r, g, b];
    } else if (bgColor.startsWith('rgb')) {
      color = bgColor.match(/\d+/g).map(Number);
    } else {
      return 'var(--bs-body-color)'; // Use Bootstrap body color variable
    }
    
    // Calculate relative luminance
    const luminance = (0.299 * color[0] + 0.587 * color[1] + 0.114 * color[2]) / 255;
    
    // Return appropriate color based on luminance
    return luminance > 0.5 ? 'var(--bs-dark)' : 'var(--bs-light)';
  },
  
  /**
   * Sanitize entity name for use as CSS class/ID
   */
  sanitizeId(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }
};

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => app.init());
