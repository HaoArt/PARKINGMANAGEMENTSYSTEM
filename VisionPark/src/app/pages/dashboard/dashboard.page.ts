import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, 
  IonFooter, IonButtons, IonMenuButton, IonIcon, IonButton 
} from '@ionic/angular/standalone';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component'; 
import { addIcons } from 'ionicons';
import { carOutline, cashOutline, searchOutline, documentTextOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { Api } from '../../services/api'; // <-- IMPORT FILE KẾT NỐI API

interface ParkingRecord {
  id: string;
  plateNumber: string;
  vehicleType: string;
  timeIn: string;
  status: 'In' | 'Out';
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [IonButton, 
    IonIcon, 
    CommonModule, 
    FormsModule, 
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar, 
    IonFooter,
    IonButtons,
    IonMenuButton,
    NavbarComponent
  ]
})
export class DashboardPage implements OnInit {
  // Thẻ thống kê
  stats = {
    totalVehicles: 0,
    availableSlots: 100, // Giả sử bãi xe có sức chứa tối đa là 100 chỗ
    revenueToday: '0 đ'  // Sẽ cập nhật khi Backend có API tính doanh thu
  };

  allRecords: ParkingRecord[] = [];
  filteredRecords: ParkingRecord[] = [];
  paginatedRecords: ParkingRecord[] = [];

  searchTerm: string = '';
  filterStatus: string = 'all';

  currentPage: number = 1;
  itemsPerPage: number = 4;
  totalPages: number = 1;

  // Tiêm Api service vào constructor
  constructor(private api: Api) { 
    addIcons({ carOutline, cashOutline, searchOutline, documentTextOutline, chevronBackOutline, chevronForwardOutline });
  }

  ngOnInit() {
    this.loadDataFromDatabase();
  }

  // --- HÀM KẾT NỐI DB LẤY DỮ LIỆU ---
  loadDataFromDatabase() {
    this.api.getParkingHistory().subscribe({
      next: (response: any) => {
        if (response && response.data) {
          
          // 1. Map dữ liệu từ SQL Server sang dạng hiển thị trên bảng
          this.allRecords = response.data.map((item: any) => ({
            id: `NFC-${item.cardID}`,
            plateNumber: item.licensePlateIn,
            vehicleType: item.vehicleTypeID === 1 ? 'Ô tô' : 'Xe máy',
            timeIn: item.checkInTime,
            status: item.status === "Đang đỗ" ? 'In' : 'Out'
          }));

          // 2. Tự động tính toán dữ liệu cho 3 Thẻ thống kê
          // Đếm số lượng xe có trạng thái "In" (Đang đỗ)
          const carsInParking = this.allRecords.filter(r => r.status === 'In').length;
          
          this.stats.totalVehicles = carsInParking;
          this.stats.availableSlots = 100 - carsInParking; // Chỗ trống = Tổng sức chứa (100) - Xe đang đỗ
          
          // 3. Áp dụng bộ lọc và phân trang để vẽ lên giao diện
          this.applyFilters();
        }
      },
      error: (err) => {
        console.error('Lỗi khi lấy dữ liệu Dashboard:', err);
      }
    });
  }

  applyFilters() {
    let temp = this.allRecords;

    if (this.searchTerm) {
      const lowerTerm = this.searchTerm.toLowerCase();
      temp = temp.filter(r => r.plateNumber.toLowerCase().includes(lowerTerm) || r.id.toLowerCase().includes(lowerTerm));
    }

    if (this.filterStatus !== 'all') {
      temp = temp.filter(r => r.status === this.filterStatus);
    }

    this.filteredRecords = temp;
    this.totalPages = Math.ceil(this.filteredRecords.length / this.itemsPerPage) || 1;
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedRecords = this.filteredRecords.slice(start, start + this.itemsPerPage);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }
}