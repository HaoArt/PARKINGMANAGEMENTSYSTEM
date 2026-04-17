import { Component } from '@angular/core';
import {
  IonApp,
  IonSplitPane,
  IonRouterOutlet,
  IonContent,
} from '@ionic/angular/standalone';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';

@Component({
  selector: 'app-main-layout',
  template: `
    <ion-app>
      <ion-split-pane contentId="main-content" when="lg">
        <app-sidebar></app-sidebar>

        <div class="ion-page" id="main-content">
          <app-navbar></app-navbar>

          <ion-content>
            <ion-router-outlet></ion-router-outlet>
          </ion-content>
        </div>
      </ion-split-pane>
    </ion-app>
  `,
  standalone: true,
  imports: [
    IonApp,
    IonSplitPane,
    IonRouterOutlet,
    SidebarComponent,
    NavbarComponent,
    IonContent,
  ],
})
export class MainLayoutComponent {}
