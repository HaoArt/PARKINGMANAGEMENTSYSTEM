import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, 
  IonFooter, IonButtons, IonMenuButton, IonIcon, IonButton } from '@ionic/angular/standalone';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component'; 

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
  stats = {
    totalVehicles: 150,
    availableSlots: 50,
    revenueToday: '2,500,000đ'
  };

  // --- DỮ LIỆU VÀ PHÂN TRANG BẢNG ---
  allRecords: ParkingRecord[] = [];
  filteredRecords: ParkingRecord[] = [];
  paginatedRecords: ParkingRecord[] = [];

  // Trạng thái bộ lọc
  searchTerm: string = '';
  filterStatus: string = 'all';

  // Cấu hình trang
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;

  constructor() { }

  ngOnInit() {
    this.generateMockData();
    this.applyFilters();
  }

  // Tạo 25 dòng dữ liệu ảo làm ví dụ
  generateMockData() {
    for (let i = 1; i <= 25; i++) {
      this.allRecords.push({
        id: `NFC-${1000 + i}`,
        plateNumber: `75A-${Math.floor(10000 + Math.random() * 90000)}`,
        vehicleType: i % 3 === 0 ? 'Ô tô' : 'Xe máy',
        timeIn: new Date(Date.now() - Math.random() * 10000000).toLocaleString('vi-VN'),
        status: i % 4 === 0 ? 'Out' : 'In'
      });
    }
  }

  // Lọc dữ liệu dựa trên Text và Trạng thái
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
    this.currentPage = 1; // Luôn quay về trang 1 khi lọc
    this.updatePagination();
  }

  // Cắt mảng dữ liệu theo giới hạn (10 item)
  updatePagination() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedRecords = this.filteredRecords.slice(start, start + this.itemsPerPage);
  }

  // Chuyển trang
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