import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Api } from '../../services/api'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-test-scan-face',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './test-scan-face.component.html',
  styleUrls: ['./test-scan-face.component.scss']
})
export class TestScanFaceComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
  @ViewChild('overlayCanvas') overlayCanvas!: ElementRef<HTMLCanvasElement>;

  imageBase64: string | null = null;
  scanResult: any = null;
  historyList: any[] = [];
  isCameraOn = false;
  stream: MediaStream | null = null;
  trackingInterval: any;

  // Thuộc tính mới cho chấm công
  mode: 'register' | 'recognize' = 'recognize';
  users: any[] = [];
  selectedUserId: number | null = null;
  recognitionResult: any = null;

  constructor(private api: Api) {}

  ngOnInit() {
    this.loadHistory();
    this.loadUsers();
  }

  // Tự động tìm và trả về thông tin nhân viên đang được chọn
  get selectedUser() {
    return this.users.find(u => u.userID === this.selectedUserId);
  }

  loadUsers() {
    this.api.getAllUsers().subscribe({
      next: (res: any) => {
        if (res && res.data) {
          // Chuẩn hóa tên thuộc tính ID (chữ thường/hoa) do Backend trả về
          this.users = res.data.map((item: any) => ({
             ...item, userID: item.userId || item.UserID || item.userID
          }));
        }
      },
      error: (err) => {
        console.error("Lỗi tải danh sách người dùng:", err);
        alert("Không thể tải danh sách người dùng.");
      }
    });
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  async startCamera() {
    if (this.isCameraOn) return;
    try {
      // Yêu cầu quyền truy cập webcam
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
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
    } catch (err) {
      console.error("Lỗi truy cập webcam: ", err);
      alert("Không thể truy cập webcam. Vui lòng cấp quyền và thử lại.");
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
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
          this.drawBoundingBoxes(res.faces, video.videoWidth, video.videoHeight);
        },
        error: (err) => {
          console.error("Lỗi tracking API:", err);
        }
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
      ctx.strokeStyle = '#00ff00'; // Đổi viền xanh lá cho tracking
      ctx.lineWidth = 4;
      faces.forEach(face => {
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
      
      if (this.mode === 'register') {
        this.handleRegistration(capturedImage);
      } else {
        this.handleRecognition(capturedImage);
      }
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
        if (this.mode === 'register') {
          this.handleRegistration(imageBase64);
        } else {
          this.handleRecognition(imageBase64);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  // Gọi API quét khuôn mặt
  scanFace() {
    // This function is now obsolete, replaced by handleRegistration and handleRecognition
    // You can remove it or leave it.
  }

  handleRegistration(imageBase64: string) {
    if (!this.selectedUserId) {
      alert("Vui lòng chọn một nhân viên để đăng ký.");
      return;
    }
    this.api.registerFace(this.selectedUserId, imageBase64).subscribe({
      next: (res) => {
        alert(res.message);
        this.recognitionResult = null; // Clear previous results
        this.loadHistory(); // Tải lại lịch sử để xem ảnh mới
        this.loadUsers(); // Tải lại danh sách nhân viên để cập nhật ảnh khuôn mặt trong khung Preview
      },
      error: (err) => {
        alert(err.error?.message || "Lỗi khi đăng ký khuôn mặt.");
      }
    });
  }

  handleRecognition(imageBase64: string) {
    this.recognitionResult = null; // Reset
    this.api.recognizeFace(imageBase64).subscribe({
      next: (res) => {
        if (res.success) {
          this.recognitionResult = res.user;
          alert(`Nhận diện thành công: ${res.user.fullName}`);
        } else {
          alert(res.message);
        }
      },
      error: (err) => {
        alert(err.error?.message || "Lỗi khi nhận diện khuôn mặt.");
      }
    });
  }

  // Gọi API lấy lịch sử
  loadHistory() {
    this.api.getFaceHistory().subscribe({
      next: (res) => {
        this.historyList = res;
      },
      error: (err) => {
        console.error('Lỗi khi lấy lịch sử', err);
        alert('Không tải được lịch sử. Hãy kiểm tra lại Backend hoặc bảng FaceRecords!');
      }
    });
  }
}
