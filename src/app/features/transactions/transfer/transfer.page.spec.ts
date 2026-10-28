import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TransferPageComponent } from './transfer.page';
import { StockService } from '../../../core/api/stock.service';
import { LocationService } from '../../../core/api/location.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SessionService } from '../../../core/session/session.service';
import { TourService } from '../../../core/tour/tour.service';

describe('TransferPageComponent', () => {
  let component: TransferPageComponent;
  let fixture: ComponentFixture<TransferPageComponent>;
  let stockService: StockService;
  let locationService: LocationService;
  let notificationService: NotificationService;

  const mockLocations = {
    items: [
      {
        id: 1,
        code: 'A-01-01',
        zone: 'Fast-Moving',
        capacity: 500,
        usedQty: 350,
        freeQty: 150,
        isActive: true,
        branchId: 1,
        rowVersion: 'AAAA',
        createdAt: '2026-10-01T00:00:00Z',
        createdBy: 1,
        modifiedAt: null,
        modifiedBy: null,
      },
      {
        id: 2,
        code: 'A-01-02',
        zone: 'Fast-Moving',
        capacity: 400,
        usedQty: 200,
        freeQty: 200,
        isActive: true,
        branchId: 1,
        rowVersion: 'AAAB',
        createdAt: '2026-10-01T00:00:00Z',
        createdBy: 1,
        modifiedAt: null,
        modifiedBy: null,
      },
      {
        id: 3,
        code: 'B-02-01',
        zone: 'Bulk-Storage',
        capacity: 500,
        usedQty: 50,
        freeQty: 450,
        isActive: true,
        branchId: 1,
        rowVersion: 'AAAC',
        createdAt: '2026-10-01T00:00:00Z',
        createdBy: 1,
        modifiedAt: null,
        modifiedBy: null,
      },
    ],
    totalCount: 3,
    page: 1,
    pageSize: 100,
    totalPages: 1,
  };

  const mockTagInfo = {
    tagId: 3,
    tagNo: 'STK-4900003',
    status: 'InStock',
    qty: 50,
    remainingQty: 50,
    materialCode: 'Bearing 6205',
    partName: 'Deep Groove Ball Bearing',
    batchNo: 'B2610-03',
    locationId: 2,
    locationCode: 'A-01-02',
    locationZone: 'Fast-Moving',
    inwardAt: '2026-10-18T10:00:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransferPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        StockService,
        LocationService,
        NotificationService,
        SessionService,
        TourService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransferPageComponent);
    component = fixture.componentInstance;
    stockService = TestBed.inject(StockService);
    locationService = TestBed.inject(LocationService);
    notificationService = TestBed.inject(NotificationService);

    vi.spyOn(locationService, 'getPaged').mockReturnValue(of(mockLocations));
    vi.spyOn(stockService, 'getTagStockInfo').mockReturnValue(of(mockTagInfo));

    fixture.detectChanges();
  });

  it('should create transfer page component', () => {
    expect(component).toBeTruthy();
  });

  it('should load active warehouse locations on init', () => {
    expect(component.allLocations().length).toBe(3);
  });

  it('should lookup tag details on scan and exclude current location from destination options', () => {
    component.tagInput.set('STK-4900003');
    component.onSearchTag();
    fixture.detectChanges();

    expect(component.scannedTag()).toEqual(mockTagInfo);
    // Destination options should exclude 'A-01-02' (the tag's current bin)
    const destBins = component.destinationLocations();
    expect(destBins.some((b) => b.code === 'A-01-02')).toBe(false);
    expect(destBins.some((b) => b.code === 'B-02-01')).toBe(true);
  });

  it('should require destination location code before initiating transfer', () => {
    component.tagInput.set('STK-4900003');
    component.onSearchTag();
    fixture.detectChanges();

    expect(component.transferForm.valid).toBe(false);

    component.transferForm.controls['targetLocationCode'].setValue('B-02-01');
    expect(component.transferForm.valid).toBe(true);
  });

  it('should open confirm modal on valid form submit', () => {
    component.tagInput.set('STK-4900003');
    component.onSearchTag();
    component.transferForm.controls['targetLocationCode'].setValue('B-02-01');
    fixture.detectChanges();

    component.openConfirmModal();
    expect(component.showConfirmModal()).toBe(true);
  });

  it('should execute transfer, show success notification toast, and reset form', () => {
    const showSuccessSpy = vi.spyOn(notificationService, 'showSuccess');
    const transferSpy = vi.spyOn(stockService, 'transfer').mockReturnValue(
      of({
        tagId: 3,
        tagNo: 'STK-4900003',
        materialCode: 'Bearing 6205',
        qty: 50,
        fromLocationCode: 'A-01-02',
        toLocationCode: 'B-02-01',
        reason: 'Consolidation',
        transferredAt: '2026-10-21T08:00:00Z',
      })
    );

    component.tagInput.set('STK-4900003');
    component.onSearchTag();
    component.transferForm.controls['targetLocationCode'].setValue('B-02-01');
    component.transferForm.controls['reason'].setValue('Consolidation');
    fixture.detectChanges();

    component.executeTransfer();

    expect(transferSpy).toHaveBeenCalledWith({
      tagNo: 'STK-4900003',
      targetLocationCode: 'B-02-01',
      reason: 'Consolidation',
    });

    expect(showSuccessSpy).toHaveBeenCalledWith(
      'Transfer Complete',
      expect.stringContaining('Tag STK-4900003 relocated successfully to bin B-02-01')
    );

    // Form and scanned tag should reset
    expect(component.scannedTag()).toBeNull();
    expect(component.tagInput()).toBe('');
    expect(component.transferHistory().length).toBeGreaterThan(0);
    expect(component.transferHistory()[0].toLocationCode).toBe('B-02-01');
  });
});
