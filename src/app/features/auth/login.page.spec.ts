import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { LoginPageComponent } from './login.page';
import { AuthService } from '../../core/auth/auth.service';
import { BranchLookupDto, LoginResponse } from '../../core/auth/auth.models';

describe('LoginPageComponent', () => {
  let component: LoginPageComponent;
  let fixture: ComponentFixture<LoginPageComponent>;
  let authService: AuthService;
  let router: Router;

  const mockBranches: BranchLookupDto[] = [
    { id: 1, code: 'BR-01', name: 'Main Warehouse' },
    { id: 2, code: 'BR-02', name: 'North Hub' },
  ];

  const mockLoginSuccess: LoginResponse = {
    token: 'jwt-123',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    user: { id: 1, username: 'ravi.k', name: 'Ravi Kumar', role: 'Admin' },
    branch: { id: 1, code: 'BR-01', name: 'Main Warehouse' },
    mustChangePassword: false,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        {
          provide: AuthService,
          useValue: {
            getActiveBranches: vi.fn().mockReturnValue(of(mockBranches)),
            login: vi.fn().mockReturnValue(of(mockLoginSuccess)),
          },
        },
        {
          provide: Router,
          useValue: {
            navigate: vi.fn(),
            navigateByUrl: vi.fn(),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: vi.fn().mockReturnValue('/transactions/grn'),
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPageComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should load branches on initialization', () => {
    expect(authService.getActiveBranches).toHaveBeenCalled();
    expect(component.branches().length).toBe(2);
  });

  it('should keep form invalid when fields are missing', () => {
    component.form.setValue({
      branchId: null,
      username: '',
      password: '',
    });
    expect(component.form.valid).toBe(false);
  });

  it('should submit form, clear password input immediately, and navigate to returnUrl on success', () => {
    component.form.setValue({
      branchId: 1,
      username: 'ravi.k',
      password: 'mypassword',
    });

    component.submit();

    expect(authService.login).toHaveBeenCalledWith({
      branchId: 1,
      username: 'ravi.k',
      password: 'mypassword',
    });
    // Password must be cleared immediately after submit for security
    expect(component.form.controls.password.value).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/transactions/grn');
  });

  it('should navigate to /change-password if response indicates mustChangePassword is true', () => {
    vi.spyOn(authService, 'login').mockReturnValue(
      of({ ...mockLoginSuccess, mustChangePassword: true }),
    );

    component.form.setValue({
      branchId: 1,
      username: 'ravi.k',
      password: 'mypassword',
    });

    component.submit();

    expect(router.navigate).toHaveBeenCalledWith(['/change-password'], {
      queryParams: { returnUrl: '/transactions/grn' },
    });
  });

  it('should surface API error message and clear password on failure', () => {
    vi.spyOn(authService, 'login').mockReturnValue(
      throwError(() => ({
        error: { detail: 'Invalid credentials.' },
      })),
    );

    component.form.setValue({
      branchId: 1,
      username: 'ravi.k',
      password: 'wrongpassword',
    });

    component.submit();

    expect(component.isSubmitting()).toBe(false);
    expect(component.errorMessage()).toBe('Invalid credentials.');
    expect(component.form.controls.password.value).toBeNull();
  });
});
