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
  helpCircleOutline, logOutOutline, eye 
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

  adminPages = [
    { title: 'Tổng quan', url: '/dashboard', icon: 'eye' },
    { title: 'Tạo thông tin thẻ', url: '/card-registration', icon: 'car-outline' },
    { title: 'Tạo thẻ theo kì', url: '/ticket-parking', icon: 'car-outline' },
    { title: 'Lịch sử', url: '/history', icon: 'time-outline' },
    { title: 'Nhân viên', url: '/users', icon: 'people-outline' },
    { title: 'Cài đặt', url: '/settings', icon: 'settings-outline' },
  ];

  currentUrl: string = '';
  fullName: string = 'User'; 
  role: string = 'Security'; 

  constructor() {
    addIcons({ gridOutline, carOutline, timeOutline, peopleOutline, settingsOutline, helpCircleOutline, logOutOutline, eye });
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