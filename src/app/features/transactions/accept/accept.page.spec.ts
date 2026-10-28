import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AcceptPageComponent } from './accept.page';
import { StockService } from '../../../core/api/stock.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SessionService } from '../../../core/session/session.service';
import { TourService } from '../../../core/tour/tour.service';

describe('AcceptPageComponent', () => {
  let component: AcceptPageComponent;
  let fixture: ComponentFixture<AcceptPageComponent>;
  let stockService: StockService;
  let notificationService: NotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcceptPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        StockService,
        NotificationService,
        SessionService,
        TourService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AcceptPageComponent);
    component = fixture.componentInstance;
    stockService = TestBed.inject(StockService);
    notificationService = TestBed.inject(NotificationService);

    vi.spyOn(stockService, 'getMovements').mockReturnValue(of([]));

    fixture.detectChanges();
  });

  it('should create accept verification page component', () => {
    expect(component).toBeTruthy();
  });

  it('should load pending items awaiting inspection on init', () => {
    expect(component.pendingList().length).toBe(3);
    expect(component.pendingList()[0].tagNo).toBe('STK-4900001');
  });

  it('should select an item from pending queue for active inspection', () => {
    const item = component.pendingList()[0];
    component.selectPendingItem(item);

    expect(component.activeInspection()).toEqual(item);
    expect(component.tagInput()).toBe(item.tagNo);
  });

  it('should confirm acceptance of stock consignment', () => {
    const notifySpy = vi.spyOn(notificationService, 'showSuccess');
    const acceptSpy = vi.spyOn(stockService, 'accept').mockReturnValue(
      of({
        tagId: 104,
        tagNo: 'STK-4900001',
        materialCode: 'M100',
        previousStatus: 'Issued',
        newStatus: 'Accepted',
        remainingQty: 0,
        reason: null,
        processedAt: '2026-10-21T07:50:00Z',
      }),
    );

    const item = component.pendingList()[0];
    component.selectPendingItem(item);

    component.openAcceptModal();
    expect(component.showAcceptModal()).toBe(true);

    component.executeAccept();

    expect(acceptSpy).toHaveBeenCalledWith({ tagNo: 'STK-4900001' });
    expect(notifySpy).toHaveBeenCalledWith('Stock Accepted', expect.stringContaining('STK-4900001'));
    expect(component.showAcceptModal()).toBe(false);
    expect(component.activeInspection()).toBeNull();
    // Item removed from pending queue
    expect(component.pendingList().find((p) => p.tagNo === 'STK-4900001')).toBeUndefined();
  });

  it('should require a mandatory reason when rejecting stock', () => {
    const item = component.pendingList()[0];
    component.selectPendingItem(item);

    component.openRejectModal();
    expect(component.showRejectModal()).toBe(true);

    const reasonControl = component.rejectForm.controls['reason'];
    expect(reasonControl.valid).toBe(false); // Empty by default
    expect(component.rejectForm.invalid).toBe(true);

    // Over 250 characters should be invalid
    reasonControl.setValue('a'.repeat(251));
    expect(reasonControl.hasError('maxlength')).toBe(true);
    expect(component.rejectForm.invalid).toBe(true);

    // Valid non-empty reason
    reasonControl.setValue('Packaging torn and contaminated with grease during transit.');
    expect(component.rejectForm.valid).toBe(true);
  });

  it('should confirm rejection and log reason', () => {
    const notifySpy = vi.spyOn(notificationService, 'showWarning');
    const rejectSpy = vi.spyOn(stockService, 'reject').mockReturnValue(
      of({
        tagId: 104,
        tagNo: 'STK-4900001',
        materialCode: 'M100',
        previousStatus: 'Issued',
        newStatus: 'Rejected',
        remainingQty: 0,
        reason: 'Broken seals',
        processedAt: '2026-10-21T07:51:00Z',
      }),
    );

    const item = component.pendingList()[0];
    component.selectPendingItem(item);
    component.openRejectModal();

    component.rejectForm.controls['reason'].setValue('Broken seals');
    component.executeReject();

    expect(rejectSpy).toHaveBeenCalledWith({ tagNo: 'STK-4900001', reason: 'Broken seals' });
    expect(notifySpy).toHaveBeenCalledWith('Stock Rejected', expect.stringContaining('Broken seals'));
    expect(component.showRejectModal()).toBe(false);
    expect(component.activeInspection()).toBeNull();
    // Item removed from pending queue
    expect(component.pendingList().find((p) => p.tagNo === 'STK-4900001')).toBeUndefined();
  });

  it('should search tag via onSearchTag and load issued details from remote service', () => {
    const remoteTag = {
      tagId: 109,
      tagNo: 'STK-9900009',
      status: 'Issued',
      qty: 60,
      remainingQty: 60,
      materialCode: 'M900',
      partName: 'Hydraulic Seal',
      batchNo: 'B-SEAL-09',
      locationId: 3,
      locationCode: 'B-02-01',
      locationZone: 'Zone B',
      inwardAt: '2026-10-15T00:00:00Z',
    };
    vi.spyOn(stockService, 'getTagStockInfo').mockReturnValue(of(remoteTag));

    component.tagInput.set('STK-9900009');
    component.onSearchTag();

    expect(component.activeInspection()).not.toBeNull();
    expect(component.activeInspection()?.tagNo).toBe('STK-9900009');
    expect(component.activeInspection()?.materialCode).toBe('M900');
    expect(component.activeInspection()?.qty).toBe(60);
  });

  it('should prevent calling stockService.reject when reason is empty or whitespace only', () => {
    const rejectSpy = vi.spyOn(stockService, 'reject');
    const item = component.pendingList()[0];
    component.selectPendingItem(item);
    component.openRejectModal();

    // Whitespace only
    component.rejectForm.controls['reason'].setValue('   ');
    component.executeReject();

    expect(rejectSpy).not.toHaveBeenCalled();
    expect(component.showRejectModal()).toBe(true);
    expect(component.activeInspection()).not.toBeNull();
  });
});
