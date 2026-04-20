import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router'; // Vẫn giữ Router để lấy URL bôi đen menu
import { filter } from 'rxjs/operators';
import { 
  IonMenu, IonContent, IonList, IonItem, IonIcon, 
  IonLabel, IonListHeader, IonToolbar, IonHeader, 
  MenuController, 
  NavController // <-- 1. Import thêm NavController của Ionic
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  gridOutline, carOutline, timeOutline, 
  peopleOutline, settingsOutline, logOutOutline 
} from 'ionicons/icons';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, CommonModule, 
    IonMenu, IonContent, IonList, IonItem, IonIcon, 
    IonLabel, IonListHeader 
  ]
})
export class SidebarComponent {
  adminPages = [
    { title: 'Dashboard', url: '/dashboard', icon: 'grid-outline' },
    { title: 'Tạo thẻ', url: '/check-in', icon: 'car-outline' },
    { title: 'Lịch sử', url: '/history', icon: 'time-outline' },
    { title: 'Nhân viên', url: '/users', icon: 'people-outline' },
    { title: 'Cài đặt', url: '/settings', icon: 'settings-outline' },
  ];

  currentUrl: string = '';

  constructor(
    private menuCtrl: MenuController,
    private router: Router,
    private navCtrl: NavController // <-- 2. Khai báo NavController
  ) {
    addIcons({ 
      gridOutline, carOutline, timeOutline, 
      peopleOutline, settingsOutline, logOutOutline 
    });

    // Lắng nghe URL để đổi màu menu đang chọn
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentUrl = event.urlAfterRedirects;
    });
  }

  // 3. Sửa lại hàm chuyển trang bằng NavController
  navigate(url: string) {
    // navigateRoot sẽ ép Ionic load lại Component đích và xóa lịch sử back
    this.navCtrl.navigateRoot(url).then(() => {
      this.menuCtrl.close(); // Đóng menu
    });
  }
}