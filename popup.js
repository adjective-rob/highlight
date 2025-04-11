// popup.js
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the UI
    updateStats();
    loadHighlights();
    loadCategories();
    
    // Set up tabs
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', function() {
        // Remove active class from all tabs and content
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding content
        this.classList.add('active');
        const tabName = this.getAttribute('data-tab');
        document.getElementById(`${tabName}-tab`).classList.add('active');
      });
    });
    
    // Set up search
    document.getElementById('searchInput').addEventListener('input', function() {
      const query = this.value.trim();
      if (query) {
        searchHighlights(query);
      } else {
        loadHighlights();
      }
    });
    

    
    // Set up clear button
    document.getElementById('clearBtn').addEventListener('click', function() {
      if (confirm('Are you sure you want to clear all highlights? This cannot be undone.')) {
        chrome.storage.local.set({ 
          highlights: [],
          csvData: 'ID,"Date/Time","Highlight","Category","Source Title","Source URL"\n',
          highlightCount: 0
        }, function() {
          updateStats();
          loadHighlights();
        });
      }
    });
    
    // Set up add category button
    document.getElementById('addCategoryBtn').addEventListener('click', function() {
      const name = document.getElementById('categoryName').value.trim();
      const color = document.getElementById('categoryColor').value;
      
      if (name) {
        const id = name.toLowerCase().replace(/\s+/g, '_');
        const category = { id, name, color };
        
        chrome.runtime.sendMessage({ 
          action: 'addCategory', 
          category: category 
        }, function() {
          loadCategories();
          document.getElementById('categoryName').value = '';
        });
      }
    });
    
    // Listen for new highlights being saved
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'highlightSaved') {
        updateStats();
        loadHighlights();
      }
    });
  });

  // Observe download logs
  document.getElementById('downloadBtn').addEventListener('click', function() {
    console.log("Download button clicked");
    chrome.runtime.sendMessage({ action: 'downloadCSV' });
  });
  
  // Function to update the statistics
  function updateStats() {
    chrome.storage.local.get(['highlightCount', 'highlights', 'categories'], (result) => {
      // Update the highlight count
      document.getElementById('highlightCount').textContent = result.highlightCount || 0;
      
      // Update the category count
      document.getElementById('categoryCount').textContent = result.categories ? result.categories.length : 0;
      
      // Calculate this week's highlights
      let weekCount = 0;
      if (result.highlights) {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        weekCount = result.highlights.filter(h => {
          const highlightDate = new Date(h.dateTime);
          return highlightDate >= oneWeekAgo;
        }).length;
      }
      document.getElementById('weekCount').textContent = weekCount;
    });
  }
  
  // Function to load highlights
  function loadHighlights() {
    chrome.storage.local.get(['highlights'], (result) => {
      const highlightsContainer = document.getElementById('highlightsContainer');
      highlightsContainer.innerHTML = '';
      
      if (result.highlights && result.highlights.length > 0) {
        // Sort highlights by date (newest first)
        const sortedHighlights = result.highlights.sort((a, b) => {
          return new Date(b.dateTime) - new Date(a.dateTime);
        });
        
        sortedHighlights.forEach(highlight => {
          const highlightDiv = createHighlightElement(highlight);
          highlightsContainer.appendChild(highlightDiv);
        });
      } else {
        highlightsContainer.innerHTML = `
          <div class="empty-state">
            <p>No highlights saved yet.</p>
            <p>Highlight text on any page, right-click, and select "Save Highlight" to get started.</p>
          </div>
        `;
      }
    });
  }
  
  // Function to create a highlight element
  function createHighlightElement(highlight) {
    const highlightDiv = document.createElement('div');
    highlightDiv.className = 'highlight-item';
    highlightDiv.setAttribute('data-id', highlight.id);
    
    // Format the date
    const date = new Date(highlight.dateTime);
    const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    
    highlightDiv.innerHTML = `
      <span class="highlight-category" style="background-color: ${highlight.categoryColor}">
        ${highlight.categoryName}
      </span>
      <div class="highlight-meta">
        <span>#${highlight.id}</span>
        <span>${formattedDate}</span>
      </div>
      <div class="highlight-text">${highlight.text}</div>
      <a href="${highlight.sourceUrl}" class="highlight-source" target="_blank" title="${highlight.sourceTitle}">
        ${highlight.sourceTitle || highlight.sourceUrl}
      </a>
      <div class="highlight-actions">
        <button class="action-btn copy-btn" title="Copy text">Copy</button>
        <button class="action-btn delete-btn" title="Delete">Delete</button>
      </div>
    `;
    
    // Set up copy button
    highlightDiv.querySelector('.copy-btn').addEventListener('click', function(e) {
      e.stopPropagation();
      navigator.clipboard.writeText(highlight.text).then(() => {
        this.textContent = 'Copied!';
        setTimeout(() => {
          this.textContent = 'Copy Text';
        }, 1000);
      });
    });
    
// Set up delete button
highlightDiv.querySelector('.delete-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    e.preventDefault(); // Add this to prevent any default action
    
    if (confirm('Are you sure you want to delete this highlight?')) {
      console.log("Deleting highlight with ID:", highlight.id); // Debug log
      
      chrome.runtime.sendMessage({ 
        action: 'deleteHighlight', 
        id: highlight.id 
      }, function(response) {
        console.log("Delete response received:", response); // Debug log
        
        // Check for a successful response
        if (response && response.success) {
          loadHighlights();
          updateStats();
        } else {
          console.error("Failed to delete highlight:", response);
        }
      });
    }
  });
    
    return highlightDiv;
  }
  
  // Function to load categories
  function loadCategories() {
    chrome.storage.local.get(['categories'], (result) => {
      const categoryList = document.getElementById('categoryList');
      categoryList.innerHTML = '';
      
      if (result.categories && result.categories.length > 0) {
        result.categories.forEach(category => {
          const categoryDiv = document.createElement('div');
          categoryDiv.className = 'category-item';
          categoryDiv.innerHTML = `
            <div>
              <span class="category-color" style="background-color: ${category.color}"></span>
              ${category.name}
            </div>
            <button class="action-btn delete-category-btn" data-id="${category.id}" title="Delete">Delete</button>
          `;
          categoryList.appendChild(categoryDiv);
        });
        
        // Set up delete buttons
        document.querySelectorAll('.delete-category-btn').forEach(btn => {
          btn.addEventListener('click', function() {
            const categoryId = this.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this category?')) {
              deleteCategory(categoryId);
            }
          });
        });
      } else {
        categoryList.innerHTML = `
          <div class="empty-state">
            <p>No categories added yet.</p>
          </div>
        `;
      }
    });
  }
  
  // Function to delete a category
  function deleteCategory(categoryId) {
    chrome.storage.local.get(['categories'], (result) => {
      if (result.categories) {
        const updatedCategories = result.categories.filter(c => c.id !== categoryId);
        chrome.storage.local.set({ categories: updatedCategories }, () => {
          loadCategories();
          // Regenerate context menus
          chrome.runtime.sendMessage({ action: 'recreateContextMenus' });
        });
      }
    });
  }
  
  // Function to search highlights
  function searchHighlights(query) {
    chrome.runtime.sendMessage({ 
      action: 'searchHighlights', 
      query: query 
    }, function(response) {
      const highlightsContainer = document.getElementById('highlightsContainer');
      highlightsContainer.innerHTML = '';
      
      if (response.results && response.results.length > 0) {
        response.results.forEach(highlight => {
          const highlightDiv = createHighlightElement(highlight);
          highlightsContainer.appendChild(highlightDiv);
        });
      } else {
        highlightsContainer.innerHTML = `
          <div class="empty-state">
            <p>No results found for "${query}"</p>
          </div>
        `;
      }
    });
  }