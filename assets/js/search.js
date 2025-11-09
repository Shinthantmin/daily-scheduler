/**
 * SEARCH.JS
 * Global search functionality across events, notes, and tasks
 */

import { getAllEvents, getAllNotes, getAllTasks } from "./model.js";
import { showModal } from "./ui.js";
import { showEventModal } from "./calendar.js";
import { showNoteModal } from "./notes.js";
import { showTaskModal } from "./tasks.js";

/**
 * Initialize global search
 */
export function initSearch() {
  const searchBtn = document.getElementById("searchBtn");

  if (searchBtn) {
    searchBtn.addEventListener("click", showSearchModal);
  }

  // Keyboard shortcut (Ctrl/Cmd + K)
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      showSearchModal();
    }
  });
}

/**
 * Show search modal
 */
function showSearchModal() {
  const container = document.createElement("div");

  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.className = "form-input";
  searchInput.placeholder = "Search events, notes, and tasks...";
  searchInput.style.marginBottom = "var(--space-md)";

  const resultsContainer = document.createElement("div");
  resultsContainer.id = "searchResults";
  resultsContainer.style.maxHeight = "400px";
  resultsContainer.style.overflowY = "auto";
  resultsContainer.innerHTML =
    '<p class="text-secondary">Type to search...</p>';

  container.appendChild(searchInput);
  container.appendChild(resultsContainer);

  showModal({
    title: "Search",
    content: container,
    buttons: [{ text: "Close", class: "btn-secondary", value: null }],
  });

  // Focus search input
  setTimeout(() => searchInput.focus(), 100);

  // Search on input
  let debounceTimer;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      performSearch(e.target.value, resultsContainer);
    }, 300);
  });
}

/**
 * Perform search across all data
 * @param {string} query - Search query
 * @param {HTMLElement} container - Results container
 */
function performSearch(query, container) {
  if (!query.trim()) {
    container.innerHTML = '<p class="text-secondary">Type to search...</p>';
    return;
  }

  const results = searchAll(query);

  if (results.length === 0) {
    container.innerHTML = '<p class="text-secondary">No results found</p>';
    return;
  }

  container.innerHTML = "";

  // Group by type
  const grouped = {
    events: results.filter((r) => r.type === "event"),
    notes: results.filter((r) => r.type === "note"),
    tasks: results.filter((r) => r.type === "task"),
  };

  Object.entries(grouped).forEach(([type, items]) => {
    if (items.length === 0) return;

    const section = document.createElement("div");
    section.style.marginBottom = "var(--space-lg)";

    const heading = document.createElement("h3");
    heading.style.fontSize = "var(--font-size-sm)";
    heading.style.fontWeight = "var(--font-weight-semibold)";
    heading.style.color = "var(--text-secondary)";
    heading.style.textTransform = "uppercase";
    heading.style.marginBottom = "var(--space-sm)";
    heading.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)}s (${
      items.length
    })`;
    section.appendChild(heading);

    items.forEach((item) => {
      const resultItem = createSearchResultItem(item, query);
      section.appendChild(resultItem);
    });

    container.appendChild(section);
  });
}

/**
 * Search all data sources
 * @param {string} query - Search query
 * @returns {Array} Array of search results
 */
function searchAll(query) {
  const results = [];
  const queryLower = query.toLowerCase();
  const tokens = tokenize(queryLower);

  // Search events
  const events = getAllEvents();
  events.forEach((event) => {
    const score = scoreMatch(
      tokens,
      `${event.title} ${event.location} ${event.notes} ${event.tags.join(
        " "
      )}`.toLowerCase()
    );

    if (score > 0) {
      results.push({
        type: "event",
        data: event,
        score,
        preview: event.title,
      });
    }
  });

  // Search notes
  const notes = getAllNotes();
  notes.forEach((note) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = note.contentHTML;
    const plainText = tempDiv.textContent || "";

    const score = scoreMatch(
      tokens,
      `${note.title} ${plainText} ${note.tags.join(" ")}`.toLowerCase()
    );

    if (score > 0) {
      results.push({
        type: "note",
        data: note,
        score,
        preview: note.title,
      });
    }
  });

  // Search tasks
  const tasks = getAllTasks();
  tasks.forEach((task) => {
    const score = scoreMatch(tokens, task.text.toLowerCase());

    if (score > 0) {
      results.push({
        type: "task",
        data: task,
        score,
        preview: task.text,
      });
    }
  });

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results;
}

/**
 * Tokenize search query
 * @param {string} query - Search query
 * @returns {Array} Array of tokens
 */
function tokenize(query) {
  return query.split(/\s+/).filter((token) => token.length > 0);
}

/**
 * Score match between tokens and text
 * @param {Array} tokens - Search tokens
 * @param {string} text - Text to search in
 * @returns {number} Match score
 */
function scoreMatch(tokens, text) {
  let score = 0;

  tokens.forEach((token) => {
    if (text.includes(token)) {
      score += token.length;

      // Bonus for exact word match
      const words = text.split(/\s+/);
      if (words.includes(token)) {
        score += 5;
      }
    }
  });

  return score;
}

/**
 * Create search result item element
 * @param {Object} result - Search result
 * @param {string} query - Original query for highlighting
 * @returns {HTMLElement} Result item element
 */
function createSearchResultItem(result, query) {
  const item = document.createElement("div");
  item.style.padding = "var(--space-sm) var(--space-md)";
  item.style.background = "var(--bg-secondary)";
  item.style.borderRadius = "var(--radius-md)";
  item.style.marginBottom = "var(--space-xs)";
  item.style.cursor = "pointer";
  item.style.transition = "background var(--transition-fast)";

  item.addEventListener("mouseenter", () => {
    item.style.background = "var(--bg-tertiary)";
  });

  item.addEventListener("mouseleave", () => {
    item.style.background = "var(--bg-secondary)";
  });

  // Highlight matches
  const highlighted = highlightMatches(result.preview, query);

  item.innerHTML = `
    <div style="font-weight: var(--font-weight-medium);">${highlighted}</div>
    ${
      result.type === "event"
        ? `<div style="font-size: var(--font-size-xs); color: var(--text-tertiary);">${result.data.date} at ${result.data.start}</div>`
        : ""
    }
    ${
      result.type === "task" && result.data.dueDate
        ? `<div style="font-size: var(--font-size-xs); color: var(--text-tertiary);">Due: ${result.data.dueDate}</div>`
        : ""
    }
  `;

  // Click to open
  item.addEventListener("click", () => {
    // Close search modal first
    document.querySelector(".modal-backdrop")?.remove();

    // Open appropriate modal
    if (result.type === "event") {
      showEventModal(result.data);
    } else if (result.type === "note") {
      showNoteModal(result.data);
    } else if (result.type === "task") {
      showTaskModal(result.data);
    }
  });

  return item;
}

/**
 * Highlight query matches in text
 * @param {string} text - Text to highlight
 * @param {string} query - Search query
 * @returns {string} HTML with highlighted matches
 */
function highlightMatches(text, query) {
  const tokens = tokenize(query.toLowerCase());
  let result = escapeHTML(text);

  tokens.forEach((token) => {
    const regex = new RegExp(`(${escapeRegex(token)})`, "gi");
    result = result.replace(
      regex,
      '<mark style="background: var(--accent-light); padding: 0 2px; border-radius: 2px;">$1</mark>'
    );
  });

  return result;
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Escape regex special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
