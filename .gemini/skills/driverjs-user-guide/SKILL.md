---
name: driverjs-user-guide
description: Use when adding or changing onboarding tours, product guides, help buttons, or "take a tour" features in the Angular app using driver.js (highlighted steps, popovers, first-visit walkthroughs, role-based tours).
---

# driver.js user guide (Angular)

Library: `npm i driver.js` (v1).
```ts
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';   // or add the css to styles in angular.json
const d = driver({ showProgress: true, steps: [{ element: '[data-tour="x"]',
  popover: { title: '...', description: '...', side: 'bottom', align: 'start' } }] });
d.drive();
```
Check the installed version's README if an option name fails to compile.

## Design
- `core/tour/tour.types.ts`: `TourDefinition { id; version; roles?: Role[]; steps: TourStepDef[] }`.
- `core/tour/tour.service.ts` (providedIn root): `start(def)`, `startIfFirstVisit(def)`, `reset(id)`.
  - Drop steps whose element is missing from the DOM or not allowed for the user's role.
  - Popover class `wt-tour` (amber/navy theme, dark-mode aware); disable animation when prefers-reduced-motion.
  - Persist completion in localStorage: `wt.tour.<userId>.<tourId>.v<version>`. Bump `version` to re-show.
- Definitions live beside the feature: `features/<area>/<area>.tour.ts`. Keep copy in one place for later i18n.
- Anchor ONLY on `[data-tour="..."]`. Never on CSS classes or generated ids.
- A "Take a tour" button in the top bar re-runs the tour for the current page.
- Auto-start on first visit only after the view has rendered (afterNextRender) and when no modal is open.
- Cross-page steps: in `onNextClick` navigate with the Router, wait for the target element (poll, 3 s timeout),
  then `moveNext()`.

## Known risk: modals
A native `<dialog>` opened with showModal() renders in the browser top layer, above the driver.js overlay and
popover, so highlighted elements inside it may not be reachable. Either build modals without the top layer
(CDK dialog / div + z-index) or start a separate mini-tour after the modal opens. Decide with the owner first.

## Rules
- Description text: one or two short sentences, plain language, no hard-coded business numbers.
- Tours explain; they never click Confirm or change data.
- Never run a tour for a screen the user cannot access.
- Unit test the service (missing element, role filter, persistence). Do not test step wording.

Screen-by-screen steps and data-tour keys: references/tour-steps.md
