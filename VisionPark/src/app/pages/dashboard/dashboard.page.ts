import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonFooter,
  IonButtons,
  IonMenuButton,
  IonIcon,
  IonButton,
  IonCard,
} from '@ionic/angular/standalone';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { addIcons } from 'ionicons';
import {
  carOutline,
  cashOutline,
  searchOutline,
  chevronBackOutline,
  chevronForwardOutline,
  optionsOutline,
  car,
  arrowUpOutline,
  bicycle,
  cameraOutline,
  refreshOutline,
  scanOutline,
  chevronDownOutline,
  saveOutline,
  downloadOutline,
  carSportOutline,
  bicycleOutline,
  pulseOutline,
  filterOutline,
  fileTrayOutline,
} from 'ionicons/icons';
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
  imports: [
    IonCard,
    IonButton,
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
    NavbarComponent,
  ],
  providers: [DatePipe],
})
export class DashboardPage implements OnInit {
  stats = {
    totalVehicles: 0,
    availableSlots: 100,
    revenueToday: '0',
    fillRate: 0,
    maxCapacity: 100,
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

  // --- BIẾN MỚI CHO TÍNH DOANH THU ---
  pricingRules: any[] = [];
  totalHistoryRevenue: number = 0; // Tiền xe vãng lai
  totalMonthlyRevenue: number = 0; // Tiền đăng ký thẻ

  constructor(
    private api: Api,
    private datePipe: DatePipe,
  ) {
    addIcons({
      cameraOutline,
      refreshOutline,
      scanOutline,
      chevronDownOutline,
      saveOutline,
      optionsOutline,
      carOutline,
      cashOutline,
      searchOutline,
      chevronBackOutline,
      chevronForwardOutline,
      car,
      arrowUpOutline,
      bicycle,
      downloadOutline,
      carSportOutline,
      bicycleOutline,
      pulseOutline,
      filterOutline,
      fileTrayOutline,
    });
  }

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.api.getSettings().subscribe({
      next: (res: any) => {
        const settingsData = res?.data || res;
        let capacity = 100;

        // Lấy sức chứa
        if (settingsData?.systemConfig || settingsData?.SystemConfig) {
          const sysConfig =
            settingsData.systemConfig || settingsData.SystemConfig;
          capacity = Number(
            sysConfig.maxCapacity || sysConfig.MaxCapacity || 100,
          );
        }

        // Lấy bảng giá để làm cơ sở tính tiền thẻ
        if (settingsData?.pricingRules || settingsData?.PricingRules) {
          this.pricingRules =
            settingsData.pricingRules || settingsData.PricingRules;
        }

        this.stats.maxCapacity =
          isNaN(capacity) || capacity <= 0 ? 100 : capacity;

        // GỌI SONG SONG 2 NGUỒN TIỀN
        this.loadDataFromDatabase(); // Tiền lượt
        this.loadDashboardSummary(); // Gọi C# Backend lấy Tổng doanh thu All-Time
      },
      error: (err) => {
        console.error('Lỗi API Settings:', err);
        this.loadDataFromDatabase();
        this.loadDashboardSummary();
      },
    });
  }

  // 1. TÍNH TIỀN TỪ CÁC LƯỢT XE RA VÀO (VÃNG LAI)
  loadDataFromDatabase() {
    const params = {
      searchTerm: this.searchTerm,
      status: this.filterStatus,
      pageNumber: this.currentPage,
      pageSize: this.itemsPerPage
    };

    this.api.getParkingHistory(params).subscribe({
      next: (response: any) => {
        const dataList =
          response?.data ||
          response?.Data ||
          (Array.isArray(response) ? response : []);

        if (dataList && dataList.length > 0) {
          this.allRecords = dataList.map((item: any) => {
            const status = item.status || item.Status || '';

            const rawTimeIn = item.checkInTime || item.CheckInTime;
            let formattedTimeIn = '---';
            try {
              if (rawTimeIn)
                formattedTimeIn =
                  this.datePipe.transform(rawTimeIn, 'HH:mm - dd/MM/yyyy') ||
                  '---';
            } catch (e) {
              formattedTimeIn = rawTimeIn;
            }

            const vTypeID = item.vehicleTypeID || item.VehicleTypeID;
            const vTypeStr = item.vehicleType || item.VehicleType;
            let vTypeName =
              vTypeID === 1 || vTypeStr === 'Ô tô' ? 'Ô tô' : 'Xe máy';

            return {
              id:
                item.cardUID ||
                item.CardUID ||
                item.cardID ||
                item.CardID ||
                `ID-${item.parkingID || item.ParkingID || '---'}`,
              plateNumber: item.licensePlateIn || item.LicensePlateIn || '---',
              vehicleType: vTypeName,
              timeIn: formattedTimeIn,
              status: status === 'Đang đỗ' || status === 'In' ? 'In' : 'Out',
            };
          });
        } else {
          this.allRecords = [];
        }

        this.filteredRecords = this.allRecords;
        this.paginatedRecords = this.allRecords;

        const totalCount = response?.totalCount || response?.TotalCount || 0;
        this.totalPages = Math.ceil(totalCount / this.itemsPerPage) || 1;
        this.generatePages();
      },
      error: (err) => console.error('Lỗi API Parking History:', err),
    });
  }

  // 2. LẤY SỐ LIỆU TỔNG DOANH THU TỪ BACKEND ĐỂ TỐI ƯU HIỆU NĂNG
  loadDashboardSummary() {
    // Giả định bạn đã định nghĩa getDashboardSummary() trong file api.ts
    this.api.getDashboardSummary().subscribe({
      next: (res: any) => {
        const data = res?.data || res?.Data || {};
        this.totalHistoryRevenue = data.totalHistoryRevenue || 0;
        this.totalMonthlyRevenue = data.totalMonthlyRevenue || 0;
        
        if (data.vehiclesInParking !== undefined) {
          this.stats.totalVehicles = data.vehiclesInParking;
          this.stats.availableSlots = Math.max(0, this.stats.maxCapacity - data.vehiclesInParking);
          this.stats.fillRate = this.stats.maxCapacity > 0 
              ? Math.round((data.vehiclesInParking / this.stats.maxCapacity) * 100) 
              : 0;
        }

        this.updateTotalRevenueDisplay();
      },
      error: (err) => console.error('Lỗi lấy Summary Dashboard:', err),
    });
  }

  // GỘP 2 NGUỒN TIỀN VÀ HIỂN THỊ
  updateTotalRevenueDisplay() {
    const grandTotal = this.totalHistoryRevenue + this.totalMonthlyRevenue;
    this.stats.revenueToday = grandTotal.toLocaleString('vi-VN');
  }

  applyFilters() {
    this.currentPage = 1;
    this.loadDataFromDatabase();
  }

  updatePagination() {
    this.loadDataFromDatabase();
  }

  generatePages() {
    const current = this.currentPage;
    const total = this.totalPages;
    const rangeWithDots: (number | string)[] = [];
    const range = [];
    let l: number | undefined;

    range.push(1);
    for (let i = current - 1; i <= current + 1; i++) {
      if (i < total && i > 1) range.push(i);
    }
    if (total > 1) range.push(total);

    for (let i of range) {
      if (l) {
        if (i - l === 2) rangeWithDots.push(l + 1);
        else if (i - l !== 1) rangeWithDots.push('...');
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

  exportReport() {
    console.log('Đang yêu cầu kết xuất dữ liệu báo cáo PDF từ Backend...');
    
    this.api.exportDashboardPdf().subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
        a.download = `Bao_Cao_Thong_Ke_VisionPark_${dateStr}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        console.log('✅ Chức năng kết xuất dữ liệu PDF hoàn tất thành công!');
      },
      error: (err) => {
        console.error('Lỗi khi kết xuất PDF từ Backend:', err);
      }
    });
  }
}
