import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { PillComponent } from './shared/components/pill/pill.component';
import { StatCardComponent } from './shared/components/stat-card/stat-card.component';
import { BinBarComponent } from './shared/components/bin-bar/bin-bar.component';
import { SessionService } from './core/session/session.service';

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  it('should create the app root', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});

describe('PillComponent', () => {
  it('should support prototype and newly requested status variants', () => {
    const fixture = TestBed.createComponent(PillComponent);
    const pill = fixture.componentInstance;

    // Test prototype variants
    fixture.componentRef.setInput('variant', 'Open');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pill.Open')).toBeTruthy();

    // Test new variants: New, Processed, Error, Issued, Accepted, Rejected
    const variants = ['New', 'Processed', 'Error', 'Issued', 'Accepted', 'Rejected'] as const;
    for (const v of variants) {
      fixture.componentRef.setInput('variant', v);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector(`.pill.${v}`)).toBeTruthy();
    }
  });
});

describe('StatCardComponent', () => {
  it('should display label, value, and subtitle', () => {
    const fixture = TestBed.createComponent(StatCardComponent);
    fixture.componentRef.setInput('label', 'Pending Inward');
    fixture.componentRef.setInput('value', 28);
    fixture.componentRef.setInput('sub', 'Awaiting putaway');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.sl')?.textContent).toContain('Pending Inward');
    expect(el.querySelector('.sv')?.textContent).toContain('28');
    expect(el.querySelector('.ss')?.textContent).toContain('Awaiting putaway');
  });
});

describe('BinBarComponent', () => {
  it('should calculate percentage and color accurately', () => {
    const fixture = TestBed.createComponent(BinBarComponent);
    fixture.componentRef.setInput('used', 500);
    fixture.componentRef.setInput('capacity', 1000);
    fixture.detectChanges();

    expect(fixture.componentInstance.percent()).toBe(50);
    expect(fixture.componentInstance.barColor()).toBe('var(--green, #2F6F4E)');

    // Warning range (>75%)
    fixture.componentRef.setInput('used', 800);
    fixture.detectChanges();
    expect(fixture.componentInstance.percent()).toBe(80);
    expect(fixture.componentInstance.barColor()).toBe('var(--amber, #E8A33D)');

    // Danger range (>90%)
    fixture.componentRef.setInput('used', 950);
    fixture.detectChanges();
    expect(fixture.componentInstance.percent()).toBe(95);
    expect(fixture.componentInstance.barColor()).toBe('var(--red, #C1443D)');
  });
});

describe('SessionService', () => {
  it('should have null defaults and update signals cleanly', () => {
    const session = TestBed.inject(SessionService);
    expect(session.user()).toBeNull();
    expect(session.branch()).toBeNull();
    expect(session.role()).toBeNull();
    expect(session.isLoggedIn()).toBe(false);
    expect(session.userDisplayName()).toBe('Not signed in');
    expect(session.branchDisplayName()).toBe('No branch selected');

    session.setUser({
      id: '1',
      username: 'ravi.k',
      fullName: 'Ravi Kumar',
      department: 'Stores',
    });
    session.setBranch({
      id: '1',
      code: 'BR-01',
      name: 'Main Warehouse',
    });
    session.setRole('Admin');

    expect(session.isLoggedIn()).toBe(true);
    expect(session.userDisplayName()).toBe('Ravi Kumar');
    expect(session.userInitials()).toBe('RK');
    expect(session.branchDisplayName()).toBe('Main Warehouse (BR-01)');
    expect(session.role()).toBe('Admin');
  });
});
