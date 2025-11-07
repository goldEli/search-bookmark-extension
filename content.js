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

      .bookmark-item {
        position: relative;
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

      .bookmark-actions {
        position: absolute;
        right: 20px;
        top: 50%;
        transform: translateY(-50%);
        display: none;
        gap: 8px;
      }

      .bookmark-item:hover .bookmark-actions,
      .bookmark-item.selected .bookmark-actions {
        display: flex;
      }

      .bookmark-btn {
        padding: 4px 8px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 500;
        background: #2a2a2a;
        color: #aaa;
        transition: all 0.2s;
      }

      .bookmark-btn:hover {
        background: #3a3a3a;
        color: #fff;
      }

      .bookmark-btn.edit {
        background: #2a2a2a;
      }

      .bookmark-btn.delete {
        background: #2a2a2a;
      }

      .bookmark-btn.delete:hover {
        background: #4a1a1a;
        color: #ff6b6b;
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
    item.dataset.bookmarkId = bookmark.id;
    if (index === 0) item.classList.add('selected');

    item.innerHTML = `
      <div class="bookmark-content">
        <div class="bookmark-title">${escapeHtml(bookmark.title)}</div>
        <div class="bookmark-url">${escapeHtml(bookmark.url)}</div>
      </div>
      <div class="bookmark-actions">
        <button class="bookmark-btn edit" data-action="edit">Edit</button>
        <button class="bookmark-btn delete" data-action="delete">Delete</button>
      </div>
    `;

    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('bookmark-btn')) {
        return;
      }
      openBookmark(bookmark);
    });

    item.querySelector('.bookmark-btn.edit').addEventListener('click', (e) => {
      e.stopPropagation();
      enterEditMode(item, bookmark);
    });

    item.querySelector('.bookmark-btn.delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteBookmark(bookmark);
    });

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

function enterEditMode(item, bookmark) {
  const content = item.querySelector('.bookmark-content');
  const originalHTML = content.innerHTML;

  content.innerHTML = `
    <input type="text"
           class="edit-title"
           value="${escapeHtml(bookmark.title)}"
           placeholder="Title"
           style="width: 100%; margin-bottom: 8px; padding: 4px 8px; background: #2a2a2a; border: 1px solid #444; border-radius: 4px; color: #fff; font-size: 14px;">
    <input type="text"
           class="edit-url"
           value="${escapeHtml(bookmark.url)}"
           placeholder="URL"
           style="width: 100%; padding: 4px 8px; background: #2a2a2a; border: 1px solid #444; border-radius: 4px; color: #fff; font-size: 12px;">
    <div class="edit-actions" style="margin-top: 8px; display: flex; gap: 8px;">
      <button class="bookmark-btn save" style="background: #2a4a2a; color: #6b6b;">Save</button>
      <button class="bookmark-btn cancel" style="background: #2a2a2a;">Cancel</button>
    </div>
  `;

  const saveBtn = content.querySelector('.save');
  const cancelBtn = content.querySelector('.cancel');
  const titleInput = content.querySelector('.edit-title');
  const urlInput = content.querySelector('.edit-url');

  saveBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const newTitle = titleInput.value.trim();
    const newUrl = urlInput.value.trim();
    if (newTitle && newUrl) {
      chrome.runtime.sendMessage({
        action: 'editBookmark',
        id: bookmark.id,
        title: newTitle,
        url: newUrl
      }, () => {
        reloadBookmarks();
      });
    }
  });

  cancelBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    content.innerHTML = originalHTML;
  });

  titleInput.focus();
}

function deleteBookmark(bookmark) {
  if (confirm('Are you sure you want to delete this bookmark?')) {
    chrome.runtime.sendMessage({
      action: 'deleteBookmark',
      id: bookmark.id
    }, () => {
      reloadBookmarks();
    });
  }
}

function reloadBookmarks() {
  const currentQuery = searchInput.value;
  chrome.runtime.sendMessage({ action: 'getBookmarks' }, (newBookmarks) => {
    bookmarks = newBookmarks || [];
    searchBookmarks(currentQuery);
  });
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
