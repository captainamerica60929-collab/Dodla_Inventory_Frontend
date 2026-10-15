import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GrnPageComponent } from './grn.page';
import { ApiCredentialService } from '../../../core/api/api-credential.service';
import { GrnResponseService } from '../../../core/api/grn-response.service';
import { NotificationService } from '../../../core/services/notification.service';

describe('GrnPageComponent', () => {
  let component: GrnPageComponent;
  let fixture: ComponentFixture<GrnPageComponent>;
  let grnService: GrnResponseService;
  let credService: ApiCredentialService;
  let notificationService: NotificationService;

  const validBatchGuid = 'cabbf046-c7a0-4ead-ad5b-f554ff72c85f';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GrnPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        GrnResponseService,
        ApiCredentialService,
        NotificationService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GrnPageComponent);
    component = fixture.componentInstance;
    grnService = TestBed.inject(GrnResponseService);
    credService = TestBed.inject(ApiCredentialService);
    notificationService = TestBed.inject(NotificationService);

    // Mock initial list queries to prevent uncaught network calls
    vi.spyOn(credService, 'getAll').mockReturnValue(of([]));
    vi.spyOn(grnService, 'getPaged').mockReturnValue(
      of({ items: [], total: 0, page: 1, pageSize: 50 }),
    );

    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  describe('Batch Filter Sanitization & GUID Validation', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should trim whitespace, strip leading "Batch:", validate GUID and call API after 300ms debounce', () => {
      const getPagedSpy = vi.spyOn(grnService, 'getPaged').mockReturnValue(
        of({ items: [], total: 0, page: 1, pageSize: 50 }),
      );

      // Pasted input with leading "Batch: " and spaces
      component.onBatchInput(`  Batch: ${validBatchGuid}  `);

      expect(component.filterBatchInput()).toBe(validBatchGuid);
      expect(component.batchValidationError()).toBeNull();

      // Before debounce 300ms, API is NOT called yet with the new batch
      vi.advanceTimersByTime(200);
      expect(component.filterBatchId()).toBe('');

      // After 300ms
      vi.advanceTimersByTime(100);
      expect(component.filterBatchId()).toBe(validBatchGuid);
      expect(getPagedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          fetchBatchId: validBatchGuid,
        }),
      );
    });

    it('should show inline error and NOT call API when invalid GUID is entered', () => {
      const getPagedSpy = vi.spyOn(grnService, 'getPaged');
      getPagedSpy.mockClear();

      component.onBatchInput('not-a-valid-guid-123');

      expect(component.batchValidationError()).toBe('Invalid GUID format.');

      // Wait out debounce
      vi.advanceTimersByTime(350);

      // Should not call API with invalid GUID
      expect(getPagedSpy).not.toHaveBeenCalled();
      expect(component.filterBatchId()).toBe('');
    });

    it('should allow clearing the filter when input is empty', () => {
      const getPagedSpy = vi.spyOn(grnService, 'getPaged').mockReturnValue(
        of({ items: [], total: 0, page: 1, pageSize: 50 }),
      );

      component.onBatchInput('');

      expect(component.filterBatchInput()).toBe('');
      expect(component.batchValidationError()).toBeNull();

      vi.advanceTimersByTime(300);
      expect(component.filterBatchId()).toBe('');
      expect(getPagedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          fetchBatchId: null,
        }),
      );
    });
  });

  describe('Summary Card & Shortcuts', () => {
    it('should copy bare GUID without "Batch:" label to clipboard', () => {
      const writeTextSpy = vi.fn();
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextSpy,
        },
      });

      component.copyBatchId(`Batch: ${validBatchGuid}`);

      expect(writeTextSpy).toHaveBeenCalledWith(validBatchGuid);
    });

    it('should filter by batch when "Filter by this batch" is clicked', () => {
      const getPagedSpy = vi.spyOn(grnService, 'getPaged').mockReturnValue(
        of({ items: [], total: 0, page: 1, pageSize: 50 }),
      );

      component.filterByBatch(`Batch: ${validBatchGuid}`);

      expect(component.filterBatchInput()).toBe(validBatchGuid);
      expect(component.filterBatchId()).toBe(validBatchGuid);
      expect(component.currentPage()).toBe(1);
      expect(getPagedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          fetchBatchId: validBatchGuid,
        }),
      );
    });

    it('should apply "Show errors only" filter shortcut', () => {
      const getPagedSpy = vi.spyOn(grnService, 'getPaged').mockReturnValue(
        of({ items: [], total: 0, page: 1, pageSize: 50 }),
      );

      component.showErrorsOnly(validBatchGuid);

      expect(component.filterStatus()).toBe('Error');
      expect(component.filterBatchId()).toBe(validBatchGuid);
      expect(component.currentPage()).toBe(1);
      expect(getPagedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'Error',
          fetchBatchId: validBatchGuid,
        }),
      );
    });
  });
});
