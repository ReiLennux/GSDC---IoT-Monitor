import { inject } from "@angular/core";
import { ActivatedRouteSnapshot, Router } from "@angular/router";
import { AuthService } from "./auth";

export const authGuard = (route?: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.getToken()) {
    router.navigate(["login"]);
    return false;
  }

  const requiredRoles = route?.data?.['roles'] as string[] | undefined;
  if (requiredRoles && requiredRoles.length > 0) {
    const userRole = authService.getRole();
    if (!userRole || !requiredRoles.includes(userRole)) {
      router.navigate(["dashboard"]);
      return false;
    }
  }

  return true;
};
