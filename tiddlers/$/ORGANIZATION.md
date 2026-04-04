This folder contains system/config tiddlers (`$:/...`) organized by purpose.

- `settings/default-view`
  - Startup/default UI state (`$:/DefaultTiddlers`, story list defaults).
- `settings/features`
  - Feature toggles and behavior/config flags (`$:/config/...`).
- `custom`
  - Project-specific custom tiddlers, macros, and custom styles.
- `plugins/mhwiki`
  - Local MHWiki plugin code/macros/styles.
- `plugins/flibbles`
  - Third-party plugin configuration tiddlers we maintain locally.
- `appearance`
  - Site identity/theme tiddlers (`$:/SiteTitle`, `$:/SiteSubtitle`, theme).
- `single-story`
  - Single-story mode assets and scripts.
- `tools`
  - Utility/admin tiddlers.

Notes:
- File location here is for repo organization only; actual behavior is driven by each tiddler `title`.
- Keep related `.js` and `.js.meta` (or `.css` and `.meta`) files together in the same folder.
