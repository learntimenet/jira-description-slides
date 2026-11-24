# Jira Description Slides

A browser extension (Chrome / Edge, Manifest V3) that presents a Jira issue's description as slides, with one slide for each heading 1. It's made for sprint reviews and demos that are prepared in a Jira issue.

## How to use

1. Write the description with a **heading 1** for each slide (`h1.` in wiki markup, or "Heading 1" in the editor).
2. Open the issue and click the extension icon. The popup shows the issue and how many slides it will produce.
3. Customize the slides if you like, then click **Present**.
4. Press **F** for full screen and **Esc** to leave.

**Alt+Shift+P** presents right away with the settings you last chose.

### Side panel

Click the side panel icon at the top right of the popup to keep the extension open in Chrome's sidebar. The panel follows the active tab, so it updates when you open another issue. The first time you do this on a Jira site, Chrome asks for access to that site, so the panel can keep working when you switch tabs or reload.

When you click **Present** in the side panel, the keyboard stays in the panel. A hint asks you to click the slides once. That click only gives the page focus; it doesn't change the slide.

## Customize (in the popup)

| Setting | Options |
| --- | --- |
| Split slides on | Heading 1 (default) or Heading 2. If the description has none of that level, the other level is used and the popup says so. |
| Theme | Learn Time (purple cover, default), Light (white), or Dark |
| Text size | S, M or L. This is the largest body text size; long slides still shrink to fit. |
| Cover slide with agenda | On or off |
| Footer | Title and slide number at the bottom of each slide, on or off |
| Issue links as title and status | On or off. When off, links stay as they are written. |

Settings are saved in `chrome.storage.local` and used by the keyboard shortcut too.

## The deck

| Slide | Content |
| --- | --- |
| Cover | The issue summary and an agenda of the slide titles. Click an agenda item to jump to it. |
| Overview | Anything written before the first heading 1 (only if there is some) |
| One per heading | The heading as the slide title, then everything up to the next heading of the same level: text, lists, tables, images, code, quotes, status lozenges and colored text |

- **Links to Jira issues** show the issue instead of its URL: type icon, key, title and a status lozenge colored by status category (to do, in progress, done). A link with its own text keeps that text and gets the status lozenge. Links to other sites are left as they are.
- Text shrinks to fit the slide. If a slide is still too long, it scrolls.

## Controls

| Key | Action |
| --- | --- |
| → ↓ Space Enter PageDown N | Next slide |
| ← ↑ PageUp Backspace P | Previous slide |
| Home / End | First / last slide |
| 1–9 | Go to slide n |
| G or O | Overview of all slides (click one to jump) |
| F | Full screen |
| Esc | Close the overview, leave full screen, then close |

Clicking the right two thirds of a slide goes forward, and clicking the left third goes back. The toolbar and the mouse cursor hide after 2.5 seconds without movement. While the slides are open, Jira's keyboard shortcuts are blocked so they don't fire behind the slides.

## How it works

- Opening the popup injects `slides-style.js` and `slides.js` into the current tab (`activeTab` + `scripting`). The popup asks the page for the issue and slide count (`JiraSlidesApp.inspect`), and **Present** starts the presenter (`JiraSlidesApp.present`) with your settings.
- `slides.js` reads the issue key from the URL. It fetches `/rest/api/2/issue/KEY?fields=summary,description&expand=renderedFields` from the Jira site itself, using your existing login. This works on Jira Cloud and Server / Data Center.
- Every link to an issue on the same Jira site (`/browse/KEY-1`, `?selectedIssue=KEY-1`) is looked up with `/rest/api/2/issue/KEY?fields=summary,status,issuetype`, up to 6 requests at a time and at most 100 issues. Issues you can't see keep their plain link.
- The rendered HTML is sanitized: scripts, event handlers, iframes, forms and `javascript:` links are removed, and only harmless inline styles such as colors are kept. It is then split into slides.
- The slides are shown in a full-window overlay inside a Shadow DOM, so Jira's styles and the slide styles never mix. Images load the same way they do in Jira.
- Only your settings are stored. Nothing is sent anywhere else, and closing the slides puts the page back as it was.

## Permissions

`activeTab`, `scripting`, `storage` (for your settings) and `sidePanel`. Chrome shows no install warning. The popup and the shortcut can access a tab only after you click the icon or use the shortcut there.

The side panel stays open while you switch tabs, which `activeTab` doesn't cover. It therefore uses an **optional** host permission: when you open the side panel on a Jira site, Chrome asks for access to that site only. You can remove it in the extension's details at any time.

## Install (unpacked)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select this folder.
4. To change the shortcut, go to `chrome://extensions/shortcuts`.

## Files

| File | Purpose |
| --- | --- |
| `manifest.json` | Extension manifest |
| `popup.html/css/js` | Popup and side panel: issue, settings and the Present button |
| `settings.js` | Default settings, loading and saving, and injecting the presenter (shared by the popup and the background worker) |
| `background.js` | Keyboard shortcut: presents with the saved settings |
| `slides.js` | Loads the issue, sanitizes and splits the description, and runs the presenter |
| `slides-style.js` | Slide styles (a CSS string for the Shadow DOM) |
| `icons/` | Extension icons |
| `STORE_LISTING.md` | Chrome Web Store listing text |
| `test/slides.test.html` | Tests (splitting, sanitizing, issue keys, issue links, options) and a demo sprint review deck. Open it in Chrome or Edge, no Jira needed. `?slide=4` starts on slide 4, `?overview` opens the overview, and `?theme=light`, `?theme=dark`, `?text=large`, `?cover=0`, `?footer=0` try the options. |
