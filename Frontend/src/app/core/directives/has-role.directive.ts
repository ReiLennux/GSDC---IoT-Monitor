import { Directive, Input, TemplateRef, ViewContainerRef, inject, OnInit, effect } from '@angular/core';
import { AuthService } from '../auth';

@Directive({
  selector: '[hasRole]',
  standalone: true
})
export class HasRoleDirective implements OnInit {
  private templateRef = inject(TemplateRef<unknown>);
  private viewContainer = inject(ViewContainerRef);
  private authService = inject(AuthService);

  @Input('hasRole') allowedRoles: string[] = [];

  private hasView = false;

  constructor() {
    effect(() => {
      this.authService.getRole();
      this.updateView();
    });
  }

  ngOnInit() {
    this.updateView();
  }

  private updateView() {
    const userRole = this.authService.getRole();
    const allowed = !!userRole && this.allowedRoles.includes(userRole);
    if (allowed && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!allowed && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
