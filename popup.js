// UI for the popup and the side panel: shows the open issue, lets the user customize the
// slides and starts the presenter in the page. Settings are shared with the keyboard shortcut.
import { DEFAULTS, loadSettings, saveSettings, injectPresenter } from './settings.js';

const $ = (id) => document.getElementById(id);
const isPopup = chrome.extension?.getViews?.({ type: 'popup' }).includes(window) ?? false;

let tab;
let windowId;
let origin = ''; // of the issue's Jira site, known once the page could be read
let settings = { ...DEFAULTS };
let loadSeq = 0;

const NO_ACCESS_PANEL = 'Open this extension from its icon on a Jira issue and choose "Open in side panel" to allow that Jira site here.';

async function inTab(func, args) {
  await injectPresenter(tab.id);
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func, args });
  return result;
}

function showView(name) {
  for (const v of ['loading', 'none', 'main']) $(`view-${v}`).hidden = v !== name;
}

function showNone(title, text) {
  $('none-title').textContent = title;
  $('none-text').textContent = text;
  showView('none');
}

function renderSettings() {
  for (const seg of document.querySelectorAll('.seg')) {
    for (const b of seg.querySelectorAll('button')) {
      b.setAttribute('aria-pressed', String(settings[seg.dataset.setting] === b.dataset.value));
    }
  }
  for (const input of document.querySelectorAll('input[data-setting]')) input.checked = !!settings[input.dataset.setting];
}

/** Reads the issue in the active tab and shows how many slides the settings produce. */
async function refresh() {
  const seq = ++loadSeq;
  [tab] = await chrome.tabs.query({ active: true, windowId });
  let info;
  try {
    if (!tab) throw new Error('no tab');
    info = await inTab((o) => globalThis.JiraSlidesApp.inspect(o), [settings]);
  } catch {
    if (seq !== loadSeq) return;
    // Browser pages can't be scripted; in the side panel, the site may not be allowed yet.
    showNone('No Jira issue', isPopup ? 'Open a Jira issue in this tab, then click the extension again.' : NO_ACCESS_PANEL);
    return;
  }
  if (seq !== loadSeq) return; // a newer tab change won

  origin = info?.origin || '';
  if (!info || info.error) {
    showNone(info?.noIssue ? 'No Jira issue' : "Couldn't read the issue", info?.error || 'Reload the page and try again.');
    return;
  }
  $('issue-key').textContent = info.key;
  $('issue-summary').textContent = info.summary;
  if (!info.slides.length) {
    showNone(`${info.key} has no description`, 'Add a description with a heading for each slide, then try again.');
    return;
  }
  const wanted = settings.level === 'H2' ? 'heading 2' : 'heading 1';
  const used = info.level === 'H2' ? 'heading 2' : 'heading 1';
  $('level-note').textContent = !info.level
    ? 'No headings: one slide.'
    : info.level !== settings.level ? `No ${wanted}: split on ${used}.` : '';
  $('slide-count').textContent = `${info.slides.length} slide${info.slides.length === 1 ? '' : 's'}`;
  showView('main');
}

async function update(key, value) {
  settings = { ...settings, [key]: value };
  renderSettings();
  await saveSettings(settings);
  if (key === 'level' || key === 'cover') await refresh(); // the slide count changes
}

async function init() {
  document.body.classList.toggle('is-popup', isPopup);
  windowId = (await chrome.windows.getCurrent()).id;
  settings = await loadSettings();
  renderSettings();

  for (const seg of document.querySelectorAll('.seg')) {
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) update(seg.dataset.setting, b.dataset.value);
    });
  }
  for (const input of document.querySelectorAll('input[data-setting]')) {
    input.addEventListener('change', () => update(input.dataset.setting, input.checked));
  }

  $('present').addEventListener('click', async () => {
    // Don't wait for the slides to load: the page keeps going after the popup closes.
    await inTab((o) => { globalThis.JiraSlidesApp.present(o); }, [settings]);
    if (isPopup) window.close();
  });

  $('btn-sidepanel').hidden = !isPopup || !chrome.sidePanel;
  $('btn-sidepanel').addEventListener('click', () => {
    // Both calls must happen synchronously in the click to keep the user gesture.
    // The side panel follows the active tab, which needs lasting access to the Jira site:
    // Chrome asks once per site (optional permission, no install warning).
    if (origin) chrome.permissions.request({ origins: [`${origin}/*`] }).catch(() => {});
    chrome.sidePanel.open({ windowId }).then(() => window.close());
  });

  if (!isPopup) {
    // The side panel stays open: follow the active tab and in-page navigation.
    chrome.tabs.onActivated.addListener((info) => { if (info.windowId === windowId) refresh(); });
    chrome.tabs.onUpdated.addListener((id, change) => {
      if (id === tab?.id && (change.url || change.status === 'complete')) refresh();
    });
    chrome.permissions.onAdded.addListener(() => refresh());
  }

  await refresh();
}

init();
