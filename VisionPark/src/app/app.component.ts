import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonApp, IonRouterOutlet, IonSplitPane } from '@ionic/angular/standalone';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonApp, IonRouterOutlet, IonSplitPane, SidebarComponent, CommonModule],
})
export class AppComponent {
  showMenu = false;

  constructor(private router: Router) {
    // Theo dõi thay đổi URL
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      // Ẩn menu nếu ở trang login hoặc register
      const url = event.urlAfterRedirects;
      this.showMenu = !(url.includes('/login') || url.includes('/register') || url === '/');
    });
  }
}