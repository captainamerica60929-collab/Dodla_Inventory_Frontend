import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService, sanitizeReturnUrl } from '../auth/auth.service';

export const authGuard: CanActivateFn = (
  _route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    const returnUrl = sanitizeReturnUrl(state.url);
    const queryParams = returnUrl !== '/dashboard' ? { returnUrl } : {};
    return router.createUrlTree(['/login'], { queryParams });
  }

  // Force password change: if mustChangePassword, user can only access /change-password
  if (authService.mustChangePassword()) {
    if (state.url.startsWith('/change-password')) {
      return true;
    }
    const returnUrl = sanitizeReturnUrl(state.url);
    const queryParams = returnUrl !== '/dashboard' ? { returnUrl } : {};
    return router.createUrlTree(['/change-password'], { queryParams });
  }

  return true;
};
