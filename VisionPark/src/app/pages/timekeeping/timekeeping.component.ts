import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { Api } from '../../services/api';
import { CommonModule, registerLocaleData } from '@angular/common';
import { FormsModule } from '@angular/forms';
import localeVi from '@angular/common/locales/vi';
import {
  IonContent,
  IonGrid,
  IonRow,
  IonIcon,
} from '@ionic/angular/standalone';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { NotificationService } from '../../services/notification.service';

import { addIcons } from 'ionicons';
import {
  videocamOutline,
  cameraOutline,
  stopCircleOutline,
  videocamOffOutline,
  scanOutline,
  calendarOutline,
  todayOutline,
  hourglassOutline,
  timeOutline,
  refreshOutline,
  checkmarkCircle,
  fileTrayOutline,
} from 'ionicons/icons';

// Đăng ký dữ liệu ngôn ngữ tiếng Việt
registerLocaleData(localeVi, 'vi');

@Component({
  selector: 'app-timekeeping',
  standalone: true,
  imports: [
    IonIcon,
    IonRow,
    IonGrid,
    CommonModule,
    FormsModule,
    IonContent,
    NavbarComponent,
  ],
  templateUrl: './timekeeping.component.html',
  styleUrls: ['./timekeeping.component.scss'],
})
export class TestScanFaceComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
  @ViewChild('overlayCanvas') overlayCanvas!: ElementRef<HTMLCanvasElement>;

  imageBase64: string | null = null;
  scanResult: any = null;
  attendanceSummary: any[] = [];
  isCameraOn = false;
  stream: MediaStream | null = null;
  trackingInterval: any;
  isProcessing = false;

  recognitionResult: any = null;

  // Đồng hồ
  currentTime: Date = new Date();
  clockInterval: any;

  constructor(
    private api: Api,
    private notification: NotificationService,
  ) {
    // Thêm icons cần thiết cho giao diện mới
    addIcons({
      videocamOutline,
      cameraOutline,
      stopCircleOutline,
      videocamOffOutline,
      scanOutline,
      calendarOutline,
      todayOutline,
      hourglassOutline,
      timeOutline,
      refreshOutline,
      checkmarkCircle,
      fileTrayOutline,
    });
  }

  ngOnInit() {
    this.loadAttendanceSummary();
    this.clockInterval = setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  ngOnDestroy() {
    this.stopCamera();
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  async startCamera() {
    if (this.isCameraOn) return;
    try {
      // Yêu cầu quyền truy cập webcam
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      // Gán luồng video vào element <video>
      this.isCameraOn = true;
      this.imageBase64 = null; // Xóa ảnh đã chụp trước đó
      this.scanResult = null;

      // Chờ Angular render thẻ video xong mới gán luồng và chạy tracking
      setTimeout(() => {
        this.videoElement.nativeElement.srcObject = this.stream;
        this.startFaceTracking();
      }, 100);
    } catch (err: any) {
      console.error('Lỗi truy cập webcam: ', err);
      this.notification.showToast(
        'Không thể truy cập webcam. Vui lòng cấp quyền và thử lại.',
        'danger',
      );
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.isCameraOn = false;
      this.stream = null;
      this.stopFaceTracking();
    }
  }

  startFaceTracking() {
    // Gửi ảnh liên tục mỗi 600ms để tìm khuôn mặt realtime
    this.trackingInterval = setInterval(() => {
      this.detectLiveFace();
    }, 600);
  }

  stopFaceTracking() {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
    }
    const canvas = this.overlayCanvas?.nativeElement;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  detectLiveFace() {
    if (!this.isCameraOn || !this.videoElement) return;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const ctx = canvas.getContext('2d');

    if (ctx && video.videoWidth > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Giảm chất lượng ảnh (0.4) để API xử lý realtime mượt hơn
      const base64 = canvas.toDataURL('image/jpeg', 0.4);

      this.api.detectFaceLive(base64).subscribe({
        next: (res) => {
          this.drawBoundingBoxes(
            res.faces,
            video.videoWidth,
            video.videoHeight,
          );
        },
        error: (err: any) => {
          console.error('Lỗi tracking API:', err);
        },
      });
    }
  }

  drawBoundingBoxes(faces: any[], width: number, height: number) {
    const canvas = this.overlayCanvas?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (faces && faces.length > 0) {
      ctx.strokeStyle = '#2dd4bf'; // Đổi viền sang màu Teal cao cấp
      ctx.lineWidth = 4;
      faces.forEach((face) => {
        const x = face.x || face.X;
        const y = face.y || face.Y;
        const w = face.width || face.Width;
        const h = face.height || face.Height;

        const cornerLen = 20; // Chiều dài của góc vuông

        ctx.beginPath();
        // Vẽ góc vuông trên - trái
        ctx.moveTo(x, y + cornerLen);
        ctx.lineTo(x, y);
        ctx.lineTo(x + cornerLen, y);

        // Vẽ góc vuông trên - phải
        ctx.moveTo(x + w - cornerLen, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + cornerLen);

        // Vẽ góc vuông dưới - phải
        ctx.moveTo(x + w, y + h - cornerLen);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x + w - cornerLen, y + h);

        // Vẽ góc vuông dưới - trái
        ctx.moveTo(x + cornerLen, y + h);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x, y + h - cornerLen);

        ctx.stroke();
      });
    }
  }

  captureImage() {
    if (!this.isCameraOn) return;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');

    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const capturedImage = canvas.toDataURL('image/jpeg');
      this.stopCamera(); // Tự động tắt camera sau khi chụp

      this.handleRecognition(capturedImage);
    }
  }

  // Xử lý khi người dùng chọn ảnh
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const imageBase64 = e.target.result;
        this.imageBase64 = imageBase64; // for preview
        this.scanResult = null;
        this.handleRecognition(imageBase64);
      };
      reader.readAsDataURL(file);
    }
  }

  handleRecognition(imageBase64: string) {
    this.recognitionResult = null; // Reset
    this.isProcessing = true; // Bật Loading

    // Xóa bỏ tiền tố "data:image/jpeg;base64," hoặc tương tự trước khi gửi lên API
    const cleanBase64 = imageBase64.includes(',')
      ? imageBase64.split(',')[1]
      : imageBase64;

    this.api.recognizeFace(cleanBase64).subscribe({
      next: (res) => {
        this.isProcessing = false; // Tắt Loading
        if (res.success) {
          this.recognitionResult = res.user;
          this.loadAttendanceSummary(); // Tải lại lịch sử chấm công
          this.notification.showToast(
            `Nhận diện thành công: ${res.user.fullName}`,
            'success',
          );
        } else {
          this.notification.showToast(res.message, 'danger');
        }
      },
      error: (err: any) => {
        this.isProcessing = false;
        this.notification.showToast(
          err.error?.message || 'Lỗi khi nhận diện khuôn mặt.',
          'danger',
        );
      },
    });
  }

  // Gọi API lấy lịch sử chấm công đã được xử lý
  loadAttendanceSummary() {
    this.api.getAttendanceSummary().subscribe({
      next: (res: any) => {
        this.attendanceSummary = res.data || res;
      },
      error: (err: any) => {
        this.notification.showToast(
          err.error?.message || 'Lỗi khi tải lịch sử chấm công.',
          'danger',
        );
        // err.error chứa đoạn JSON { Message: "...", Error: "..." } từ Backend
        console.error('Lỗi Backend trả về:', err.error?.error || err.message);
        this.attendanceSummary = []; // Xóa trắng danh sách nếu API lỗi
      },
    });
  }
}
