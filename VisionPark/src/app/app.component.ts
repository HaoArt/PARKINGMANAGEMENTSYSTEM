import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';

// Nhớ phải có mặt IonMenu và IonSplitPane ở đây
import { IonApp, IonRouterOutlet, IonSplitPane, IonMenu } from '@ionic/angular/standalone'; 
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonApp, IonRouterOutlet, IonSplitPane, IonMenu, SidebarComponent, CommonModule],
})
export class AppComponent {
  showMenu = false;

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects;
      // Trả về true (hiện menu) nếu KHÔNG phải trang login
      this.showMenu = !(url.includes('/login') || url.includes('/register') || url === '/');
    });
  }
}