/*
 * home-dashboard-header.js
 *
 * https://github.com/base1en/ha-overview-page-tweak
 *
 * Copyright (c) 2026 Paul James
 *
 * Overrides the header of Home Assistant's built-in Home Dashboard so it
 * reads "Home" instead of "Overview", and adds shortcut icon buttons inline
 * in that header, immediately to the right of the title.
 *
 * Loaded via frontend.extra_module_url (see README.md).
 * Tested on Home Assistant Core 2026.9.2 / Frontend 20260826.7.
 *
 * WARNING: this module relies on internal Home Assistant frontend DOM and
 * shadow-root structure. It is NOT an official or supported Home Assistant
 * extension API and may need updating after a Home Assistant frontend update
 * (see the "Upgrade risk" section of README.md).
 *
 * Route scope: this module only touches the built-in Home Dashboard at "/",
 * "/home" and "/home/overview". Home Dashboard sub-views and every other
 * dashboard are left alone. Do NOT add /lovelace* to the scope: on
 * HA 2026.9+ that is a dead route - dashboards are top-level panels at
 * their own URL.
 *
 * License: MIT 
 * See LICENSE in the repository for the full licence text.
 */
(() => {
  "use strict";

  /* ============================================================
   * CONFIGURATION - the only section you normally need to edit.
   * ============================================================
   * SHORTCUTS: the icon buttons shown in the header, to the right of the
   * "Home" title. Each entry needs:
   *   icon  - an MDI icon name, e.g. "mdi:cctv" (see README).
   *   label - short text used as the button tooltip and aria-label.
   *   path  - the dashboard URL to navigate to, e.g. "/my-dashboard".
   *
   * The three entries below are the author's example dashboards. Replace
   * them with your own paths, and add or remove entries freely - the button
   * row grows to fit.
   */
  const SHORTCUTS = [
    {
      icon: "mdi:power-plug",
      label: "Smart Plugs",
      path: "/smart-plugs",
    },
    {
      icon: "mdi:router-network",
      label: "Network Cupboard",
      path: "/network-cupboard",
    },
    {
      icon: "mdi:cctv",
      label: "Cameras",
      path: "/cameras-dash",
    },
  ];

  /* Routes the module may act on. /home sub-views (e.g. /home/areas-*)
   * render their own titles and are deliberately excluded. Keep this list
   * as-is; never add /lovelace*. */
  const SCOPED = () => {
    const p = location.pathname.replace(/\/+$/, "");
    return p === "" || p === "/home" || p === "/home/overview";
  };

  /* Find the first descendant (walking through open shadow roots and light
   * DOM) whose tag matches `tag`. Locates hui-root without hard-coding the
   * intermediate component nesting. */
  const pierce = (root, tag) => {
    const scan = (el) => {
      if (el?.tagName?.toLowerCase() === tag) return el;
      if (el?.shadowRoot) {
        const deep = scan(el.shadowRoot);
        if (deep) return deep;
      }
      if (el?.children) {
        for (const c of el.children) {
          const deep = scan(c);
          if (deep) return deep;
        }
      }
      return null;
    };
    return scan(root);
  };

  /* Navigate the way Home Assistant's own router does: a real history entry
   * (pushState) plus a location-changed event. The browser Back/Forward
   * buttons keep working and nothing reloads. */
  const go = (path) => {
    if (path === location.pathname) return;
    history.pushState({ from: location.pathname }, "", path);
    window.dispatchEvent(
      new CustomEvent("location-changed", { replace: false })
    );
  };

  let shadowRef = null;
  let toolbarObserver = null;

  /* Create the shortcut buttons. Idempotent: fills the container only when
   * it is empty, so re-runs never produce duplicates. Buttons are native
   * ha-icon-button elements with an <ha-icon> in the slot (ha-icon-button
   * exposes no `icon` property in HA 2026.9.x); `label` drives both the
   * aria-label and the native title tooltip. */
  const buildShortcuts = (ctx) => {
    if (ctx.hasChildNodes()) return;
    for (const s of SHORTCUTS) {
      const b = document.createElement("ha-icon-button");
      b.dataset.path = s.path;
      b.label = s.label;
      const icon = document.createElement("ha-icon");
      icon.icon = s.icon;
      b.appendChild(icon);
      b.addEventListener("click", () => go(s.path));
      ctx.appendChild(b);
    }
  };

  /* Re-inject only when the controls have vanished from the hui-root shadow
   * root (e.g. after a Lit re-render wiped them). Scoped to that one shadow
   * root, not the whole document. */
  const onToolbarMutation = () => {
    if (!SCOPED()) return;
    if (shadowRef?.querySelector("div.overview-shortcuts")) return;
    ensureAttached();
  };

  /* Apply (or remove) the title override and shortcut buttons within the
   * hui-root shadow root. Returns false when hui-root is not (yet) present,
   * in which case the caller retries briefly and otherwise fails quietly. */
  const ensureAttached = () => {
    const shadow = shadowRef;
    if (!shadow) return false;
    const style = shadow.querySelector("style.overview-title-style");
    const toolbar = shadow.querySelector(".toolbar");

    if (SCOPED()) {
      if (!style) {
        const s = document.createElement("style");
        s.className = "overview-title-style";
        s.textContent =
          ".main-title{font-size:0!important}" +
          '.main-title::before{content:"Home";font-size:1.5rem;display:inline-block;line-height:1;vertical-align:middle}' +
          "div.overview-shortcuts{display:inline-flex;align-items:center;gap:2px;margin-inline-start:var(--mdc-icon-size,24px);vertical-align:middle;font-size:var(--ha-font-size-m,16px)}";
        shadow.prepend(s);
      }
      if (toolbar) {
        let ctx = toolbar.querySelector("div.overview-shortcuts");
        if (!ctx) {
          ctx = document.createElement("div");
          ctx.className = "overview-shortcuts";
          /* Inline container inside .main-title, after the "Home" text.
           * The CSS paints the word with ::before (not ::after) so it
           * renders before real children - which is why the container is a
           * child and the title uses ::before. Fall back to the toolbar
           * flow before .action-items if the title element is not found.
           * No absolute/fixed positioning is used; Home Assistant's own
           * action items are left untouched. */
          const mainTitle = toolbar.querySelector(".main-title");
          if (mainTitle) {
            mainTitle.appendChild(ctx);
          } else {
            toolbar.insertBefore(ctx, toolbar.querySelector(".action-items"));
          }
          console.debug("[home-dashboard-header] container created");
        }
        buildShortcuts(ctx);
        if (!toolbarObserver) {
          toolbarObserver = new MutationObserver(onToolbarMutation);
          toolbarObserver.observe(shadow, { childList: true, subtree: true });
          console.debug("[home-dashboard-header] observer armed");
        }
        console.debug(
          "[home-dashboard-header] injected",
          location.pathname,
          "container:",
          !!ctx,
          "buttons:",
          ctx?.childElementCount
        );
      } else {
        console.debug("[home-dashboard-header] toolbar not found");
      }
    } else {
      /* Outside the Home Dashboard routes: remove the override so other
       * dashboards stay untouched, and stop observing. */
      style?.remove();
      if (toolbar) toolbar.querySelector("div.overview-shortcuts")?.remove();
      if (toolbarObserver) {
        toolbarObserver.disconnect();
        toolbarObserver = null;
      }
    }
    return true;
  };

  /* Locate hui-root via the current component chain:
   * document -> home-assistant -> partial-panel-resolver -> ha-panel-home
   * -> hui-root. Returns false (quietly) when the panel is not mounted. */
  const attach = () => {
    const panel = pierce(document, "ha-panel-home");
    const root = panel && pierce(panel, "hui-root");
    const nextShadow = root?.shadowRoot ?? null;
    if (nextShadow !== shadowRef) {
      /* hui-root was re-created in place: drop the observer still watching
       * the old shadow root, so ensureAttached arms a fresh one on the new
       * root. */
      shadowRef = nextShadow;
      if (toolbarObserver) {
        toolbarObserver.disconnect();
        toolbarObserver = null;
      }
    }
    return ensureAttached();
  };

  console.debug("[home-dashboard-header] module loaded");

  /* Poll briefly on load/route changes in case the panel mounts after the
   * module runs; afterwards the MutationObserver handles re-renders. */
  let timer = 0;
  const run = () => {
    if (timer) return;
    let tries = 0;
    timer = setInterval(() => {
      if (attach() || ++tries >= 20) {
        clearInterval(timer);
        timer = 0;
        if (tries >= 20) {
          console.debug("[home-dashboard-header] hui-root not found after 20 tries");
        }
      }
    }, 200);
  };

  addEventListener("location-changed", run);
  addEventListener("popstate", run);
  customElements.whenDefined("ha-panel-home").then(run);
  run();
})();
