import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { UserRole } from '../session/session.service';

export const roleGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  _state: RouterStateSnapshot,
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = route.data?.['allowedRoles'] as UserRole[] | undefined;

  // If no role restrictions are defined, allow access
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  const userRole = authService.currentRole();
  if (userRole && allowedRoles.includes(userRole)) {
    return true;
  }

  // Unauthorized direct URL -> "No access" page
  return router.createUrlTree(['/no-access']);
};
