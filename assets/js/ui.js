/**
 * UI.JS
 * Modal, toast, and other UI component utilities
 */

let modalStack = [];
let toastQueue = [];
let undoStack = [];

/**
 * Show modal dialog
 * @param {Object} options - Modal configuration
 * @returns {Promise} Resolves with modal result
 */
export function showModal(options) {
  return new Promise((resolve) => {
    const modal = createModal(options, resolve);
    modalStack.push(modal);
    document.getElementById("modalContainer").appendChild(modal);

    // Focus first input or button
    setTimeout(() => {
      const firstFocusable = modal.querySelector("input, textarea, button");
      if (firstFocusable) firstFocusable.focus();
    }, 100);

    // Trap focus within modal
    trapFocus(modal);
  });
}

/**
 * Create modal element
 * @param {Object} options - Modal configuration
 * @param {Function} resolve - Promise resolve function
 * @returns {HTMLElement} Modal backdrop element
 */
function createModal(options, resolve) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");
  backdrop.setAttribute("aria-labelledby", "modalTitle");

  const modal = document.createElement("div");
  modal.className = "modal";

  // Header
  const header = document.createElement("div");
  header.className = "modal-header";

  const title = document.createElement("h2");
  title.id = "modalTitle";
  title.className = "modal-title";
  title.textContent = options.title || "Modal";

  const closeBtn = document.createElement("button");
  closeBtn.className = "modal-close";
  closeBtn.setAttribute("aria-label", "Close modal");
  closeBtn.innerHTML = "×";
  closeBtn.onclick = () => closeModal(backdrop, resolve, null);

  header.appendChild(title);
  header.appendChild(closeBtn);

  // Body
  const body = document.createElement("div");
  body.className = "modal-body";

  if (typeof options.content === "string") {
    body.innerHTML = options.content;
  } else if (options.content instanceof HTMLElement) {
    body.appendChild(options.content);
  }

  // Footer
  const footer = document.createElement("div");
  footer.className = "modal-footer";

  if (options.buttons) {
    options.buttons.forEach((btn) => {
      const button = document.createElement("button");
      button.className = `btn ${btn.class || "btn-secondary"}`;
      button.textContent = btn.text;
      button.onclick = () => {
        if (btn.onClick) btn.onClick();
        closeModal(backdrop, resolve, btn.value);
      };
      footer.appendChild(button);
    });
  }

  modal.appendChild(header);
  modal.appendChild(body);
  if (options.buttons) modal.appendChild(footer);

  backdrop.appendChild(modal);

  // Close on backdrop click
  backdrop.onclick = (e) => {
    if (e.target === backdrop) {
      closeModal(backdrop, resolve, null);
    }
  };

  // Close on Escape
  const escapeHandler = (e) => {
    if (e.key === "Escape") {
      closeModal(backdrop, resolve, null);
      document.removeEventListener("keydown", escapeHandler);
    }
  };
  document.addEventListener("keydown", escapeHandler);

  return backdrop;
}

/**
 * Close modal
 * @param {HTMLElement} backdrop - Modal backdrop element
 * @param {Function} resolve - Promise resolve function
 * @param {*} value - Value to resolve with
 */
function closeModal(backdrop, resolve, value) {
  backdrop.remove();
  modalStack = modalStack.filter((m) => m !== backdrop);
  resolve(value);
}

/**
 * Trap focus within element
 * @param {HTMLElement} element - Element to trap focus in
 */
function trapFocus(element) {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  element.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  });
}

/**
 * Show toast notification
 * @param {Object} options - Toast configuration
 */
export function showToast(options) {
  const toast = createToast(options);
  toastQueue.push(toast);

  const container = document.getElementById("toastContainer");
  container.appendChild(toast);

  // Auto-hide after duration
  const duration = options.duration || 5000;
  setTimeout(() => {
    hideToast(toast);
  }, duration);
}

/**
 * Create toast element
 * @param {Object} options - Toast configuration
 * @returns {HTMLElement} Toast element
 */
function createToast(options) {
  const toast = document.createElement("div");
  toast.className = `toast toast-${options.type || "info"}`;

  const content = document.createElement("div");
  content.className = "toast-content";

  if (options.title) {
    const title = document.createElement("div");
    title.className = "toast-title";
    title.textContent = options.title;
    content.appendChild(title);
  }

  const message = document.createElement("div");
  message.className = "toast-message";
  message.textContent = options.message;
  content.appendChild(message);

  // Add actions if provided
  if (options.actions) {
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "toast-actions";

    options.actions.forEach((action) => {
      const btn = document.createElement("button");
      btn.className = "toast-action";
      btn.textContent = action.text;
      btn.onclick = () => {
        action.onClick();
        hideToast(toast);
      };
      actionsDiv.appendChild(btn);
    });

    content.appendChild(actionsDiv);
  }

  const closeBtn = document.createElement("button");
  closeBtn.className = "toast-close";
  closeBtn.setAttribute("aria-label", "Close notification");
  closeBtn.innerHTML = "×";
  closeBtn.onclick = () => hideToast(toast);

  toast.appendChild(content);
  toast.appendChild(closeBtn);

  return toast;
}

/**
 * Hide toast
 * @param {HTMLElement} toast - Toast element
 */
function hideToast(toast) {
  toast.style.animation = "slideOutRight 0.25s ease";
  setTimeout(() => {
    toast.remove();
    toastQueue = toastQueue.filter((t) => t !== toast);
  }, 250);
}

/**
 * Show confirmation dialog
 * @param {string} message - Confirmation message
 * @param {string} title - Dialog title
 * @returns {Promise<boolean>} True if confirmed
 */
export function confirm(message, title = "Confirm") {
  return showModal({
    title,
    content: `<p>${message}</p>`,
    buttons: [
      { text: "Cancel", class: "btn-secondary", value: false },
      { text: "Confirm", class: "btn-primary", value: true },
    ],
  });
}

/**
 * Show prompt dialog
 * @param {string} message - Prompt message
 * @param {string} defaultValue - Default input value
 * @param {string} title - Dialog title
 * @returns {Promise<string|null>} Input value or null
 */
export function prompt(message, defaultValue = "", title = "Input") {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "form-input";
  input.value = defaultValue;
  input.placeholder = message;

  const container = document.createElement("div");
  container.appendChild(input);

  return showModal({
    title,
    content: container,
    buttons: [
      { text: "Cancel", class: "btn-secondary", value: null },
      { text: "OK", class: "btn-primary", value: () => input.value },
    ],
  }).then((result) => {
    return typeof result === "function" ? result() : result;
  });
}

/**
 * Add undo action
 * @param {Function} undoFn - Function to execute on undo
 * @param {string} message - Description of action
 */
export function addUndo(undoFn, message) {
  const undoAction = { fn: undoFn, message };
  undoStack.push(undoAction);

  showToast({
    type: "info",
    message,
    duration: 10000,
    actions: [
      {
        text: "Undo",
        onClick: () => {
          undoFn();
          undoStack = undoStack.filter((a) => a !== undoAction);
        },
      },
    ],
  });

  // Keep only last 5 undo actions
  if (undoStack.length > 5) {
    undoStack.shift();
  }
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Format relative time
 * @param {string} dateString - ISO date string
 * @returns {string} Relative time string
 */
export function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Get query parameter
 * @param {string} param - Parameter name
 * @returns {string|null} Parameter value or null
 */
export function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

/**
 * Set query parameter
 * @param {string} param - Parameter name
 * @param {string} value - Parameter value
 */
export function setQueryParam(param, value) {
  const url = new URL(window.location);
  url.searchParams.set(param, value);
  window.history.pushState({}, "", url);
}

/**
 * Sanitize HTML to prevent XSS
 * @param {string} html - HTML string
 * @returns {string} Sanitized HTML
 */
export function sanitizeHTML(html) {
  const temp = document.createElement("div");
  temp.textContent = html;
  return temp.innerHTML;
}

/**
 * Create element with attributes
 * @param {string} tag - Element tag name
 * @param {Object} attrs - Element attributes
 * @param {Array|string} children - Child elements or text
 * @returns {HTMLElement} Created element
 */
export function createElement(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);

  Object.entries(attrs).forEach(([key, value]) => {
    if (key === "className") {
      element.className = value;
    } else if (key.startsWith("on")) {
      element.addEventListener(key.substring(2).toLowerCase(), value);
    } else {
      element.setAttribute(key, value);
    }
  });

  if (typeof children === "string") {
    element.textContent = children;
  } else if (Array.isArray(children)) {
    children.forEach((child) => {
      if (typeof child === "string") {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    });
  }

  return element;
}

export { modalStack, toastQueue, undoStack };
