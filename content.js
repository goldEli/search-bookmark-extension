(function() {
  if (window.bookmarkSearchExtensionLoaded) {
    return;
  }
  window.bookmarkSearchExtensionLoaded = true;

  let overlay = null;
  let searchInput = null;
  let resultsContainer = null;
  let bookmarks = [];
  let selectedIndex = -1;
  let isVisible = false;


function createOverlay() {
  if (overlay) {
    overlay.remove();
  }

  overlay = document.createElement('div');
  overlay.id = 'bookmark-search-overlay';
  overlay.innerHTML = `
    <style>
      #bookmark-search-overlay {
        position: fixed;
        top: 20%;
        left: 50%;
        transform: translateX(-50%);
        width: 600px;
        max-width: 90vw;
        background: #1a1a1a;
        border-radius: 8px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      #bookmark-search-input {
        width: 100%;
        padding: 16px 20px;
        font-size: 16px;
        background: #2a2a2a;
        border: none;
        border-radius: 8px 8px 0 0;
        color: #ffffff;
        outline: none;
        box-sizing: border-box;
      }

      #bookmark-search-input::placeholder {
        color: #888;
      }

      #bookmark-search-results {
        max-height: 400px;
        overflow-y: auto;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .bookmark-item {
        padding: 12px 20px;
        cursor: pointer;
        border-bottom: 1px solid #333;
        color: #ccc;
      }

      .bookmark-item:hover,
      .bookmark-item.selected {
        background: #3a3a3a;
        color: #fff;
      }

      .bookmark-title {
        font-weight: 500;
        margin-bottom: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .bookmark-url {
        font-size: 12px;
        color: #888;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .no-results {
        padding: 20px;
        text-align: center;
        color: #666;
      }
    </style>

    <input type="text"
           id="bookmark-search-input"
           placeholder="Search bookmarks..."
           autocomplete="off">

    <div id="bookmark-search-results"></div>
  `;

  document.body.appendChild(overlay);
  searchInput = overlay.querySelector('#bookmark-search-input');
  resultsContainer = overlay.querySelector('#bookmark-search-results');

  searchInput.focus();
}

function updateResults(results) {
  resultsContainer.innerHTML = '';

  if (results.length === 0) {
    resultsContainer.innerHTML = '<div class="no-results">No bookmarks found</div>';
    selectedIndex = -1;
    return;
  }

  selectedIndex = 0;
  results.forEach((bookmark, index) => {
    const item = document.createElement('div');
    item.className = 'bookmark-item';
    if (index === 0) item.classList.add('selected');

    item.innerHTML = `
      <div class="bookmark-title">${escapeHtml(bookmark.title)}</div>
      <div class="bookmark-url">${escapeHtml(bookmark.url)}</div>
    `;

    item.addEventListener('click', () => openBookmark(bookmark));
    resultsContainer.appendChild(item);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function searchBookmarks(query) {
  if (!query.trim()) {
    updateResults([]);
    return;
  }

  const lowerQuery = query.toLowerCase();
  const results = bookmarks.filter(bookmark =>
    bookmark.title.toLowerCase().includes(lowerQuery) ||
    bookmark.url.toLowerCase().includes(lowerQuery)
  ).slice(0, 20);

  updateResults(results);
}

function openBookmark(bookmark) {
  chrome.runtime.sendMessage({ action: 'openTab', url: bookmark.url });
  closeOverlay();
}

function closeOverlay() {
  if (overlay) {
    overlay.remove();
    overlay = null;
    isVisible = false;
  }
}

function handleKeyDown(e) {
  if (!isVisible) return;

  const items = resultsContainer.querySelectorAll('.bookmark-item');

  if (e.key === 'Escape') {
    e.preventDefault();
    closeOverlay();
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (items.length > 0) {
      selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
      updateSelection();
    }
    return;
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (items.length > 0) {
      selectedIndex = Math.max(selectedIndex - 1, 0);
      updateSelection();
    }
    return;
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    const currentItem = resultsContainer.querySelector('.bookmark-item.selected');
    if (currentItem) {
      const title = currentItem.querySelector('.bookmark-title').textContent;
      const url = currentItem.querySelector('.bookmark-url').textContent;
      const bookmark = bookmarks.find(b => b.title === title && b.url === url);
      if (bookmark) {
        openBookmark(bookmark);
      }
    }
  }
}

function updateSelection() {
  const items = resultsContainer.querySelectorAll('.bookmark-item');
  items.forEach((item, index) => {
    item.classList.toggle('selected', index === selectedIndex);
  });

  if (items[selectedIndex]) {
    items[selectedIndex].scrollIntoView({ block: 'nearest' });
  }
}

async function init() {
  if (isVisible) {
    closeOverlay();
    return;
  }

  bookmarks = window.injectedBookmarks || [];
  createOverlay();
  isVisible = true;

  document.addEventListener('keydown', handleKeyDown);

  searchInput.addEventListener('input', (e) => {
    searchBookmarks(e.target.value);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  });

  document.addEventListener('click', (e) => {
    if (overlay && !overlay.contains(e.target)) {
      closeOverlay();
    }
  });
}

init();
})();
