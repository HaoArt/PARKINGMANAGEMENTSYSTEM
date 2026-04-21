import { Component, OnInit, inject } from '@angular/core'; // Thêm OnInit, dùng inject
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
  IonMenu,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
  IonListHeader,
  IonToolbar,
  IonHeader,
  MenuController,
  NavController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    CommonModule,
    IonMenu,
    IonContent,
    IonList,
    IonItem,
    IonIcon,
    IonLabel,
    IonListHeader,
  ],
})
export class SidebarComponent implements OnInit {
  private menuCtrl = inject(MenuController);
  private router = inject(Router);
  private navCtrl = inject(NavController);

  adminPages = [
    { title: 'Dashboard', url: '/dashboard', icon: 'grid-outline' },
    { title: 'Tạo thẻ', url: '/ticket-parking', icon: 'car-outline' },
    { title: 'Lịch sử', url: '/history', icon: 'time-outline' },
    { title: 'Nhân viên', url: '/users', icon: 'people-outline' },
    { title: 'Cài đặt', url: '/settings', icon: 'settings-outline' },
  ];

  currentUrl: string = '';

  constructor() {
    addIcons({ ...addIcons });
  }

  ngOnInit() {
    this.currentUrl = this.router.url;

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentUrl = event.urlAfterRedirects;
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
}
