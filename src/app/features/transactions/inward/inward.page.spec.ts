import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { InwardPageComponent } from './inward.page';
import { StockService } from '../../../core/api/stock.service';
import { LocationDto, LocationService } from '../../../core/api/location.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SessionService } from '../../../core/session/session.service';
import { TourService } from '../../../core/tour/tour.service';

describe('InwardPageComponent', () => {
  let component: InwardPageComponent;
  let fixture: ComponentFixture<InwardPageComponent>;
  let stockService: StockService;
  let locationService: LocationService;
  let notificationService: NotificationService;
  let tourService: TourService;

  const mockLocations: LocationDto[] = [
    {
      id: 1,
      branchId: 1,
      code: 'A-01-01',
      zone: 'Zone A',
      capacity: 500,
      usedQty: 100,
      freeQty: 400,
      isActive: true,
      rowVersion: 'v1',
      createdAt: '2026-10-01T00:00:00Z',
      createdBy: null,
      modifiedAt: null,
      modifiedBy: null,
    },
    {
      id: 2,
      branchId: 1,
      code: 'A-01-02',
      zone: 'Zone A',
      capacity: 200,
      usedQty: 180,
      freeQty: 20,
      isActive: true,
      rowVersion: 'v2',
      createdAt: '2026-10-01T00:00:00Z',
      createdBy: null,
      modifiedAt: null,
      modifiedBy: null,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InwardPageComponent],
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

    fixture = TestBed.createComponent(InwardPageComponent);
    component = fixture.componentInstance;
    stockService = TestBed.inject(StockService);
    locationService = TestBed.inject(LocationService);
    notificationService = TestBed.inject(NotificationService);
    tourService = TestBed.inject(TourService);

    vi.spyOn(locationService, 'getPaged').mockReturnValue(
      of({ items: mockLocations, totalCount: 2, page: 1, pageSize: 100, totalPages: 1 }),
    );
    vi.spyOn(stockService, 'getMovements').mockReturnValue(of([]));

    fixture.detectChanges();
  });

  it('should create inward page component', () => {
    expect(component).toBeTruthy();
  });

  it('should load active warehouse locations on init', () => {
    expect(component.availableLocations().length).toBe(2);
    expect(component.availableLocations()[0].code).toBe('A-01-01');
  });

  it('should scan/lookup tag successfully', () => {
    const mockTag = {
      tagId: 1,
      tagNo: 'STK-001011',
      status: 'Printed',
      qty: 150,
      remainingQty: 150,
      materialCode: 'M100',
      partName: 'Steel Bolt M8',
      batchNo: 'B2610A',
      locationId: null,
      locationCode: null,
      locationZone: null,
      inwardAt: null,
    };

    vi.spyOn(stockService, 'getTagStockInfo').mockReturnValue(of(mockTag));

    component.tagSearchInput.set('STK-001011');
    component.onSearchTag();

    expect(component.scannedTag()).toEqual(mockTag);
    expect(component.isSearchingTag()).toBe(false);
  });

  it('should select destination bin if capacity allows, and compute canInward', () => {
    component.scannedTag.set({
      tagId: 1,
      tagNo: 'STK-001011',
      status: 'Printed',
      qty: 150,
      remainingQty: 150,
      materialCode: 'M100',
    });

    const ampleLoc = mockLocations[0]; // Free: 400, tag: 150
    component.onSelectLocation(ampleLoc, 150);

    expect(component.selectedLocation()?.code).toBe('A-01-01');
    expect(component.canInward()).toBe(true);

    const projected = component.calcProjectedPercent(ampleLoc, 150);
    expect(projected).toBe(50); // (100 + 150) / 500 = 50%
  });

  it('should not allow selecting bin if free capacity is insufficient', () => {
    component.scannedTag.set({
      tagId: 1,
      tagNo: 'STK-001011',
      status: 'Printed',
      qty: 150,
      remainingQty: 150,
      materialCode: 'M100',
    });

    const tightLoc = mockLocations[1]; // Free: 20, tag: 150
    component.onSelectLocation(tightLoc, 150);

    expect(component.selectedLocation()).toBeNull();
    expect(component.canInward()).toBe(false);
  });

  it('should open confirm modal and execute inward putaway', () => {
    const notifySpy = vi.spyOn(notificationService, 'showSuccess');
    const inwardSpy = vi.spyOn(stockService, 'inward').mockReturnValue(
      of({
        stockRecordId: 10,
        tagId: 1,
        tagNo: 'STK-001011',
        locationId: 1,
        locationCode: 'A-01-01',
        materialCode: 'M100',
        qty: 150,
        locationUsedCapacity: 250,
        locationCapacity: 500,
        inwardAt: '2026-10-21T07:45:00Z',
      }),
    );

    component.scannedTag.set({
      tagId: 1,
      tagNo: 'STK-001011',
      status: 'Printed',
      qty: 150,
      remainingQty: 150,
      materialCode: 'M100',
    });
    component.selectedLocation.set(mockLocations[0]);

    component.openConfirmModal();
    expect(component.showConfirmModal()).toBe(true);

    component.executePutaway();

    expect(inwardSpy).toHaveBeenCalledWith({ tagNo: 'STK-001011', locationCode: 'A-01-01' });
    expect(notifySpy).toHaveBeenCalledWith('Putaway Confirmed', expect.stringContaining('STK-001011'));
    expect(component.showConfirmModal()).toBe(false);
    expect(component.scannedTag()).toBeNull();
  });
});
