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

    totalVehicles: 0, availableSlots: 100, revenueToday: '0', fillRate: 0,
    maxCapacity: 100

  };
  
  allRecords: ParkingRecord[] = [];
  filteredRecords: ParkingRecord[] = [];
  paginatedRecords: ParkingRecord[] = [];
  
  searchTerm: string = '';
  filterStatus: string = 'all'; 
  
  currentPage: number = 1;
  itemsPerPage: number = 5;
  totalPages: number = 1;
  visiblePages: (number | string)[] = [];

  constructor(private api: Api) { 
    addIcons({cameraOutline,refreshOutline,scanOutline,chevronDownOutline,saveOutline,optionsOutline,carOutline,cashOutline,searchOutline,chevronBackOutline,chevronForwardOutline,car,arrowUpOutline,bicycle});
  }

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.api.getSettings().subscribe({
      next: (res: any) => {
        const settingsData = res?.data || res;
        console.log('Dữ liệu Settings lấy từ API:', settingsData);

        let capacity = 100;

        // Xử lý các dạng dữ liệu C# API có thể trả về
        if (settingsData?.systemConfig || settingsData?.SystemConfig) {
          // Cấu trúc mới nhất của Settings API
          const sysConfig = settingsData.systemConfig || settingsData.SystemConfig;
          capacity = Number(sysConfig.maxCapacity || sysConfig.MaxCapacity || 100);
        } else {
          if (Array.isArray(settingsData)) {
            // 1. Nếu API trả về mảng Key-Value (vd: [{ settingKey: 'MaxCapacity', settingValue: '150' }])
            const capSetting = settingsData.find((s: any) => 
              s.settingKey === 'MaxCapacity' || s.SettingKey === 'MaxCapacity' || s.key === 'MaxCapacity'
            );
            if (capSetting) {
              capacity = Number(capSetting.settingValue || capSetting.SettingValue || capSetting.value);
            } 
            // 2. Nếu API trả về mảng Object 1 phần tử (vd: [{ id: 1, maxCapacity: 150 }])
            else if (settingsData.length > 0) {
              capacity = Number(settingsData[0].maxCapacity || settingsData[0].MaxCapacity || 100);
            }
          } else {
            // 3. Nếu API trả về trực tiếp Object (vd: { maxCapacity: 150 })
            capacity = Number(settingsData?.maxCapacity || settingsData?.MaxCapacity || 100);
          }
        }

        // Đảm bảo kiểu số và tránh NaN (nếu lỗi sẽ fallback về 100)
        this.stats.maxCapacity = (isNaN(capacity) || capacity <= 0) ? 100 : capacity;

        this.loadDataFromDatabase();
      },
      error: (err) => {
        console.error('Lỗi lấy cấu hình hệ thống (Settings API), dùng dung lượng mặc định:', err);
        this.loadDataFromDatabase();
      }
    });
  }

  loadDataFromDatabase() {
    this.api.getParkingHistory().subscribe({
      next: (response: any) => {
        if (response && response.data) {
          let totalRevenue = 0; 

          this.allRecords = response.data.map((item: any) => {
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

          const carsInParking = this.allRecords.filter(r => r.status === 'In').length;
          this.stats.totalVehicles = carsInParking;

          this.stats.availableSlots = this.stats.maxCapacity - carsInParking;
          this.stats.fillRate = this.stats.maxCapacity > 0 ? Math.round((carsInParking / this.stats.maxCapacity) * 100) : 0;
          this.stats.revenueToday = totalRevenue.toLocaleString('vi-VN'); 

          this.applyFilters();
        }
      },
      error: (err) => console.error('Lỗi API Dashboard:', err)
    });
  }

  applyFilters() {
    let temp = this.allRecords;
    
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      temp = temp.filter(r => r.plateNumber.toLowerCase().includes(term) || r.id.toLowerCase().includes(term));
    }
    
    if (this.filterStatus !== 'all') {
      temp = temp.filter(r => r.status === this.filterStatus);
    }

    this.filteredRecords = temp;
    this.totalPages = Math.ceil(this.filteredRecords.length / this.itemsPerPage) || 1;
    this.currentPage = 1; 
    this.updatePagination();
    this.generatePages();
  }

  updatePagination() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedRecords = this.filteredRecords.slice(start, start + this.itemsPerPage);
  }
  
  generatePages() {
    const current = this.currentPage;
    const total = this.totalPages;
    const delta = 1;
    const range = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    range.push(1);
    for (let i = current - delta; i <= current + delta; i++) {
      if (i < total && i > 1) {
        range.push(i);
      }
    }
    if (total > 1) {
      range.push(total);
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    this.visiblePages = rangeWithDots;
  }

  goToPage(page: number | string) {
    if (typeof page === 'number' && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePagination();
      this.generatePages();
    }
  }

  nextPage() { 
    if (this.currentPage < this.totalPages) { 
      this.currentPage++; 
      this.updatePagination(); 
      this.generatePages(); 
    } 
  }
  
  prevPage() { 
    if (this.currentPage > 1) { 
      this.currentPage--; 
      this.updatePagination(); 
      this.generatePages(); 
    } 
  }
}