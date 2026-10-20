import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { EmployeePageComponent } from './employee.page';
import { EmployeeService } from '../../../core/api/employee.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SessionService } from '../../../core/session/session.service';

describe('EmployeePageComponent', () => {
  let component: EmployeePageComponent;
  let fixture: ComponentFixture<EmployeePageComponent>;
  let employeeService: EmployeeService;
  let notificationService: NotificationService;

  const mockEmployees = [
    {
      id: 1,
      code: 'EMP-01',
      name: 'Ravi Kumar',
      department: 'Stores',
      designation: 'Store Keeper',
      phone: '9876543210',
      isActive: true,
      createdAt: '2026-10-01T00:00:00Z',
      createdBy: 1,
      modifiedAt: null,
      modifiedBy: null,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeePageComponent],
      providers: [
        {
          provide: EmployeeService,
          useValue: {
            getAll: vi.fn().mockReturnValue(of(mockEmployees)),
            create: vi.fn(),
            update: vi.fn(),
            deactivate: vi.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            showSuccess: vi.fn(),
            showError: vi.fn(),
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

    fixture = TestBed.createComponent(EmployeePageComponent);
    component = fixture.componentInstance;
    employeeService = TestBed.inject(EmployeeService);
    notificationService = TestBed.inject(NotificationService);
    fixture.detectChanges();
  });

  it('should load employees on initialization', () => {
    expect(employeeService.getAll).toHaveBeenCalled();
    expect(component.employees().length).toBe(1);
  });

  it('should open add modal and validate required fields', () => {
    component.openAddModal();
    expect(component.showAddModal()).toBe(true);
    expect(component.addForm.valid).toBe(false);

    component.addForm.controls.code.setValue('EMP-02');
    component.addForm.controls.name.setValue('Meena Selvam');
    expect(component.addForm.valid).toBe(true);
  });

  it('should submit new employee and show success toast', () => {
    component.openAddModal();
    component.addForm.controls.code.setValue('EMP-02');
    component.addForm.controls.name.setValue('Meena Selvam');

    vi.spyOn(employeeService, 'create').mockReturnValue(
      of({
        ...mockEmployees[0],
        id: 2,
        code: 'EMP-02',
        name: 'Meena Selvam',
      }),
    );

    component.submitAdd();

    expect(employeeService.create).toHaveBeenCalledWith({
      code: 'EMP-02',
      name: 'Meena Selvam',
      department: null,
      designation: null,
      phone: null,
    });
    expect(notificationService.showSuccess).toHaveBeenCalledWith(
      'Employee Created',
      expect.stringContaining('EMP-02'),
    );
  });

  it('should open deactivate confirm dialog and call deactivate API upon confirmation', () => {
    const emp = mockEmployees[0];
    component.confirmDeactivate(emp);

    expect(component.showDeactivateModal()).toBe(true);
    expect(component.selectedEmployee()).toEqual(emp);

    vi.spyOn(employeeService, 'deactivate').mockReturnValue(of(undefined));

    component.submitDeactivate();

    expect(employeeService.deactivate).toHaveBeenCalledWith(1);
    expect(notificationService.showSuccess).toHaveBeenCalledWith(
      'Employee Deactivated',
      expect.stringContaining('deactivated along with any associated user accounts'),
    );
  });
});
