import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { LocationPageComponent } from './location.page';
import { LocationDto, LocationService } from '../../../core/api/location.service';
import { PagedResult } from '../../../core/api/material.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SessionService, UserRole } from '../../../core/session/session.service';

describe('LocationPageComponent', () => {
  let component: LocationPageComponent;
  let fixture: ComponentFixture<LocationPageComponent>;
  let locationService: LocationService;
  let notificationService: NotificationService;

  const mockLocations: LocationDto[] = [
    {
      id: 1,
      branchId: 1,
      code: 'A-01-01',
      zone: 'Zone A',
      capacity: 500,
      usedQty: 120,
      freeQty: 380,
      isActive: true,
      rowVersion: 'AAAAAAAAB9c=',
      createdAt: '2026-10-01T00:00:00Z',
      createdBy: 1,
      modifiedAt: null,
      modifiedBy: null,
    },
    {
      id: 2,
      branchId: 1,
      code: 'B-01-01',
      zone: 'Zone B',
      capacity: 200,
      usedQty: 0,
      freeQty: 200,
      isActive: false,
      rowVersion: 'AAAAAAAAB9d=',
      createdAt: '2026-10-02T00:00:00Z',
      createdBy: 1,
      modifiedAt: null,
      modifiedBy: null,
    },
  ];

  const mockPagedResult: PagedResult<LocationDto> = {
    items: mockLocations,
    totalCount: 2,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  };

  const mockRole = signal<UserRole>('Admin');

  beforeEach(async () => {
    mockRole.set('Admin');

    await TestBed.configureTestingModule({
      imports: [LocationPageComponent],
      providers: [
        {
          provide: LocationService,
          useValue: {
            getPaged: vi.fn().mockImplementation((params) =>
              of({
                ...mockPagedResult,
                page: params?.page ?? 1,
              }),
            ),
            getById: vi.fn().mockReturnValue(of(mockLocations[0])),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            showSuccess: vi.fn(),
            showError: vi.fn(),
            showWarning: vi.fn(),
          },
        },
        {
          provide: SessionService,
          useValue: {
            role: mockRole,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LocationPageComponent);
    component = fixture.componentInstance;
    locationService = TestBed.inject(LocationService);
    notificationService = TestBed.inject(NotificationService);
    fixture.detectChanges();
  });

  it('should load paged locations on initialization and bind bin-bar to usedQty and capacity', () => {
    expect(locationService.getPaged).toHaveBeenCalled();
    expect(component.locations().length).toBe(2);
    expect(component.locations()[0].usedQty).toBe(120);
    expect(component.locations()[0].capacity).toBe(500);
  });

  describe('Capacity Validation Rules', () => {
    it('should reject non-integer, decimal, negative, and exponent notation', () => {
      const capacityCtrl = component.addForm.controls.capacity;

      // Decimal rejected
      capacityCtrl.setValue('10.5');
      expect(capacityCtrl.valid).toBe(false);
      expect(capacityCtrl.errors?.['invalidInteger']).toBeTruthy();

      // Zero and negative rejected
      capacityCtrl.setValue('0');
      expect(capacityCtrl.valid).toBe(false);
      expect(capacityCtrl.errors?.['min']).toBeTruthy();

      capacityCtrl.setValue('-10');
      expect(capacityCtrl.valid).toBe(false);

      // Exponent rejected
      capacityCtrl.setValue('1e5');
      expect(capacityCtrl.valid).toBe(false);
      expect(capacityCtrl.errors?.['invalidInteger']).toBeTruthy();

      // Above max integer rejected
      capacityCtrl.setValue('2147483648');
      expect(capacityCtrl.valid).toBe(false);
      expect(capacityCtrl.errors?.['max']).toBeTruthy();

      // Valid whole number > 0 passes
      capacityCtrl.setValue('500');
      expect(capacityCtrl.valid).toBe(true);
    });

    it('should prevent exponent and decimal keys on keydown', () => {
      const preventSpy = vi.fn();
      const mockEvent = { key: 'e', preventDefault: preventSpy } as unknown as KeyboardEvent;
      component.onCapacityKeyDown(mockEvent);
      expect(preventSpy).toHaveBeenCalled();

      const mockEventDot = { key: '.', preventDefault: preventSpy } as unknown as KeyboardEvent;
      component.onCapacityKeyDown(mockEventDot);
      expect(preventSpy).toHaveBeenCalled();
    });
  });

  describe('409 Conflict Handling', () => {
    it('should show 409 conflict message and reload button when update conflict occurs', () => {
      const loc = mockLocations[0];
      component.openEditModal(loc);

      vi.spyOn(locationService, 'update').mockReturnValue(
        throwError(() => ({
          status: 409,
          error: { detail: 'A concurrency conflict occurred. The location was modified by another operation.' },
        })),
      );

      component.submitEdit();

      expect(component.isSubmitting()).toBe(false);
      expect(component.conflictBanner()).toBe(
        'This record was changed by someone else. Reload and try again',
      );
    });

    it('should reload fresh record by id on reloadConflictRecord and update rowVersion', () => {
      const loc = mockLocations[0];
      component.openEditModal(loc);
      component.conflictBanner.set('This record was changed by someone else. Reload and try again');

      const freshLoc: LocationDto = {
        ...loc,
        zone: 'Zone A-Updated',
        capacity: 650,
        rowVersion: 'AAAAAAAAB9x=',
      };
      vi.spyOn(locationService, 'getById').mockReturnValue(of(freshLoc));

      component.reloadConflictRecord(loc.id);

      expect(locationService.getById).toHaveBeenCalledWith(loc.id);
      expect(component.conflictBanner()).toBeNull();
      expect(component.editForm.controls.zone.value).toBe('Zone A-Updated');
      expect(component.editForm.controls.capacity.value).toBe('650');
      expect(notificationService.showSuccess).toHaveBeenCalledWith(
        'Record Reloaded',
        expect.stringContaining('latest server revision'),
      );
    });

    it('should keep user edits on reload if keepMyEdits is checked', () => {
      const loc = mockLocations[0];
      component.openEditModal(loc);
      component.editForm.controls.zone.setValue('My Custom Zone');
      component.conflictBanner.set('This record was changed by someone else. Reload and try again');
      component.keepMyEdits.set(true);

      const freshLoc: LocationDto = {
        ...loc,
        zone: 'Server Zone',
        rowVersion: 'AAAAAAAAB9x=',
      };
      vi.spyOn(locationService, 'getById').mockReturnValue(of(freshLoc));

      component.reloadConflictRecord(loc.id);

      // Kept user's entered edit
      expect(component.editForm.controls.zone.value).toBe('My Custom Zone');
    });
  });

  describe('422 Error Handling', () => {
    it('should map duplicate code error onto the code field', () => {
      component.openAddModal();
      component.addForm.setValue({
        code: 'A-01-01',
        zone: 'Zone A',
        capacity: '500',
      });

      vi.spyOn(locationService, 'create').mockReturnValue(
        throwError(() => ({
          status: 422,
          error: { detail: "Location with code 'A-01-01' already exists in this branch." },
        })),
      );

      component.submitAdd();

      expect(component.addForm.controls.code.errors?.['serverError']).toContain('already exists');
    });
  });

  describe('Role-Based Visibility', () => {
    it('should hide actions, add, and import buttons for non-Admins', () => {
      mockRole.set('StoreKeeper');
      fixture.detectChanges();

      expect(component.isAdmin()).toBe(false);
      expect(component.tableHeaders()).not.toContain('Actions');

      component.openAddModal();
      expect(component.showAddModal()).toBe(false);

      component.openImportModal();
      expect(component.showImportModal()).toBe(false);
    });

    it('should allow Admin to open import modal and reload list on import success', () => {
      mockRole.set('Admin');
      fixture.detectChanges();

      component.openImportModal();
      expect(component.showImportModal()).toBe(true);

      const getPagedSpy = vi.spyOn(locationService, 'getPaged');
      component.onImportSuccess();
      expect(getPagedSpy).toHaveBeenCalled();

      component.closeImportModal();
      expect(component.showImportModal()).toBe(false);
    });
  });
});
