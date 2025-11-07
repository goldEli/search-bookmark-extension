function loadBookmarks() {
  return new Promise((resolve) => {
    chrome.bookmarks.getTree((nodes) => {
      const flatBookmarks = [];

      function traverse(nodes) {
        for (let node of nodes) {
          if (node.url) {
            flatBookmarks.push({
              title: node.title || node.url,
              url: node.url,
              id: node.id
            });
          }
          if (node.children) {
            traverse(node.children);
          }
        }
      }

      traverse(nodes);
      resolve(flatBookmarks);
    });
  });
}

if (chrome.action && chrome.action.onClicked) {
  chrome.action.onClicked.addListener(async (tab) => {
    const bookmarks = await loadBookmarks();

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (bookmarks) => {
        window.injectedBookmarks = bookmarks;
      },
      args: [bookmarks]
    });

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  });
} else {
  console.error('chrome.action.onClicked is not available');
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openTab') {
    chrome.tabs.create({ url: message.url });
    sendResponse({ success: true });
    return true;
  } else if (message.action === 'editBookmark') {
    chrome.bookmarks.update(message.id, {
      title: message.title,
      url: message.url
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  } else if (message.action === 'deleteBookmark') {
    chrome.bookmarks.remove(message.id, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  return false;
});
