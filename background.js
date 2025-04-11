// background.js
let highlightCount = 0;
const CSV_FILENAME = "highlights.csv";

// Initialize the context menu items
chrome.runtime.onInstalled.addListener(() => {
  // Get the saved highlight count if it exists
  chrome.storage.local.get(['highlightCount', 'categories'], (result) => {
    if (result.highlightCount) {
      highlightCount = result.highlightCount;
    }

    
    
    // Initialize default categories if none exist
    if (!result.categories) {
      chrome.storage.local.set({
        categories: [
          { id: 'general', name: 'General', color: '#4285f4' },
          { id: 'important', name: 'Important', color: '#ea4335' },
          { id: 'research', name: 'Research', color: '#34a853' },
          { id: 'personal', name: 'Personal', color: '#fbbc05' }
        ]
      });
    }
  });

  // Create the main context menu
  chrome.contextMenus.create({
    id: "saveHighlightParent",
    title: "Save Highlight",
    contexts: ["selection"]
  });
  
  // Create subcategory menu items
  createCategoryContextMenus();
});

// Function to create category context menus
function createCategoryContextMenus() {
  chrome.storage.local.get(['categories'], (result) => {
    if (result.categories) {
      // Remove existing items first
      chrome.contextMenus.removeAll(() => {
        // Recreate the parent menu
        chrome.contextMenus.create({
          id: "saveHighlightParent",
          title: "Save Highlight",
          contexts: ["selection"]
        });
        
        // Add each category as a submenu
        result.categories.forEach(category => {
          chrome.contextMenus.create({
            id: `saveHighlight_${category.id}`,
            parentId: "saveHighlightParent",
            title: category.name,
            contexts: ["selection"]
          });
        });
        
        // Add an option to save without category
        chrome.contextMenus.create({
          id: "saveHighlight_none",
          parentId: "saveHighlightParent",
          title: "No Category",
          contexts: ["selection"]
        });
      });
    }
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId.startsWith("saveHighlight_")) {
    const categoryId = info.menuItemId.replace("saveHighlight_", "");
    const selectedText = info.selectionText;
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const sourceUrl = tabs[0].url;
      const sourceTitle = tabs[0].title;
      
      saveHighlight(selectedText, categoryId, sourceUrl, sourceTitle);
    });
  }
});

// Function to save the highlight
function saveHighlight(text, categoryId, sourceUrl, sourceTitle) {
  // Increment the counter
  highlightCount++;
  
  // Save the updated counter
  chrome.storage.local.set({ highlightCount: highlightCount });
  
  // Get the current date and time
  const now = new Date();
  const dateTime = now.toISOString();
  
  // Get category information
  chrome.storage.local.get(['categories'], (result) => {
    let categoryName = "Uncategorized";
    let categoryColor = "#999999";
    
    if (categoryId !== "none" && result.categories) {
      const category = result.categories.find(cat => cat.id === categoryId);
      if (category) {
        categoryName = category.name;
        categoryColor = category.color;
      }
    }
    
    // Create the highlight object
    const highlight = {
      id: highlightCount,
      text: text,
      dateTime: dateTime,
      categoryId: categoryId,
      categoryName: categoryName,
      categoryColor: categoryColor,
      sourceUrl: sourceUrl,
      sourceTitle: sourceTitle
    };
    
    // Store in highlights array
    chrome.storage.local.get(['highlights'], (result) => {
      let highlights = result.highlights || [];
      highlights.push(highlight);
      chrome.storage.local.set({ highlights: highlights });
    });
    
    // Create the CSV entry (escape double quotes in the text)
    updateCSVData(highlight);
    
    // Notify the popup if it's open
    chrome.runtime.sendMessage({
      action: 'highlightSaved',
      highlight: highlight
    });
  });
}

// Function to update the CSV data
function updateCSVData(highlight) {
  chrome.storage.local.get(['csvData'], (result) => {
    let csvData = result.csvData || 'ID,"Date/Time","Highlight","Category","Source Title","Source URL"\n';
    
    // Escape double quotes in the text and other fields
    const escapedText = highlight.text.replace(/"/g, '""');
    const escapedSourceTitle = highlight.sourceTitle.replace(/"/g, '""');
    
    // Create the CSV entry
    const csvEntry = `${highlight.id},"${highlight.dateTime}","${escapedText}","${highlight.categoryName}","${escapedSourceTitle}","${highlight.sourceUrl}"\n`;
    
    // Append the new entry
    csvData += csvEntry;
    
    // Save the updated CSV data
    chrome.storage.local.set({ csvData: csvData });
  });
}
// Observe Logs for CSV
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'downloadCSV') {
      console.log("Download CSV message received");
      chrome.storage.local.get(['csvData'], (result) => {
        console.log("CSV Data:", result.csvData ? "Present" : "Missing");
        // ... rest of the download code
      });
    }
  });
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'downloadCSV') {
      chrome.storage.local.get(['csvData'], (result) => {
        if (result.csvData) {
          const csvContent = result.csvData;
          const csvUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
  
          chrome.downloads.download({
            url: csvUrl,
            filename: CSV_FILENAME,
            saveAs: true
          });
        }
      });
    } else if (message.action === 'addCategory') {
    chrome.storage.local.get(['categories'], (result) => {
      let categories = result.categories || [];
      categories.push(message.category);
      chrome.storage.local.set({ categories: categories }, () => {
        createCategoryContextMenus();
        sendResponse({ success: true });
      });
    });
    return true; // Keep the message channel open for the async response
} else if (message.action === 'deleteHighlight') {
  deleteHighlight(message.id, () => {
    sendResponse({ success: true });
  });
  return true; // Important to keep this, as we are using async sendResponse
} else if (message.action === 'searchHighlights') {
  searchHighlights(message.query, sendResponse);
  return true; // Keep the message channel open for the async response
}
});


// Function to delete a highlight
function deleteHighlight(id, callback) {
  chrome.storage.local.get(['highlights'], (result) => {
    if (result.highlights) {
      const updatedHighlights = result.highlights.filter(h => h.id !== id);
      chrome.storage.local.set({ highlights: updatedHighlights }, () => {
        regenerateCSVData(updatedHighlights, () => {
          if (callback) callback();
        });
      });
    } else {
      if (callback) callback();
    }
  });
}

// Function to regenerate CSV data after deletion
function regenerateCSVData(highlights, callback) {
  let csvData = 'ID,"Date/Time","Highlight","Category","Source Title","Source URL"\n';

  highlights.forEach(highlight => {
    const escapedText = highlight.text.replace(/"/g, '""');
    const escapedSourceTitle = highlight.sourceTitle ? highlight.sourceTitle.replace(/"/g, '""') : '';

    const csvEntry = `${highlight.id},"${highlight.dateTime}","${escapedText}","${highlight.categoryName}","${escapedSourceTitle}","${highlight.sourceUrl}"\n`;
    csvData += csvEntry;
  });

  chrome.storage.local.set({ csvData: csvData }, () => {
    if (callback) callback();
  });
}

// Function to search highlights
function searchHighlights(query, sendResponse) {
  query = query.toLowerCase();
  
  chrome.storage.local.get(['highlights'], (result) => {
    if (result.highlights) {
      const filteredHighlights = result.highlights.filter(h => 
        h.text.toLowerCase().includes(query) || 
        h.categoryName.toLowerCase().includes(query) ||
        h.sourceTitle.toLowerCase().includes(query)
      );
      
      sendResponse({ results: filteredHighlights });
    } else {
      sendResponse({ results: [] });
    }
  });
}