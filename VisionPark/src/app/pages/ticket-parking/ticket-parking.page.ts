import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonIcon,
  IonGrid,
  IonRow,
  IonCardContent,
  Platform,
  ToastController,
  IonCardHeader,
  IonCard,
  IonCardTitle,
  IonCol,
  IonItem,
  IonLabel,
  IonButton,
  IonSpinner,
  IonModal,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonHeader,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import * as icons from 'ionicons/icons';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { Api } from '../../services/api';
import { NFC, Ndef } from '@awesome-cordova-plugins/nfc/ngx';
import { Capacitor } from '@capacitor/core';
import {
  CameraPreview,
  CameraPreviewOptions,
  CameraPreviewPictureOptions,
} from '@capacitor-community/camera-preview';

interface MonthlyTicketRecord {
  ticketId: number;
  customerName: string;
  phoneNumber: string;
  registerPlate: string;
  vehicleType: string;
  cardUID: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  status: string;
}

@Component({
  selector: 'app-monthly-ticket',
  templateUrl: './ticket-parking.page.html',
  styleUrls: ['./ticket-parking.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonIcon,
    CommonModule,
    FormsModule,
    NavbarComponent,
    IonModal,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonHeader,
    IonButton,
    IonSpinner,
  ],
  providers: [NFC, Ndef],
})
export class TicketParkingPage implements OnInit, OnDestroy {
  private api = inject(Api);
  private platform = inject(Platform);
  private toastCtrl = inject(ToastController);

  monthlyTickets: MonthlyTicketRecord[] = [];
  paginatedTickets: MonthlyTicketRecord[] = [];

  // Phân trang
  currentPage: number = 1;
  itemsPerPage: number = 5;
  totalPages: number = 1;
  visiblePages: (number | string)[] = [];
  pricingRules: any[] = [];
  showQRModal: boolean = false;
  qrUrl: string = '';
  paymentAmount: number = 0;

  filterStatus: string = 'all';

  isLoading = false;
  isSubmitting = false;

  // Trạng thái bật/tắt Camera Plugin
  isCameraActive = false;

  regData = {
    cardUID: '',
    customerName: '',
    phoneNumber: '',
    registerPlate: '',
    vehicleTypeID: 1, // Mặc định 1 là Ô tô
    durationMonths: 1,
  };

  selectedImageFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;

  constructor(
    private nfc: NFC,
    private ndef: Ndef,
    private cdr: ChangeDetectorRef,
  ) {
    addIcons({ ...icons });
  }

  ngOnInit() {
    this.loadTickets();
    this.startNFC();
    this.loadPricingConfig();
  }

  ngOnDestroy() {
    if (this.isCameraActive) {
      this.stopCamera();
    }
  }

  loadTickets() {
    this.isLoading = true;

    const params = {
      status: this.filterStatus,
      pageNumber: this.currentPage,
      pageSize: this.itemsPerPage
    };

    this.api.getMonthlyTickets(params).subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.monthlyTickets = res.data;
        }
        this.paginatedTickets = this.monthlyTickets;
        const totalCount = res?.totalCount || res?.TotalCount || 0;
        this.totalPages = Math.ceil(totalCount / this.itemsPerPage) || 1;
        this.generatePages();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Lỗi tải danh sách vé:', err);
        this.isLoading = false;
      },
    });
  }

  loadPricingConfig() {
    this.api.getSettings().subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        if (data?.pricingRules || data?.PricingRules) {
          this.pricingRules = data.pricingRules || data.PricingRules;
        }
      },
      error: (err) => console.error('Lỗi tải cấu hình bảng giá:', err),
    });
  }

  calculateAmount(vehicleTypeId: number, durationMonths: number): number {
    const rule = this.pricingRules.find(
      (r: any) => r.ruleId == vehicleTypeId || r.RuleId == vehicleTypeId,
    );

    if (!rule) return 0;

    if (durationMonths == 12)
      return rule.pricePerYear || rule.PricePerYear || 0;
    if (durationMonths == 3)
      return rule.pricePerQuarter || rule.PricePerQuarter || 0;
    return rule.pricePerMonth || rule.PricePerMonth || 0;
  }

  applyFilters() {
    this.currentPage = 1;
    this.loadTickets();
  }

  // --- LOGIC CAMERA PREVIEW KHUNG ĐỎ ---
  async takePicture() {
    const cameraPreviewOptions: CameraPreviewOptions = {
      position: 'rear',
      parent: 'cameraPreview',
      className: 'cameraPreview',
      toBack: true,
    };

    try {
      await CameraPreview.start(cameraPreviewOptions);
      this.isCameraActive = true;

      document.body.style.backgroundColor = 'transparent';
      document.documentElement.style.backgroundColor = 'transparent';
      this.cdr.detectChanges();
    } catch (error) {
      console.log('Error opening camera preview:', error);
      this.showToast('Không thể khởi động camera!', 'danger');
    }
  }

  async captureImage() {
    const cameraPreviewPictureOptions: CameraPreviewPictureOptions = {
      quality: 80,
    };

    try {
      const result = await CameraPreview.capture(cameraPreviewPictureOptions);
      const base64PictureData = result.value;

      const response = await fetch(
        `data:image/jpeg;base64,${base64PictureData}`,
      );
      const blob = await response.blob();
      const fileName = `xe_${new Date().getTime()}.jpg`;

      this.selectedImageFile = new File([blob], fileName, {
        type: 'image/jpeg',
      });
      this.imagePreview = `data:image/jpeg;base64,${base64PictureData}`;

      this.stopCamera();
    } catch (e) {
      console.error(e);
      this.showToast('Lỗi khi chụp ảnh!', 'danger');
    }
  }

  async stopCamera() {
    try {
      await CameraPreview.stop();
    } catch (e) {
      console.error('Lỗi khi đóng camera', e);
    }
    this.isCameraActive = false;

    document.body.style.backgroundColor = '';
    document.documentElement.style.backgroundColor = '';
    this.cdr.detectChanges();
  }

  // --- HÀM HỨNG FILE UPLOAD TỪ THƯ VIỆN ---
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedImageFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit() {
    if (!this.regData.cardUID) {
      this.showToast('Vui lòng quét hoặc nhập mã thẻ NFC!', 'warning');
      return;
    }
    if (!this.selectedImageFile) {
      this.showToast('Vui lòng tải lên ảnh chụp xe!', 'warning');
      return;
    }
    if (!this.regData.customerName) {
      this.showToast('Vui lòng nhập tên khách hàng!', 'warning');
      return;
    }

    this.isSubmitting = true;

    const formData = new FormData();
    formData.append('CardUID', this.regData.cardUID);
    formData.append('CustomerName', this.regData.customerName);
    formData.append('PhoneNumber', this.regData.phoneNumber);

    if (this.regData.registerPlate) {
      formData.append('RegisterPlate', this.regData.registerPlate);
    }

    formData.append('VehicleTypeID', this.regData.vehicleTypeID.toString());
    formData.append('DurationMonths', this.regData.durationMonths.toString());
    formData.append('VehicleImage', this.selectedImageFile);

    this.api.registerMonthly(formData).subscribe({
      next: (res: any) => {
        // FIX LỖI 1: Bắt đúng biến trả về từ C# (Đề phòng viết hoa/viết thường)
        const plate =
          res.detectedPlate ||
          res.DetectedPlate ||
          res.registerPlate ||
          this.regData.registerPlate ||
          'VeThang';

        this.showToast(
          `${res.message || res.Message || 'Đăng ký thành công!'}\nBiển số: ${plate}`,
          'success',
        );

        this.paymentAmount = this.calculateAmount(
          this.regData.vehicleTypeID,
          this.regData.durationMonths,
        );

        // Cấu hình ngân hàng
        const bankId = 'MB';
        const accountNo = '3775501172004';
        const accountName = 'HOANG NHAT HAO'; // In hoa không dấu
        const description = `Thanh toan the xe ${plate}`;

        // FIX LỖI 2: Mã hóa URL an toàn hơn bằng encodeURIComponent
        let url = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact.png?accountName=${encodeURIComponent(accountName)}&addInfo=${encodeURIComponent(description)}`;

        // FIX LỖI 3: Chỉ thêm tham số amount nếu giá tiền lớn hơn 0
        if (this.paymentAmount > 0) {
          url += `&amount=${this.paymentAmount}`;
        }
        console.log('Giá tiền:', this.paymentAmount);
        console.log('Dữ liệu QR:', {
          plate: plate,
          amount: this.paymentAmount,
          url: url,
        });
        this.qrUrl = url;

        // Kích hoạt hiển thị Modal QR
        this.showQRModal = true;
        this.isSubmitting = false;
        this.cdr.detectChanges(); // Ép UI cập nhật mượt mà
      },
      error: (err) => {
        this.showToast(
          err.error?.message || err.error || 'Lỗi đăng ký vé tháng!',
          'danger',
        );
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  closeQRAndReset() {
    this.showQRModal = false;
    this.resetForm();
    this.loadTickets();
  }

  resetForm() {
    this.regData = {
      cardUID: '',
      customerName: '',
      phoneNumber: '',
      registerPlate: '',
      vehicleTypeID: 1,
      durationMonths: 1,
    };
    this.selectedImageFile = null;
    this.imagePreview = null;
  }

  startNFC() {
    if (this.platform.is('capacitor') || this.platform.is('cordova')) {
      this.nfc.addTagDiscoveredListener().subscribe({
        next: (event: any) => this.handleTagEvent(event),
        error: (err) => console.error('Lỗi NFC Tag:', err),
      });

      this.nfc.addNdefListener().subscribe({
        next: (event: any) => this.handleTagEvent(event),
        error: (err) => console.error('Lỗi NFC NDEF:', err),
      });
    } else {
      console.warn(
        'NFC plugin chỉ hoạt động trên thiết bị thực (Android/iOS). Môi trường hiện tại là trình duyệt.',
      );
    }
  }

  handleTagEvent(event: any) {
    if (event && event.tag && event.tag.id) {
      const cardUID = this.nfc.bytesToHexString(event.tag.id).toUpperCase();
      this.regData.cardUID = cardUID;
      this.cdr.detectChanges();
      this.showToast('Đã nhận thẻ: ' + cardUID, 'success');
    }
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
  updatePaginatedTickets() {
    this.loadTickets();
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
      this.updatePaginatedTickets();
      this.generatePages();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedTickets();
      this.generatePages();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedTickets();
      this.generatePages();
    }
  }
}
