import { Component, OnInit, OnDestroy, inject, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonButtons, IonButton, IonIcon,
  IonAvatar, IonLabel, IonBadge, IonSearchbar, IonMenuButton,
  IonPopover, IonContent, IonList, IonItem
} from '@ionic/angular/standalone';
import { NavController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  searchOutline, notificationsOutline, personCircleOutline, 
  logOutOutline, menuOutline, chevronDownOutline, personOutline, helpCircleOutline
} from 'ionicons/icons';
import { Api } from '../../../services/api';

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
  avatarUrl: string = 'https://ionicframework.com/docs/img/demos/avatar.svg';
  
  // BIẾN CHO ĐỒNG HỒ
  isDashboard: boolean = false;
  currentDate: string = '';
  private clockInterval: any;
  
  isProfileMenuOpen: boolean = false; // Biến kiểm soát popup mượt mà

  searchTerm: string = '';
  @Output() searchChange = new EventEmitter<string>();

  private router = inject(Router);
  private navCtrl = inject(NavController);
  private api = inject(Api);
  private cdr = inject(ChangeDetectorRef); // Thêm Change Detector

  pageTitles: { [key: string]: string } = {
    '/dashboard': 'Tổng quan hệ thống',
    '/ticket-parking': 'Quản lý Thẻ & Xe',
    '/history': 'Lịch sử ra vào',
    '/users': 'Quản lý Nhân viên',
    '/card-registration': 'Quản lý Thẻ NFC',
    '/settings': 'Cài đặt hệ thống'
  };

  constructor() {
    addIcons({ logOutOutline, searchOutline, notificationsOutline, personCircleOutline, menuOutline, chevronDownOutline, personOutline, helpCircleOutline });
  }

  ngOnInit() {
    this.updateUserInfo();
    this.updateTitle(this.router.url);
    this.startClock(); // Khởi động đồng hồ

    // Lắng nghe sự kiện nếu người dùng vừa đăng ký khuôn mặt thành công thì thay đổi ảnh ngay lập tức
    this.api.avatarUpdated.subscribe(newUrl => {
      this.avatarUrl = this.api.getFullImageUrl(newUrl);
      this.cdr.detectChanges();
    });

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
    // 1. Tạm thời lấy dữ liệu cũ để giao diện khỏi bị trống
    this.fullName = localStorage.getItem('fullName') || 'Admin Vision';
    this.role = localStorage.getItem('userRole') || 'Quản trị viên';
    
    // Lấy ảnh từ local để load cực nhanh lúc mở trang
    const localImg = localStorage.getItem('faceImageUrl');
    if (localImg && localImg.trim() !== '' && localImg !== 'null' && localImg !== 'undefined') {
      this.avatarUrl = this.api.getFullImageUrl(localImg);
    } else {
      this.avatarUrl = 'https://ionicframework.com/docs/img/demos/avatar.svg';
    }
    
    // 2. Gọi thẳng API xuống Database y hệt trang Admin
    this.api.getCurrentUser().subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        // Đảm bảo bắt mọi định dạng FaceImageUrl từ Backend trả về
        const faceImg = data?.faceImageUrl || data?.FaceImageUrl;
        
        if (faceImg && faceImg.trim() !== '' && faceImg !== 'null' && faceImg !== 'undefined') {
          this.avatarUrl = this.api.getFullImageUrl(faceImg);
          localStorage.setItem('faceImageUrl', faceImg); // Sao lưu lại cho lần sau
        } else {
          this.avatarUrl = 'https://ionicframework.com/docs/img/demos/avatar.svg';
          localStorage.removeItem('faceImageUrl');
        }
        
        // 👉 Ép giao diện Angular cập nhật ảnh lập tức sau khi API trả về
        this.cdr.detectChanges();
      },
      error: (err) => {
        // Nếu mất kết nối mạng, fallback dùng ảnh dự phòng
        const fallbackImg = localStorage.getItem('faceImageUrl');
        if (fallbackImg && fallbackImg.trim() !== '' && fallbackImg !== 'null' && fallbackImg !== 'undefined') {
          this.avatarUrl = this.api.getFullImageUrl(fallbackImg);
        }
        
        this.cdr.detectChanges();
      }
    });
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

  // Xử lý an toàn khi ảnh load bị lỗi (mất mạng, xoá file...)
  onAvatarError(event: any) {
    event.target.src = 'https://ionicframework.com/docs/img/demos/avatar.svg';
  }
}