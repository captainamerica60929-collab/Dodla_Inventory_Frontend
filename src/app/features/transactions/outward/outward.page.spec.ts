import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { OutwardPageComponent } from './outward.page';
import { StockService } from '../../../core/api/stock.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SessionService } from '../../../core/session/session.service';
import { TourService } from '../../../core/tour/tour.service';

describe('OutwardPageComponent', () => {
  let component: OutwardPageComponent;
  let fixture: ComponentFixture<OutwardPageComponent>;
  let stockService: StockService;
  let notificationService: NotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OutwardPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        StockService,
        NotificationService,
        SessionService,
        TourService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OutwardPageComponent);
    component = fixture.componentInstance;
    stockService = TestBed.inject(StockService);
    notificationService = TestBed.inject(NotificationService);

    vi.spyOn(stockService, 'getMovements').mockReturnValue(of([]));

    fixture.detectChanges();
  });

  it('should create outward page component', () => {
    expect(component).toBeTruthy();
  });

  it('should load FIFO-sequenced stock balances on initialization', () => {
    const items = component.stockItems();
    expect(items.length).toBeGreaterThan(0);
    // Verify chronological FIFO order
    for (let i = 0; i < items.length - 1; i++) {
      const t1 = new Date(items[i].inwardAt).getTime();
      const t2 = new Date(items[i + 1].inwardAt).getTime();
      expect(t1).toBeLessThanOrEqual(t2);
    }
  });

  it('should correctly determine oldest lot for a material', () => {
    const items = component.stockItems();
    const m100Items = items.filter((i) => i.materialCode === 'M100');
    expect(m100Items.length).toBe(2);

    const oldest = m100Items[0];
    const newer = m100Items[1];

    expect(component.isOldestLot(oldest)).toBe(true);
    expect(component.isOldestLot(newer)).toBe(false);
    expect(component.findOlderLot(newer)?.tagId).toBe(oldest.tagId);
  });

  it('should validate partial quantity reactively against tag limit', () => {
    const item = component.stockItems()[0];
    component.selectItem(item);

    const qtyControl = component.issueForm.controls['qty'];
    expect(qtyControl.value).toBe(item.remainingQty);
    expect(component.issueForm.valid).toBe(true);

    // Quantity cannot exceed remainingQty
    qtyControl.setValue(item.remainingQty + 50);
    expect(qtyControl.hasError('max')).toBe(true);
    expect(component.issueForm.invalid).toBe(true);

    // Quantity cannot be zero or negative
    qtyControl.setValue(0);
    expect(qtyControl.hasError('min')).toBe(true);

    // Valid partial quantity
    const partialQty = Math.floor(item.remainingQty / 2);
    qtyControl.setValue(partialQty);
    expect(component.issueForm.valid).toBe(true);
    expect(component.projectedRemaining()).toBe(item.remainingQty - partialQty);
  });

  it('should open confirm modal and execute outward stock issuance', () => {
    const notifySpy = vi.spyOn(notificationService, 'showSuccess');
    const outwardSpy = vi.spyOn(stockService, 'outward').mockReturnValue(
      of({
        tagId: 1,
        tagNo: 'STK-4900001',
        materialCode: 'M100',
        issuedQty: 30,
        remainingQty: 70,
        tagStatus: 'InStock',
        locationId: 1,
        locationCode: 'A-01-01',
        inwardAt: '2026-09-10T00:00:00Z',
      }),
    );

    const item = component.stockItems()[0];
    component.selectItem(item);
    component.issueForm.controls['qty'].setValue(30);

    component.openConfirmModal();
    expect(component.showConfirmModal()).toBe(true);

    component.executeDispatch();

    expect(outwardSpy).toHaveBeenCalledWith({ tagNo: item.tagNo, qty: 30, bypassFifo: false });
    expect(notifySpy).toHaveBeenCalledWith('Outward Dispatch Recorded', expect.stringContaining('30'));
    expect(component.showConfirmModal()).toBe(false);
    expect(component.selectedItem()).toBeNull();
  });

  it('should instantly trigger lookup on Enter/scan', () => {
    component.searchFilter.set('STK-4900002');
    component.onScanEnter();

    expect(component.selectedItem()).not.toBeNull();
    expect(component.selectedItem()?.tagNo).toBe('STK-4900002');
    expect(component.issueForm.controls['qty'].value).toBe(250);
  });

  it('should lookup via stockService if tag is not in initial local list', () => {
    const remoteTag = {
      tagId: 99,
      tagNo: 'STK-REMOTE-01',
      status: 'InStock',
      qty: 120,
      remainingQty: 120,
      materialCode: 'M500',
      partName: 'Special Valve',
      batchNo: 'B-VALVE-1',
      locationId: 5,
      locationCode: 'C-01-01',
      locationZone: 'Zone C',
      inwardAt: '2026-10-01T00:00:00Z',
    };
    vi.spyOn(stockService, 'getTagStockInfo').mockReturnValue(of(remoteTag));

    component.searchFilter.set('STK-REMOTE-01');
    component.onScanEnter();

    expect(component.selectedItem()).not.toBeNull();
    expect(component.selectedItem()?.tagNo).toBe('STK-REMOTE-01');
    expect(component.selectedItem()?.remainingQty).toBe(120);
  });

  it('should correctly include bypassFifo in outward submission payload when checkbox is checked', () => {
    const outwardSpy = vi.spyOn(stockService, 'outward').mockReturnValue(
      of({
        tagId: 2,
        tagNo: 'STK-4900002',
        materialCode: 'M100',
        issuedQty: 50,
        remainingQty: 200,
        tagStatus: 'InStock',
        locationId: 1,
        locationCode: 'A-01-02',
        inwardAt: '2026-10-09T00:00:00Z',
      }),
    );

    const item = component.stockItems()[1]; // Secondary lot
    component.selectItem(item);
    component.issueForm.controls['qty'].setValue(50);
    component.issueForm.controls['bypassFifo'].setValue(true);

    component.openConfirmModal();
    component.executeDispatch();

    expect(outwardSpy).toHaveBeenCalledWith({
      tagNo: item.tagNo,
      qty: 50,
      bypassFifo: true,
    });
  });

  it('should smoothly reset the form and clear filter for the next scan', () => {
    const item = component.stockItems()[0];
    component.selectItem(item);
    component.searchFilter.set(item.tagNo);

    expect(component.selectedItem()).not.toBeNull();

    component.clearSelection();

    expect(component.selectedItem()).toBeNull();
    expect(component.issueForm.controls['qty'].value).toBeNull();
    expect(component.issueForm.controls['bypassFifo'].value).toBe(false);
    expect(component.searchFilter()).toBe('');
  });
});

