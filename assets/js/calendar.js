/**
 * CALENDAR.JS
 * Calendar rendering, event display, and drag-and-drop functionality
 */

import {
  getEventsByDate,
  getEventsByDateRange,
  createEvent,
  updateEvent,
  deleteEvent,
  checkEventConflicts,
  formatDate,
  formatTime,
} from "./model.js";
import { showModal, showToast, confirm, addUndo } from "./ui.js";
import { getSettings } from "./settings.js";

let currentDate = new Date();
let currentView = "day"; // 'day' or 'week'
let draggedEvent = null;
let dragStartY = 0;
let dragStartMinutes = 0;

/**
 * Initialize calendar view
 * @param {string} view - 'day' or 'week'
 */
export function initCalendar(view = "day") {
  const settings = getSettings();
  currentView = settings.defaultView || view;

  // Set up view toggle
  document
    .getElementById("dayViewBtn")
    ?.addEventListener("click", () => switchView("day"));
  document
    .getElementById("weekViewBtn")
    ?.addEventListener("click", () => switchView("week"));

  // Set up navigation
  document
    .getElementById("prevPeriod")
    ?.addEventListener("click", () => navigatePeriod(-1));
  document
    .getElementById("nextPeriod")
    ?.addEventListener("click", () => navigatePeriod(1));
  document
    .getElementById("todayBtn")
    ?.addEventListener("click", () => goToToday());

  // Set up new event button
  document
    .getElementById("addEventBtn")
    ?.addEventListener("click", () => showEventModal());

  // Keyboard navigation
  document.addEventListener("keydown", handleCalendarKeyboard);

  // Initial render
  switchView(currentView);
}

/**
 * Switch calendar view
 * @param {string} view - 'day' or 'week'
 */
function switchView(view) {
  currentView = view;

  // Update toggle buttons
  document.querySelectorAll(".view-toggle .toggle-btn").forEach((btn) => {
    btn.classList.remove("active");
    btn.setAttribute("aria-selected", "false");
  });

  const activeBtn = document.getElementById(`${view}ViewBtn`);
  if (activeBtn) {
    activeBtn.classList.add("active");
    activeBtn.setAttribute("aria-selected", "true");
  }

  // Show/hide views
  document
    .getElementById("dayView")
    ?.classList.toggle("hidden", view !== "day");
  document
    .getElementById("weekView")
    ?.classList.toggle("hidden", view !== "week");

  // Render appropriate view
  if (view === "day") {
    renderDayView();
  } else {
    renderWeekView();
  }

  updatePeriodLabel();
}

/**
 * Render day view
 */
function renderDayView() {
  const container = document.getElementById("timeGrid");
  if (!container) return;

  container.innerHTML = "";
  const dateStr = formatDate(currentDate);
  const events = getEventsByDate(dateStr);

  // Create time slots from 5 AM to 11 PM
  for (let hour = 5; hour <= 23; hour++) {
    const timeSlot = document.createElement("div");
    timeSlot.className = "time-slot";

    // Time label
    const label = document.createElement("div");
    label.className = "time-label";
    label.textContent = formatTime(`${String(hour).padStart(2, "0")}:00`);

    // Time cell
    const cell = document.createElement("div");
    cell.className = "time-cell";
    cell.dataset.hour = hour;
    cell.dataset.date = dateStr;

    // Click to create event
    cell.addEventListener("click", (e) => handleCellClick(e, dateStr, hour));

    timeSlot.appendChild(label);
    timeSlot.appendChild(cell);
    container.appendChild(timeSlot);
  }

  // Render events
  renderDayEvents(events, container);
}

/**
 * Render events in day view
 * @param {Array} events - Events to render
 * @param {HTMLElement} container - Container element
 */
function renderDayEvents(events, container) {
  events.forEach((event) => {
    const eventCard = createEventCard(event);
    positionEventCard(eventCard, event);

    const cell = container.querySelector(
      `.time-cell[data-hour="${getHourFromTime(event.start)}"]`
    );
    if (cell) {
      cell.appendChild(eventCard);
    }
  });
}

/**
 * Create event card element
 * @param {Object} event - Event object
 * @returns {HTMLElement} Event card element
 */
function createEventCard(event) {
  const card = document.createElement("div");
  card.className = "event-card";
  card.dataset.eventId = event.id;
  card.style.background = event.color || "#3b82f6";

  const settings = getSettings();
  const startTime = formatTime(event.start, settings.timeFormat);
  const endTime = formatTime(event.end, settings.timeFormat);

  card.innerHTML = `
    <div class="event-time">${startTime} - ${endTime}</div>
    <div class="event-title">${escapeHTML(event.title)}</div>
    ${
      event.location
        ? `<div class="event-location">${escapeHTML(event.location)}</div>`
        : ""
    }
  `;

  // Check for conflicts
  const conflicts = checkEventConflicts(
    event.date,
    event.start,
    event.end,
    event.id
  );
  if (conflicts.length > 0) {
    const badge = document.createElement("div");
    badge.className = "event-conflict-badge";
    badge.title = "Time conflict detected";
    card.appendChild(badge);
  }

  // Click to edit
  card.addEventListener("click", (e) => {
    e.stopPropagation();
    showEventModal(event);
  });

  // Make draggable
  card.draggable = true;
  card.addEventListener("dragstart", (e) => handleDragStart(e, event));
  card.addEventListener("dragend", handleDragEnd);

  return card;
}

/**
 * Position event card based on time
 * @param {HTMLElement} card - Event card element
 * @param {Object} event - Event object
 */
function positionEventCard(card, event) {
  const startMinutes = timeToMinutes(event.start);
  const endMinutes = timeToMinutes(event.end);
  const duration = endMinutes - startMinutes;

  // Position relative to hour (60 minutes per cell)
  const hourStart = Math.floor(startMinutes / 60);
  const minutesIntoHour = startMinutes % 60;

  const topPercent = (minutesIntoHour / 60) * 100;
  const heightPixels = (duration / 60) * 60; // 60px per hour

  card.style.top = `${topPercent}%`;
  card.style.height = `${heightPixels}px`;
  card.style.minHeight = "30px";
}

/**
 * Render week view
 */
function renderWeekView() {
  const container = document.getElementById("weekGrid");
  if (!container) return;

  container.innerHTML = "";

  const settings = getSettings();
  const weekStart = getWeekStart(currentDate, settings.weekStartsOn);
  const weekDates = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    weekDates.push(date);
  }

  // Create header
  const header = document.createElement("div");
  header.className = "week-header";

  // Empty corner cell
  const corner = document.createElement("div");
  corner.className = "week-day-header";
  header.appendChild(corner);

  // Day headers
  weekDates.forEach((date) => {
    const dayHeader = document.createElement("div");
    dayHeader.className = "week-day-header";
    if (formatDate(date) === formatDate(new Date())) {
      dayHeader.classList.add("today");
    }

    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
    const dayNum = date.getDate();

    dayHeader.innerHTML = `
      <div class="week-day-name">${dayName}</div>
      <div class="week-day-number">${dayNum}</div>
    `;

    header.appendChild(dayHeader);
  });

  container.appendChild(header);

  // Create time slots
  for (let hour = 5; hour <= 23; hour++) {
    // Time label
    const label = document.createElement("div");
    label.className = "week-time-label";
    label.textContent = formatTime(`${String(hour).padStart(2, "0")}:00`);
    container.appendChild(label);

    // Day cells
    weekDates.forEach((date) => {
      const cell = document.createElement("div");
      cell.className = "week-time-cell";
      cell.dataset.hour = hour;
      cell.dataset.date = formatDate(date);

      cell.addEventListener("click", (e) =>
        handleCellClick(e, formatDate(date), hour)
      );
      container.appendChild(cell);
    });
  }

  // Render events for the week
  const startDate = formatDate(weekDates[0]);
  const endDate = formatDate(weekDates[6]);
  const events = getEventsByDateRange(startDate, endDate);

  renderWeekEvents(events, container);
}

/**
 * Render events in week view
 * @param {Array} events - Events to render
 * @param {HTMLElement} container - Container element
 */
function renderWeekEvents(events, container) {
  events.forEach((event) => {
    const eventCard = createEventCard(event);
    positionEventCard(eventCard, event);

    const cell = container.querySelector(
      `.week-time-cell[data-date="${event.date}"][data-hour="${getHourFromTime(
        event.start
      )}"]`
    );

    if (cell) {
      cell.appendChild(eventCard);
    }
  });
}

/**
 * Handle cell click to create event
 * @param {Event} e - Click event
 * @param {string} date - Date string
 * @param {number} hour - Hour number
 */
function handleCellClick(e, date, hour) {
  if (e.target.classList.contains("event-card")) return;

  const startTime = `${String(hour).padStart(2, "0")}:00`;
  const endTime = `${String(hour + 1).padStart(2, "0")}:00`;

  showEventModal({
    date,
    start: startTime,
    end: endTime,
  });
}

/**
 * Show event creation/edit modal
 * @param {Object} event - Existing event or defaults
 */
export function showEventModal(event = {}) {
  const isEdit = !!event.id;

  const form = document.createElement("form");
  form.innerHTML = `
    <div class="form-group">
      <label class="form-label" for="eventTitle">Title *</label>
      <input type="text" id="eventTitle" class="form-input" required value="${escapeHTML(
        event.title || ""
      )}" placeholder="Event title">
    </div>
    
    <div class="form-group">
      <label class="form-label" for="eventDate">Date *</label>
      <input type="date" id="eventDate" class="form-input" required value="${
        event.date || formatDate(currentDate)
      }">
    </div>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
      <div class="form-group">
        <label class="form-label" for="eventStart">Start Time *</label>
        <input type="time" id="eventStart" class="form-input" required value="${
          event.start || "09:00"
        }">
      </div>
      
      <div class="form-group">
        <label class="form-label" for="eventEnd">End Time *</label>
        <input type="time" id="eventEnd" class="form-input" required value="${
          event.end || "10:00"
        }">
      </div>
    </div>
    
    <div class="form-group">
      <label class="form-label" for="eventLocation">Location</label>
      <input type="text" id="eventLocation" class="form-input" value="${escapeHTML(
        event.location || ""
      )}" placeholder="Event location">
    </div>
    
    <div class="form-group">
      <label class="form-label" for="eventNotes">Notes</label>
      <textarea id="eventNotes" class="textarea-input" placeholder="Additional notes">${escapeHTML(
        event.notes || ""
      )}</textarea>
    </div>
    
    <div class="form-group">
      <label class="form-label" for="eventColor">Color</label>
      <input type="color" id="eventColor" class="color-input" value="${
        event.color || "#3b82f6"
      }">
    </div>
    
    <div class="form-group">
      <label class="form-label" for="eventTags">Tags (comma-separated)</label>
      <input type="text" id="eventTags" class="form-input" value="${(
        event.tags || []
      ).join(", ")}" placeholder="work, meeting, personal">
    </div>
    
    <div class="form-group">
      <label class="form-label" for="eventRepeat">Repeat</label>
      <select id="eventRepeat" class="select-input">
        <option value="none" ${
          !event.repeat || event.repeat.freq === "none" ? "selected" : ""
        }>Does not repeat</option>
        <option value="daily" ${
          event.repeat?.freq === "daily" ? "selected" : ""
        }>Daily</option>
        <option value="weekly" ${
          event.repeat?.freq === "weekly" ? "selected" : ""
        }>Weekly</option>
        <option value="monthly" ${
          event.repeat?.freq === "monthly" ? "selected" : ""
        }>Monthly</option>
      </select>
    </div>
  `;

  const buttons = [{ text: "Cancel", class: "btn-secondary", value: null }];

  if (isEdit) {
    buttons.push({
      text: "Delete",
      class: "btn-danger",
      value: "delete",
      onClick: () => handleDeleteEvent(event),
    });
  }

  buttons.push({
    text: isEdit ? "Save" : "Create",
    class: "btn-primary",
    value: "save",
    onClick: () => handleSaveEvent(form, event),
  });

  showModal({
    title: isEdit ? "Edit Event" : "New Event",
    content: form,
    buttons,
  });
}

/**
 * Handle save event
 * @param {HTMLFormElement} form - Form element
 * @param {Object} existingEvent - Existing event or empty object
 */
function handleSaveEvent(form, existingEvent) {
  const formData = {
    title: form.querySelector("#eventTitle").value,
    date: form.querySelector("#eventDate").value,
    start: form.querySelector("#eventStart").value,
    end: form.querySelector("#eventEnd").value,
    location: form.querySelector("#eventLocation").value,
    notes: form.querySelector("#eventNotes").value,
    color: form.querySelector("#eventColor").value,
    tags: form
      .querySelector("#eventTags")
      .value.split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    repeat: {
      freq: form.querySelector("#eventRepeat").value,
      interval: 1,
      until: null,
    },
  };

  // Validate times
  if (formData.start >= formData.end) {
    showToast({
      type: "error",
      message: "End time must be after start time",
    });
    return;
  }

  // Check for conflicts
  const conflicts = checkEventConflicts(
    formData.date,
    formData.start,
    formData.end,
    existingEvent.id
  );

  if (conflicts.length > 0) {
    showToast({
      type: "warning",
      title: "Time Conflict",
      message: `This event overlaps with ${conflicts.length} other event(s)`,
    });
  }

  if (existingEvent.id) {
    // Update existing event
    const oldEvent = { ...existingEvent };
    updateEvent(existingEvent.id, formData);

    addUndo(() => {
      updateEvent(existingEvent.id, oldEvent);
      refreshCalendar();
    }, "Event updated");

    showToast({
      type: "success",
      message: "Event updated successfully",
    });
  } else {
    // Create new event
    const newEvent = createEvent(formData);

    addUndo(() => {
      deleteEvent(newEvent.id);
      refreshCalendar();
    }, "Event created");

    showToast({
      type: "success",
      message: "Event created successfully",
    });
  }

  refreshCalendar();
}

/**
 * Handle delete event
 * @param {Object} event - Event to delete
 */
async function handleDeleteEvent(event) {
  const confirmed = await confirm(
    "Are you sure you want to delete this event?",
    "Delete Event"
  );

  if (confirmed) {
    const deletedEvent = { ...event };
    deleteEvent(event.id);

    addUndo(() => {
      createEvent(deletedEvent);
      refreshCalendar();
    }, "Event deleted");

    showToast({
      type: "success",
      message: "Event deleted successfully",
    });

    refreshCalendar();
  }
}

/**
 * Handle drag start
 * @param {DragEvent} e - Drag event
 * @param {Object} event - Event object
 */
function handleDragStart(e, event) {
  draggedEvent = event;
  dragStartY = e.clientY;
  dragStartMinutes = timeToMinutes(event.start);

  e.target.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
}

/**
 * Handle drag end
 * @param {DragEvent} e - Drag event
 */
function handleDragEnd(e) {
  e.target.classList.remove("dragging");

  if (!draggedEvent) return;

  const deltaY = e.clientY - dragStartY;
  const deltaMinutes = Math.round((deltaY / 60) * 60); // 60px = 1 hour
  const snappedDelta = Math.round(deltaMinutes / 15) * 15; // Snap to 15 min

  const newStartMinutes = dragStartMinutes + snappedDelta;
  const duration =
    timeToMinutes(draggedEvent.end) - timeToMinutes(draggedEvent.start);
  const newEndMinutes = newStartMinutes + duration;

  // Validate times are within bounds
  if (newStartMinutes >= 0 && newEndMinutes <= 24 * 60) {
    const newStart = minutesToTime(newStartMinutes);
    const newEnd = minutesToTime(newEndMinutes);

    const oldEvent = { ...draggedEvent };
    updateEvent(draggedEvent.id, { start: newStart, end: newEnd });

    addUndo(() => {
      updateEvent(draggedEvent.id, {
        start: oldEvent.start,
        end: oldEvent.end,
      });
      refreshCalendar();
    }, "Event moved");

    refreshCalendar();
  }

  draggedEvent = null;
}

/**
 * Navigate period (day or week)
 * @param {number} direction - -1 for previous, 1 for next
 */
function navigatePeriod(direction) {
  if (currentView === "day") {
    currentDate.setDate(currentDate.getDate() + direction);
  } else {
    currentDate.setDate(currentDate.getDate() + 7 * direction);
  }

  refreshCalendar();
  updatePeriodLabel();
}

/**
 * Go to today
 */
function goToToday() {
  currentDate = new Date();
  refreshCalendar();
  updatePeriodLabel();
}

/**
 * Update period label
 */
function updatePeriodLabel() {
  const label = document.getElementById("currentPeriod");
  if (!label) return;

  if (currentView === "day") {
    const isToday = formatDate(currentDate) === formatDate(new Date());
    label.textContent = isToday
      ? "Today"
      : currentDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
  } else {
    const settings = getSettings();
    const weekStart = getWeekStart(currentDate, settings.weekStartsOn);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    label.textContent = `${weekStart.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} - ${weekEnd.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }
}

/**
 * Refresh calendar view
 */
function refreshCalendar() {
  if (currentView === "day") {
    renderDayView();
  } else {
    renderWeekView();
  }
}

/**
 * Handle keyboard navigation
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleCalendarKeyboard(e) {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

  switch (e.key) {
    case "ArrowLeft":
      navigatePeriod(-1);
      e.preventDefault();
      break;
    case "ArrowRight":
      navigatePeriod(1);
      e.preventDefault();
      break;
    case "t":
    case "T":
      goToToday();
      e.preventDefault();
      break;
  }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Get week start date
 * @param {Date} date - Reference date
 * @param {number} weekStartsOn - 0 for Sunday, 1 for Monday
 * @returns {Date} Week start date
 */
function getWeekStart(date, weekStartsOn = 0) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  d.setDate(d.getDate() - diff);
  return d;
}

/**
 * Convert time string to minutes
 * @param {string} time - Time in HH:MM format
 * @returns {number} Minutes since midnight
 */
function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes to time string
 * @param {number} minutes - Minutes since midnight
 * @returns {string} Time in HH:MM format
 */
function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/**
 * Get hour from time string
 * @param {string} time - Time in HH:MM format
 * @returns {number} Hour
 */
function getHourFromTime(time) {
  return parseInt(time.split(":")[0], 10);
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

export { currentDate, currentView, refreshCalendar };
