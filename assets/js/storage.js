/**
 * STORAGE.JS
 * LocalStorage abstraction with versioning and migrations
 */

const STORAGE_VERSION = "1.0.0";
const STORAGE_KEYS = {
  EVENTS: "daily_planner_events",
  NOTES: "daily_planner_notes",
  TASKS: "daily_planner_tasks",
  SETTINGS: "daily_planner_settings",
  VERSION: "daily_planner_version",
};

/**
 * Get item from localStorage with JSON parsing
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key doesn't exist
 * @returns {*} Parsed value or default
 */
export function getItem(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from storage:`, error);
    return defaultValue;
  }
}

/**
 * Set item in localStorage with JSON stringification
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @returns {boolean} Success status
 */
export function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing ${key} to storage:`, error);
    return false;
  }
}

/**
 * Remove item from localStorage
 * @param {string} key - Storage key
 */
export function removeItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing ${key} from storage:`, error);
  }
}

/**
 * Clear all application data
 */
export function clearAll() {
  Object.values(STORAGE_KEYS).forEach((key) => {
    removeItem(key);
  });
}

/**
 * Get current storage version
 * @returns {string} Version string
 */
export function getVersion() {
  return getItem(STORAGE_KEYS.VERSION, "0.0.0");
}

/**
 * Initialize storage with default values and run migrations
 */
export function initStorage() {
  const currentVersion = getVersion();

  // Run migrations if needed
  if (currentVersion !== STORAGE_VERSION) {
    runMigrations(currentVersion, STORAGE_VERSION);
    setItem(STORAGE_KEYS.VERSION, STORAGE_VERSION);
  }

  // Initialize with defaults if empty
  if (!getItem(STORAGE_KEYS.EVENTS)) {
    setItem(STORAGE_KEYS.EVENTS, getSeedEvents());
  }

  if (!getItem(STORAGE_KEYS.NOTES)) {
    setItem(STORAGE_KEYS.NOTES, getSeedNotes());
  }

  if (!getItem(STORAGE_KEYS.TASKS)) {
    setItem(STORAGE_KEYS.TASKS, getSeedTasks());
  }

  if (!getItem(STORAGE_KEYS.SETTINGS)) {
    setItem(STORAGE_KEYS.SETTINGS, getDefaultSettings());
  }
}

/**
 * Run migrations between versions
 * @param {string} fromVersion - Current version
 * @param {string} toVersion - Target version
 */
function runMigrations(fromVersion, toVersion) {
  console.log(`Migrating storage from ${fromVersion} to ${toVersion}`);
  // Add migration logic here as needed for future versions
}

/**
 * Get default settings
 * @returns {Object} Default settings object
 */
function getDefaultSettings() {
  // Detect system theme preference
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  return {
    theme: "system",
    accent: "#3b82f6",
    weekStartsOn: 0, // Sunday
    defaultView: "day",
    timeFormat: "12",
    version: STORAGE_VERSION,
  };
}

/**
 * Get seed events for demo
 * @returns {Array} Array of event objects
 */
function getSeedEvents() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const formatDate = (date) => {
    return date.toISOString().split("T")[0];
  };

  return [
    {
      id: generateId(),
      title: "Team Standup",
      date: formatDate(today),
      start: "09:00",
      end: "09:30",
      location: "Conference Room A",
      notes: "Daily sync with the development team",
      color: "#3b82f6",
      tags: ["work", "meeting"],
      repeat: { freq: "daily", interval: 1, until: null },
      seriesId: "series-1",
    },
    {
      id: generateId(),
      title: "Lunch Break",
      date: formatDate(today),
      start: "12:00",
      end: "13:00",
      location: "Cafeteria",
      notes: "",
      color: "#10b981",
      tags: ["personal"],
      repeat: { freq: "none", interval: 1, until: null },
      seriesId: null,
    },
    {
      id: generateId(),
      title: "Project Review",
      date: formatDate(today),
      start: "14:00",
      end: "15:30",
      location: "Meeting Room B",
      notes: "Review Q4 project deliverables",
      color: "#f59e0b",
      tags: ["work", "project"],
      repeat: { freq: "weekly", interval: 1, until: null },
      seriesId: "series-2",
    },
    {
      id: generateId(),
      title: "Gym Session",
      date: formatDate(today),
      start: "18:00",
      end: "19:00",
      location: "Downtown Gym",
      notes: "Leg day workout",
      color: "#ef4444",
      tags: ["personal", "fitness"],
      repeat: { freq: "none", interval: 1, until: null },
      seriesId: null,
    },
    {
      id: generateId(),
      title: "Client Presentation",
      date: formatDate(tomorrow),
      start: "10:00",
      end: "11:30",
      location: "Zoom",
      notes: "Present new feature roadmap",
      color: "#8b5cf6",
      tags: ["work", "client"],
      repeat: { freq: "none", interval: 1, until: null },
      seriesId: null,
    },
  ];
}

/**
 * Get seed notes for demo
 * @returns {Array} Array of note objects
 */
function getSeedNotes() {
  const now = new Date().toISOString();

  return [
    {
      id: generateId(),
      title: "Project Ideas",
      contentHTML:
        "<p>Build a <strong>personal finance tracker</strong> with budget visualization</p><ul><li>Income/expense tracking</li><li>Category-based budgets</li><li>Monthly reports</li></ul>",
      createdAt: now,
      updatedAt: now,
      tags: ["ideas", "projects"],
      color: "#3b82f6",
      pinned: true,
    },
    {
      id: generateId(),
      title: "Meeting Notes - Nov 9",
      contentHTML:
        "<p>Key points from today's meeting:</p><ul><li>Launch date moved to Dec 1</li><li>Need to finalize API documentation</li><li>Design review scheduled for next week</li></ul><p><strong>Action items:</strong> Update timeline, review mockups</p>",
      createdAt: now,
      updatedAt: now,
      tags: ["work", "meetings"],
      color: "#10b981",
      pinned: false,
    },
    {
      id: generateId(),
      title: "Learning Resources",
      contentHTML:
        '<p>Useful links for web development:</p><ul><li><a href="#">MDN Web Docs</a> - Comprehensive reference</li><li><a href="#">CSS Tricks</a> - Great tutorials</li><li><a href="#">JavaScript.info</a> - In-depth JS guide</li></ul>',
      createdAt: now,
      updatedAt: now,
      tags: ["learning", "resources"],
      color: "#f59e0b",
      pinned: true,
    },
    {
      id: generateId(),
      title: "Recipe: Pasta Carbonara",
      contentHTML:
        "<p><strong>Ingredients:</strong></p><ul><li>400g spaghetti</li><li>200g pancetta</li><li>4 eggs</li><li>100g Parmesan cheese</li><li>Black pepper</li></ul><p><strong>Instructions:</strong> Cook pasta, fry pancetta, mix eggs with cheese, combine all with pasta water.</p>",
      createdAt: now,
      updatedAt: now,
      tags: ["recipes", "cooking"],
      color: "#ef4444",
      pinned: false,
    },
  ];
}

/**
 * Get seed tasks for demo
 * @returns {Array} Array of task objects
 */
function getSeedTasks() {
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  return [
    {
      id: generateId(),
      text: "Review pull requests",
      done: false,
      dueDate: today,
      noteId: null,
      eventId: null,
    },
    {
      id: generateId(),
      text: "Update project documentation",
      done: false,
      dueDate: today,
      noteId: null,
      eventId: null,
    },
    {
      id: generateId(),
      text: "Prepare presentation slides",
      done: false,
      dueDate: tomorrowStr,
      noteId: null,
      eventId: null,
    },
    {
      id: generateId(),
      text: "Call dentist for appointment",
      done: true,
      dueDate: today,
      noteId: null,
      eventId: null,
    },
    {
      id: generateId(),
      text: "Buy groceries",
      done: false,
      dueDate: null,
      noteId: null,
      eventId: null,
    },
  ];
}

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Export all data as JSON
 * @returns {Object} All application data
 */
export function exportData() {
  return {
    version: STORAGE_VERSION,
    exportDate: new Date().toISOString(),
    events: getItem(STORAGE_KEYS.EVENTS, []),
    notes: getItem(STORAGE_KEYS.NOTES, []),
    tasks: getItem(STORAGE_KEYS.TASKS, []),
    settings: getItem(STORAGE_KEYS.SETTINGS, getDefaultSettings()),
  };
}

/**
 * Import data from JSON
 * @param {Object} data - Data to import
 * @param {string} mode - 'merge' or 'replace'
 * @returns {Object} Result with success status and message
 */
export function importData(data, mode = "merge") {
  try {
    // Validate data structure
    if (!data || typeof data !== "object") {
      throw new Error("Invalid data format");
    }

    if (mode === "replace") {
      // Replace all data
      if (data.events) setItem(STORAGE_KEYS.EVENTS, data.events);
      if (data.notes) setItem(STORAGE_KEYS.NOTES, data.notes);
      if (data.tasks) setItem(STORAGE_KEYS.TASKS, data.tasks);
      if (data.settings) setItem(STORAGE_KEYS.SETTINGS, data.settings);
    } else {
      // Merge data
      if (data.events) {
        const existing = getItem(STORAGE_KEYS.EVENTS, []);
        setItem(STORAGE_KEYS.EVENTS, [...existing, ...data.events]);
      }
      if (data.notes) {
        const existing = getItem(STORAGE_KEYS.NOTES, []);
        setItem(STORAGE_KEYS.NOTES, [...existing, ...data.notes]);
      }
      if (data.tasks) {
        const existing = getItem(STORAGE_KEYS.TASKS, []);
        setItem(STORAGE_KEYS.TASKS, [...existing, ...data.tasks]);
      }
      if (data.settings) {
        const existing = getItem(STORAGE_KEYS.SETTINGS, getDefaultSettings());
        setItem(STORAGE_KEYS.SETTINGS, { ...existing, ...data.settings });
      }
    }

    return { success: true, message: "Data imported successfully" };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Calculate storage usage in KB
 * @returns {number} Storage size in KB
 */
export function getStorageSize() {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return (total / 1024).toFixed(2);
}

export { STORAGE_KEYS };
