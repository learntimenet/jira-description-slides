// Shared by the popup and the background worker (keyboard shortcut).
export const DEFAULTS = {
  level: 'H1',
  theme: 'learntime',
  textSize: 'medium',
  cover: true,
  footer: true,
  issueLinks: true,
};

export async function loadSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  return { ...DEFAULTS, ...settings };
}

export function saveSettings(settings) {
  const clean = Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, settings[k]]));
  return chrome.storage.local.set({ settings: clean });
}

/** Loads the presenter into the tab. Safe to call more than once. */
export function injectPresenter(tabId) {
  return chrome.scripting.executeScript({ target: { tabId }, files: ['slides-style.js', 'slides.js'] });
}
