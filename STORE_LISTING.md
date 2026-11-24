# Chrome Web Store listing

## Store listing tab

**Name** (from manifest, max 75 chars)

```
Jira Description Slides
```

> "Jira" is an Atlassian trademark. Store reviewers sometimes reject names that start with another company's brand. If that happens, rename the extension to `Description Slides for Jira` in `manifest.json`. The disclaimer at the end of the description is there for the same reason.

**Summary** (from manifest `description`, max 132 chars)

```
Present a Jira issue description as slides: one slide per heading 1, ready for sprint reviews and demos.
```

**Category:** Workflow & Planning (or Productivity)

**Description** (plain text, paste as is)

```
Turn a Jira issue into a slide deck in one click. It's built for sprint reviews, demos and team updates that you already prepare in Jira.

Write the description with a heading for each topic. Click the extension, and every heading 1 becomes a slide, ready to present full screen. There's no copying into PowerPoint and no second document to keep up to date.

HOW IT WORKS
• Open the Jira issue and click the extension icon. The popup shows how many slides the issue will produce.
• Click Present, or press Alt+Shift+P to present straight away.
• A cover slide shows the issue summary and an agenda of the slide titles.
• Each heading 1 becomes a slide with everything written under it: text, lists, tables, images, code, quotes, status lozenges and colored text.
• Links to Jira issues show the issue's title and status, not a long URL. That's ideal for "what we delivered" tables.
• If there's no heading 1, heading 2 is used instead.
• Text shrinks to fit each slide.

MAKE IT YOURS
• Split slides on heading 1 or heading 2.
• Three themes: Learn Time (purple), Light and Dark.
• Small, medium or large text.
• Turn the cover with agenda, the footer and the issue link cards on or off.
• Keep it open in Chrome's side panel, where it follows the issue you're on.
• Your settings are remembered.

PRESENT WITH CONFIDENCE
• Arrow keys, Space or a click to move between slides. Number keys jump to a slide.
• G opens an overview of all slides, and you can click one to jump to it.
• F for full screen, Esc to close.
• The toolbar and cursor hide while you talk.
• Jira's keyboard shortcuts are blocked while presenting, so nothing happens behind your slides.

WORKS WITH YOUR JIRA
• Jira Cloud and Jira Server / Data Center.
• Uses the Jira login you already have in the browser. No API token or setup needed.
• Clean 16:9 slides in the Learn Time style, scaled to any screen or projector.

PRIVATE BY DESIGN
• No account, no tracking, no ads.
• The extension only accesses the current tab, and only when you click it.
• The issue is read from your own Jira site and shown on your screen. Nothing is stored or sent anywhere else.

Made by Learn Time. Not affiliated with or endorsed by Atlassian. Jira is a trademark of Atlassian.
```

## Privacy practices tab

**Single purpose**

```
Jira Description Slides presents the description of the Jira issue open in the current tab as full-screen slides, one slide per heading.
```

**Permission justifications**

| Permission | Justification |
| --- | --- |
| `activeTab` | When the user clicks the extension icon or uses its keyboard shortcut, gives temporary access to the current tab only, so the slides can be shown over the Jira page. It has no access to any other tab or site. |
| `scripting` | Injects the extension's packaged presenter script into the current tab, so the popup can list the slides and the presenter can show them. The script reads the open issue's summary and description, plus the title and status of the issues it links to, from the Jira site's own REST API, using the user's existing login, and shows them as slides. Nothing is sent anywhere else. |

| `sidePanel` | Lets the user keep the extension open in Chrome's side panel while moving between Jira issues. |
| Optional host permissions `https://*/*`, `http://*/*` | Requested only when the user opens the side panel on a Jira site, and only for that one site. The side panel stays open across tab switches and reloads, where the temporary `activeTab` access ends, so it needs lasting access to that Jira site to read the open issue. It never asks for all sites at once. |
| `storage` | Saves the user's slide settings (heading level, theme, text size, cover, footer and issue links on or off) locally, so the popup and the keyboard shortcut use the same choices. No issue content is stored. |

**Remote code:** No, I am not using remote code. All scripts are packaged with the extension.

**Data usage:** The extension does not collect or transmit any user data. It reads the issue only inside the user's tab, from the user's own Jira site, to display it. Only the user's slide settings are stored, locally, and nothing is sent to the developer or any third party. Tick no data categories, then tick all three certifications:
- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** Optional, because no user data is collected. If you want one, a short page saying "Jira Description Slides works only inside the Jira tab you click it on. It reads the open issue from your own Jira site to show it as slides, and does not collect or share any data. Only your slide settings are saved, in your browser." is enough.

## Assets still needed

- Store icon: 128×128 PNG (`icons/icon128.png`)
- At least 1 screenshot, 1280×800 or 640×400. Good choices: the popup next to an issue, the cover with the agenda, a content slide with a table, and the dark theme. `test/slides.test.html` renders a demo deck for these.
- Optional small promo tile: 440×280
