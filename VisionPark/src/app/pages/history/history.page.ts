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

  parkingHistory: ParkingRecord[] = [];
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
    this.nfc.addTagDiscoveredListener().subscribe((event: any) => {
      const cardUID = this.nfc.bytesToHexString(event.tag.id).toUpperCase();
      this.inputNfcId = cardUID; // Gán mã thẻ vào ô input

      this.cdr.detectChanges(); // Ép giao diện hiển thị ngay mã thẻ
      this.showToast('Đã nhận thẻ: ' + cardUID, 'success');

      // Tự động gọi hàm quét thẻ (như kiểu bấm nút "Enter")
      this.onProcessCard(cardUID);
    });
  }

  // Hàm gọi API lấy dữ liệu đã lọc từ Backend
  fetchData() {
    this.isLoading = true;
    const params = {
      searchTerm: this.filterConfig.plateNumber,
      status: this.filterConfig.status,
      pageNumber: 1,
      pageSize: 20,
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
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'top',
    });
    toast.present();
  }
}
