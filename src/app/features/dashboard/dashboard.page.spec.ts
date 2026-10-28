import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DashboardPageComponent } from './dashboard.page';
import { ReportService } from '../../core/api/report.service';
import { SessionService } from '../../core/session/session.service';
import { NotificationService } from '../../core/services/notification.service';
import { TourService } from '../../core/tour/tour.service';

describe('DashboardPageComponent', () => {
  let component: DashboardPageComponent;
  let fixture: ComponentFixture<DashboardPageComponent>;
  let reportService: ReportService;
  let notificationService: NotificationService;

  const mockLiveMetrics = {
    totalRegisteredItems: 1500,
    pendingInwardItems: 35,
    totalInStockItems: 1320,
    totalClaimedRejected: 8,
    activeAlertsCount: 1,
    recentMovements: [
      {
        id: 1,
        tagNo: 'STK-001011',
        materialCode: 'M100',
        partName: 'Steel Bolt M8',
        movementType: 'Inward' as const,
        qty: 200,
        locationCode: 'A-01-01',
        timestamp: '2026-10-21T07:30:00Z',
        userName: 'Ravi Kumar',
      },
    ],
    zoneOccupancy: [
      { zone: 'Fast-Moving (Zone A)', usedQty: 580, capacity: 600, percentage: 96 },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        ReportService,
        SessionService,
        NotificationService,
        TourService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPageComponent);
    component = fixture.componentInstance;
    reportService = TestBed.inject(ReportService);
    notificationService = TestBed.inject(NotificationService);

    vi.spyOn(reportService, 'getDashboardLive').mockReturnValue(of(mockLiveMetrics));

    fixture.detectChanges();
  });

  it('should create dashboard page component', () => {
    expect(component).toBeTruthy();
  });

  it('should load live metrics on initialization and bind KPI values', () => {
    expect(component.liveMetrics().totalRegisteredItems).toBe(1500);
    expect(component.liveMetrics().pendingInwardItems).toBe(35);
    expect(component.liveMetrics().totalInStockItems).toBe(1320);
    expect(component.liveMetrics().totalClaimedRejected).toBe(8);
    expect(component.liveMetrics().recentMovements.length).toBe(1);
    expect(component.liveMetrics().zoneOccupancy.length).toBe(1);
  });

  it('should trigger manual sync and show success notification toast', () => {
    const notifySpy = vi.spyOn(notificationService, 'showSuccess');
    component.refreshLiveMetrics(false);

    expect(notifySpy).toHaveBeenCalledWith(
      'Live Sync Complete',
      expect.stringContaining('synchronized')
    );
  });
});
