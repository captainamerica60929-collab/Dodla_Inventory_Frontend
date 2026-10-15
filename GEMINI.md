# Frontend (Angular 22) — scope: Frontend/Inventory-UI

Applies when working in this folder. Shared rules are in the parent GEMINI.md.
Use the `angular-frontend`, `driverjs-user-guide` and `wms-domain-rules` skills.

## Tech Stack & Architecture
- Framework: Angular 22 (standalone components, signals, lazy-loaded routes).
- UI Components: Angular CDK (`@angular/cdk` for Dialog, Overlay, a11y). **No Angular Material**.
- Styling: Custom SCSS adhering to prototype tokens (colors, surfaces, typography, elevations).
- Onboarding: driver.js v1 with tours restricted by role.

## Commands (run from this folder)
- Install: npm install
- Serve:   npm start   (ng serve, http://localhost:4200)
- Test:    npm test -- --watch=false
- Lint:    npm run lint   (if defined)
- Build:   npm run build

## Local rules
- API base URL lives in the environment files; never hard-code it in services.
- Use a dev proxy (proxy.conf.json) to the .NET API instead of widening CORS.
- Install driver.js with `npm i driver.js`; tour code lives in src/app/core/tour.
- Every interactive element a tour needs has a stable data-tour="..." attribute.
- Role-based UI protection: Dynamically hide UI actions, menu items, and tours the active role cannot access.
- Do not touch anything under ../../Backend. If the API needs to change, say so under "Backend impact:".
