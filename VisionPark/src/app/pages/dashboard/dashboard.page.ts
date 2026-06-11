import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
    this.api.getParkingHistory({ status: 'all' }).subscribe({
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

          const carsInParking = this.allRecords.filter(
            (r) => r.status === 'In',
          ).length;
          this.stats.totalVehicles = carsInParking;
          this.stats.availableSlots = Math.max(
            0,
            this.stats.maxCapacity - carsInParking,
          );
          this.stats.fillRate =
            this.stats.maxCapacity > 0
              ? Math.round((carsInParking / this.stats.maxCapacity) * 100)
              : 0;
        } else {
          this.allRecords = [];
          this.stats.totalVehicles = 0;
          this.stats.availableSlots = this.stats.maxCapacity;
          this.stats.fillRate = 0;
        }

        this.applyFilters();
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
    let temp = this.allRecords;
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      temp = temp.filter(
        (r) =>
          r.plateNumber.toLowerCase().includes(term) ||
          r.id.toLowerCase().includes(term),
      );
    }
    if (this.filterStatus !== 'all') {
      temp = temp.filter((r) => r.status === this.filterStatus);
    }

    this.filteredRecords = temp;
    this.totalPages =
      Math.ceil(this.filteredRecords.length / this.itemsPerPage) || 1;
    this.currentPage = 1;
    this.updatePagination();
    this.generatePages();
  }

  updatePagination() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedRecords = this.filteredRecords.slice(
      start,
      start + this.itemsPerPage,
    );
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
    console.log('Đang khởi tạo dữ liệu báo cáo PDF...');

    // 1. Khởi tạo đối tượng jsPDF (Khổ A4, đơn vị mm)
    const doc = new jsPDF('portrait', 'mm', 'a4');

    // 2. Thiết kế Tiêu đề chính của báo cáo
    doc.setFontSize(20);
    doc.setTextColor(41, 128, 185);
    doc.text('BAO CAO THONG KE HE THONG VISIONPARK', 14, 20);

    // Thời gian xuất báo cáo thực tế
    doc.setFontSize(10);
    doc.setTextColor(127, 140, 141);
    const today = new Date();
    const dateStr = today.toLocaleDateString('vi-VN');
    const timeStr = today.toLocaleTimeString('vi-VN');
    doc.text(`Ngay xuat: ${dateStr} - Gio: ${timeStr}`, 14, 27);

    // Dòng kẻ phân cách
    doc.setDrawColor(220, 220, 220);
    doc.line(14, 32, 196, 32);

    // 3. TÍNH TOÁN CÁC CHỈ SỐ THỐNG KÊ TỪ DATA THỰC TẾ
    const doanhThuTong = this.totalHistoryRevenue + this.totalMonthlyRevenue;
    const xeTrongKho = this.stats.totalVehicles;
    const xeRaHomNay = this.allRecords.filter((r) => r.status === 'Out').length;
    const xeVaoHomNay = this.allRecords.length; // Tổng lượt xe đã vào trong ngày
    const sucChuaToiDa =
      this.stats.maxCapacity > 0 ? this.stats.maxCapacity : 1500;

    // 4. ĐƯA CÁC CHỈ SỐ YÊU CẦU VÀO FILE PDF
    doc.setFontSize(12);
    doc.setTextColor(44, 62, 80);

    doc.text(
      `1. Tong doanh thu: ${doanhThuTong.toLocaleString('vi-VN')} VND`,
      14,
      42,
    );

    doc.text(`2. Luu luong phuong tien ra vao:`, 14, 50);
    doc.setFontSize(11);
    doc.text(`   - Tong so luot xe da vao bai: ${xeVaoHomNay} luot xe`, 14, 57);
    doc.text(`   - So luot xe da xuat ben (ra): ${xeRaHomNay} luot xe`, 14, 64);

    doc.setFontSize(12);
    const tileLapDay = ((xeTrongKho / sucChuaToiDa) * 100).toFixed(1);
    doc.text(
      `3. Tinh trang hien tai cua kho chua: ${xeTrongKho} / ${sucChuaToiDa} xe (Dat ${tileLapDay}% suc chua)`,
      14,
      74,
    );

    // Dòng kẻ phân cách trước khi vào bảng chi tiết
    doc.line(14, 80, 196, 80);

    doc.text('DANH SACH CHI TIET CAC PHIEN GIAO DICH', 14, 88);

    // 5. CẤU TRÚC BẢNG CHI TIẾT PHƯƠNG TIỆN
    const tableColumn = [
      'Bien so xe',
      'Loai phuong tien',
      'Thoi gian vao',
      'Trang thai hien tai',
    ];
    const tableRows: any[] = [];

    // Duyệt danh sách đang hiển thị trên bảng để xuất file
    if (this.filteredRecords && this.filteredRecords.length > 0) {
      this.filteredRecords.forEach((record: any) => {
        const isCar =
          record.vehicleType === 'Car' || record.vehicleType === 'Ô tô';
        const rowData = [
          record.plateNumber || 'Chua nhan dien',
          isCar ? 'O to' : 'Xe may',
          record.timeIn || 'N/A',
          record.status === 'In' ? 'Dang trong kho' : 'Da xuat ben',
        ];
        tableRows.push(rowData);
      });
    } else {
      tableRows.push(['Khong co du lieu xe ra vao', '', '', '']);
    }

    // 6. KẾT XUẤT BẢNG SỬ DỤNG AUTOTABLE
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 94,
      theme: 'grid',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontSize: 10,
      },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      styles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
      columnStyles: {
        0: { fontStyle: 'bold' }, // Biển số in đậm nhìn cho rõ ràng
      },
    });

    // 7. TIẾN HÀNH TẢI XUỐNG FILE BÁO CÁO
    const nameFormat = dateStr.replace(/\//g, '-');
    const fileName = `Bao_Cao_Du_Lieu_VisionPark_${nameFormat}.pdf`;
    doc.save(fileName);

    console.log('✅ Chức năng kết xuất dữ liệu PDF hoàn tất thành công!');
  }
}
