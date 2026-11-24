// Styles for the presenter. Kept in JS so they can go straight into the Shadow DOM
// (insertCSS can't reach inside it). learntime.net palette, same as the other extensions.
globalThis.__jdsStyles = `
:host { all: initial; }
* { box-sizing: border-box; }
svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; display: block; }

.overlay {
  --paper: #fbfaf8; --surface: #ffffff; --ink: #0f172a; --text: #1e293b; --muted: #4b5a6c;
  --card: #f6f3fa; --border: #e1e6ed; --accent: #752be8; --accent-2: #a26bff; --accent-hover: #6420d0;
  --accent-soft: #f0e6ff; --coral: #ff9578; --teal: #16866e; --row: #fcfbfe;
  position: fixed; inset: 0; z-index: 2147483647;
  background: radial-gradient(120% 80% at 50% 0%, #241a38, #0d0a14 70%);
  font: 16px/1.45 "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: var(--ink); -webkit-font-smoothing: antialiased; outline: none;
  user-select: text;
}
.overlay.idle { cursor: none; }
.overlay.idle .toolbar { opacity: 0; pointer-events: none; }

/* ---------- stage: fixed 1280x720 design, scaled to the window ---------- */
.stage {
  position: absolute; left: 50%; top: 50%; width: 1280px; height: 720px;
  transform: translate(-50%, -50%) scale(var(--scale, 1));
  border-radius: 18px; overflow: hidden;
  box-shadow: 0 30px 80px -20px rgb(0 0 0 / .6), 0 0 0 1px rgb(255 255 255 / .06);
}
.slide { position: absolute; inset: 0; display: none; flex-direction: column; background: var(--paper); }
.slide.active { display: flex; animation: enter .28s cubic-bezier(.2, .8, .2, 1); }
@keyframes enter { from { opacity: 0; transform: translateY(8px); } }

/* ---------- cover ---------- */
.cover {
  justify-content: center; color: #fff;
  background:
    radial-gradient(60% 80% at 85% 15%, rgb(255 179 107 / .35), transparent 60%),
    radial-gradient(70% 90% at 10% 100%, rgb(22 134 110 / .35), transparent 60%),
    linear-gradient(135deg, #5b1fc4, #752be8 45%, #a26bff);
}
.cover-inner { padding: 0 110px; display: grid; gap: 22px; max-height: 100%; }
.cover-title { margin: 0; font-size: 68px; line-height: 1.05; font-weight: 800; letter-spacing: -.035em; max-width: 1000px; text-wrap: balance; }
.agenda { list-style: none; margin: 18px 0 0; padding: 0; display: grid; gap: 10px 48px; font-size: 24px; font-weight: 500; }
.agenda.two-cols { grid-template-columns: 1fr 1fr; grid-auto-flow: row; font-size: 21px; }
.agenda li { display: flex; align-items: baseline; gap: 14px; cursor: pointer; opacity: .92; }
.agenda li:hover { opacity: 1; text-decoration: underline; text-underline-offset: 5px; }
.agenda-num { font-size: .8em; font-weight: 700; color: #ffd2a8; font-variant-numeric: tabular-nums; }

/* ---------- content slides ---------- */
.content { padding: 40px 80px 0; }
.content.no-footer { padding-bottom: 36px; }
.slide-title {
  margin: 18px 0 26px; font-size: 52px; line-height: 1.08; font-weight: 800; letter-spacing: -.03em; color: var(--ink);
  text-wrap: balance;
}
.slide-title::after {
  content: ""; display: block; width: 72px; height: 6px; margin-top: 18px; border-radius: 999px;
  background: linear-gradient(90deg, var(--accent), var(--coral));
}
.body { flex: 1; min-height: 0; overflow: hidden; font-size: 28px; line-height: 1.45; color: var(--text); padding-bottom: 8px; }
.body.scroll { overflow-y: auto; }
.body > :first-child { margin-top: 0; }
.body p { margin: 0 0 .6em; }
.body h1, .body h2, .body h3, .body h4, .body h5, .body h6 { color: var(--ink); line-height: 1.2; margin: .7em 0 .35em; letter-spacing: -.015em; }
.body h2 { font-size: 1.3em; } .body h3 { font-size: 1.15em; } .body h4, .body h5, .body h6 { font-size: 1em; }
.body ul, .body ol { margin: 0 0 .6em; padding-left: 1.3em; }
.body li { margin: .22em 0; padding-left: .2em; }
.body li::marker { color: var(--accent); font-weight: 700; }
.body ul ul, .body ol ol, .body ul ol, .body ol ul { margin: .2em 0; font-size: .9em; }
.body a { color: var(--accent-hover); text-decoration-thickness: 2px; text-underline-offset: 3px; }
.body strong, .body b { font-weight: 700; }
.body hr { border: none; height: 2px; background: var(--border); margin: .8em 0; }
.body img { max-width: 100%; max-height: 380px; height: auto; border-radius: 10px; vertical-align: middle; }
.body blockquote { margin: .4em 0 .7em; padding: .2em 0 .2em .9em; border-left: 6px solid var(--accent-2); color: var(--muted); }
.body code, .body tt { font-family: ui-monospace, "Cascadia Code", Consolas, monospace; font-size: .85em; background: var(--card); padding: .08em .35em; border-radius: 6px; }
.body pre { font-family: ui-monospace, "Cascadia Code", Consolas, monospace; font-size: .7em; line-height: 1.5; background: var(--card); padding: .8em 1em; border-radius: 12px; white-space: pre-wrap; margin: 0 0 .7em; }
.body pre code { background: none; padding: 0; font-size: 1em; }
.body table { border-collapse: collapse; margin: 0 0 .7em; font-size: .78em; }
.body th, .body td { border: 1px solid var(--border); padding: .35em .7em; text-align: left; vertical-align: top; }
.body th { background: var(--accent-soft); color: var(--ink); font-weight: 700; }
.body tr:nth-child(even) td { background: var(--row); }
.body .table-wrap { overflow: visible; }
.body .panel, .body .code.panel, .body .preformatted { border: none; border-radius: 12px; background: var(--card); padding: .6em .9em; margin: 0 0 .7em; }
.body .panelHeader { font-weight: 700; margin-bottom: .3em; }
.body .aui-lozenge, .body .status-macro, .body .jira-issue-status-lozenge {
  font-size: .6em; font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
  padding: .15em .5em; border-radius: 6px; background: var(--card); color: var(--muted); vertical-align: middle;
}
.body .aui-lozenge-success { background: #e4f4ec; color: #0f6b57; }
.body .aui-lozenge-current { background: #e3ecff; color: #1d4ed8; }
.body .aui-lozenge-error { background: #fde8e8; color: #a3161b; }
.body input[type="checkbox"] { width: .75em; height: .75em; accent-color: var(--accent); margin: 0 .3em 0 0; vertical-align: middle; }
.body .empty { color: var(--muted); font-style: italic; }

/* links to Jira issues: [icon] KEY  Summary  STATUS */
.body a.issue-chip {
  display: inline-flex; align-items: center; gap: .4em; max-width: 100%; vertical-align: baseline;
  padding: .06em .45em .06em .35em; border: 1px solid var(--border); border-radius: .4em;
  background: var(--surface); color: var(--text); text-decoration: none; line-height: 1.3;
  box-shadow: 0 1px 2px rgb(15 23 42 / .05);
}
.body a.issue-chip:hover { border-color: var(--accent-2); }
.chip-icon { width: .75em; height: .75em; flex: none; border-radius: 3px; }
.chip-key { flex: none; font-size: .8em; font-weight: 700; color: var(--accent-hover); white-space: nowrap; }
.chip-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chip-status {
  flex: none; display: inline-block; font-size: .55em; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
  padding: .2em .55em; border-radius: .35em; white-space: nowrap; vertical-align: middle; line-height: 1.3;
}
.cat-new { background: #eef1f5; color: #44546f; }
.cat-indeterminate { background: #e3ecff; color: #1d4ed8; }
.cat-done { background: #e4f4ec; color: #0f6b57; }

.slide-footer {
  position: relative; flex: none; height: 64px; display: flex; align-items: center; justify-content: space-between; gap: 24px;
  margin: 0 -80px; padding: 0 80px; border-top: 1px solid var(--border); font-size: 15px; color: var(--muted);
}
.footer-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.footer-page { font-weight: 600; font-variant-numeric: tabular-nums; flex: none; }
.progress { position: absolute; left: 0; bottom: 0; height: 5px; background: linear-gradient(90deg, var(--accent), var(--accent-2)); border-radius: 0 999px 999px 0; }

/* ---------- toolbar ---------- */
.toolbar {
  position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%);
  display: flex; align-items: center; gap: 2px; padding: 6px; border-radius: 999px;
  background: rgb(20 14 32 / .78); backdrop-filter: blur(12px); box-shadow: 0 10px 30px -10px rgb(0 0 0 / .6), 0 0 0 1px rgb(255 255 255 / .08);
  color: #f1f5f9; transition: opacity .3s;
}
.tool {
  width: 40px; height: 40px; display: grid; place-items: center; border: none; border-radius: 999px;
  background: transparent; color: inherit; cursor: pointer; padding: 0; font: inherit;
}
.tool:hover { background: rgb(255 255 255 / .12); }
.tool:focus-visible, .thumb:focus-visible, .btn-primary:focus-visible { outline: 2px solid #c6a5ff; outline-offset: 2px; }
.counter { min-width: 64px; text-align: center; font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; }
.sep { width: 1px; height: 22px; background: rgb(255 255 255 / .18); margin: 0 6px; }

/* ---------- overview ---------- */
.overview { position: absolute; inset: 0; overflow: auto; padding: 40px; background: rgb(13 10 20 / .97); animation: enter .2s ease; }
.overview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(256px, 1fr)); gap: 24px; max-width: 1400px; margin: 0 auto; }
.thumb { display: grid; gap: 8px; padding: 0; border: none; background: none; cursor: pointer; color: #e2e8f0; font: inherit; text-align: left; }
.thumb-frame { position: relative; aspect-ratio: 16 / 9; overflow: hidden; border-radius: 10px; box-shadow: 0 0 0 1px rgb(255 255 255 / .1); }
.thumb.current .thumb-frame { box-shadow: 0 0 0 3px #b48bff; }
.thumb:hover .thumb-frame { box-shadow: 0 0 0 3px rgb(255 255 255 / .5); }
.thumb-frame .slide { width: 1280px; height: 720px; transform: scale(var(--s, .2)); transform-origin: 0 0; animation: none; pointer-events: none; }
.thumb-label { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ---------- messages ---------- */
.loading, .message {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  color: #f1f5f9; text-align: center;
}
.loading { font-size: 18px; font-weight: 600; opacity: .8; }
.message { width: min(480px, 90vw); padding: 32px; border-radius: 20px; background: #1a1426; box-shadow: 0 0 0 1px #342a48, 0 20px 50px -10px rgb(0 0 0 / .6); }
.message h2 { margin: 0 0 10px; font-size: 20px; }
.message p { margin: 0 0 20px; color: #b8b1c8; }
.message .hint { margin: 12px 0 0; font-size: 12px; }
.btn-primary {
  border: none; border-radius: 999px; padding: 10px 22px; font: 600 14px/1 inherit; font-family: inherit; cursor: pointer;
  color: #110c1a; background: linear-gradient(135deg, #b48bff, #d7c1ff);
}

@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }

/* ---------- themes (Learn Time is the default above) ---------- */
.theme-light .cover {
  color: var(--ink);
  background:
    radial-gradient(60% 80% at 90% 10%, rgb(117 43 232 / .12), transparent 60%),
    radial-gradient(60% 80% at 0% 100%, rgb(255 149 120 / .12), transparent 60%),
    #ffffff;
}
.theme-light .slide { background: #ffffff; }
.theme-light .cover-title::after {
  content: ""; display: block; width: 96px; height: 8px; margin-top: 26px; border-radius: 999px;
  background: linear-gradient(90deg, var(--accent), var(--coral));
}
.theme-light .agenda { color: var(--text); }
.theme-light .agenda-num { color: var(--accent); }

.overlay.theme-dark {
  --paper: #15101f; --surface: #1f1830; --ink: #f8fafc; --text: #e2e8f0; --muted: #b8b1c8;
  --card: #271f3a; --border: #342a48; --accent-soft: #2c2145; --accent-hover: #c8abff; --row: #1a1428;
}
.theme-dark .cover {
  background:
    radial-gradient(60% 80% at 85% 15%, rgb(162 107 255 / .35), transparent 60%),
    radial-gradient(70% 90% at 10% 100%, rgb(255 149 120 / .18), transparent 60%),
    #110c1a;
}
.theme-dark .agenda-num { color: #d7c1ff; }
.theme-dark .body img { background: #fff; }

.focus-hint {
  position: absolute; left: 50%; top: 18px; transform: translateX(-50%);
  padding: 8px 16px; border-radius: 999px; font-size: 14px; font-weight: 600;
  background: rgb(20 14 32 / .85); color: #f1f5f9; box-shadow: 0 0 0 1px rgb(255 255 255 / .1);
  pointer-events: none; animation: enter .3s ease;
}
.focus-hint[hidden] { display: none; }
`;
