import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonBadge,
  IonList,
  IonItem,
  IonInput,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonSelect,
  IonSelectOption,
  IonIcon,
  IonButton,
  IonLabel,
  IonHeader,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import * as icons from 'ionicons/icons';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { Api } from '../../services/api'; // Hãy đảm bảo Api service có chứa 2 hàm gọi API bên dưới

// Interface hứng dữ liệu từ GET /api/Ticket/monthly-tickets
interface MonthlyTicketRecord {
  ticketId: number;
  customerName: string;
  phoneNumber: string;
  registerPlate: string;
  vehicleType: string;
  cardUID: string;
  startDate: string; // C# trả về chuỗi dd/MM/yyyy
  endDate: string; // C# trả về chuỗi dd/MM/yyyy
  isActive: boolean;
  status: string;
}

@Component({
  selector: 'app-monthly-ticket',
  templateUrl: './ticket-parking.page.html',
  styleUrls: ['./ticket-parking.page.scss'],
  standalone: true,
  imports: [
    IonToolbar,
    IonHeader,
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
    IonList,
    IonSelect,
    IonSelectOption,
    IonIcon,
    IonButton,
    IonLabel,
    CommonModule,
    FormsModule,
    NavbarComponent,
  ],
})
export class TicketParkingPage implements OnInit {
  private api = inject(Api);

  // Danh sách vé tháng
  monthlyTickets: MonthlyTicketRecord[] = [];

  // Trạng thái load
  isLoading = false;
  isSubmitting = false;

  // Dữ liệu Form đăng ký
  regData = {
    cardUID: '',
    customerName: '',
    phoneNumber: '',
    vehicleTypeID: 1, 
    durationMonths: 1,
  };

  // Xử lý ảnh tải lên
  selectedImageFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;

  constructor() {
    addIcons({ ...icons });
  }

  ngOnInit() {
    this.loadTickets();
  }

  // 1. GỌI API LẤY DANH SÁCH VÉ THÁNG
  loadTickets() {
    this.isLoading = true;
    // Lưu ý: Thêm hàm getMonthlyTickets() vào file Api Service của bạn
    this.api.getMonthlyTickets().subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.monthlyTickets = res.data;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Lỗi tải danh sách vé:', err);
        this.isLoading = false;
      },
    });
  }

  // 2. XỬ LÝ KHI CHỌN ẢNH TỪ MÁY
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedImageFile = file;

      // Tạo preview để hiện ảnh lên giao diện
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  // 3. GỬI FORM ĐĂNG KÝ VÉ THÁNG
  onSubmit() {
    // Validate cơ bản
    if (!this.regData.cardUID)
      return alert('Vui lòng quét hoặc nhập mã thẻ NFC!');
    if (!this.selectedImageFile)
      return alert('Vui lòng tải lên ảnh chụp xe để AI đọc biển số!');
    if (!this.regData.customerName)
      return alert('Vui lòng nhập tên khách hàng!');

    this.isSubmitting = true;

    // Tạo FormData vì API yêu cầu [FromForm] và có chứa File ảnh
    const formData = new FormData();
    formData.append('CardUID', this.regData.cardUID);
    formData.append('CustomerName', this.regData.customerName);
    formData.append('PhoneNumber', this.regData.phoneNumber);
    formData.append('VehicleTypeID', this.regData.vehicleTypeID.toString());
    formData.append('DurationMonths', this.regData.durationMonths.toString());
    formData.append('VehicleImage', this.selectedImageFile);

    // Lưu ý: Thêm hàm registerMonthly(formData) vào file Api Service của bạn
    this.api.registerMonthly(formData).subscribe({
      next: (res: any) => {
        alert(`${res.message}\nBiển số AI đọc được: ${res.detectedPlate}`);
        this.resetForm();
        this.loadTickets(); // Tải lại danh sách
        this.isSubmitting = false;
      },
      error: (err) => {
        alert(err.error?.message || err.error || 'Lỗi đăng ký vé tháng!');
        this.isSubmitting = false;
      },
    });
  }

  resetForm() {
    this.regData = {
      cardUID: '',
      customerName: '',
      phoneNumber: '',
      vehicleTypeID: 1,
      durationMonths: 1,
    };
    this.selectedImageFile = null;
    this.imagePreview = null;
  }
}
