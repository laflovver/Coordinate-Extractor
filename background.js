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

chrome.commands.onCommand.addListener(async (command) => {
  console.log("Command received:", command);
  if (command === "open-extension") {
    try {
      await chrome.action.openPopup();
      console.log("Popup opened via command successfully");
    } catch (error) {
      console.log("Popup not available via command, trying to open in new tab...", error.message);
      try {
        await chrome.tabs.create({ 
          url: chrome.runtime.getURL('popup.html'),
          active: true 
        });
        console.log("Extension opened in new tab via command");
      } catch (tabError) {
        console.error("Error opening extension via command:", tabError);
      }
    }
  }
});