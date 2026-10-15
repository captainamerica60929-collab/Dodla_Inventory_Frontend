---
name: angular-frontend
description: Use for any Angular frontend work in WareTrack - app shell, routing, feature screens, forms, scan modal, API services, state, guards, styling, and frontend tests.
---

# Angular rules

FIRST read package.json and angular.json: confirm the Angular version, UI library, lint and test setup.
Prefer standalone components and signals if the version allows. Follow the existing code style.

## Structure
```
src/app/
  core/        auth, http interceptors, guards, layout shell, tour/ (driver.js wrapper)
  shared/      ui components (pill, stat-card, data-table, modal, bin-bar), pipes (age-days), directives
  features/    dashboard materials locations employees users grn inward outward transfer reports
  api/         typed API clients (one service per backend area)
```

## Rules
- Smart (page) vs presentational components. Pages call API services; presentational ones take inputs.
- Typed forms. Mirror backend validation (whole qty > 0, qty <= pending/available/free) for instant feedback;
  the API stays the authority and its ProblemDetails messages are shown to the user.
- Barcode scan field: scanners type fast then press Enter. Handle live `input` match and Enter (force lookup);
  autofocus; keep focus after a successful scan.
- Use design tokens from the prototype CSS variables (amber #E8A33D, navy #1B2430, green #2F6F4E, red #C1443D,
  blue #2E6BA6, purple #6B4FA3). Support light/dark theme and prefers-reduced-motion.
- Sidebar items and routes are filtered by role. Route guards use the same role matrix as the API.
- Modals: do NOT use native <dialog>.showModal() if driver.js tours must run inside them
  (see driverjs-user-guide). Use CDK/Material dialog or a div modal with a known z-index.
- Every element a tour needs gets a stable `data-tour="..."` attribute.
- Accessibility: labelled inputs, focus trap in modals, keyboard operable, visible focus ring.
- Tests: component tests for forms and guards; service tests with HttpTestingController.
