import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, 
  IonFooter, IonButtons, IonMenuButton, IonIcon, IonButton 
} from '@ionic/angular/standalone';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component'; 
import { addIcons } from 'ionicons';
import { 
  carOutline, cashOutline, searchOutline, chevronBackOutline, 
  chevronForwardOutline, optionsOutline, car, arrowUpOutline, bicycle, cameraOutline, refreshOutline, scanOutline, chevronDownOutline, saveOutline } from 'ionicons/icons';
import { Api } from '../../services/api';

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
  imports: [ IonButton, IonIcon, CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, IonFooter, IonButtons, IonMenuButton, NavbarComponent]
})
export class DashboardPage implements OnInit {
  stats = {
    totalVehicles: 0, availableSlots: 100, revenueToday: '0', fillRate: 0 
  };
  currentDate: string = '';
  allRecords: ParkingRecord[] = [];
  filteredRecords: ParkingRecord[] = [];
  paginatedRecords: ParkingRecord[] = [];
  
  searchTerm: string = '';
  filterStatus: string = 'all'; // Biến lưu trạng thái lọc
  
  currentPage: number = 1;
  itemsPerPage: number = 4;
  totalPages: number = 1;

  constructor(private api: Api) { 
    addIcons({cameraOutline,refreshOutline,scanOutline,chevronDownOutline,saveOutline,optionsOutline,carOutline,cashOutline,searchOutline,chevronBackOutline,chevronForwardOutline,car,arrowUpOutline,bicycle});
  }

  ngOnInit() {
    this.formatCurrentDate();
    this.loadDataFromDatabase();
  }

  formatCurrentDate() {
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const now = new Date();
    this.currentDate = `Hôm nay: ${days[now.getDay()]}, ${now.getDate().toString().padStart(2, '0')} Tháng ${(now.getMonth() + 1).toString().padStart(2, '0')}, ${now.getFullYear()} | ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  }

  loadDataFromDatabase() {
    this.api.getParkingHistory().subscribe({
      next: (response: any) => {
        if (response && response.data) {
          let totalRevenue = 0; // Biến cộng dồn doanh thu

          this.allRecords = response.data.map((item: any) => {
            // Cộng dồn tiền vé từ API
            const cost = item.totalCost || item.TotalCost || 0;
            totalRevenue += cost;

            return {
              id: `NFC-${item.cardID || item.CardID}`, 
              plateNumber: item.licensePlateIn || item.LicensePlateIn || 'N/A', 
              vehicleType: item.vehicleTypeID === 1 ? 'Xe máy' : 'Ô tô', 
              timeIn: item.checkInTime || item.CheckInTime, 
              status: (item.status === "Đang đỗ" || item.status === "In") ? 'In' : 'Out'
            };
          });

          // Cập nhật các thẻ thống kê DỮ LIỆU THẬT
          const carsInParking = this.allRecords.filter(r => r.status === 'In').length;
          this.stats.totalVehicles = carsInParking;
          this.stats.availableSlots = 100 - carsInParking;
          this.stats.fillRate = Math.round((carsInParking / 100) * 100);
          this.stats.revenueToday = totalRevenue.toLocaleString('vi-VN'); // Format tiền tệ VN

          // Đã XÓA đoạn Mock Data cũ ở đây để hiển thị 100% dữ liệu thật!

          this.applyFilters();
        }
      },
      error: (err) => console.error('Lỗi API Dashboard:', err)
    });
  }

  applyFilters() {
    let temp = this.allRecords;
    
    // 1. Lọc theo thanh tìm kiếm (Tìm biển số, thẻ)
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      temp = temp.filter(r => r.plateNumber.toLowerCase().includes(term) || r.id.toLowerCase().includes(term));
    }
    
    // 2. Lọc theo Trạng thái (Dropdown)
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
  
  nextPage() { if (this.currentPage < this.totalPages) { this.currentPage++; this.updatePagination(); } }
  prevPage() { if (this.currentPage > 1) { this.currentPage--; this.updatePagination(); } }
}