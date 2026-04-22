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

import { NavController } from '@ionic/angular';
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
  constructor(
    private navCtrl: NavController,
  ) {
    addIcons({
      searchOutline,
      notificationsOutline,
      personCircleOutline,
    });
  }
  logout() {
    localStorage.clear();
    this.navCtrl.navigateRoot('/login');
  }
}
