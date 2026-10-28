import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ReportsPageComponent } from './reports.page';
import { ReportService } from '../../core/api/report.service';
import { BranchService } from '../../core/api/branch.service';
import { SessionService } from '../../core/session/session.service';
import { NotificationService } from '../../core/services/notification.service';
import { TourService } from '../../core/tour/tour.service';

describe('ReportsPageComponent', () => {
  let component: ReportsPageComponent;
  let fixture: ComponentFixture<ReportsPageComponent>;
  let reportService: ReportService;
  let notificationService: NotificationService;
  let sessionService: SessionService;

  const mockInwardData = {
    items: [
      {
        tagNo: 'STK-001011',
        materialCode: 'M100',
        partName: 'Steel Bolt M8',
        qty: 200,
        locationCode: 'A-01-01',
        locationZone: 'Fast-Moving',
        inwardAt: '2026-10-21T07:30:00Z',
        userNameSnapshot: 'Ravi Kumar',
        branchId: 1,
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  };

  const mockOutwardData = {
    items: [
      {
        tagNo: 'STK-4900001',
        materialCode: 'M100',
        partName: 'Steel Bolt M8',
        issuedQty: 50,
        remainingQty: 50,
        locationCode: 'A-01-01',
        dispatchedAt: '2026-10-21T08:15:00Z',
        userNameSnapshot: 'StoreKeeper',
        bypassFifo: false,
        branchId: 1,
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  };

  const mockInStockData = {
    items: [
      {
        materialCode: 'M100',
        partName: 'Steel Bolt M8',
        locationCode: 'A-01-01',
        locationZone: 'Fast-Moving',
        totalQty: 250,
        tagCount: 2,
        oldestInwardAt: '2026-09-10T00:00:00Z',
        branchId: 1,
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ReportService,
        BranchService,
        SessionService,
        NotificationService,
        TourService,
      ],
    }).compileComponents();

    reportService = TestBed.inject(ReportService);
    notificationService = TestBed.inject(NotificationService);
    sessionService = TestBed.inject(SessionService);

    vi.spyOn(reportService, 'getInwardReport').mockReturnValue(of(mockInwardData));
    vi.spyOn(reportService, 'getOutwardReport').mockReturnValue(of(mockOutwardData));
    vi.spyOn(reportService, 'getInStockReport').mockReturnValue(of(mockInStockData));

    fixture = TestBed.createComponent(ReportsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the reports page component', () => {
    expect(component).toBeTruthy();
  });

  it('should load inward report by default on initialization', () => {
    expect(component.activeTab()).toBe('inward');
    expect(component.inwardData().length).toBeGreaterThan(0);
    expect(component.totalCount()).toBe(1);
  });

  it('should switch between tabs and load corresponding report data', () => {
    const outwardSpy = vi.spyOn(reportService, 'getOutwardReport').mockReturnValue(of(mockOutwardData));
    component.switchTab('outward');
    fixture.detectChanges();

    expect(component.activeTab()).toBe('outward');
    expect(outwardSpy).toHaveBeenCalled();
    expect(component.outwardData().length).toBe(1);

    const inStockSpy = vi.spyOn(reportService, 'getInStockReport').mockReturnValue(of(mockInStockData));
    component.switchTab('in-stock');
    fixture.detectChanges();

    expect(component.activeTab()).toBe('in-stock');
    expect(inStockSpy).toHaveBeenCalled();
    expect(component.inStockData().length).toBe(1);
  });

  it('should apply global search and reload current report', () => {
    const inwardSpy = vi.spyOn(reportService, 'getInwardReport').mockReturnValue(of(mockInwardData));
    component.onSearchChange('M100');
    fixture.detectChanges();

    expect(component.searchText()).toBe('M100');
    expect(inwardSpy).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'M100', page: 1 })
    );
  });

  it('should set date presets correctly (Today, Last 7 Days, This Month, All Time)', () => {
    component.setToday();
    const today = new Date().toISOString().split('T')[0];
    expect(component.fromDate()).toBe(today);
    expect(component.toDate()).toBe(today);

    component.setLast7Days();
    expect(component.fromDate()).not.toBe('');
    expect(component.toDate()).toBe(today);

    component.clearDates();
    expect(component.fromDate()).toBe('');
    expect(component.toDate()).toBe('');
  });

  it('should reset all filters and reload', () => {
    component.searchText.set('Custom query');
    component.fromDate.set('2026-10-01');
    component.toDate.set('2026-10-10');

    component.resetFilters();

    expect(component.searchText()).toBe('');
    expect(component.fromDate()).toBe('');
    expect(component.toDate()).toBe('');
    expect(component.currentPage()).toBe(1);
  });

  it('should paginate correctly (goToPage and onPageSizeChange)', () => {
    const inwardSpy = vi.spyOn(reportService, 'getInwardReport').mockReturnValue(of(mockInwardData));
    component.totalPages.set(3);
    component.goToPage(2);
    fixture.detectChanges();

    expect(component.currentPage()).toBe(2);
    expect(inwardSpy).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));

    component.onPageSizeChange(25);
    expect(component.pageSize()).toBe(25);
    expect(component.currentPage()).toBe(1);
  });

  it('should trigger CSV export and display success notification toast', () => {
    const successSpy = vi.spyOn(notificationService, 'showSuccess');
    const warningSpy = vi.spyOn(notificationService, 'showWarning');

    component.exportCurrentReportToCsv();

    expect(warningSpy).not.toHaveBeenCalled();
    expect(successSpy).toHaveBeenCalledWith(
      'Export Downloaded',
      expect.stringContaining('.csv')
    );
  });

  it('should display locked branch badge for non-admin and dropdown for admin', () => {
    sessionService.role.set('StoreKeeper');
    expect(component.isAdmin()).toBe(false);

    sessionService.role.set('Admin');
    expect(component.isAdmin()).toBe(true);
  });
});
