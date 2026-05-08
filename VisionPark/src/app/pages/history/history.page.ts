import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core'; // Thêm ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonBadge,
  IonSearchbar,
  IonText,
  IonSelect,
  IonButton,
  IonIcon,
  IonSelectOption,
  IonItem,
  IonInput,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  ToastController,
  Platform,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import * as icons from 'ionicons/icons';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { Api } from '../../services/api';
// 👉 THÊM PLUGIN NFC
import { NFC, Ndef } from '@awesome-cordova-plugins/nfc/ngx';

interface ParkingRecord {
  nfcId: string;
  plateNumberIn: string;
  plateNumberOut: string;
  vehicleType: string;
  checkInTime: string;
  checkOutTime: string;
  status: 'In' | 'Out';
}

interface ScanResultData {
  action: string;
  message: string;
  customerName: string;
  plateNumber: string;
  vehicleType: string;
  expiryDate: string;
  status: string;
  isSuccess: boolean;
}

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
  standalone: true,
  imports: [
    IonCardContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonItem,
    IonContent,
    IonGrid,
    IonRow,
    IonInput,
    IonCol,
    IonBadge,
    IonSearchbar,
    IonText,
    IonButton,
    IonSelect,
    IonSelectOption,
    IonIcon,
    CommonModule,
    FormsModule,
    NavbarComponent,
  ],
  providers: [NFC, Ndef], // 👉 CẤP QUYỀN SỬ DỤNG NFC CHO COMPONENT NÀY
})
export class HistoryPage implements OnInit {
  private api = inject(Api);
  private toastCtrl = inject(ToastController);
  private platform = inject(Platform);
  private lastScanTime: number = 0;

  parkingHistory: ParkingRecord[] = [];
  paginatedHistory: ParkingRecord[] = [];

  // Phân trang
  currentPage: number = 1;
  itemsPerPage: number = 5;
  totalPages: number = 1;
  visiblePages: (number | string)[] = [];

  isLoading = false;

  inputNfcId = '';
  // Bộ lọc cấu hình gửi lên BE
  filterConfig = { plateNumber: '', status: 'all' };

  scanResult: ScanResultData | null = null;

  constructor(
    private nfc: NFC, // Tiêm NFC
    private cdr: ChangeDetectorRef, // Tiêm ChangeDetectorRef để chống đơ màn hình
  ) {
    addIcons({ ...icons });
  }

  ngOnInit() {
    this.fetchData();
    this.startNFC(); // 👉 KÍCH HOẠT LẮNG NGHE QUẸT THẺ TỰ ĐỘNG
  }

  // 👉 HÀM LẮNG NGHE THẺ NFC CHẠM VÀO ĐIỆN THOẠI
  startNFC() {
    if (this.platform.is('capacitor') || this.platform.is('cordova')) {
      // 1. Lắng nghe thẻ NFC cơ bản (Thẻ trắng)
      this.nfc.addTagDiscoveredListener().subscribe({
        next: (event: any) => this.handleTagEvent(event),
        error: (err) => console.error('Lỗi NFC Tag:', err),
      });

      // 2. BẮT BUỘC: Lắng nghe thẻ có chứa dữ liệu NDEF để chặn Android chuyển hướng
      this.nfc.addNdefListener().subscribe({
        next: (event: any) => this.handleTagEvent(event),
        error: (err) => console.error('Lỗi NFC NDEF:', err),
      });
    } else {
      console.warn('NFC plugin chỉ hoạt động trên thiết bị thực.');
    }
  }
  handleTagEvent(event: any) {
    // 👉 1. LOGIC CHỐNG ĐÚP (COOLDOWN)
    const currentTime = new Date().getTime();
    if (currentTime - this.lastScanTime < 2000) {
      // Nếu thời gian quẹt cách lần trước chưa tới 2000ms (2 giây) -> Bỏ qua ngay lập tức
      return;
    }
    this.lastScanTime = currentTime; // Cập nhật lại mốc thời gian vừa quẹt xong

    // 👉 2. LOGIC XỬ LÝ THẺ BÌNH THƯỜNG
    if (event && event.tag && event.tag.id) {
      const scannedUID = this.nfc.bytesToHexString(event.tag.id).toUpperCase();

      this.inputNfcId = scannedUID;
      this.cdr.detectChanges();
      this.showToast('Đã nhận mã thẻ: ' + scannedUID, 'success');

      // Tự động gọi API
      this.onProcessCard(scannedUID);
    }
  }

  // Hàm gọi API lấy dữ liệu đã lọc từ Backend
  fetchData() {
    this.isLoading = true;
    const params = {
      searchTerm: this.filterConfig.plateNumber,
      status: this.filterConfig.status,
      pageNumber: 1,
      pageSize: 1000, // Tăng giới hạn tải để có thể phân trang ở Client
    };

    this.api.getParkingHistory(params).subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.parkingHistory = res.data.map((item: any) =>
            this.mapBackendToFrontend(item),
          );
        } else {
          this.parkingHistory = [];
        }

        this.currentPage = 1;
        this.calculatePagination();

        this.isLoading = false;
        this.cdr.detectChanges(); // Update UI
      },
      error: (err) => {
        console.error('Lỗi API:', err);
        this.isLoading = false;
        this.showToast('Lỗi khi tải lịch sử dữ liệu!', 'danger');
        this.cdr.detectChanges();
      },
    });
  }

  // Kích hoạt khi gõ tìm kiếm hoặc đổi select box
  applyFilters() {
    this.fetchData();
  }

  // Nhận từ khóa tìm kiếm từ Navbar và tự động cập nhật bảng
  onNavbarSearch(searchTerm: string) {
    this.filterConfig.plateNumber = searchTerm;
    this.applyFilters();
  }

  private mapBackendToFrontend(item: any): ParkingRecord {
    return {
      nfcId: item.cardID,
      plateNumberIn: item.licensePlateIn || '---',
      plateNumberOut: item.licensePlateOut || '---',
      vehicleType: item.vehicleTypeID === 1 ? 'Ô tô' : 'Xe máy',
      checkInTime: item.checkInTime,
      checkOutTime: item.checkOutTime,
      status: item.status === 'In' || item.status === 'Đang đỗ' ? 'In' : 'Out',
    };
  }

  onProcessCard(nfcId: string) {
    if (!nfcId) {
      this.showToast('Vui lòng nhập hoặc quét mã thẻ!', 'warning');
      return;
    }

    this.isLoading = true;
    this.api.scanCard(nfcId).subscribe({
      next: (res: any) => {
        const data = res.data;

        this.scanResult = {
          action: res.action,
          message: res.message,
          customerName: data?.customerName || '---',
          plateNumber: data?.plateNumber || data?.registerPlate || '---',
          vehicleType:
            data?.vehicleType?.name ||
            data?.vehicleType?.typeName ||
            data?.vehicleType ||
            '---',
          expiryDate: data?.expiryDate || '---',
          status: data?.status || '---',
          isSuccess: res.action === 'CHECK_IN' || res.action === 'CHECK_OUT',
        };

        this.inputNfcId = ''; // Xoá trắng ô text box
        this.fetchData(); // Quẹt xong thì load lại bảng lịch sử mới nhất
      },
      error: (err) => {
        this.scanResult = {
          action: 'ERROR',
          message: err.error?.message || err.error || 'Lỗi xử lý thẻ!',
          customerName: '---',
          plateNumber: '---',
          vehicleType: '---',
          expiryDate: '---',
          status: '---',
          isSuccess: false,
        };
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning' = 'danger',
  ) {
    let iconName = 'alert-circle-outline';
    if (color === 'success') iconName = 'checkmark-circle-outline';
    else if (color === 'warning') iconName = 'warning-outline';

    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'top',
      icon: iconName,
      cssClass: 'toast-top-right',
    });
    toast.present();
  }

  // --- LOGIC PHÂN TRANG ---
  calculatePagination() {
    this.totalPages = Math.ceil(this.parkingHistory.length / this.itemsPerPage);

    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    } else if (this.totalPages === 0) {
      this.currentPage = 1;
    }

    this.updatePaginatedHistory();
    this.generatePages();
  }

  updatePaginatedHistory() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedHistory = this.parkingHistory.slice(startIndex, endIndex);
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
      this.updatePaginatedHistory();
      this.generatePages();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedHistory();
      this.generatePages();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedHistory();
      this.generatePages();
    }
  }

  exportReport() {
    this.showToast(
      'Tính năng Xuất báo cáo Excel đang được phát triển!',
      'warning',
    );
  }
}
