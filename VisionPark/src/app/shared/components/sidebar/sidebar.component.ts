import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { 
  IonMenu, IonContent, IonList, IonItem, IonIcon, 
  IonLabel, IonListHeader, IonMenuToggle 
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
    CommonModule, RouterLink, RouterLinkActive, 
    IonMenu, IonContent, IonList, IonItem, IonIcon, 
    IonLabel, IonListHeader, IonMenuToggle
  ]
})
export class SidebarComponent {
  adminPages = [
    { title: 'Dashboard', url: '/dashboard', icon: 'grid-outline' },
    { title: 'Xe Vào (NFC)', url: '/check-in', icon: 'car-outline' },
    { title: 'Lịch sử', url: '/history', icon: 'time-outline' },
    { title: 'Nhân viên', url: '/users', icon: 'people-outline' },
    { title: 'Cài đặt', url: '/settings', icon: 'settings-outline' },
  ];

  constructor() {
    addIcons({ 
      gridOutline, carOutline, timeOutline, 
      peopleOutline, settingsOutline, logOutOutline 
    });
  }
}