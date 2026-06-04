import { inject } from "@angular/core";
import {Router} from "@angular/router";
import { AuthService } from "./auth";

export const authGuard = () => {

  const authService = inject(AuthService)
  const router = inject(Router)

  if (authService.getToken()) return true

  router.navigate(["login"])
  return false

};
