chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "saveText") {
      console.log("Received data:", request.data);
      // Your logic to handle the data
    }
  });

    
    // Rest of your initialization code...