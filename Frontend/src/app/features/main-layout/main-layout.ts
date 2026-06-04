import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { MenubarModule } from 'primeng/menubar';
import { MenuItem } from 'primeng/api';
import { AuthService } from '../../core/auth';
import { IoTService } from '../../core/iot.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    ButtonModule,
    AvatarModule,
    MenuModule,
    MenubarModule
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss'
})
export class MainLayout implements OnInit {
  private authService = inject(AuthService);
  private iotService = inject(IoTService);
  private router = inject(Router);

  menuItems: MenuItem[] = [
    { label: 'Dashboard', icon: 'pi pi-home', routerLink: '/dashboard' },
    { label: 'Devices', icon: 'pi pi-database', routerLink: '/devices' },
    { label: 'Alerts', icon: 'pi pi-bell', routerLink: '/alerts' },
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

  onLogout() {
    this.authService.logout();
    this.iotService.disconnect();
    this.router.navigate(['/login']);
  }
}
