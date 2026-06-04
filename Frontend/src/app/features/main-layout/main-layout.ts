import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { MenubarModule } from 'primeng/menubar';
import { MenuItem } from 'primeng/api';
import { AuthService } from '../../core/auth';
import { IoTService } from '../../core/iot.service';
import { ThemeService } from '../../core/theme.service';
import { DashboardStore } from '../../state/dashboard.store';
import { CommonModule } from '@angular/common';
import { BadgeModule } from 'primeng/badge';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    ButtonModule,
    AvatarModule,
    MenuModule,
    MenubarModule,
    BadgeModule,
  ],
  templateUrl: './main-layout.html',
  styles: [`
    .layout-wrapper {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background-color: var(--surface-ground);

        .layout-header {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            z-index: 1000;
            background-color: var(--surface-0);

            ::ng-deep .p-menubar {
                display: flex;
                align-items: center;
                justify-content: space-between;

                .p-menubar-root-list {
                    flex: 1;
                    justify-content: center;
                }
            }
        }

        .layout-main {
            flex: 1;
            margin-top: 5rem;
            padding: 2rem;

            .content-container {
                max-width: 1440px;
                margin: 0 auto;
            }
        }
    }
  `]
})
export class MainLayout implements OnInit {
  private authService = inject(AuthService);
  private iotService = inject(IoTService);
  private router = inject(Router);
  themeService = inject(ThemeService);
  readonly store = inject(DashboardStore);

  menuItems: MenuItem[] = [
    { label: 'Dashboard', icon: 'pi pi-home', routerLink: '/dashboard' },
    { label: 'Devices', icon: 'pi pi-database', routerLink: '/devices' },
    { label: 'Analytics', icon: 'pi pi-chart-line', routerLink: '/analytics' }
  ];

  userMenuItems: MenuItem[] = [
    { label: 'Profile', icon: 'pi pi-user' },
    { label: 'Settings', icon: 'pi pi-cog' },
    { separator: true },
    { label: 'Logout', icon: 'pi pi-sign-out', command: () => this.onLogout() }
  ];

  ngOnInit() {
    this.iotService.initializeData();
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  onLogout() {
    this.authService.logout();
    this.iotService.disconnect();
    this.router.navigate(['/login']);
  }
}
