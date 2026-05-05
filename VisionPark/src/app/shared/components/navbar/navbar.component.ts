import { Component, OnInit, OnDestroy, inject, Output, EventEmitter } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonButtons, IonButton, IonIcon,
  IonAvatar, IonLabel, IonBadge, IonSearchbar, IonMenuButton,
  IonPopover, IonContent, IonList, IonItem
} from '@ionic/angular/standalone';
import { NavController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  searchOutline, notificationsOutline, personCircleOutline, 
  logOutOutline, menuOutline, chevronDownOutline, personOutline, helpCircleOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  standalone: true,
  imports: [
    CommonModule, IonSearchbar, IonBadge, IonLabel, IonMenuButton,
    IonAvatar, IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, FormsModule,
    IonPopover, IonContent, IonList, IonItem
  ],
})
export class NavbarComponent implements OnInit, OnDestroy {
  fullName: string = 'User';
  role: string = 'Security';
  pageTitle: string = 'Tổng quan hệ thống';
  
  // BIẾN CHO ĐỒNG HỒ
  isDashboard: boolean = false;
  currentDate: string = '';
  private clockInterval: any;
  
  isProfileMenuOpen: boolean = false; // Biến kiểm soát popup mượt mà

  searchTerm: string = '';
  @Output() searchChange = new EventEmitter<string>();

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
    addIcons({ logOutOutline, searchOutline, notificationsOutline, personCircleOutline, menuOutline, chevronDownOutline, personOutline, helpCircleOutline });
  }

  ngOnInit() {
    this.updateUserInfo();
    this.updateTitle(this.router.url);
    this.startClock(); // Khởi động đồng hồ

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updateUserInfo();
      this.updateTitle(event.urlAfterRedirects);
    });
  }

  ngOnDestroy() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval); // Xóa bộ đếm khi hủy component
    }
  }

  updateUserInfo() {
    this.fullName = localStorage.getItem('fullName') || 'Admin Vision';
    this.role = localStorage.getItem('userRole') || 'Quản trị viên';
  }

  updateTitle(url: string) {
    const cleanUrl = url.split('?')[0]; 
    this.isDashboard = cleanUrl === '/dashboard'; // Nhận diện trang Dashboard
    this.pageTitle = this.pageTitles[cleanUrl] || 'VisionPark';
  }

  // LOGIC ĐỒNG HỒ CHẠY TỪNG GIÂY
  startClock() {
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    this.updateClock(days);
    this.clockInterval = setInterval(() => {
      this.updateClock(days);
    }, 1000);
  }

  updateClock(days: string[]) {
    const now = new Date();
    this.currentDate = `${days[now.getDay()]}, ${now.getDate().toString().padStart(2, '0')} Tháng ${(now.getMonth() + 1).toString().padStart(2, '0')}, ${now.getFullYear()} • ${now.toLocaleTimeString('vi-VN', { hour12: false })}`;
  }

  onSearch() {
    this.searchChange.emit(this.searchTerm);
  }

  manageAccount() {
    console.log('Mở trang Quản lý tài khoản');
  }

  logout() {
    localStorage.clear();
    this.navCtrl.navigateRoot('/login');
  }
}