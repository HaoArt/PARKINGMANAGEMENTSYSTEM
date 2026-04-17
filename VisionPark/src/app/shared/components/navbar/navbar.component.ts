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
import { addIcons } from 'ionicons';
import {
  homeOutline,
  statsChartOutline,
  logOutOutline,
  carOutline,
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
    addIcons({
      'notifications-outline': notificationsOutline,
      'person-circle-outline': personCircleOutline,
    });
  }
}
