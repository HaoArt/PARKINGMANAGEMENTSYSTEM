import { Component, OnInit, OnDestroy, inject, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonIcon,
  IonList,
  IonBadge,
  ToastController,
  IonAvatar,
  IonText,
  IonNote,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { Api } from '../../services/api';
import { NFC, Ndef } from '@awesome-cordova-plugins/nfc/ngx';
import { Platform } from '@ionic/angular/standalone';

import {
  idCardOutline,
  carOutline,
  bicycleOutline,
  timeOutline,
  checkmarkCircleOutline,
  addOutline,
  logInOutline,
  scanOutline,
  alertCircleOutline,
  helpOutline,
  warningOutline,
  carSportOutline,
  fileTrayOutline, // Thêm icons cho UI mới & Toast
  cameraOutline,
  apertureOutline,
  closeOutline,
} from 'ionicons/icons';

// Giao diện dữ liệu chuẩn hóa theo thiết kế Database của bạn
interface CheckInRecord {
  CardUid: string;
  PlateNumber: string;
  VehicleType: string;
  TimeIn: Date;
}

@Component({
  selector: 'app-check-in',
  templateUrl: './check-in.page.html',
  styleUrls: ['./check-in.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonIcon,
    IonList,
    IonBadge,
    IonAvatar,
    IonText,
    IonNote,
    CommonModule,
    FormsModule,
  ],
  providers: [NFC, Ndef]
})
export class CheckInPage implements OnInit, OnDestroy {
  // Model liên kết với Form
  CheckInData = {
    CardUid: '',
    PlateNumber: '',
    VehicleType: 'Xe máy',
  };

  private toastCtrl = inject(ToastController);
  private api = inject(Api);
  private nfc = inject(NFC);
  private platform = inject(Platform);
  private cdr = inject(ChangeDetectorRef);

  // --- CAMERA ---
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
  isCameraOn = false;
  stream: MediaStream | null = null;
  plateImageBase64: string | null = null;
  isLoading = false;
  requiresForcePass = false;

  // Danh sách lịch sử Check-in tạm thời
  RecentCheckIns: CheckInRecord[] = [];

  constructor() {
    // Đăng ký các icon sẽ dùng trên giao diện
    addIcons({
      idCardOutline,
      carOutline,
      bicycleOutline,
      timeOutline,
      checkmarkCircleOutline,
      addOutline,
      logInOutline,
      scanOutline,
      alertCircleOutline,
      helpOutline,
      warningOutline,
      carSportOutline,
      fileTrayOutline,
      cameraOutline,
      apertureOutline,
      closeOutline,
    });
  }

  ngOnInit() {
    this.startNFC();
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  startNFC() {
    if (this.platform.is('capacitor') || this.platform.is('cordova')) {
      this.nfc.addTagDiscoveredListener().subscribe((event: any) => this.handleTagEvent(event));
      this.nfc.addNdefListener().subscribe((event: any) => this.handleTagEvent(event));
    }
  }

  handleTagEvent(event: any) {
    if (event && event.tag && event.tag.id) {
      this.CheckInData.CardUid = this.nfc.bytesToHexString(event.tag.id).toUpperCase();
      this.cdr.detectChanges();
      this.showToast('Đã nhận mã thẻ: ' + this.CheckInData.CardUid, 'success');
      
      if (this.isCameraOn) this.capturePlate();
    }
  }

  async startCamera() {
    if (this.isCameraOn) return;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      this.isCameraOn = true;
      setTimeout(() => {
        if (this.videoElement) this.videoElement.nativeElement.srcObject = this.stream;
      }, 100);
    } catch (err) {
      this.showToast('Không thể mở Camera!', 'danger');
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.isCameraOn = false;
      this.stream = null;
    }
  }

  capturePlate() {
    if (!this.isCameraOn || !this.videoElement || !this.canvasElement) return;
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');
    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      this.plateImageBase64 = canvas.toDataURL('image/jpeg');
      this.showToast('Đã chụp ảnh biển số!', 'success');
    }
  }

  clearPlate() {
    this.plateImageBase64 = null;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.plateImageBase64 = e.target.result;
      };
      reader.readAsDataURL(file);
    }
    event.target.value = '';
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

  // Hàm xử lý khi bấm nút "Xác nhận vào bãi"
  onSubmit(forcePass: boolean = false) {
    if (!this.CheckInData.CardUid) {
      this.showToast('Vui lòng nhập hoặc quẹt Mã thẻ!', 'warning');
      return;
    }

    this.isLoading = true;
    const vehicleTypeId = this.CheckInData.VehicleType === 'Ô tô' ? 2 : 1;
    
    // Gọi AI Backend thực tế để nhận diện biển số & đối chiếu thẻ
    this.api.scanCard(
      this.CheckInData.CardUid, 
      undefined, 
      undefined, 
      this.plateImageBase64 || undefined, 
      vehicleTypeId, 
      forcePass
    ).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.requiresForcePass = false;
        this.showToast(res.message, 'success');
        
        this.RecentCheckIns.unshift({
          CardUid: this.CheckInData.CardUid,
          PlateNumber: res.data?.plateNumber || 'N/A',
          VehicleType: res.data?.vehicleType || this.CheckInData.VehicleType,
          TimeIn: new Date()
        });

        this.CheckInData.CardUid = '';
        this.CheckInData.PlateNumber = '';
        this.clearPlate();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isLoading = false;
        const errData = err.error || {};
        this.showToast(errData.message || 'Lỗi xử lý thẻ!', 'danger');
        
        // Nếu AI phát hiện biển số không khớp, Backend sẽ yêu cầu Force Pass
        if (errData.requiresForcePass || errData.RequiresForcePass) {
           this.requiresForcePass = true;
        }
        this.cdr.detectChanges();
      }
    });
  }

  forcePass() {
    this.onSubmit(true);
  }
}
