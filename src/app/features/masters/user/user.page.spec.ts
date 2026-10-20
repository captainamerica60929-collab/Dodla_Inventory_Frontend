import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { UserPageComponent } from './user.page';
import { BranchService } from '../../../core/api/branch.service';
import { EmployeeService } from '../../../core/api/employee.service';
import { UserService } from '../../../core/api/user.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SessionService } from '../../../core/session/session.service';

describe('UserPageComponent', () => {
  let component: UserPageComponent;
  let fixture: ComponentFixture<UserPageComponent>;
  let userService: UserService;
  let employeeService: EmployeeService;
  let notificationService: NotificationService;

  const mockUsers = [
    {
      id: 1,
      username: 'ravi.k',
      employeeId: 10,
      employeeName: 'Ravi Kumar',
      employeeCode: 'EMP-01',
      role: 'Admin',
      mustChangePassword: false,
      isActive: true,
      failedLoginCount: 0,
      lockoutEnd: null,
      lastLoginAt: '2026-10-15T10:00:00Z',
      branchIds: [1],
      createdAt: '2026-10-01T00:00:00Z',
      createdBy: 1,
      modifiedAt: null,
      modifiedBy: null,
    },
  ];

  const mockActiveEmployees = [
    {
      id: 10,
      code: 'EMP-01',
      name: 'Ravi Kumar',
      department: 'Stores',
      designation: 'Manager',
      phone: '9876543210',
      isActive: true,
      createdAt: '2026-10-01T00:00:00Z',
      createdBy: 1,
      modifiedAt: null,
      modifiedBy: null,
    },
  ];

  const mockBranches = [
    {
      id: 1,
      code: 'BR-01',
      name: 'Main Warehouse',
      plantCode: '1000',
      isActive: true,
      createdAt: '2026-10-01T00:00:00Z',
      createdBy: 1,
      modifiedAt: null,
      modifiedBy: null,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserPageComponent],
      providers: [
        {
          provide: UserService,
          useValue: {
            getAll: vi.fn().mockReturnValue(of(mockUsers)),
            create: vi.fn(),
            update: vi.fn(),
            resetPassword: vi.fn(),
            unlock: vi.fn(),
          },
        },
        {
          provide: EmployeeService,
          useValue: {
            getAll: vi.fn().mockReturnValue(of(mockActiveEmployees)),
          },
        },
        {
          provide: BranchService,
          useValue: {
            getAll: vi.fn().mockReturnValue(of(mockBranches)),
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
            role: vi.fn().mockReturnValue('Admin'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserPageComponent);
    component = fixture.componentInstance;
    userService = TestBed.inject(UserService);
    employeeService = TestBed.inject(EmployeeService);
    notificationService = TestBed.inject(NotificationService);
    fixture.detectChanges();
  });

  it('should load active employees and branches on initialization', () => {
    expect(employeeService.getAll).toHaveBeenCalledWith(true);
    expect(component.activeEmployees().length).toBe(1);
    expect(component.branches().length).toBe(1);
  });

  describe('Password Policy Validation', () => {
    it('should invalidate passwords shorter than 10 characters', () => {
      component.createForm.controls.initialPassword.setValue('Short1!');
      expect(component.createForm.controls.initialPassword.valid).toBe(false);
      expect(component.createForm.controls.initialPassword.errors?.['minLength']).toBe(true);
    });

    it('should invalidate passwords lacking uppercase letter', () => {
      component.createForm.controls.initialPassword.setValue('lowercase12345');
      expect(component.createForm.controls.initialPassword.valid).toBe(false);
      expect(component.createForm.controls.initialPassword.errors?.['requireUppercase']).toBe(true);
    });

    it('should invalidate passwords lacking lowercase letter', () => {
      component.createForm.controls.initialPassword.setValue('UPPERCASE12345');
      expect(component.createForm.controls.initialPassword.valid).toBe(false);
      expect(component.createForm.controls.initialPassword.errors?.['requireLowercase']).toBe(true);
    });

    it('should invalidate passwords lacking a digit', () => {
      component.createForm.controls.initialPassword.setValue('NoDigitsHereAtAll');
      expect(component.createForm.controls.initialPassword.valid).toBe(false);
      expect(component.createForm.controls.initialPassword.errors?.['requireDigit']).toBe(true);
    });

    it('should validate passwords complying with all rules', () => {
      component.createForm.controls.initialPassword.setValue('ValidPass123');
      expect(component.createForm.controls.initialPassword.valid).toBe(true);
    });
  });

  describe('User Creation Form', () => {
    it('should require employeeId, username, and at least one branch', () => {
      component.openCreateModal();
      expect(component.createForm.valid).toBe(false);

      component.createForm.controls.employeeId.setValue(10);
      component.createForm.controls.username.setValue('new.user');
      component.createForm.controls.role.setValue('StoreKeeper');
      component.createForm.controls.initialPassword.setValue('StrongPass123');

      expect(component.createForm.valid).toBe(true);
      // Branch not yet selected
      expect(component.createSelectedBranches().length).toBe(0);

      component.toggleBranch(component.createSelectedBranches, 1);
      expect(component.createSelectedBranches().length).toBe(1);
    });

    it('should submit user creation, clear password immediately, and show success', () => {
      component.openCreateModal();
      component.createForm.controls.employeeId.setValue(10);
      component.createForm.controls.username.setValue('new.user');
      component.createForm.controls.role.setValue('StoreKeeper');
      component.createForm.controls.initialPassword.setValue('StrongPass123');
      component.toggleBranch(component.createSelectedBranches, 1);

      vi.spyOn(userService, 'create').mockReturnValue(of({
        ...mockUsers[0],
        id: 2,
        username: 'new.user',
      }));

      component.submitCreate();

      expect(userService.create).toHaveBeenCalledWith({
        employeeId: 10,
        username: 'new.user',
        role: 'StoreKeeper',
        branchIds: [1],
        initialPassword: 'StrongPass123',
      });

      // Password input must be reset immediately
      expect(component.createForm.controls.initialPassword.value).toBeNull();
      expect(notificationService.showSuccess).toHaveBeenCalledWith(
        'User Created',
        expect.stringContaining('new.user'),
      );
    });

    it('should surface backend rule errors like inactive employee or duplicate username', () => {
      component.openCreateModal();
      component.createForm.controls.employeeId.setValue(10);
      component.createForm.controls.username.setValue('existing.user');
      component.createForm.controls.role.setValue('StoreKeeper');
      component.createForm.controls.initialPassword.setValue('StrongPass123');
      component.toggleBranch(component.createSelectedBranches, 1);

      vi.spyOn(userService, 'create').mockReturnValue(
        throwError(() => ({
          error: { detail: 'Cannot create a user for an inactive employee.' },
        })),
      );

      component.submitCreate();

      expect(notificationService.showError).toHaveBeenCalledWith(
        'Create Failed',
        'Cannot create a user for an inactive employee.',
      );
    });
  });
});
