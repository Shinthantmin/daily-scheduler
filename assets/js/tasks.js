/**
 * TASKS.JS
 * Task management functionality
 */

import {
  getAllTasks,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskDone,
  filterTasks,
} from "./model.js";
import { showModal, showToast, confirm, addUndo } from "./ui.js";

/**
 * Initialize tasks page
 */
export function initTasks() {
  // Add task button
  document
    .getElementById("addTaskBtn")
    ?.addEventListener("click", () => showTaskModal());

  // Initial render
  renderTasks();
}

/**
 * Render tasks list
 */
export function renderTasks() {
  const container = document.getElementById("tasksList");
  if (!container) return;

  const tasks = getAllTasks();

  if (tasks.length === 0) {
    container.innerHTML =
      '<p class="text-secondary">No tasks yet. Add your first task!</p>';
    return;
  }

  // Group tasks: incomplete first, then completed
  const incompleteTasks = tasks.filter((t) => !t.done);
  const completedTasks = tasks.filter((t) => t.done);

  container.innerHTML = "";

  // Render incomplete tasks
  if (incompleteTasks.length > 0) {
    const incompleteSection = document.createElement("div");
    incompleteSection.innerHTML =
      '<h3 style="margin-bottom: 1rem; font-size: 0.875rem; color: var(--text-secondary); text-transform: uppercase;">To Do</h3>';
    incompleteTasks.forEach((task) => {
      incompleteSection.appendChild(createTaskElement(task));
    });
    container.appendChild(incompleteSection);
  }

  // Render completed tasks
  if (completedTasks.length > 0) {
    const completedSection = document.createElement("div");
    completedSection.style.marginTop = "var(--space-lg)";
    completedSection.innerHTML =
      '<h3 style="margin-bottom: 1rem; font-size: 0.875rem; color: var(--text-secondary); text-transform: uppercase;">Completed</h3>';
    completedTasks.forEach((task) => {
      completedSection.appendChild(createTaskElement(task));
    });
    container.appendChild(completedSection);
  }
}

/**
 * Create task element
 * @param {Object} task - Task object
 * @returns {HTMLElement} Task element
 */
function createTaskElement(task) {
  const item = document.createElement("div");
  item.className = "task-list-item";
  if (task.done) item.classList.add("completed");
  item.dataset.taskId = task.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-checkbox";
  checkbox.checked = task.done;
  checkbox.setAttribute(
    "aria-label",
    `Mark task as ${task.done ? "incomplete" : "complete"}`
  );
  checkbox.addEventListener("change", () => handleToggleTask(task.id));

  const details = document.createElement("div");
  details.className = "task-details";

  const text = document.createElement("div");
  text.className = "task-list-text";
  text.textContent = task.text;
  details.appendChild(text);

  if (task.dueDate) {
    const meta = document.createElement("div");
    meta.className = "task-meta";

    const dueSpan = document.createElement("span");
    dueSpan.className = "task-due";

    const today = new Date().toISOString().split("T")[0];
    if (task.dueDate < today && !task.done) {
      dueSpan.classList.add("overdue");
      dueSpan.textContent = `Overdue: ${formatDateShort(task.dueDate)}`;
    } else {
      dueSpan.textContent = `Due: ${formatDateShort(task.dueDate)}`;
    }

    meta.appendChild(dueSpan);
    details.appendChild(meta);
  }

  const actions = document.createElement("div");
  actions.className = "note-actions";

  const editBtn = document.createElement("button");
  editBtn.className = "btn-icon";
  editBtn.setAttribute("aria-label", "Edit task");
  editBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M11 2l3 3-8 8H3v-3l8-8z" fill="none" stroke="currentColor" stroke-width="1.5"/>
    </svg>
  `;
  editBtn.addEventListener("click", () => showTaskModal(task));

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn-icon";
  deleteBtn.setAttribute("aria-label", "Delete task");
  deleteBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M2 4h12M5 4V2h6v2M3 4v10h10V4" fill="none" stroke="currentColor" stroke-width="1.5"/>
    </svg>
  `;
  deleteBtn.addEventListener("click", () => handleDeleteTask(task.id));

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  item.appendChild(checkbox);
  item.appendChild(details);
  item.appendChild(actions);

  return item;
}

/**
 * Show task modal
 * @param {Object} task - Existing task or undefined for new
 */
export function showTaskModal(task = {}) {
  const isEdit = !!task.id;

  const form = document.createElement("form");
  form.innerHTML = `
    <div class="form-group">
      <label class="form-label" for="taskText">Task *</label>
      <input type="text" id="taskText" class="form-input" required value="${escapeHTML(
        task.text || ""
      )}" placeholder="What needs to be done?">
    </div>
    
    <div class="form-group">
      <label class="form-label" for="taskDueDate">Due Date</label>
      <input type="date" id="taskDueDate" class="form-input" value="${
        task.dueDate || ""
      }">
    </div>
  `;

  const buttons = [{ text: "Cancel", class: "btn-secondary", value: null }];

  if (isEdit) {
    buttons.push({
      text: "Delete",
      class: "btn-danger",
      value: "delete",
      onClick: () => handleDeleteTask(task.id),
    });
  }

  buttons.push({
    text: isEdit ? "Save" : "Create",
    class: "btn-primary",
    value: "save",
    onClick: () => handleSaveTask(form, task),
  });

  showModal({
    title: isEdit ? "Edit Task" : "New Task",
    content: form,
    buttons,
  });
}

/**
 * Handle save task
 * @param {HTMLFormElement} form - Form element
 * @param {Object} existingTask - Existing task or empty object
 */
function handleSaveTask(form, existingTask) {
  const taskData = {
    text: form.querySelector("#taskText").value,
    dueDate: form.querySelector("#taskDueDate").value || null,
  };

  if (!taskData.text.trim()) {
    showToast({
      type: "error",
      message: "Please enter a task description",
    });
    return;
  }

  if (existingTask.id) {
    // Update existing task
    const oldTask = { ...existingTask };
    updateTask(existingTask.id, taskData);

    addUndo(() => {
      updateTask(existingTask.id, oldTask);
      renderTasks();
    }, "Task updated");

    showToast({
      type: "success",
      message: "Task updated successfully",
    });
  } else {
    // Create new task
    const newTask = createTask(taskData);

    addUndo(() => {
      deleteTask(newTask.id);
      renderTasks();
    }, "Task created");

    showToast({
      type: "success",
      message: "Task created successfully",
    });
  }

  renderTasks();
}

/**
 * Handle toggle task
 * @param {string} id - Task ID
 */
function handleToggleTask(id) {
  const task = toggleTaskDone(id);

  showToast({
    type: "success",
    message: task.done ? "Task completed!" : "Task reopened",
  });

  renderTasks();
}

/**
 * Handle delete task
 * @param {string} id - Task ID
 */
async function handleDeleteTask(id) {
  const confirmed = await confirm(
    "Are you sure you want to delete this task?",
    "Delete Task"
  );

  if (confirmed) {
    deleteTask(id);

    showToast({
      type: "success",
      message: "Task deleted successfully",
    });

    renderTasks();
  }
}

/**
 * Format date in short format
 * @param {string} dateStr - Date string YYYY-MM-DD
 * @returns {string} Formatted date
 */
function formatDateShort(dateStr) {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (dateStr === today.toISOString().split("T")[0]) {
    return "Today";
  } else if (dateStr === tomorrow.toISOString().split("T")[0]) {
    return "Tomorrow";
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
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
