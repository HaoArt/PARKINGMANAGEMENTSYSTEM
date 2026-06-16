import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
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
  IonButton,
  IonIcon,
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
import {
  scanOutline,
  idCardOutline,
  radioOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  informationCircleOutline,
  cardOutline,
  chevronDownOutline,
  searchOutline,
  downloadOutline,
  documentTextOutline,
  chevronBackOutline,
  chevronForwardOutline,
  carSportOutline, // Đã thêm
  bicycleOutline, // Đã thêm
  cameraOutline,
  apertureOutline,
  stopCircleOutline,
  personOutline,
  videocamOffOutline,
  imageOutline,
  trashOutline, closeOutline, warningOutline, filterOutline,
  alertCircleOutline } from 'ionicons/icons';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { Api } from '../../services/api';
// 👉 THÊM PLUGIN NFC
import { NFC, Ndef } from '@awesome-cordova-plugins/nfc/ngx';

interface ParkingRecord {
  nfcId: string;
  cardType?: string;
  plateNumberIn: string;
  plateNumberOut: string;
  vehicleType: string;
  checkInTime: string;
  checkOutTime: string;
  status: 'In' | 'Out';
  faceImageUrlIn?: string;
  faceImageUrlOut?: string;
  vehicleImageUrlIn?: string;
  vehicleImageUrlOut?: string;
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
  totalCost?: number;
  cardType?: string;
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
    IonIcon,
    CommonModule,
    FormsModule,
    NavbarComponent,
  ],
  providers: [NFC, Ndef], // 👉 CẤP QUYỀN SỬ DỤNG NFC CHO COMPONENT NÀY
})
export class HistoryPage implements OnInit, OnDestroy {
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

  // --- BIẾN CAMERA ---
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
  isCameraOn = false;
  stream: MediaStream | null = null;
  plateImageBase64: string | null = null;
  faceImageBase64: string | null = null;
  selectedVehicleType: number = 2; // 1: Ô tô, 2: Xe máy mặc định
  requiresForcePass = false;
  lastFailedCardInfo: { nfcId: string, cardToken?: string } | null = null;

  constructor(
    private nfc: NFC, // Tiêm NFC
    private cdr: ChangeDetectorRef, // Tiêm ChangeDetectorRef để chống đơ màn hình
  ) {
    addIcons({scanOutline,idCardOutline,carSportOutline,bicycleOutline,videocamOffOutline,closeOutline,imageOutline,radioOutline,cardOutline,warningOutline,filterOutline,chevronDownOutline,searchOutline,downloadOutline,documentTextOutline,chevronBackOutline,chevronForwardOutline,cameraOutline,personOutline,stopCircleOutline,checkmarkCircleOutline,closeCircleOutline,informationCircleOutline,apertureOutline,trashOutline,alertCircleOutline});
  }

  ngOnInit() {
    this.fetchData();
    this.startNFC(); // 👉 KÍCH HOẠT LẮNG NGHE QUẸT THẺ TỰ ĐỘNG
  }

  ngOnDestroy() {
    this.stopCamera();
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

      // Giải mã dữ liệu NDEF (Mật khẩu phần mềm) để chống thẻ giả
      let cardToken = '';
      if (event.tag.ndefMessage && event.tag.ndefMessage.length > 0) {
        const payload = event.tag.ndefMessage[0].payload;
        // Decode payload của chuẩn NDEF Text (Bỏ qua 3 byte đầu chứa độ dài và mã ngôn ngữ 'en')
        cardToken = this.nfc.bytesToString(payload).substring(3);
      }

      this.inputNfcId = scannedUID;
      this.cdr.detectChanges();
      this.showToast('Đã nhận mã thẻ: ' + scannedUID, 'success');

      // Tự động gọi API và truyền kèm CardToken vừa giải mã được
      this.onProcessCard(scannedUID, cardToken);
    }
  }

  // Hàm gọi API lấy dữ liệu đã lọc từ Backend
  fetchData() {
    this.isLoading = true;
    const params = {
      searchTerm: this.filterConfig.plateNumber,
      status: this.filterConfig.status,
      pageNumber: this.currentPage,
      pageSize: this.itemsPerPage, 
    };

    this.api.getParkingHistory(params).subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.parkingHistory = res.data.map((item: any) => ({
            ...item,
            cardType: item.cardType || item.CardType || 'Guest',
            faceImageUrlIn: item.faceImageUrlIn || item.FaceImageUrlIn ? this.api.getFullImageUrl(item.faceImageUrlIn || item.FaceImageUrlIn) : undefined,
            faceImageUrlOut: item.faceImageUrlOut || item.FaceImageUrlOut ? this.api.getFullImageUrl(item.faceImageUrlOut || item.FaceImageUrlOut) : undefined,
            vehicleImageUrlIn: item.vehicleImageUrlIn || item.VehicleImageUrlIn ? this.api.getFullImageUrl(item.vehicleImageUrlIn || item.VehicleImageUrlIn) : undefined,
            vehicleImageUrlOut: item.vehicleImageUrlOut || item.VehicleImageUrlOut ? this.api.getFullImageUrl(item.vehicleImageUrlOut || item.VehicleImageUrlOut) : undefined,
          }));
        } else {
          this.parkingHistory = [];
        }

        this.paginatedHistory = this.parkingHistory;
        const totalCount = res?.totalCount || res?.TotalCount || 0;
        this.totalPages = Math.ceil(totalCount / this.itemsPerPage) || 1;
        this.generatePages();

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
    this.currentPage = 1;
    this.fetchData();
  }

  // Nhận từ khóa tìm kiếm từ Navbar và tự động cập nhật bảng
  onNavbarSearch(searchTerm: string) {
    this.filterConfig.plateNumber = searchTerm;
    this.applyFilters();
  }

  // Thêm tham số tùy chọn cardToken (những lúc nhập tay trên màn hình sẽ không có tham số này)
  onProcessCard(nfcId: string, cardToken?: string, forcePass: boolean = false) {
    if (!nfcId) {
      this.showToast('Vui lòng nhập hoặc quét mã thẻ!', 'warning');
      return;
    }

    // Đã lược bỏ quét khuôn mặt khi ra/vào để giảm tải
    const faceImage = undefined;
    const plateImage = this.plateImageBase64 ? this.plateImageBase64 : undefined;

    this.isLoading = true;
    this.api.scanCard(nfcId, cardToken, faceImage, plateImage, this.selectedVehicleType, forcePass).subscribe({
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
          cardType: data?.cardType || data?.CardType || 'Guest',
          isSuccess: res.action === 'CHECK_IN' || res.action === 'CHECK_OUT',
          totalCost: data?.totalCost || data?.TotalCost || 0,
        };

        // Hiển thị Toast thông báo rõ ràng cho bảo vệ
        if (this.scanResult.isSuccess) {
          this.showToast(this.scanResult.message, 'success');
          
          // Nếu vé sắp hết hạn (dưới 7 ngày), hiển thị thêm cảnh báo màu vàng
          const currentStatus = this.scanResult.status;
          if (currentStatus && currentStatus.includes('Sắp hết hạn')) {
             setTimeout(() => {
                 this.showToast(`CẢNH BÁO: Thẻ ${currentStatus}`, 'warning');
             }, 500); // Trễ 0.5s để không đè lên thông báo thành công
          }
        } else {
          // Bị BLOCK (Hết hạn, bị khóa...) - Hiện màu đỏ
          this.showToast(this.scanResult.message, 'danger');
        }

        this.inputNfcId = ''; // Xoá trắng ô text box
        this.clearImage(); // Xoá ảnh khuôn mặt để sẵn sàng cho xe tiếp theo
        this.requiresForcePass = false;
        this.lastFailedCardInfo = null;
        this.fetchData(); // Quẹt xong thì load lại bảng lịch sử mới nhất
      },
      error: (err) => {
        const errData = err.error || {};
        this.scanResult = {
          action: 'ERROR',
          message: errData.message || errData.Message || err.error || 'Lỗi xử lý thẻ!',
          customerName: '---',
          plateNumber: '---',
          vehicleType: '---',
          expiryDate: '---',
          status: '---',
          isSuccess: false,
        };

        const isForcePassReq = errData.requiresForcePass || errData.RequiresForcePass;
        if (isForcePassReq) {
          this.requiresForcePass = true;
          this.lastFailedCardInfo = { nfcId, cardToken };
        } else {
          this.requiresForcePass = false;
          this.lastFailedCardInfo = null;
        }

        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  forcePass() {
    if (this.lastFailedCardInfo) {
      this.onProcessCard(this.lastFailedCardInfo.nfcId, this.lastFailedCardInfo.cardToken, true);
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
  updatePaginatedHistory() {
    this.fetchData();
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
    this.isLoading = true;
    this.showToast('Đang khởi tạo báo cáo PDF từ Server...', 'success');

    this.api.exportParkingHistoryPdf(this.filterConfig).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Bao_Cao_Giao_Dich_${new Date().getTime()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.showToast('Lỗi khi tải file báo cáo!', 'danger');
        console.error('Lỗi xuất PDF:', err);
      },
    });
  }

  // --- LOGIC CAMERA ---
  async startCamera() {
    if (this.isCameraOn) return;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      this.isCameraOn = true;
      setTimeout(() => {
        if (this.videoElement) this.videoElement.nativeElement.srcObject = this.stream;
      }, 100);
    } catch (err: any) {
      console.error('Lỗi truy cập webcam: ', err);
      this.showToast('Không thể truy cập webcam.', 'danger');
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.isCameraOn = false;
      this.stream = null;
    }
  }

  capturePlate() {
    this.plateImageBase64 = this.captureFromVideo();
  }

  captureFaceAndSearch() {
    const faceBase64 = this.captureFromVideo();
    if (!faceBase64) return;
    
    this.isLoading = true;
    this.showToast('Đang tìm kiếm khuôn mặt trong hệ thống...', 'warning');
    this.api.findCardByFace(faceBase64).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.cardUID) {
          this.inputNfcId = res.cardUID;
          this.showToast(`Tìm thấy thẻ của: ${res.customerName}`, 'success');
          this.onProcessCard(res.cardUID);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.showToast(err.error?.message || err.error?.Message || 'Không tìm thấy thẻ phù hợp!', 'danger');
      }
    });
  }

  captureFromVideo(): string | null {
    if (!this.isCameraOn || !this.videoElement || !this.canvasElement) return null;
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');
    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg');
    }
    return null;
  }

  // Hàm tải ảnh từ thiết bị để Test AI
  onFileSelected(event: any, type: 'plate' | 'face') {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        if (type === 'plate') {
          this.plateImageBase64 = e.target.result;
        }
      };
      reader.readAsDataURL(file);
    }
    
    // Reset lại value của thẻ input để lần sau chọn lại chính ảnh đó vẫn hoạt động bình thường
    event.target.value = '';
  }

  clearPlate() { this.plateImageBase64 = null; }
  clearFace() { this.faceImageBase64 = null; }

  clearImage() {
    this.clearPlate();
    this.clearFace();
  }
}
