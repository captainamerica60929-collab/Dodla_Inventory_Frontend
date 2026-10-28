import { Injectable, computed, inject, signal } from '@angular/core';
import { driver, DriveStep } from 'driver.js';
import { SessionService } from '../session/session.service';
import { TourDefinition, TourStepDef } from './tour.types';

@Injectable({
  providedIn: 'root',
})
export class TourService {
  private readonly session = inject(SessionService);
  private currentTourDef = signal<TourDefinition | null>(null);

  readonly hasCurrentTour = computed(() => {
    const def = this.currentTourDef();
    if (!def) return false;
    const role = this.session.role();
    if (def.roles && (!role || !def.roles.includes(role))) {
      return false;
    }
    return true;
  });

  registerCurrentTour(def: TourDefinition | null): void {
    this.currentTourDef.set(def);
  }

  startCurrentTour(): void {
    const def = this.currentTourDef();
    if (def) {
      this.start(def);
    }
  }

  start(def: TourDefinition): void {
    if (typeof window === 'undefined') return;

    const role = this.session.role();
    if (def.roles && (!role || !def.roles.includes(role))) {
      return;
    }

    // Filter steps by role and element presence in DOM
    const validSteps: DriveStep[] = def.steps
      .filter((step: TourStepDef) => {
        if (step.roles && (!role || !step.roles.includes(role))) {
          return false;
        }
        const el = document.querySelector(step.element);
        return el !== null;
      })
      .map((step: TourStepDef) => ({
        element: step.element,
        popover: {
          title: step.title,
          description: step.description,
          side: step.side || 'bottom',
          align: step.align || 'start',
          popoverClass: 'wt-tour',
        },
      }));

    if (validSteps.length === 0) {
      return;
    }

    const prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const driverObj = driver({
      showProgress: true,
      animate: !prefersReducedMotion,
      popoverClass: 'wt-tour',
      steps: validSteps,
      onDestroyed: () => {
        this.markCompleted(def);
      },
    });

    driverObj.drive();
  }

  startIfFirstVisit(def: TourDefinition): void {
    if (this.hasCompleted(def)) {
      return;
    }
    this.start(def);
  }

  reset(tourId: string): void {
    if (typeof window === 'undefined') return;
    const userId = this.session.user()?.id || 'guest';
    const prefix = `wt.tour.${userId}.${tourId}`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    }
  }

  private hasCompleted(def: TourDefinition): boolean {
    if (typeof window === 'undefined') return true;
    const userId = this.session.user()?.id || 'guest';
    const key = `wt.tour.${userId}.${def.id}.v${def.version}`;
    return localStorage.getItem(key) === 'true';
  }

  private markCompleted(def: TourDefinition): void {
    if (typeof window === 'undefined') return;
    const userId = this.session.user()?.id || 'guest';
    const key = `wt.tour.${userId}.${def.id}.v${def.version}`;
    try {
      localStorage.setItem(key, 'true');
    } catch {
      // Ignore localStorage quotas
    }
  }
}
