browser.browserAction.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("/index.html") });
});
