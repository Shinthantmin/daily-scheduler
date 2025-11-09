/**
 * MAIN.JS
 * Main application entry point - initializes all modules based on current page
 */

import { initStorage } from "./storage.js";
import { initCalendar } from "./calendar.js";
import { initNotes } from "./notes.js";
import { initTasks, renderTasks } from "./tasks.js";
import { initSearch } from "./search.js";
import { initSettings, initThemeToggle, getSettings } from "./settings.js";
import { showToast, getQueryParam } from "./ui.js";
import {
  getAllEvents,
  getAllNotes,
  getAllTasks,
  getEventsByDate,
  filterTasks,
  formatDate,
  formatTime,
} from "./model.js";

/**
 * Initialize application
 */
function init() {
  // Initialize storage
  initStorage();

  // Initialize theme toggle (available on all pages)
  initThemeToggle();

  // Initialize global search
  initSearch();

  // Determine current page and initialize accordingly
  const path = window.location.pathname;
  const page = path.substring(path.lastIndexOf("/") + 1) || "index.html";

  switch (page) {
    case "index.html":
    case "":
      initDashboard();
      break;
    case "schedule.html":
      initCalendar();
      break;
    case "notes.html":
      initNotesPage();
      break;
    case "settings.html":
      initSettings();
      break;
  }

  console.log("✓ Daily Planner initialized");
}

/**
 * Initialize dashboard page
 */
function initDashboard() {
  renderTodaySummary();
  renderMiniCalendar();
  renderUpcomingEvents();
  renderTasksPreview();
  renderNotesPreview();

  // Quick add buttons
  document.getElementById("quickAddEvent")?.addEventListener("click", () => {
    window.location.href = "schedule.html";
  });

  document.getElementById("quickAddNote")?.addEventListener("click", () => {
    window.location.href = "notes.html";
  });

  document.getElementById("quickAddTask")?.addEventListener("click", () => {
    window.location.href = "notes.html?tab=tasks";
  });
}

/**
 * Render today's summary
 */
function renderTodaySummary() {
  const container = document.getElementById("todaySummary");
  if (!container) return;

  const today = formatDate(new Date());
  const todayEvents = getEventsByDate(today);
  const todayTasks = filterTasks({ dueDate: today, done: false });
  const overdueTasks = filterTasks({ overdue: true });

  container.innerHTML = `
    <div class="summary-stat">
      <div class="stat-value">${todayEvents.length}</div>
      <div class="stat-label">Events Today</div>
    </div>
    <div class="summary-stat">
      <div class="stat-value">${todayTasks.length}</div>
      <div class="stat-label">Tasks Due</div>
    </div>
    <div class="summary-stat">
      <div class="stat-value" style="color: ${
        overdueTasks.length > 0 ? "var(--danger)" : "var(--accent)"
      }">
        ${overdueTasks.length}
      </div>
      <div class="stat-label">Overdue</div>
    </div>
  `;

  // Update date display
  const todayDate = document.getElementById("todayDate");
  if (todayDate) {
    todayDate.textContent = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
}

/**
 * Render mini calendar
 */
function renderMiniCalendar() {
  const container = document.getElementById("miniCalendar");
  if (!container) return;

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const settings = getSettings();
  const weekStartsOn = settings.weekStartsOn;

  let html = `
    <div class="calendar-header">
      <button class="btn-icon" id="prevMonth" aria-label="Previous month">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <polyline points="10,3 5,8 10,13" fill="none" stroke="currentColor" stroke-width="2"/>
        </svg>
      </button>
      <div class="calendar-month">${today.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })}</div>
      <button class="btn-icon" id="nextMonth" aria-label="Next month">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <polyline points="6,3 11,8 6,13" fill="none" stroke="currentColor" stroke-width="2"/>
        </svg>
      </button>
    </div>
    <div class="calendar-grid">
  `;

  // Day names
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 0; i < 7; i++) {
    const dayIndex = (i + weekStartsOn) % 7;
    html += `<div class="calendar-day-name">${dayNames[dayIndex]}</div>`;
  }

  // Empty cells before first day
  const adjustedStart = (startingDayOfWeek - weekStartsOn + 7) % 7;
  for (let i = 0; i < adjustedStart; i++) {
    html += '<div class="calendar-day other-month"></div>';
  }

  // Days of month
  const events = getAllEvents();
  const todayStr = formatDate(today);

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = formatDate(date);
    const hasEvents = events.some((e) => e.date === dateStr);
    const isToday = dateStr === todayStr;

    html += `<div class="calendar-day${isToday ? " today" : ""}${
      hasEvents ? " has-events" : ""
    }">${day}</div>`;
  }

  html += "</div>";
  container.innerHTML = html;
}

/**
 * Render upcoming events
 */
function renderUpcomingEvents() {
  const container = document.getElementById("upcomingList");
  if (!container) return;

  const events = getAllEvents();
  const today = formatDate(new Date());
  const settings = getSettings();

  // Get upcoming events (today and future)
  const upcoming = events
    .filter((e) => e.date >= today)
    .sort((a, b) => {
      if (a.date === b.date) {
        return a.start.localeCompare(b.start);
      }
      return a.date.localeCompare(b.date);
    })
    .slice(0, 5); // Show only 5 upcoming

  if (upcoming.length === 0) {
    container.innerHTML = '<p class="text-secondary">No upcoming events</p>';
    return;
  }

  container.innerHTML = "";

  upcoming.forEach((event) => {
    const item = document.createElement("div");
    item.className = "upcoming-item";
    item.style.borderLeftColor = event.color || "#3b82f6";

    const dateLabel =
      event.date === today
        ? "Today"
        : new Date(event.date + "T00:00:00").toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });

    item.innerHTML = `
      <div class="upcoming-time">${dateLabel}<br>${formatTime(
      event.start,
      settings.timeFormat
    )}</div>
      <div class="upcoming-details">
        <div class="upcoming-title">${escapeHTML(event.title)}</div>
        ${
          event.location
            ? `<div class="upcoming-location">${escapeHTML(
                event.location
              )}</div>`
            : ""
        }
      </div>
    `;

    container.appendChild(item);
  });
}

/**
 * Render tasks preview
 */
function renderTasksPreview() {
  const container = document.getElementById("tasksPreview");
  if (!container) return;

  const tasks = getAllTasks()
    .filter((t) => !t.done)
    .slice(0, 5);
  const today = formatDate(new Date());

  if (tasks.length === 0) {
    container.innerHTML = '<p class="text-secondary">No pending tasks</p>';
    return;
  }

  container.innerHTML = "";

  tasks.forEach((task) => {
    const item = document.createElement("div");
    item.className = "task-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;

    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.text;

    item.appendChild(checkbox);
    item.appendChild(text);

    if (task.dueDate) {
      const due = document.createElement("span");
      due.className = "task-due";
      if (task.dueDate < today) due.classList.add("overdue");

      if (task.dueDate === today) {
        due.textContent = "Today";
      } else {
        due.textContent = new Date(
          task.dueDate + "T00:00:00"
        ).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }

      item.appendChild(due);
    }

    container.appendChild(item);
  });
}

/**
 * Render notes preview
 */
function renderNotesPreview() {
  const container = document.getElementById("notesPreview");
  if (!container) return;

  const notes = getAllNotes()
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 3);

  if (notes.length === 0) {
    container.innerHTML = '<p class="text-secondary">No notes yet</p>';
    return;
  }

  container.innerHTML = "";

  notes.forEach((note) => {
    const item = document.createElement("div");
    item.className = "note-preview";

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = note.contentHTML;
    const plainText = (tempDiv.textContent || "").substring(0, 100);

    item.innerHTML = `
      <div class="note-preview-title">${escapeHTML(note.title)}</div>
      <div class="note-preview-content">${escapeHTML(plainText)}${
      plainText.length >= 100 ? "..." : ""
    }</div>
    `;

    container.appendChild(item);
  });
}

/**
 * Initialize notes page
 */
function initNotesPage() {
  // Check if should show tasks tab
  const tab = getQueryParam("tab");

  if (tab === "tasks") {
    // Switch to tasks tab
    document.getElementById("notesTabBtn")?.classList.remove("active");
    document
      .getElementById("notesTabBtn")
      ?.setAttribute("aria-selected", "false");
    document.getElementById("tasksTabBtn")?.classList.add("active");
    document
      .getElementById("tasksTabBtn")
      ?.setAttribute("aria-selected", "true");
    document.getElementById("notesContent")?.classList.add("hidden");
    document.getElementById("tasksContent")?.classList.remove("hidden");

    initTasks();
  } else {
    initNotes();

    // Set up tab switching
    document.getElementById("notesTabBtn")?.addEventListener("click", () => {
      switchTab("notes");
    });

    document.getElementById("tasksTabBtn")?.addEventListener("click", () => {
      switchTab("tasks");
      initTasks();
    });
  }
}

/**
 * Switch between notes and tasks tabs
 * @param {string} tab - 'notes' or 'tasks'
 */
function switchTab(tab) {
  document
    .getElementById("notesTabBtn")
    ?.classList.toggle("active", tab === "notes");
  document
    .getElementById("notesTabBtn")
    ?.setAttribute("aria-selected", tab === "notes" ? "true" : "false");
  document
    .getElementById("tasksTabBtn")
    ?.classList.toggle("active", tab === "tasks");
  document
    .getElementById("tasksTabBtn")
    ?.setAttribute("aria-selected", tab === "tasks" ? "true" : "false");
  document
    .getElementById("notesContent")
    ?.classList.toggle("hidden", tab !== "notes");
  document
    .getElementById("tasksContent")
    ?.classList.toggle("hidden", tab !== "tasks");
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

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
