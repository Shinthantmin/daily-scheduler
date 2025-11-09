/**
 * NOTES.JS
 * Notes management with rich text editing
 */

import {
  getAllNotes,
  createNote,
  updateNote,
  deleteNote,
  toggleNotePin,
  filterNotes,
  getAllTags,
} from "./model.js";
import {
  showModal,
  showToast,
  confirm,
  addUndo,
  formatRelativeTime,
  debounce,
} from "./ui.js";

let currentFilter = {};
let currentViewMode = "list"; // 'list' or 'grid'

/**
 * Initialize notes page
 */
export function initNotes() {
  // View mode toggle
  document
    .getElementById("gridViewBtn")
    ?.addEventListener("click", () => setViewMode("grid"));
  document
    .getElementById("listViewBtn")
    ?.addEventListener("click", () => setViewMode("list"));

  // Filter controls
  document.getElementById("filterPinned")?.addEventListener("change", (e) => {
    if (e.target.checked) {
      currentFilter.pinned = true;
    } else {
      delete currentFilter.pinned;
    }
    renderNotes();
  });

  // Search
  const searchInput = document.getElementById("notesSearch");
  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce((e) => {
        if (e.target.value.trim()) {
          currentFilter.search = e.target.value.trim();
        } else {
          delete currentFilter.search;
        }
        renderNotes();
      }, 300)
    );
  }

  // Add note button
  document
    .getElementById("addNoteBtn")
    ?.addEventListener("click", () => showNoteModal());

  // Initial render
  renderNotes();
  renderTagFilters();
}

/**
 * Set view mode
 * @param {string} mode - 'list' or 'grid'
 */
function setViewMode(mode) {
  currentViewMode = mode;

  // Update buttons
  document
    .getElementById("gridViewBtn")
    ?.classList.toggle("active", mode === "grid");
  document
    .getElementById("listViewBtn")
    ?.classList.toggle("active", mode === "list");

  // Update grid class
  const grid = document.getElementById("notesGrid");
  if (grid) {
    grid.classList.toggle("grid-view", mode === "grid");
    grid.classList.toggle("list-view", mode === "list");
  }
}

/**
 * Render notes
 */
function renderNotes() {
  const container = document.getElementById("notesGrid");
  if (!container) return;

  const notes = filterNotes(currentFilter);

  if (notes.length === 0) {
    container.innerHTML =
      '<p class="text-secondary">No notes found. Create your first note!</p>';
    return;
  }

  container.innerHTML = "";

  notes.forEach((note) => {
    const card = createNoteCard(note);
    container.appendChild(card);
  });
}

/**
 * Create note card element
 * @param {Object} note - Note object
 * @returns {HTMLElement} Note card element
 */
function createNoteCard(note) {
  const card = document.createElement("div");
  card.className = "note-card";
  if (note.pinned) card.classList.add("pinned");
  card.dataset.noteId = note.id;

  // Extract plain text from HTML
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = note.contentHTML;
  const plainText = tempDiv.textContent || tempDiv.innerText || "";

  card.innerHTML = `
    <div class="note-card-header">
      <h3 class="note-card-title">${escapeHTML(note.title)}</h3>
      <div class="note-actions">
        <button class="btn-icon" data-action="pin" aria-label="${
          note.pinned ? "Unpin" : "Pin"
        } note" title="${note.pinned ? "Unpin" : "Pin"}">
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M8 2l1.5 4.5H14L10 10l1.5 4.5L8 12l-3.5 2.5L6 10 2 6.5h4.5L8 2z" 
                  fill="${note.pinned ? "currentColor" : "none"}" 
                  stroke="currentColor" 
                  stroke-width="1.5"/>
          </svg>
        </button>
        <button class="btn-icon" data-action="delete" aria-label="Delete note" title="Delete">
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M2 4h12M5 4V2h6v2M3 4v10h10V4" fill="none" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="note-card-content">${plainText}</div>
    <div class="note-card-footer">
      ${note.tags
        .map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`)
        .join("")}
      <span class="note-date">${formatRelativeTime(note.updatedAt)}</span>
    </div>
  `;

  // Event listeners
  card.addEventListener("click", (e) => {
    if (e.target.closest("[data-action]")) {
      const action = e.target.closest("[data-action]").dataset.action;
      e.stopPropagation();

      if (action === "pin") {
        handlePinNote(note.id);
      } else if (action === "delete") {
        handleDeleteNote(note.id);
      }
    } else {
      showNoteModal(note);
    }
  });

  return card;
}

/**
 * Show note modal
 * @param {Object} note - Existing note or undefined for new
 */
export function showNoteModal(note = {}) {
  const isEdit = !!note.id;

  const form = document.createElement("div");
  form.innerHTML = `
    <div class="form-group">
      <label class="form-label" for="noteTitle">Title *</label>
      <input type="text" id="noteTitle" class="form-input" required value="${escapeHTML(
        note.title || ""
      )}" placeholder="Note title">
    </div>
    
    <div class="form-group">
      <label class="form-label">Content</label>
      <div class="rich-editor">
        <div class="editor-toolbar">
          <button type="button" class="editor-btn" data-command="bold" title="Bold (Ctrl+B)"><strong>B</strong></button>
          <button type="button" class="editor-btn" data-command="italic" title="Italic (Ctrl+I)"><em>I</em></button>
          <button type="button" class="editor-btn" data-command="underline" title="Underline (Ctrl+U)"><u>U</u></button>
          <button type="button" class="editor-btn" data-command="insertUnorderedList" title="Bullet list">• List</button>
          <button type="button" class="editor-btn" data-command="insertOrderedList" title="Numbered list">1. List</button>
          <button type="button" class="editor-btn" data-command="formatBlock" data-value="pre" title="Code block">&lt;/&gt;</button>
          <button type="button" class="editor-btn" data-command="createLink" title="Insert link">🔗</button>
        </div>
        <div class="editor-content" id="noteContent" contenteditable="true">${
          note.contentHTML || ""
        }</div>
      </div>
    </div>
    
    <div class="form-group">
      <label class="form-label" for="noteTags">Tags (comma-separated)</label>
      <input type="text" id="noteTags" class="form-input" value="${(
        note.tags || []
      ).join(", ")}" placeholder="work, ideas, personal">
    </div>
    
    <div class="form-group">
      <label class="form-label" for="noteColor">Color Label</label>
      <input type="color" id="noteColor" class="color-input" value="${
        note.color || "#3b82f6"
      }">
    </div>
    
    <div class="form-group">
      <label class="checkbox-label">
        <input type="checkbox" id="notePinned" ${note.pinned ? "checked" : ""}>
        <span>Pin this note</span>
      </label>
    </div>
  `;

  // Set up rich text editor
  setTimeout(() => setupRichEditor(form), 100);

  const buttons = [{ text: "Cancel", class: "btn-secondary", value: null }];

  if (isEdit) {
    buttons.push({
      text: "Delete",
      class: "btn-danger",
      value: "delete",
      onClick: () => handleDeleteNote(note.id),
    });
  }

  buttons.push({
    text: isEdit ? "Save" : "Create",
    class: "btn-primary",
    value: "save",
    onClick: () => handleSaveNote(form, note),
  });

  showModal({
    title: isEdit ? "Edit Note" : "New Note",
    content: form,
    buttons,
  });
}

/**
 * Set up rich text editor
 * @param {HTMLElement} form - Form element
 */
function setupRichEditor(form) {
  const toolbar = form.querySelector(".editor-toolbar");
  const editor = form.querySelector(".editor-content");

  if (!toolbar || !editor) return;

  // Toolbar button handlers
  toolbar.addEventListener("click", (e) => {
    const btn = e.target.closest(".editor-btn");
    if (!btn) return;

    e.preventDefault();
    const command = btn.dataset.command;
    const value = btn.dataset.value;

    if (command === "createLink") {
      const url = prompt("Enter URL:", "https://");
      if (url) {
        document.execCommand(command, false, url);
      }
    } else if (value) {
      document.execCommand(command, false, value);
    } else {
      document.execCommand(command, false, null);
    }

    editor.focus();
    updateToolbarState();
  });

  // Update toolbar state on selection change
  editor.addEventListener("mouseup", updateToolbarState);
  editor.addEventListener("keyup", updateToolbarState);

  function updateToolbarState() {
    toolbar.querySelectorAll(".editor-btn").forEach((btn) => {
      const command = btn.dataset.command;
      if (["bold", "italic", "underline"].includes(command)) {
        btn.classList.toggle("active", document.queryCommandState(command));
      }
    });
  }
}

/**
 * Handle save note
 * @param {HTMLElement} form - Form element
 * @param {Object} existingNote - Existing note or empty object
 */
function handleSaveNote(form, existingNote) {
  const noteData = {
    title: form.querySelector("#noteTitle").value,
    contentHTML: form.querySelector("#noteContent").innerHTML,
    tags: form
      .querySelector("#noteTags")
      .value.split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    color: form.querySelector("#noteColor").value,
    pinned: form.querySelector("#notePinned").checked,
  };

  if (!noteData.title.trim()) {
    showToast({
      type: "error",
      message: "Please enter a note title",
    });
    return;
  }

  if (existingNote.id) {
    // Update existing note
    const oldNote = { ...existingNote };
    updateNote(existingNote.id, noteData);

    addUndo(() => {
      updateNote(existingNote.id, oldNote);
      renderNotes();
    }, "Note updated");

    showToast({
      type: "success",
      message: "Note updated successfully",
    });
  } else {
    // Create new note
    const newNote = createNote(noteData);

    addUndo(() => {
      deleteNote(newNote.id);
      renderNotes();
    }, "Note created");

    showToast({
      type: "success",
      message: "Note created successfully",
    });
  }

  renderNotes();
  renderTagFilters();
}

/**
 * Handle pin note
 * @param {string} id - Note ID
 */
function handlePinNote(id) {
  const note = toggleNotePin(id);

  showToast({
    type: "info",
    message: note.pinned ? "Note pinned" : "Note unpinned",
  });

  renderNotes();
}

/**
 * Handle delete note
 * @param {string} id - Note ID
 */
async function handleDeleteNote(id) {
  const confirmed = await confirm(
    "Are you sure you want to delete this note?",
    "Delete Note"
  );

  if (confirmed) {
    deleteNote(id);

    showToast({
      type: "success",
      message: "Note deleted successfully",
    });

    renderNotes();
    renderTagFilters();
  }
}

/**
 * Render tag filters
 */
function renderTagFilters() {
  const container = document.getElementById("tagsList");
  if (!container) return;

  const tags = getAllTags();

  if (tags.length === 0) {
    container.innerHTML = '<p class="text-secondary text-sm">No tags yet</p>';
    return;
  }

  container.innerHTML = "";

  tags.forEach((tag) => {
    const btn = document.createElement("button");
    btn.className = "tag-filter";
    btn.textContent = tag;

    if (currentFilter.tags && currentFilter.tags.includes(tag)) {
      btn.classList.add("active");
    }

    btn.addEventListener("click", () => {
      if (!currentFilter.tags) {
        currentFilter.tags = [];
      }

      const index = currentFilter.tags.indexOf(tag);
      if (index > -1) {
        currentFilter.tags.splice(index, 1);
        if (currentFilter.tags.length === 0) {
          delete currentFilter.tags;
        }
      } else {
        currentFilter.tags.push(tag);
      }

      renderNotes();
      renderTagFilters();
    });

    container.appendChild(btn);
  });
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

export { renderNotes };
