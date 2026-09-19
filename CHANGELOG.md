# Changelog

## [beta] - 2026-09-19

Initial standalone release of the working Home Dashboard header module.

### Added

- Native Home Dashboard header title override: `/`, `/home` and
  `/home/overview` now show "Home" instead of "Overview", rendered via
  `::before` on `.main-title` inside the `hui-root` shadow root.
- Shortcut icon buttons in the header toolbar, immediately to the right of the
  title, as native `ha-icon-button` controls with slotted `<ha-icon>` icons
  (`ha-icon-button` exposes no `icon` property in this frontend version).
- Route scoping: the module acts only on `/`, `/home`, `/home/overview`;
  Home Dashboard sub-views and all other dashboards are left untouched.
- Shadow-root traversal (`pierce`) to locate `ha-panel-home` -> `hui-root`
  without hard-coding the component container nesting.
- Scoped `MutationObserver` on the `hui-root` shadow root that re-asserts the
  injected controls after Lit/Home Assistant re-renders — idempotent, and
  scoped to that one shadow root rather than the whole document.
- Navigation via Home Assistant's own router semantics (`history.pushState` +
  `location-changed`): no page reload, browser Back/Forward preserved.
- `console.debug` diagnostics for fast failure triage.
- Licensed under MIT.

### Tested

- Home Assistant Core 2026.9.3, Frontend 20260826.7. 
- Not guaranteed to survive future Home Assistant frontend restructuring —
  see README, "Upgrade risk and architectural trade-offs".
