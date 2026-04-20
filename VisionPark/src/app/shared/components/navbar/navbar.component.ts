import { Component } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonAvatar,
  IonLabel,
  IonBadge,
  IonSearchbar,
  IonMenuButton,
} from '@ionic/angular/standalone';

// Import thư viện icon
import { addIcons } from 'ionicons';
import {
  searchOutline,
  notificationsOutline,
  personCircleOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  standalone: true,
  imports: [
    IonSearchbar,
    IonBadge,
    IonLabel,
    IonMenuButton,
    IonAvatar,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
  ],
})
export class NavbarComponent {
  constructor() {
    // Khai báo icon một lần duy nhất bằng cú pháp ngắn gọn
    addIcons({
      searchOutline,
      notificationsOutline,
      personCircleOutline
    });
  }
}