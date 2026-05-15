import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
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
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import * as icons from 'ionicons/icons';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { Api } from '../../services/api';
import { NFC, Ndef } from '@awesome-cordova-plugins/nfc/ngx';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

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
    IonSpinner,
    IonButton,
    IonLabel,
    IonItem,
    IonCol,
    IonCardTitle,
    IonCard,
    IonCardHeader,
    IonCardContent,
    IonRow,
    IonGrid,
    IonContent,
    IonIcon,
    CommonModule,
    FormsModule,
    NavbarComponent,
  ],
  providers: [NFC, Ndef],
})
export class TicketParkingPage implements OnInit {
  private api = inject(Api);
  private platform = inject(Platform);
  private toastCtrl = inject(ToastController);

  allMonthlyTickets: MonthlyTicketRecord[] = [];
  monthlyTickets: MonthlyTicketRecord[] = [];
  paginatedTickets: MonthlyTicketRecord[] = [];

  // Phân trang
  currentPage: number = 1;
  itemsPerPage: number = 5;
  totalPages: number = 1;
  visiblePages: (number | string)[] = [];

  filterStatus: string = 'all';

  isLoading = false;
  isSubmitting = false;

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
    private cdr: ChangeDetectorRef, // Ép UI cập nhật mượt mà
  ) {
    addIcons({ ...icons });
  }

  ngOnInit() {
    this.loadTickets();
    this.startNFC(); // Gọi lắng nghe thẻ ngầm
  }

  loadTickets() {
    this.isLoading = true;
    this.api.getMonthlyTickets().subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.allMonthlyTickets = res.data;
          this.applyFilters();
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Lỗi tải danh sách vé:', err);
        this.isLoading = false;
      },
    });
  }

  applyFilters() {
    if (this.filterStatus === 'active') {
      this.monthlyTickets = this.allMonthlyTickets.filter(
        (item) => item.isActive === true,
      );
    } else if (this.filterStatus === 'inactive') {
      this.monthlyTickets = this.allMonthlyTickets.filter(
        (item) => item.isActive === false,
      );
    } else {
      this.monthlyTickets = [...this.allMonthlyTickets];
    }
    this.currentPage = 1; // Reset về trang 1 khi lọc
    this.calculatePagination();
  }

  handleImageClick(fileInputElement: HTMLInputElement) {
    if (Capacitor.isNativePlatform()) {
      this.takePicture();
    } else {
      fileInputElement.click();
    }
  }

  async takePicture() {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
      });

      if (image.webPath) {
        this.imagePreview = image.webPath;

        const response = await fetch(image.webPath);
        const blob = await response.blob();
        const fileName = `xe_${new Date().getTime()}.${image.format}`;
        this.selectedImageFile = new File([blob], fileName, {
          type: `image/${image.format}`,
        });
        this.cdr.detectChanges(); // Ép UI cập nhật sau khi chọn ảnh
      }
    } catch (error) {
      console.log('User cancelled or error:', error);
    }
  }

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
      this.showToast(
        'Vui lòng tải lên ảnh chụp xe để AI đọc biển số!',
        'warning',
      );
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

    // Đã tích hợp vehicleTypeID gửi sang Backend
    formData.append('VehicleTypeID', this.regData.vehicleTypeID.toString());
    formData.append('DurationMonths', this.regData.durationMonths.toString());
    formData.append('VehicleImage', this.selectedImageFile);

    this.api.registerMonthly(formData).subscribe({
      next: (res: any) => {
        this.showToast(
          `${res.message}\nBiển số AI đọc được: ${res.detectedPlate}`,
          'success',
        );
        this.resetForm();
        this.loadTickets();
        this.isSubmitting = false;
        this.cdr.detectChanges();
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

  resetForm() {
    this.regData = {
      cardUID: '',
      customerName: '',
      phoneNumber: '',
      registerPlate: '',
      vehicleTypeID: 1, // Trả về mặc định là 1 khi reset
      durationMonths: 1,
    };
    this.selectedImageFile = null;
    this.imagePreview = null;
  }

  startNFC() {
    if (this.platform.is('capacitor') || this.platform.is('cordova')) {
      // 1. Lắng nghe thẻ NFC cơ bản (Thẻ trắng)
      this.nfc.addTagDiscoveredListener().subscribe({
        next: (event: any) => this.handleTagEvent(event),
        error: (err) => console.error('Lỗi NFC Tag:', err),
      });

      // 2. BẮT BUỘC: Lắng nghe thẻ có chứa dữ liệu NDEF để chặn Android tự mở link/app khác
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

  // Tách logic ra một hàm dùng chung cho cả 2 loại thẻ
  handleTagEvent(event: any) {
    if (event && event.tag && event.tag.id) {
      const cardUID = this.nfc.bytesToHexString(event.tag.id).toUpperCase();

      // Gán mã thẻ vào biến của trang Phát hành thẻ (regData)
      this.regData.cardUID = cardUID;

      // Ép màn hình điền mã thẻ ngay lập tức khi quẹt
      this.cdr.detectChanges();

      // Hiện thông báo (Bạn có thể dùng Toast thay cho alert cho đẹp hơn)
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
  calculatePagination() {
    this.totalPages = Math.ceil(this.monthlyTickets.length / this.itemsPerPage);

    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    } else if (this.totalPages === 0) {
      this.currentPage = 1;
    }

    this.updatePaginatedTickets();
    this.generatePages();
  }

  updatePaginatedTickets() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedTickets = this.monthlyTickets.slice(startIndex, endIndex);
  }

  // Hàm tạo mảng số trang hiển thị (vd: [1, 2, '...', 5])
  generatePages() {
    const current = this.currentPage;
    const total = this.totalPages;
    const delta = 1; // Số lượng trang hiển thị kề bên trang hiện tại
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
