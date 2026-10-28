import { UserRole } from '../session/session.service';

export interface TourStepDef {
  element: string; // CSS selector e.g. '[data-tour="inward-scan-input"]'
  title: string;
  description: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  roles?: UserRole[];
}

export interface TourDefinition {
  id: string;
  version: number;
  roles?: UserRole[];
  steps: TourStepDef[];
}
