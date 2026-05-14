import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonIcon,
  IonSpinner,
  Platform,
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import * as icons from 'ionicons/icons';

import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { Api } from '../../services/api';

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-attendance',
  templateUrl: './attendance.page.html',
  styleUrls: ['./attendance.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonIcon,
    IonSpinner,
    CommonModule,
    FormsModule,
    NavbarComponent,
  ],
})
export class AttendancePage {
  private api = inject(Api);
  private cdr = inject(ChangeDetectorRef);
  private platform = inject(Platform);

  isNativePlatform = Capacitor.isNativePlatform();

  photoFile: File | null = null;
  photoPreview: string | ArrayBuffer | null = null;

  isLoading = false;
  resultData: any = null;
  employeeImageUrl: string | null = null; // Biến lưu URL ảnh gốc nhân viên

  constructor() {
    addIcons({ ...icons });
  }

  // Chụp ảnh bằng camera
  async takePicture() {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
      });

      if (image.webPath) {
        this.photoPreview = image.webPath;

        const response = await fetch(image.webPath);
        const blob = await response.blob();
        const fileName = `attendance_${new Date().getTime()}.${image.format}`;

        this.photoFile = new File([blob], fileName, {
          type: `image/${image.format}`,
        });

        this.resultData = null;
        this.employeeImageUrl = null;
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.log('User cancelled camera or error:', error);
    }
  }

  // Chọn ảnh từ máy tính (dành cho browser)
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.photoFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.photoPreview = reader.result;
        this.resultData = null;
        this.employeeImageUrl = null;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  // Gửi ảnh chấm công lên Server
  submitCheckIn() {
    if (!this.photoFile) return;

    this.isLoading = true;
    this.resultData = null;
    this.employeeImageUrl = null;

    const formData = new FormData();
    formData.append('image', this.photoFile);

    this.api.checkInAttendance(formData).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.resultData = res.data;

          // Xử lý hiển thị ảnh gốc nhân viên từ thư mục tĩnh của .NET
          // Logic: Lấy URL cơ sở (bỏ /api) và nối với đường dẫn ảnh nhân viên
          const baseStaticUrl = (this.api as any).baseUrl.replace('/api', '');

          if (res.data.employeeImageFileName) {
            this.employeeImageUrl = `${baseStaticUrl}/images/employees/${res.data.employeeImageFileName}`;
          }
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        alert(
          err.error?.message ||
            err.error ||
            'Nhận diện thất bại! Không tìm thấy nhân viên trong hệ thống.',
        );
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // Reset để tiếp tục điểm danh
  reset() {
    this.photoFile = null;
    this.photoPreview = null;
    this.resultData = null;
    this.employeeImageUrl = null;
    this.cdr.detectChanges();
  }
}
