// Presenter, injected into the Jira tab by the popup (or the keyboard shortcut).
// Reads the issue's rendered description through the Jira site's own REST API (same
// origin, the user's existing login), splits it into one slide per heading and shows
// it full-window in a Shadow DOM, so Jira's styles and the slides never mix.
// Defines globalThis.JiraSlidesApp = { inspect(options), present(options), close() }.
(() => {
  const HOST_ID = 'jira-description-slides';
  const TESTING = !!globalThis.__JDS_TEST__;

  /** Presentation options, set in the popup. */
  const DEFAULTS = {
    level: 'H1',          // split slides on 'H1' or 'H2'
    theme: 'learntime',   // 'learntime' | 'light' | 'dark'
    textSize: 'medium',   // 'small' | 'medium' | 'large'
    cover: true,          // cover slide with the agenda
    footer: true,         // title and slide number at the bottom
    issueLinks: true,     // links to Jira issues shown as title + status
    start: 0,             // slide to start on
  };
  const TEXT_SIZES = { small: 24, medium: 28, large: 34 };

  // ---------- issue key ----------

  /** Issue key from the current Jira URL (/browse/KEY-1, ?selectedIssue=KEY-1, .../KEY-1). */
  function detectIssueKey(href) {
    const url = new URL(href);
    const fromQuery = url.searchParams.get('selectedIssue');
    if (fromQuery) return fromQuery.toUpperCase();
    const m = url.pathname.match(/\/(?:browse|issues?)\/([A-Za-z][A-Za-z0-9_]*-\d+)/)
      || url.pathname.match(/\/([A-Za-z][A-Za-z0-9_]*-\d+)\/?$/);
    return m ? m[1].toUpperCase() : null;
  }

  // ---------- content ----------

  const DROP = 'script, style, link, meta, base, iframe, frame, object, embed, form, button, select, textarea, input:not([type="checkbox"]), noscript, template';
  const URL_ATTRS = new Set(['href', 'src', 'xlink:href', 'action', 'formaction', 'srcset', 'poster']);
  const KEEP_STYLES = ['color', 'background-color', 'text-align', 'font-weight', 'font-style', 'text-decoration'];

  /** Removes anything active from Jira's rendered HTML. Only harmless inline styles survive. */
  function sanitize(root) {
    root.querySelectorAll(DROP).forEach((n) => n.remove());
    for (const el of root.querySelectorAll('*')) {
      for (const { name, value } of [...el.attributes]) {
        const n = name.toLowerCase();
        if (n.startsWith('on')) el.removeAttribute(name);
        else if (URL_ATTRS.has(n) && /^\s*(javascript|vbscript|data:(?!image\/(png|gif|jpe?g|webp)))/i.test(value)) el.removeAttribute(name);
      }
      if (el.hasAttribute('style')) {
        const kept = KEEP_STYLES.map((p) => [p, el.style.getPropertyValue(p)]).filter(([, v]) => v);
        el.removeAttribute('style');
        for (const [p, v] of kept) el.style.setProperty(p, v);
      }
      if (el.tagName === 'A') {
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      }
      if (el.tagName === 'INPUT') el.setAttribute('disabled', '');
    }
  }

  const isBlank = (node) =>
    node.nodeType === 8 // comment
    || (node.nodeType === 3 && !node.data.trim())
    || (node.nodeType === 1 && !node.textContent.trim() && !node.querySelector('img, table, hr, input, video'));

  /**
   * Splits rendered description HTML into slides: one slide per heading of the preferred
   * level ('H1' or 'H2'), falling back to the other level when there is none. Content
   * before the first heading becomes an intro slide.
   * Returns { level, intro: Node[], sections: [{ title, nodes }] } (nodes from an inert document).
   */
  function buildSlides(html, prefer = 'H1') {
    const doc = new DOMParser().parseFromString(`<!doctype html><body>${html || ''}</body>`, 'text/html');
    const body = doc.body;
    sanitize(body);

    const order = prefer === 'H2' ? ['H2', 'H1'] : ['H1', 'H2'];
    const level = order.find((tag) => body.querySelector(tag)) || null;
    // Jira sometimes wraps the whole description in a div: split inside that wrapper.
    let container = body;
    if (level) {
      const first = body.querySelector(level);
      container = first.parentElement;
      while (container !== body && container.querySelectorAll(level).length < body.querySelectorAll(level).length) {
        container = container.parentElement;
      }
    }

    const intro = [];
    const sections = [];
    let current = null;
    const add = (node) => { if (!isBlank(node)) (current ? current.nodes : intro).push(node); };

    // Anything outside the wrapper, before it, belongs to the intro.
    if (container !== body) {
      for (let n = body.firstChild; n && !n.contains(container); n = n.nextSibling) add(n);
    }
    for (const node of [...container.childNodes]) {
      if (node.nodeType === 1 && node.tagName === level) {
        current = { title: node.textContent.replace(/\s+/g, ' ').trim(), nodes: [] };
        sections.push(current);
      } else {
        add(node);
      }
    }
    return { level, intro, sections };
  }

  // ---------- Jira ----------

  async function fetchIssue(key) {
    const res = await fetch(`/rest/api/2/issue/${encodeURIComponent(key)}?fields=summary,description&expand=renderedFields`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error('You are not logged in to Jira in this tab.');
      if (res.status === 403) throw new Error(`You don't have permission to view ${key}.`);
      if (res.status === 404) throw new Error(`Issue ${key} was not found.`);
      throw new Error(`Jira answered with HTTP ${res.status}.`);
    }
    let json;
    try { json = await res.json(); } catch { throw new Error('This page does not look like Jira.'); }
    return {
      key: json.key,
      summary: json.fields?.summary || '',
      html: json.renderedFields?.description || '',
    };
  }

  // ---------- links to Jira issues ----------

  /** Issue key if `href` points to an issue on this Jira site (/browse/KEY-1, ?selectedIssue=KEY-1). */
  function linkedIssueKey(href, origin) {
    let url;
    try { url = new URL(href, origin); } catch { return null; }
    if (url.origin !== origin) return null;
    const fromQuery = url.searchParams.get('selectedIssue');
    if (fromQuery && /^[A-Za-z][A-Za-z0-9_]*-\d+$/.test(fromQuery)) return fromQuery.toUpperCase();
    const m = url.pathname.match(/\/(?:browse|issues?)\/([A-Za-z][A-Za-z0-9_]*-\d+)\/?$/);
    return m ? m[1].toUpperCase() : null;
  }

  async function fetchIssueInfo(key) {
    const res = await fetch(`/rest/api/2/issue/${encodeURIComponent(key)}?fields=summary,status,issuetype`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null; // no permission, deleted, ...: keep the link as it is
    const { key: k, fields: f } = await res.json();
    return {
      key: k,
      summary: f.summary || '',
      status: f.status?.name || '',
      category: f.status?.statusCategory?.key || 'new', // new | indeterminate | done
      icon: f.issuetype?.iconUrl || '',
      type: f.issuetype?.name || '',
    };
  }

  /** Runs fn over items with at most `limit` requests at a time. */
  async function mapLimit(items, limit, fn) {
    const out = new Array(items.length);
    let next = 0;
    const worker = async () => {
      while (next < items.length) {
        const i = next++;
        try { out[i] = await fn(items[i]); } catch { out[i] = null; }
      }
    };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return out;
  }

  function statusLozenge(doc, info) {
    const s = doc.createElement('span');
    s.className = `chip-status cat-${['new', 'indeterminate', 'done'].includes(info.category) ? info.category : 'new'}`;
    s.textContent = info.status;
    return s;
  }

  /** <a class="issue-chip">[type icon] KEY  Summary  STATUS</a> */
  function issueChip(doc, info, href) {
    const a = doc.createElement('a');
    a.className = 'issue-chip';
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.title = `${info.key}: ${info.summary}`;
    if (/^https?:\/\//i.test(info.icon) || info.icon.startsWith('/')) {
      const img = doc.createElement('img');
      img.className = 'chip-icon';
      img.src = info.icon;
      img.alt = info.type;
      a.append(img);
    }
    const key = doc.createElement('span');
    key.className = 'chip-key';
    key.textContent = info.key;
    const title = doc.createElement('span');
    title.className = 'chip-title';
    title.textContent = info.summary;
    a.append(key, title);
    if (info.status) a.append(statusLozenge(doc, info));
    return a;
  }

  /**
   * Shows links to Jira issues as their title and status instead of a raw URL.
   * A link whose text is the URL or the key becomes an issue chip; a link with its own
   * text keeps it and gets a status lozenge. Jira Server's issue macro is replaced whole.
   */
  async function enrichIssueLinks(deck, origin, getInfo = fetchIssueInfo) {
    const roots = [...deck.intro, ...deck.sections.flatMap((s) => s.nodes)].filter((n) => n.nodeType === 1);
    const links = [];
    for (const root of roots) {
      const anchors = root.tagName === 'A' ? [root] : [...root.querySelectorAll('a[href]')];
      for (const a of anchors) {
        const key = linkedIssueKey(a.getAttribute('href'), origin);
        if (key) links.push({ a, key });
      }
    }
    if (!links.length) return 0;

    const keys = [...new Set(links.map((l) => l.key))].slice(0, 100);
    const infos = new Map((await mapLimit(keys, 6, getInfo)).map((info, i) => [keys[i], info]));

    // Replace a node, also when it is itself one of the deck's top-level nodes.
    const lists = [deck.intro, ...deck.sections.map((s) => s.nodes)];
    const swap = (oldNode, newNode) => {
      oldNode.replaceWith(newNode);
      for (const list of lists) {
        const i = list.indexOf(oldNode);
        if (i !== -1) list[i] = newNode;
      }
    };

    let changed = 0;
    for (const { a, key } of links) {
      const info = infos.get(key);
      if (!info || !a.parentNode) continue; // unknown issue, or already replaced with its macro
      const doc = a.ownerDocument;
      const href = new URL(a.getAttribute('href'), origin).href;
      const text = a.textContent.replace(/\s+/g, ' ').trim();
      const macro = a.closest('.jira-issue-macro, .jira-issue');
      const auto = !text || text === href || /^https?:\/\//i.test(text) || text.toUpperCase() === key;

      if (macro) swap(macro, issueChip(doc, info, href));
      else if (auto) swap(a, issueChip(doc, info, href));
      else {
        a.title = `${info.key}: ${info.summary}`;
        a.after(doc.createTextNode(' '), statusLozenge(doc, info));
      }
      changed++;
    }
    return changed;
  }

  // ---------- presenter ----------

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const icon = (paths) => {
    const span = el('span', 'icon');
    span.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`; // static markup
    return span;
  };
  const ICONS = {
    prev: '<polyline points="15 18 9 12 15 6"/>',
    next: '<polyline points="9 18 15 12 9 6"/>',
    full: '<path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4"/>',
    exitFull: '<path d="M9 4v4a1 1 0 0 1-1 1H4M20 9h-4a1 1 0 0 1-1-1V4M15 20v-4a1 1 0 0 1 1-1h4M4 15h4a1 1 0 0 1 1 1v4"/>',
    close: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  };

  function createPresenter() {
    const host = document.createElement('div');
    host.id = HOST_ID;
    const root = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = globalThis.__jdsStyles || '';
    const overlay = el('div', 'overlay');
    overlay.tabIndex = -1;
    root.append(style, overlay);
    document.documentElement.append(host);

    const savedOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden'; // keep Jira from scrolling behind the slides
    const previousFocus = document.activeElement;
    overlay.focus();

    const cleanups = [];
    const on = (target, type, fn, opts) => {
      target.addEventListener(type, fn, opts);
      cleanups.push(() => target.removeEventListener(type, fn, opts));
    };

    function close() {
      if (!host.isConnected) return;
      if (document.fullscreenElement === host) document.exitFullscreen().catch(() => {});
      cleanups.forEach((fn) => fn());
      host.remove();
      document.documentElement.style.overflow = savedOverflow;
      previousFocus?.focus?.();
      delete globalThis.__jdsClose;
    }
    globalThis.__jdsClose = close;

    return { host, root, overlay, on, close };
  }

  function showMessage(p, title, text) {
    const card = el('div', 'message');
    card.append(el('h2', null, title), el('p', null, text));
    const btn = el('button', 'btn-primary', 'Close');
    btn.addEventListener('click', p.close);
    card.append(btn, el('p', 'hint', 'Esc closes'));
    p.overlay.replaceChildren(card);
    btn.focus();
  }

  /** The slides in order: [{ kind: 'cover' | 'content', title, nodes, section }]. */
  function outline(deck, opts) {
    const list = [];
    if (opts.cover) list.push({ kind: 'cover', title: 'Cover' });
    if (!deck.sections.length) {
      list.push({ kind: 'content', title: '', nodes: deck.intro });
    } else {
      if (deck.intro.length) list.push({ kind: 'content', title: 'Overview', nodes: deck.intro });
      deck.sections.forEach((sec, i) => list.push({ kind: 'content', title: sec.title, nodes: sec.nodes, section: i }));
    }
    return list;
  }

  function renderDeck(p, issue, deck, options = {}) {
    const opts = { ...DEFAULTS, ...options };
    p.overlay.classList.add(`theme-${['learntime', 'light', 'dark'].includes(opts.theme) ? opts.theme : 'learntime'}`);
    const maxText = TEXT_SIZES[opts.textSize] || TEXT_SIZES.medium;

    const specs = outline(deck, opts);
    const total = specs.length;
    const stage = el('div', 'stage');

    const slides = specs.map((spec, n) => {
      if (spec.kind === 'cover') {
        // Cover: summary and an agenda of the section titles.
        const cover = el('section', 'slide cover');
        const inner = el('div', 'cover-inner');
        inner.append(el('h1', 'cover-title', issue.summary || issue.key));
        if (deck.sections.length > 1) {
          const agenda = el('ol', `agenda${deck.sections.length > 5 ? ' two-cols' : ''}`);
          deck.sections.forEach((sec, i) => {
            const li = el('li');
            li.append(el('span', 'agenda-num', String(i + 1).padStart(2, '0')), el('span', null, sec.title || 'Untitled'));
            li.addEventListener('click', (e) => { e.stopPropagation(); go(specs.findIndex((x) => x.section === i)); });
            agenda.append(li);
          });
          inner.append(agenda);
        }
        cover.append(inner);
        return cover;
      }
      const s = el('section', 'slide content');
      if (spec.title) s.append(el('h1', 'slide-title', spec.title));
      const body = el('div', 'body');
      body.append(...spec.nodes.map((node) => document.importNode(node, true)));
      if (!spec.nodes.length) body.append(el('p', 'empty', 'No content under this heading.'));
      s.append(body);
      if (opts.footer) {
        const f = el('footer', 'slide-footer');
        f.append(el('span', 'footer-title', issue.summary || issue.key), el('span', 'footer-page', `${n + 1} / ${total}`));
        s.append(f);
      } else {
        s.classList.add('no-footer');
      }
      const bar = el('div', 'progress');
      bar.style.width = `${((n + 1) / total) * 100}%`;
      s.append(bar);
      return s;
    });
    stage.append(...slides);

    // Toolbar
    const bar = el('div', 'toolbar');
    const btn = (name, label, fn) => {
      const b = el('button', 'tool');
      b.title = label;
      b.setAttribute('aria-label', label);
      b.append(icon(ICONS[name]));
      b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
      return b;
    };
    const counter = el('span', 'counter');
    const fullBtn = btn('full', 'Full screen (F)', toggleFullscreen);
    bar.append(
      btn('prev', 'Previous (←)', () => go(index - 1)),
      counter,
      btn('next', 'Next (→)', () => go(index + 1)),
      el('span', 'sep'),
      btn('grid', 'All slides (G)', toggleOverview),
      fullBtn,
      btn('close', 'Close (Esc)', p.close),
    );
    p.overlay.replaceChildren(stage, bar);

    // Scale the 1280×720 stage to the window.
    const fitStage = () => {
      const s = Math.min(p.overlay.clientWidth / 1280, p.overlay.clientHeight / 720) * 0.96;
      stage.style.setProperty('--scale', String(s));
    };
    fitStage();
    p.on(window, 'resize', fitStage);

    // Shrink text until the slide body fits, then allow scrolling as a last resort.
    const fitText = (slide) => {
      const body = slide.querySelector('.body');
      if (!body) return;
      let size = maxText;
      body.style.fontSize = `${size}px`;
      body.classList.remove('scroll');
      while (body.scrollHeight > body.clientHeight + 1 && size > 16) {
        size -= 2;
        body.style.fontSize = `${size}px`;
      }
      if (body.scrollHeight > body.clientHeight + 1) body.classList.add('scroll');
    };
    for (const img of stage.querySelectorAll('img')) {
      img.addEventListener('load', () => { const s = img.closest('.slide'); if (s === slides[index]) fitText(s); });
    }

    let index = 0;
    function go(i) {
      if (overview) toggleOverview();
      index = Math.max(0, Math.min(slides.length - 1, i));
      slides.forEach((s, n) => s.classList.toggle('active', n === index));
      counter.textContent = `${index + 1} / ${slides.length}`;
      fitText(slides[index]);
    }

    // Overview: all slides as a grid of thumbnails.
    let overview = null;
    function toggleOverview() {
      if (overview) {
        overview.remove();
        overview = null;
        return;
      }
      overview = el('div', 'overview');
      const grid = el('div', 'overview-grid');
      slides.forEach((s, n) => {
        const thumb = el('button', `thumb${n === index ? ' current' : ''}`);
        const clone = s.cloneNode(true);
        clone.classList.add('active');
        const frame = el('div', 'thumb-frame');
        frame.append(clone);
        thumb.append(frame, el('span', 'thumb-label', `${n + 1}. ${specs[n].title || issue.summary}`));
        thumb.addEventListener('click', (e) => { e.stopPropagation(); overview.remove(); overview = null; go(n); });
        grid.append(thumb);
      });
      overview.append(grid);
      p.overlay.append(overview);
      // Scale each thumbnail to its frame, also after the grid reflows.
      const ro = new ResizeObserver((entries) => {
        for (const { target } of entries) target.style.setProperty('--s', String(target.clientWidth / 1280));
      });
      grid.querySelectorAll('.thumb-frame').forEach((f) => ro.observe(f));
      grid.querySelector('.current')?.focus();
    }

    function toggleFullscreen() {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else p.host.requestFullscreen().catch(() => {});
    }
    p.on(document, 'fullscreenchange', () => {
      fullBtn.replaceChildren(icon(document.fullscreenElement ? ICONS.exitFull : ICONS.full));
      setTimeout(fitStage, 50);
    });

    // Started from the side panel, the panel keeps the keyboard focus: say so until the page
    // gets it. The click that brings focus to the page doesn't change the slide.
    let focusClick = false;
    const focusHint = el('div', 'focus-hint', 'Click the slides to use the keyboard');
    const syncFocusHint = () => { focusHint.hidden = document.hasFocus(); };
    syncFocusHint();
    p.overlay.append(focusHint);
    p.on(window, 'focus', syncFocusHint);
    p.on(window, 'blur', syncFocusHint);
    stage.addEventListener('pointerdown', () => { focusClick = !document.hasFocus(); }, true);

    // Click: right two thirds = next, left third = previous (links still work).
    stage.addEventListener('click', (e) => {
      if (focusClick) { focusClick = false; p.overlay.focus(); return; }
      if (e.composedPath().some((n) => n.tagName === 'A' || n.tagName === 'LI' && n.closest?.('.agenda'))) return;
      if (getSelection().toString()) return;
      const r = stage.getBoundingClientRect();
      go(e.clientX < r.left + r.width / 3 ? index - 1 : index + 1);
    });

    // Keys are captured before Jira sees them, so its shortcuts don't fire behind the slides.
    p.on(window, 'keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.key === 'Tab') return; // keep browser shortcuts and focus moves
      const k = e.key;
      let handled = true;
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter', 'n', 'N'].includes(k)) go(index + 1);
      else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace', 'p', 'P'].includes(k)) go(index - 1);
      else if (k === 'Home') go(0);
      else if (k === 'End') go(slides.length - 1);
      else if (k === 'f' || k === 'F') toggleFullscreen();
      else if (k === 'g' || k === 'G' || k === 'o' || k === 'O') toggleOverview();
      else if (k === 'Escape') {
        if (overview) toggleOverview();
        else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else p.close();
      } else if (/^[1-9]$/.test(k)) go(Number(k) - 1);
      if (handled) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);

    // Hide the toolbar and cursor when the mouse is idle.
    let idle;
    const wake = () => {
      p.overlay.classList.remove('idle');
      clearTimeout(idle);
      idle = setTimeout(() => { if (!bar.matches(':hover')) p.overlay.classList.add('idle'); }, 2500);
    };
    p.on(p.overlay, 'mousemove', wake);
    wake();

    go(Number(opts.start) || 0);
    return { go, slides };
  }

  // ---------- entry points ----------

  const NO_ISSUE = 'Open a Jira issue (for example …/browse/ABC-123), then try again.';

  /** For the popup: the issue and the list of slides it will produce. Never throws. */
  async function inspect(options = {}) {
    const opts = { ...DEFAULTS, ...options };
    try {
      const key = detectIssueKey(location.href);
      if (!key) return { error: NO_ISSUE, noIssue: true };
      const issue = await fetchIssue(key);
      const deck = buildSlides(issue.html, opts.level);
      const empty = !deck.intro.length && !deck.sections.length;
      return {
        origin: location.origin,
        key: issue.key,
        summary: issue.summary,
        level: deck.level,
        slides: empty ? [] : outline(deck, opts).map((x) => x.title || issue.summary),
      };
    } catch (e) {
      return { error: e.message || String(e) };
    }
  }

  /** Opens the presenter over the page. Replaces a presenter that is already open. */
  async function present(options = {}) {
    const opts = { ...DEFAULTS, ...options };
    globalThis.__jdsClose?.();
    const p = createPresenter();
    const key = detectIssueKey(location.href);
    if (!key) {
      showMessage(p, 'No Jira issue on this page', NO_ISSUE);
      return;
    }
    p.overlay.replaceChildren(el('div', 'loading', `Loading ${key}…`));
    try {
      const issue = await fetchIssue(key);
      const deck = buildSlides(issue.html, opts.level);
      if (!deck.intro.length && !deck.sections.length) {
        showMessage(p, `${issue.key} has no description`, 'Add a description with a heading for each slide, then present again.');
        return;
      }
      if (opts.issueLinks) await enrichIssueLinks(deck, location.origin);
      renderDeck(p, issue, deck, opts);
    } catch (e) {
      showMessage(p, "Couldn't load the issue", e.message || String(e));
    }
  }

  globalThis.JiraSlidesApp = { inspect, present, close: () => globalThis.__jdsClose?.() };
  if (TESTING) {
    globalThis.JiraSlides = { DEFAULTS, detectIssueKey, sanitize, buildSlides, outline, linkedIssueKey, enrichIssueLinks, createPresenter, renderDeck, showMessage };
  }
})();
