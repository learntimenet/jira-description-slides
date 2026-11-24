// Keyboard shortcut (Alt+Shift+P): present right away with the settings saved in the popup.
// The shortcut grants activeTab for the current tab, like clicking the icon.
import { loadSettings, injectPresenter } from './settings.js';

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== 'present' || !tab?.id) return;
  try {
    const settings = await loadSettings();
    await injectPresenter(tab.id);
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (o) => { globalThis.JiraSlidesApp.present(o); },
      args: [settings],
    });
  } catch {
    // Browser pages (chrome://, the Web Store, PDFs) can't be scripted.
    await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#a3161b' });
    await chrome.action.setBadgeText({ tabId: tab.id, text: '!' });
  }
});
