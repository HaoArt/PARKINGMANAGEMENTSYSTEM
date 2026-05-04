import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core'; // Thêm ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {

  IonContent,
  IonIcon,
  IonGrid,
  IonRow,
  IonCardContent,
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


  allMonthlyTickets: MonthlyTicketRecord[] = [];
  monthlyTickets: MonthlyTicketRecord[] = [];

  filterStatus: string = 'all';

  isLoading = false;
  isSubmitting = false;

  regData = {
    cardUID: '',
    customerName: '',
    phoneNumber: '',

    registerPlate: '',
    vehicleTypeID: 1,

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

    if (!this.regData.cardUID)
      return alert('Vui lòng quét hoặc nhập mã thẻ NFC!');
    if (!this.selectedImageFile)
      return alert('Vui lòng tải lên ảnh chụp xe để AI đọc biển số!');
    if (!this.regData.customerName)
      return alert('Vui lòng nhập tên khách hàng!');

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
        alert(`${res.message}\nBiển số AI đọc được: ${res.detectedPlate}`);
        this.resetForm();
        this.loadTickets();
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        alert(err.error?.message || err.error || 'Lỗi đăng ký vé tháng!');
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
      vehicleTypeID: 1,
      durationMonths: 1,

    };
    this.selectedImageFile = null;
    this.imagePreview = null;
  }


  startNFC() {
    this.nfc.addTagDiscoveredListener().subscribe((event: any) => {
      const cardUID = this.nfc.bytesToHexString(event.tag.id).toUpperCase();
      this.regData.cardUID = cardUID;

      // Chìa khóa: Ép màn hình điền mã thẻ ngay lập tức khi quẹt
      this.cdr.detectChanges();

      // Bạn có thể giữ alert hoặc bỏ đi vì giờ thẻ quẹt sẽ nhảy thẳng vào ô input rất mượt
      alert('Đã nhận thẻ: ' + cardUID);
    });
  }
}

