import { Component, OnInit, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonButtons, IonButton, IonIcon,
  IonAvatar, IonLabel, IonBadge, IonSearchbar, IonMenuButton,
  IonPopover, IonContent, IonList, IonItem // <-- Bổ sung các thẻ này cho Dropdown Menu
} from '@ionic/angular/standalone';
import { NavController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  searchOutline, notificationsOutline, personCircleOutline, 
  logOutOutline, menuOutline, chevronDownOutline, personOutline 
} from 'ionicons/icons';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  standalone: true,
  imports: [
    CommonModule, IonSearchbar, IonBadge, IonLabel, IonMenuButton,
    IonAvatar, IonHeader, IonToolbar, IonButtons, IonButton, IonIcon,
    IonPopover, IonContent, IonList, IonItem // <-- Import vào đây
  ],
})
export class NavbarComponent implements OnInit {
  fullName: string = 'User';
  role: string = 'Security';
  pageTitle: string = 'Tổng quan';

  private router = inject(Router);
  private navCtrl = inject(NavController);

  pageTitles: { [key: string]: string } = {
    '/dashboard': 'Tổng quan hệ thống',
    '/ticket-parking': 'Quản lý Thẻ & Xe',
    '/history': 'Lịch sử ra vào',
    '/users': 'Quản lý Nhân viên',
    '/settings': 'Cài đặt hệ thống'
  };

  constructor() {
    addIcons({ logOutOutline, searchOutline, notificationsOutline, personCircleOutline, menuOutline, chevronDownOutline, personOutline });
  }

  ngOnInit() {
    this.updateUserInfo();
    this.updateTitle(this.router.url);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updateUserInfo();
      this.updateTitle(event.urlAfterRedirects);
    });
  }

  updateUserInfo() {
    this.fullName = localStorage.getItem('fullName') || 'User';
    this.role = localStorage.getItem('userRole') || 'Security';
  }

  updateTitle(url: string) {
    const cleanUrl = url.split('?')[0]; 
    this.pageTitle = this.pageTitles[cleanUrl] || 'VisionPark';
  }

  // Nút Quản lý tài khoản
  manageAccount() {
    console.log('Mở trang Quản lý tài khoản');
    // Mở comment dòng dưới khi bạn có trang Account
    // this.navCtrl.navigateForward('/account'); 
  }

  logout() {
    localStorage.clear();
    this.navCtrl.navigateRoot('/login');
  }
}