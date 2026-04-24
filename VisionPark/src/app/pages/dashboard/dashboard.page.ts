import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonIcon } from '@ionic/angular/standalone';
import { Api } from '../../services/api'; // Đường dẫn có thể khác tùy cấu trúc thư mục của bạn
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { addIcons } from 'ionicons';
import { businessOutline, carOutline, checkmarkCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [IonContent, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonIcon, CommonModule, FormsModule, NavbarComponent]
})
export class DashboardPage implements OnInit {
  private api = inject(Api);

  // Khai báo các biến lưu trữ thống kê
  maxCapacity: number = 0;
  currentParked: number = 0; // Số xe đang đỗ trong bãi
  availableSpots: number = 0; // Số chỗ trống

  // Danh sách xe đang đỗ
  parkedVehicles: any[] = [];

  constructor() {
    addIcons({ businessOutline, carOutline, checkmarkCircleOutline });
  }

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    // 1. Gọi API lấy Cấu hình hệ thống để biết Sức chứa tối đa (MaxCapacity)
    this.api.getSettings().subscribe({
      next: (res: any) => {
        if (res?.systemConfig) {
          // Lấy giá trị MaxCapacity (hỗ trợ cả viết hoa và viết thường tùy backend trả về)
          this.maxCapacity = res.systemConfig.maxCapacity || res.systemConfig.MaxCapacity || 0;
          this.calculateAvailableSpots();
        }
      },
      error: (err) => console.error('Lỗi khi lấy cấu hình bãi đỗ:', err)
    });

    // 2. LẤY DANH SÁCH XE ĐANG ĐỖ TỪ DATABASE
    this.api.getParkingHistory({ status: 'In', pageNumber: 1, pageSize: 1000 }).subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.parkedVehicles = res.data.map((item: any) => ({
            plate: item.licensePlateIn || '---',
            type: item.vehicleTypeID === 1 ? 'Ô tô' : 'Xe máy',
            timeIn: item.checkInTime
          }));
          this.currentParked = this.parkedVehicles.length;
          this.calculateAvailableSpots();
        }
      },
      error: (err) => console.error('Lỗi lấy danh sách xe đang đỗ:', err)
    });
  }

  // Hàm tính toán số chỗ còn trống
  calculateAvailableSpots() {
    this.availableSpots = this.maxCapacity - this.currentParked;
    // Đảm bảo số chỗ trống không bị âm trong trường hợp lỗi data
    if (this.availableSpots < 0) {
      this.availableSpots = 0;
    }
  }
}
