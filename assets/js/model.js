/**
 * MODEL.JS
 * CRUD operations and business logic for events, notes, and tasks
 */

import { getItem, setItem, generateId, STORAGE_KEYS } from "./storage.js";

// ===== EVENTS =====

/**
 * Get all events
 * @returns {Array} Array of events
 */
export function getAllEvents() {
  return getItem(STORAGE_KEYS.EVENTS, []);
}

/**
 * Get events for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Array} Array of events for the date
 */
export function getEventsByDate(date) {
  const events = getAllEvents();
  return events.filter((event) => event.date === date);
}

/**
 * Get events for a date range
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Array} Array of events in the range
 */
export function getEventsByDateRange(startDate, endDate) {
  const events = getAllEvents();
  return events.filter(
    (event) => event.date >= startDate && event.date <= endDate
  );
}

/**
 * Get event by ID
 * @param {string} id - Event ID
 * @returns {Object|null} Event object or null
 */
export function getEventById(id) {
  const events = getAllEvents();
  return events.find((event) => event.id === id) || null;
}

/**
 * Create new event
 * @param {Object} eventData - Event data
 * @returns {Object} Created event with ID
 */
export function createEvent(eventData) {
  const events = getAllEvents();
  const newEvent = {
    id: generateId(),
    title: eventData.title || "Untitled Event",
    date: eventData.date,
    start: eventData.start,
    end: eventData.end,
    location: eventData.location || "",
    notes: eventData.notes || "",
    color: eventData.color || "#3b82f6",
    tags: eventData.tags || [],
    repeat: eventData.repeat || { freq: "none", interval: 1, until: null },
    seriesId: eventData.seriesId || null,
  };

  events.push(newEvent);
  setItem(STORAGE_KEYS.EVENTS, events);
  return newEvent;
}

/**
 * Update event
 * @param {string} id - Event ID
 * @param {Object} updates - Updated fields
 * @returns {Object|null} Updated event or null
 */
export function updateEvent(id, updates) {
  const events = getAllEvents();
  const index = events.findIndex((event) => event.id === id);

  if (index === -1) return null;

  events[index] = { ...events[index], ...updates };
  setItem(STORAGE_KEYS.EVENTS, events);
  return events[index];
}

/**
 * Delete event
 * @param {string} id - Event ID
 * @returns {boolean} Success status
 */
export function deleteEvent(id) {
  const events = getAllEvents();
  const filtered = events.filter((event) => event.id !== id);
  setItem(STORAGE_KEYS.EVENTS, filtered);
  return filtered.length < events.length;
}

/**
 * Delete all events in a series
 * @param {string} seriesId - Series ID
 * @returns {number} Number of events deleted
 */
export function deleteEventSeries(seriesId) {
  const events = getAllEvents();
  const filtered = events.filter((event) => event.seriesId !== seriesId);
  const deletedCount = events.length - filtered.length;
  setItem(STORAGE_KEYS.EVENTS, filtered);
  return deletedCount;
}

/**
 * Check for time conflicts
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} start - Start time HH:MM
 * @param {string} end - End time HH:MM
 * @param {string} excludeId - Event ID to exclude from check
 * @returns {Array} Array of conflicting events
 */
export function checkEventConflicts(date, start, end, excludeId = null) {
  const dayEvents = getEventsByDate(date);
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  return dayEvents.filter((event) => {
    if (event.id === excludeId) return false;

    const eventStart = timeToMinutes(event.start);
    const eventEnd = timeToMinutes(event.end);

    // Check for overlap
    return startMinutes < eventEnd && endMinutes > eventStart;
  });
}

/**
 * Expand recurring events for a date range
 * @param {Object} event - Base event with recurrence
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Array} Array of expanded event instances
 */
export function expandRecurringEvent(event, startDate, endDate) {
  if (!event.repeat || event.repeat.freq === "none") {
    return [event];
  }

  const instances = [];
  const start = new Date(event.date);
  const end = new Date(endDate);
  const until = event.repeat.until ? new Date(event.repeat.until) : end;

  let current = new Date(start);

  while (current <= Math.min(until, end)) {
    if (current >= new Date(startDate)) {
      instances.push({
        ...event,
        date: formatDate(current),
        isRecurring: true,
      });
    }

    // Increment based on frequency
    switch (event.repeat.freq) {
      case "daily":
        current.setDate(current.getDate() + event.repeat.interval);
        break;
      case "weekly":
        current.setDate(current.getDate() + 7 * event.repeat.interval);
        break;
      case "monthly":
        current.setMonth(current.getMonth() + event.repeat.interval);
        break;
    }
  }

  return instances;
}

// ===== NOTES =====

/**
 * Get all notes
 * @returns {Array} Array of notes
 */
export function getAllNotes() {
  return getItem(STORAGE_KEYS.NOTES, []);
}

/**
 * Get note by ID
 * @param {string} id - Note ID
 * @returns {Object|null} Note object or null
 */
export function getNoteById(id) {
  const notes = getAllNotes();
  return notes.find((note) => note.id === id) || null;
}

/**
 * Create new note
 * @param {Object} noteData - Note data
 * @returns {Object} Created note with ID
 */
export function createNote(noteData) {
  const notes = getAllNotes();
  const now = new Date().toISOString();

  const newNote = {
    id: generateId(),
    title: noteData.title || "Untitled Note",
    contentHTML: noteData.contentHTML || "",
    createdAt: now,
    updatedAt: now,
    tags: noteData.tags || [],
    color: noteData.color || "#3b82f6",
    pinned: noteData.pinned || false,
  };

  notes.push(newNote);
  setItem(STORAGE_KEYS.NOTES, notes);
  return newNote;
}

/**
 * Update note
 * @param {string} id - Note ID
 * @param {Object} updates - Updated fields
 * @returns {Object|null} Updated note or null
 */
export function updateNote(id, updates) {
  const notes = getAllNotes();
  const index = notes.findIndex((note) => note.id === id);

  if (index === -1) return null;

  notes[index] = {
    ...notes[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  setItem(STORAGE_KEYS.NOTES, notes);
  return notes[index];
}

/**
 * Delete note
 * @param {string} id - Note ID
 * @returns {boolean} Success status
 */
export function deleteNote(id) {
  const notes = getAllNotes();
  const filtered = notes.filter((note) => note.id !== id);
  setItem(STORAGE_KEYS.NOTES, filtered);
  return filtered.length < notes.length;
}

/**
 * Toggle note pin status
 * @param {string} id - Note ID
 * @returns {Object|null} Updated note or null
 */
export function toggleNotePin(id) {
  const note = getNoteById(id);
  if (!note) return null;
  return updateNote(id, { pinned: !note.pinned });
}

/**
 * Get notes filtered by criteria
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered notes
 */
export function filterNotes(filters = {}) {
  let notes = getAllNotes();

  // Filter by pinned
  if (filters.pinned !== undefined) {
    notes = notes.filter((note) => note.pinned === filters.pinned);
  }

  // Filter by tags
  if (filters.tags && filters.tags.length > 0) {
    notes = notes.filter((note) =>
      filters.tags.some((tag) => note.tags.includes(tag))
    );
  }

  // Filter by search text
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    notes = notes.filter(
      (note) =>
        note.title.toLowerCase().includes(searchLower) ||
        note.contentHTML.toLowerCase().includes(searchLower)
    );
  }

  // Sort: pinned first, then by updated date
  notes.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  return notes;
}

// ===== TASKS =====

/**
 * Get all tasks
 * @returns {Array} Array of tasks
 */
export function getAllTasks() {
  return getItem(STORAGE_KEYS.TASKS, []);
}

/**
 * Get task by ID
 * @param {string} id - Task ID
 * @returns {Object|null} Task object or null
 */
export function getTaskById(id) {
  const tasks = getAllTasks();
  return tasks.find((task) => task.id === id) || null;
}

/**
 * Create new task
 * @param {Object} taskData - Task data
 * @returns {Object} Created task with ID
 */
export function createTask(taskData) {
  const tasks = getAllTasks();

  const newTask = {
    id: generateId(),
    text: taskData.text || "",
    done: taskData.done || false,
    dueDate: taskData.dueDate || null,
    noteId: taskData.noteId || null,
    eventId: taskData.eventId || null,
  };

  tasks.push(newTask);
  setItem(STORAGE_KEYS.TASKS, tasks);
  return newTask;
}

/**
 * Update task
 * @param {string} id - Task ID
 * @param {Object} updates - Updated fields
 * @returns {Object|null} Updated task or null
 */
export function updateTask(id, updates) {
  const tasks = getAllTasks();
  const index = tasks.findIndex((task) => task.id === id);

  if (index === -1) return null;

  tasks[index] = { ...tasks[index], ...updates };
  setItem(STORAGE_KEYS.TASKS, tasks);
  return tasks[index];
}

/**
 * Delete task
 * @param {string} id - Task ID
 * @returns {boolean} Success status
 */
export function deleteTask(id) {
  const tasks = getAllTasks();
  const filtered = tasks.filter((task) => task.id !== id);
  setItem(STORAGE_KEYS.TASKS, filtered);
  return filtered.length < tasks.length;
}

/**
 * Toggle task done status
 * @param {string} id - Task ID
 * @returns {Object|null} Updated task or null
 */
export function toggleTaskDone(id) {
  const task = getTaskById(id);
  if (!task) return null;
  return updateTask(id, { done: !task.done });
}

/**
 * Get tasks filtered by criteria
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered tasks
 */
export function filterTasks(filters = {}) {
  let tasks = getAllTasks();

  // Filter by done status
  if (filters.done !== undefined) {
    tasks = tasks.filter((task) => task.done === filters.done);
  }

  // Filter by due date
  if (filters.dueDate) {
    tasks = tasks.filter((task) => task.dueDate === filters.dueDate);
  }

  // Filter by overdue
  if (filters.overdue) {
    const today = formatDate(new Date());
    tasks = tasks.filter(
      (task) => task.dueDate && task.dueDate < today && !task.done
    );
  }

  return tasks;
}

// ===== UTILITY FUNCTIONS =====

/**
 * Convert time string to minutes since midnight
 * @param {string} time - Time in HH:MM format
 * @returns {number} Minutes since midnight
 */
function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Format date as YYYY-MM-DD
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format time for display
 * @param {string} time - Time in HH:MM format
 * @param {string} format - '12' or '24'
 * @returns {string} Formatted time string
 */
export function formatTime(time, format = "12") {
  if (format === "24") return time;

  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
}

/**
 * Get all unique tags from notes
 * @returns {Array} Array of unique tags
 */
export function getAllTags() {
  const notes = getAllNotes();
  const events = getAllEvents();
  const allTags = new Set();

  notes.forEach((note) => note.tags.forEach((tag) => allTags.add(tag)));
  events.forEach((event) => event.tags.forEach((tag) => allTags.add(tag)));

  return Array.from(allTags).sort();
}

/**
 * Assert function for basic testing
 * @param {boolean} condition - Condition to test
 * @param {string} message - Error message if condition is false
 */
export function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Basic tests
try {
  assert(
    timeToMinutes("09:30") === 570,
    "timeToMinutes should convert correctly"
  );
  assert(
    formatDate(new Date("2025-11-09")) === "2025-11-09",
    "formatDate should format correctly"
  );
  assert(
    formatTime("14:30", "12") === "2:30 PM",
    "formatTime should convert to 12-hour format"
  );
  console.log("✓ Model utility tests passed");
} catch (error) {
  console.error("✗ Model utility tests failed:", error.message);
}
