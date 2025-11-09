/**
 * SETTINGS.JS
 * Application settings and data management
 */

import {
  getItem,
  setItem,
  STORAGE_KEYS,
  exportData,
  importData,
  clearAll,
  getStorageSize,
} from "./storage.js";
import { showToast, confirm } from "./ui.js";

/**
 * Get current settings
 * @returns {Object} Settings object
 */
export function getSettings() {
  return getItem(STORAGE_KEYS.SETTINGS, {
    theme: "system",
    accent: "#3b82f6",
    weekStartsOn: 0,
    defaultView: "day",
    timeFormat: "12",
    version: "1.0.0",
  });
}

/**
 * Update settings
 * @param {Object} updates - Settings to update
 */
export function updateSettings(updates) {
  const current = getSettings();
  const newSettings = { ...current, ...updates };
  setItem(STORAGE_KEYS.SETTINGS, newSettings);
  applySettings(newSettings);
}

/**
 * Initialize settings page
 */
export function initSettings() {
  loadSettingsForm();

  // Theme select
  document.getElementById("themeSelect")?.addEventListener("change", (e) => {
    updateSettings({ theme: e.target.value });
  });

  // Accent color
  document.getElementById("accentColor")?.addEventListener("change", (e) => {
    updateSettings({ accent: e.target.value });
  });

  // Week starts on
  document.getElementById("weekStartsOn")?.addEventListener("change", (e) => {
    updateSettings({ weekStartsOn: parseInt(e.target.value, 10) });
  });

  // Default view
  document.getElementById("defaultView")?.addEventListener("change", (e) => {
    updateSettings({ defaultView: e.target.value });
  });

  // Time format
  document.getElementById("timeFormat")?.addEventListener("change", (e) => {
    updateSettings({ timeFormat: e.target.value });
  });

  // Export button
  document.getElementById("exportBtn")?.addEventListener("click", handleExport);

  // Import file selection
  document.getElementById("importFile")?.addEventListener("change", (e) => {
    const importBtn = document.getElementById("importBtn");
    if (importBtn) {
      importBtn.disabled = !e.target.files || e.target.files.length === 0;
    }
  });

  // Import button
  document.getElementById("importBtn")?.addEventListener("click", handleImport);

  // Reset button
  document.getElementById("resetBtn")?.addEventListener("click", handleReset);

  // Display storage usage
  updateStorageUsage();
}

/**
 * Load settings into form
 */
function loadSettingsForm() {
  const settings = getSettings();

  const themeSelect = document.getElementById("themeSelect");
  if (themeSelect) themeSelect.value = settings.theme;

  const accentColor = document.getElementById("accentColor");
  if (accentColor) accentColor.value = settings.accent;

  const weekStartsOn = document.getElementById("weekStartsOn");
  if (weekStartsOn) weekStartsOn.value = settings.weekStartsOn;

  const defaultView = document.getElementById("defaultView");
  if (defaultView) defaultView.value = settings.defaultView;

  const timeFormat = document.getElementById("timeFormat");
  if (timeFormat) timeFormat.value = settings.timeFormat;
}

/**
 * Apply settings to UI
 * @param {Object} settings - Settings object
 */
export function applySettings(settings) {
  // Apply theme
  applyTheme(settings.theme);

  // Apply accent color
  document.documentElement.style.setProperty("--accent", settings.accent);
  document.documentElement.style.setProperty(
    "--accent-hover",
    darkenColor(settings.accent, 10)
  );
  document.documentElement.style.setProperty(
    "--accent-light",
    lightenColor(settings.accent, 85)
  );
}

/**
 * Apply theme
 * @param {string} theme - 'light', 'dark', or 'system'
 */
function applyTheme(theme) {
  let effectiveTheme = theme;

  if (theme === "system") {
    effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  document.documentElement.setAttribute("data-theme", effectiveTheme);
}

/**
 * Initialize theme toggle button
 */
export function initThemeToggle() {
  const toggleBtn = document.getElementById("themeToggle");

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const settings = getSettings();
      const themes = ["light", "dark", "system"];
      const currentIndex = themes.indexOf(settings.theme);
      const nextTheme = themes[(currentIndex + 1) % themes.length];

      updateSettings({ theme: nextTheme });

      showToast({
        type: "info",
        message: `Theme: ${
          nextTheme.charAt(0).toUpperCase() + nextTheme.slice(1)
        }`,
      });
    });
  }

  // Apply initial settings
  const settings = getSettings();
  applySettings(settings);

  // Listen for system theme changes
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      const currentSettings = getSettings();
      if (currentSettings.theme === "system") {
        applyTheme("system");
      }
    });
}

/**
 * Handle export
 */
function handleExport() {
  const data = exportData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `daily-planner-backup-${
    new Date().toISOString().split("T")[0]
  }.json`;
  a.click();

  URL.revokeObjectURL(url);

  showToast({
    type: "success",
    message: "Data exported successfully",
  });
}

/**
 * Handle import
 */
async function handleImport() {
  const fileInput = document.getElementById("importFile");
  const file = fileInput?.files?.[0];

  if (!file) {
    showToast({
      type: "error",
      message: "Please select a file to import",
    });
    return;
  }

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    const mode =
      document.querySelector('input[name="importMode"]:checked')?.value ||
      "merge";

    const confirmed = await confirm(
      mode === "replace"
        ? "This will replace all existing data. Continue?"
        : "This will merge the imported data with existing data. Continue?",
      "Import Data"
    );

    if (!confirmed) return;

    const result = importData(data, mode);

    if (result.success) {
      showToast({
        type: "success",
        message: result.message,
      });

      // Reload page to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      showToast({
        type: "error",
        message: result.message,
      });
    }
  } catch (error) {
    showToast({
      type: "error",
      message: "Failed to import data: Invalid JSON file",
    });
  }
}

/**
 * Handle reset
 */
async function handleReset() {
  const confirmed = await confirm(
    "This will permanently delete ALL your data. This action cannot be undone. Are you sure?",
    "Reset All Data"
  );

  if (!confirmed) return;

  const doubleConfirm = await confirm(
    "Last chance! Really delete everything?",
    "Final Confirmation"
  );

  if (doubleConfirm) {
    clearAll();

    showToast({
      type: "success",
      message: "All data has been reset",
    });

    // Reload page
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
}

/**
 * Update storage usage display
 */
function updateStorageUsage() {
  const usageElement = document.getElementById("storageUsed");
  if (usageElement) {
    usageElement.textContent = `${getStorageSize()} KB`;
  }
}

/**
 * Darken color by percentage
 * @param {string} color - Hex color
 * @param {number} percent - Percentage to darken
 * @returns {string} Darkened hex color
 */
function darkenColor(color, percent) {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max((num >> 16) - amt, 0);
  const G = Math.max(((num >> 8) & 0x00ff) - amt, 0);
  const B = Math.max((num & 0x0000ff) - amt, 0);
  return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

/**
 * Lighten color by percentage
 * @param {string} color - Hex color
 * @param {number} percent - Percentage to lighten
 * @returns {string} Lightened hex color
 */
function lightenColor(color, percent) {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min((num >> 16) + amt, 255);
  const G = Math.min(((num >> 8) & 0x00ff) + amt, 255);
  const B = Math.min((num & 0x0000ff) + amt, 255);
  return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}
