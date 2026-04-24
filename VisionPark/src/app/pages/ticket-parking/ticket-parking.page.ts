import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonIcon, IonGrid, IonRow, IonCardContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import * as icons from 'ionicons/icons';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { Api } from '../../services/api'; 

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
  imports: [IonCardContent, IonRow, IonGrid, 
    IonContent, IonIcon, CommonModule, FormsModule, NavbarComponent,
  ],
})
export class TicketParkingPage implements OnInit {
  private api = inject(Api);

  allMonthlyTickets: MonthlyTicketRecord[] = []; // Mảng gốc lưu toàn bộ dữ liệu
  monthlyTickets: MonthlyTicketRecord[] = [];    // Mảng hiển thị (đã qua bộ lọc)
  
  filterStatus: string = 'all'; // Biến lưu trạng thái lọc mặc định
  searchTerm: string = '';      // Từ khóa tìm kiếm
  currentPage: number = 1;      // Biến lưu trang hiện tại
  
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

  constructor() {
    addIcons({ ...icons });
  }

  ngOnInit() {
    this.loadTickets();
  }

  loadTickets() {
    this.isLoading = true;
    this.api.getMonthlyTickets().subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.allMonthlyTickets = res.data;
          this.applyFilters(); // Gọi hàm lọc ngay sau khi tải xong dữ liệu
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Lỗi tải danh sách vé:', err);
        this.isLoading = false;
      },
    });
  }

  // Hàm xử lý Lọc dữ liệu
  applyFilters() {
    this.currentPage = 1; // Luôn đưa về trang 1 mỗi khi gõ tìm kiếm hoặc đổi bộ lọc
    
    let temp = this.allMonthlyTickets;

    // 1. Lọc theo trạng thái
    if (this.filterStatus === 'active') {
      temp = temp.filter(item => item.isActive === true);
    } else if (this.filterStatus === 'inactive') {
      temp = temp.filter(item => item.isActive === false);
    }

    // 2. Lọc theo từ khóa tìm kiếm (Biển số hoặc Mã thẻ)
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      temp = temp.filter(item => 
        (item.registerPlate && item.registerPlate.toLowerCase().includes(term)) ||
        (item.cardUID && item.cardUID.toLowerCase().includes(term))
      );
    }

    this.monthlyTickets = temp;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedImageFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit() {
    if (!this.regData.cardUID) return alert('Vui lòng quét hoặc nhập mã thẻ NFC!');
    if (!this.selectedImageFile) return alert('Vui lòng tải lên ảnh chụp xe để AI đọc biển số!');
    if (!this.regData.customerName) return alert('Vui lòng nhập tên khách hàng!');

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
      },
      error: (err) => {
        alert(err.error?.message || err.error || 'Lỗi đăng ký vé tháng!');
        this.isSubmitting = false;
      },
    });
  }

  resetForm() {
    this.regData = {
      cardUID: '', customerName: '', phoneNumber: '', registerPlate: '', vehicleTypeID: 1, durationMonths: 1,
    };
    this.selectedImageFile = null;
    this.imagePreview = null;
  }
}