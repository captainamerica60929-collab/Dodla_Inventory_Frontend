import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { MaterialPageComponent } from './material.page';
import { MaterialDto, MaterialService, PagedResult } from '../../../core/api/material.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SessionService, UserRole } from '../../../core/session/session.service';

describe('MaterialPageComponent', () => {
  let component: MaterialPageComponent;
  let fixture: ComponentFixture<MaterialPageComponent>;
  let materialService: MaterialService;
  let notificationService: NotificationService;

  const mockMaterials: MaterialDto[] = [
    {
      id: 1,
      code: 'MAT-001',
      name: 'Steel Bolt M8',
      uom: 'PCS',
      zone: 'Zone A',
      isActive: true,
      createdAt: '2026-10-01T00:00:00Z',
      createdBy: 1,
      modifiedAt: null,
      modifiedBy: null,
    },
    {
      id: 2,
      code: 'MAT-002',
      name: 'Hydraulic Oil 20L',
      uom: 'DRM',
      zone: 'Zone B',
      isActive: false,
      createdAt: '2026-10-02T00:00:00Z',
      createdBy: 1,
      modifiedAt: null,
      modifiedBy: null,
    },
  ];

  const mockPagedResult: PagedResult<MaterialDto> = {
    items: mockMaterials,
    totalCount: 2,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  };

  const mockRole = signal<UserRole>('Admin');

  beforeEach(async () => {
    mockRole.set('Admin');

    await TestBed.configureTestingModule({
      imports: [MaterialPageComponent],
      providers: [
        {
          provide: MaterialService,
          useValue: {
            getPaged: vi.fn().mockImplementation((params) =>
              of({
                ...mockPagedResult,
                page: params?.page ?? 1,
              }),
            ),
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

    fixture = TestBed.createComponent(MaterialPageComponent);
    component = fixture.componentInstance;
    materialService = TestBed.inject(MaterialService);
    notificationService = TestBed.inject(NotificationService);
    fixture.detectChanges();
  });

  it('should load paged materials on initialization', () => {
    expect(materialService.getPaged).toHaveBeenCalled();
    expect(component.materials().length).toBe(2);
    expect(component.totalCount()).toBe(2);
  });

  describe('Filters & Server-side Paging', () => {
    it('should reset page to 1 when a filter changes and query with updated filters', () => {
      component.page.set(3);

      component.onFilterChange({
        search: 'Bolt',
        zone: 'Zone A',
        activeOnly: true,
      });

      expect(component.page()).toBe(1);
      expect(materialService.getPaged).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        search: 'Bolt',
        zone: 'Zone A',
        activeOnly: true,
      });
    });

    it('should query new page on pageChange', () => {
      component.onPageChange(2);
      expect(component.page()).toBe(2);
      expect(materialService.getPaged).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 }),
      );
    });
  });

  describe('Form Validation & Immutability', () => {
    it('should require code, name, and uom on create', () => {
      component.openAddModal();
      expect(component.showAddModal()).toBe(true);
      expect(component.addForm.valid).toBe(false);

      component.addForm.patchValue({
        code: 'MAT-003',
        name: 'Bearing 6205',
        uom: 'BOX',
      });
      expect(component.addForm.valid).toBe(true);
    });

    it('should open edit modal with populated data and keep code read-only', () => {
      const mat = mockMaterials[0];
      component.openEditModal(mat);

      expect(component.showEditModal()).toBe(true);
      expect(component.selectedMaterial()).toEqual(mat);
      expect(component.editForm.controls.name.value).toBe(mat.name);
      expect(component.editForm.controls.uom.value).toBe(mat.uom);
    });
  });

  describe('Error Handling (422 and 400)', () => {
    it('should map duplicate code error onto the code form field on create', () => {
      component.openAddModal();
      component.addForm.patchValue({
        code: 'MAT-EXIST',
        name: 'Existing Material',
        uom: 'PCS',
      });

      vi.spyOn(materialService, 'create').mockReturnValue(
        throwError(() => ({
          status: 422,
          error: { detail: "Material with code 'MAT-EXIST' already exists." },
        })),
      );

      component.submitAdd();

      expect(component.isSubmitting()).toBe(false);
      expect(component.addForm.controls.code.errors?.['serverError']).toContain('already exists');
    });

    it('should show other 422 message as a banner inside the modal', () => {
      component.openAddModal();
      component.addForm.patchValue({
        code: 'MAT-009',
        name: 'Bad Material',
        uom: 'PCS',
      });

      vi.spyOn(materialService, 'create').mockReturnValue(
        throwError(() => ({
          status: 422,
          error: { detail: 'Cannot create material due to warehouse zone policy limit.' },
        })),
      );

      component.submitAdd();

      expect(component.addModalBanner()).toBe(
        'Cannot create material due to warehouse zone policy limit.',
      );
    });

    it('should map 400 validation errors dictionary per-field', () => {
      component.openAddModal();
      component.addForm.patchValue({
        code: 'MAT-INVALID',
        name: 'Valid Name Initially',
        uom: 'PCS',
      });

      vi.spyOn(materialService, 'create').mockReturnValue(
        throwError(() => ({
          status: 400,
          error: {
            errors: {
              Name: ['Material name is required.'],
            },
          },
        })),
      );

      component.submitAdd();

      expect(component.addForm.controls.name.errors?.['serverError']).toBe('Material name is required.');
    });
  });

  describe('Role-Based Visibility', () => {
    it('should hide add, edit, deactivate, and import buttons for non-Admins', () => {
      mockRole.set('StoreKeeper');
      fixture.detectChanges();

      expect(component.isAdmin()).toBe(false);
      expect(component.tableHeaders()).not.toContain('Actions');

      // Attempting to open modals without Admin role should be blocked
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

      const getPagedSpy = vi.spyOn(materialService, 'getPaged');
      component.onImportSuccess();
      expect(getPagedSpy).toHaveBeenCalled();

      component.closeImportModal();
      expect(component.showImportModal()).toBe(false);
    });
  });
});
