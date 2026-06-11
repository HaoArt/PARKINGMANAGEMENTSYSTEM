import { Component, OnInit, inject } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
  IonContent, IonIcon,
  MenuController, NavController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  gridOutline, carOutline, timeOutline, peopleOutline, settingsOutline,
  helpCircleOutline, logOutOutline, eye, idCardOutline, calendarOutline, 
  scanOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: true,
  imports: [
    CommonModule, IonContent, IonIcon
  ],
})
export class SidebarComponent implements OnInit {
  private menuCtrl = inject(MenuController);
  private router = inject(Router);
  private navCtrl = inject(NavController);

  allPages = [
    { title: 'Tổng quan', url: '/dashboard', icon: 'grid-outline' },
    { title: 'Tạo thông tin thẻ', url: '/card-registration', icon: 'id-card-outline' },
    { title: 'Tạo thẻ theo kì', url: '/ticket-parking', icon: 'calendar-outline' },
    { title: 'Lịch sử', url: '/history', icon: 'time-outline' },
    { title: 'Nhân viên', url: '/users', icon: 'people-outline' },
    { title: 'Cài đặt', url: '/settings', icon: 'settings-outline' },
    { title: 'Chấm công', url: '/timekeeping', icon: 'scan-outline' }
  ];

  currentUrl: string = '';
  fullName: string = 'User'; 
  role: string = 'Security'; 

  constructor() {
    addIcons({ gridOutline, carOutline, timeOutline, peopleOutline, settingsOutline, helpCircleOutline, logOutOutline, eye, idCardOutline, calendarOutline, scanOutline });
  }

  get adminPages() {
    if (this.role === 'Admin') {
      return this.allPages;
    }
    // Các user bình thường sẽ không thấy Tạo thẻ, Nhân viên, và Cài đặt
    return this.allPages.filter(p => !['/card-registration', '/users', '/settings'].includes(p.url));
  }

  ngOnInit() {
    this.currentUrl = this.router.url;

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentUrl = event.urlAfterRedirects;
        // Quét thông tin user mỗi khi chuyển trang
        this.fullName = localStorage.getItem('fullName') || 'User';
        this.role = localStorage.getItem('userRole') || 'Security';
      });
  }

  navigate(url: string) {
    if (this.currentUrl === url) {
      this.menuCtrl.close();
      return;
    }

    this.currentUrl = url;
    this.menuCtrl.close().then(() => {
      this.navCtrl.navigateRoot(url, { animated: false });
    });
  }

  logout() {
    localStorage.clear(); 
    this.navCtrl.navigateRoot('/login'); 
  }
}