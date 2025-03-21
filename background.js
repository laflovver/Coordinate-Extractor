chrome.action.onClicked.addListener(async () => {
  try {
    await chrome.action.openPopup();
  } catch (error) {
    console.error("Error opening popup:", error);
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "open-extension") {
    try {
      await chrome.action.openPopup();
    } catch (error) {
      console.error("Error opening popup via command:", error);
    }
  }
});