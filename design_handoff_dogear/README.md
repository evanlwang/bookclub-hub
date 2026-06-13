# Dogear — Design Handoff

This folder is the UI source of truth for Dogear's cozy editorial redesign. It collects two
complementary handoff packages. Each subfolder is self-contained: open its `README.md` first,
then its runnable HTML reference.

| Subfolder | Scope | Start here |
|---|---|---|
| [`app-redesign/`](app-redesign/README.md) | Full app visual + interaction redesign — every surface (dashboard, voting, progress, notes, meetings, entry), the design system, tokens, and component specs. | `app-redesign/README.md`, then open `app-redesign/Dogear Redesign.html` |
| [`landing/`](landing/README.md) | Focused, newer editorial redesign of just the marketing landing page (`/`) and the app icon. | `landing/README.md`, then open `landing/Landing Page.html` |

## How the two relate

The **app-redesign** package defines the overall design language (paper + terracotta + amber,
Nunito / Newsreader / Courier Prime, pill buttons, warm shadows, the dog-ear metaphor) and every
in-app surface. The **landing** package is a later, narrower pass that supersedes the app-redesign's
landing screen with the borrower's-card editorial composition and ships the dog-ear app icon.

Both share the same design tokens. Where they overlap:

- `dogear.css` and `dogear-components.jsx` are identical across both subfolders.
- `dogear-join.jsx` differs: **`landing/`** holds the current landing screen (adds the `DogEarMark`
  icon component and the editorial `LandingScreen`) and is the canonical reference for the landing.
  `app-redesign/dogear-join.jsx` keeps the full join wizard / login / library-card flows.

Each subfolder keeps its own copy of the shared files so its HTML reference runs standalone.
