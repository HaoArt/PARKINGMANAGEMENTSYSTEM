import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonGrid, IonRow, IonCol, IonBadge, IonSearchbar,
  IonText, IonSelect, IonButton, IonIcon, IonSelectOption,
  IonItem, IonInput, IonCard, IonCardContent, IonCardHeader, IonCardTitle
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  downloadOutline, filterOutline, timeOutline, searchOutline, 
  logInOutline, logOutOutline, idCardOutline, carOutline, checkmarkCircleOutline,
  chevronDownOutline, documentTextOutline, cashOutline
} from 'ionicons/icons';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component'; 
import { Api } from '../../services/api' 

interface ParkingRecord {
  nfcId: string;
  plateNumber: string;
  vehicleType: string;
  checkInTime: string; // Đổi thành string vì C# trả về string
  checkOutTime?: string;
  status: 'In' | 'Out';
}

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
  standalone: true,
  imports: [
    IonCardContent, IonCard, IonCardHeader, IonCardTitle,
    IonItem, IonContent, IonGrid, IonRow, IonInput, IonCol,
    IonBadge, IonSearchbar, IonText, IonButton, IonSelect,
    IonSelectOption, IonIcon, CommonModule, FormsModule, NavbarComponent
  ],
})
export class HistoryPage implements OnInit {
  
  checkInData = { nfcId: '', plateNumber: '', vehicleType: 'Ô tô' };
  checkOutData = { nfcId: '', plateNumber: '--', timeIn: '', totalCost: 0 };

  parkingHistory: ParkingRecord[] = [];
  filteredHistory: ParkingRecord[] = [];

  filterConfig = { plateNumber: '', status: 'all' };

  // Tiêm Api vào constructor
  constructor(private api: Api) {
    addIcons({
      downloadOutline, filterOutline, timeOutline, searchOutline,
      logInOutline, logOutOutline, idCardOutline, carOutline, checkmarkCircleOutline,
      chevronDownOutline, documentTextOutline, cashOutline
    });
  }

  ngOnInit() {
    this.loadHistoryFromBackend(); // Load dữ liệu thật khi mở trang
  }

  // --- GỌI API LẤY LỊCH SỬ ---
  loadHistoryFromBackend() {
    this.api.getParkingHistory().subscribe({
      next: (response: any) => {
        if (response && response.data) {
          // Map dữ liệu từ C# sang Frontend
          this.parkingHistory = response.data.map((item: any) => ({
            nfcId: `Card ID: ${item.cardID}`,
            plateNumber: item.licensePlateIn,
            vehicleType: item.vehicleTypeID === 1 ? 'Ô tô' : 'Xe máy',
            checkInTime: item.checkInTime,
            checkOutTime: item.checkOutTime !== "Chưa ra khỏi bãi" ? item.checkOutTime : null,
            status: item.status === "Đang đỗ" ? 'In' : 'Out'
          }));
          this.applyFilters();
        }
      },
      error: (err) => console.error('Lỗi khi lấy dữ liệu API:', err)
    });
  }

  // --- GỌI API QUÉT THẺ (DÙNG CHUNG CHO VÀO VÀ RA THEO C#) ---
  onCheckIn() {
    if (!this.checkInData.nfcId) {
      alert('Vui lòng nhập Mã thẻ NFC!');
      return;
    }
    
    this.api.scanCard(this.checkInData.nfcId).subscribe({
      next: (res: any) => {
        alert(res.message); // Hiển thị thông báo "Xe VÀO bãi thành công" hoặc "Xe RA..."
        this.loadHistoryFromBackend(); // Tải lại bảng dữ liệu
        this.checkInData.nfcId = '';
      },
      error: (err) => {
        alert(err.error?.message || err.error || 'Lỗi xử lý thẻ!');
      }
    });
  }

  onCheckOut() {
    if (!this.checkOutData.nfcId) {
      alert('Vui lòng nhập Mã thẻ NFC!');
      return;
    }

    // Do C# xử lý In/Out chung 1 hàm, ta gọi lại hàm scanCard
    this.api.scanCard(this.checkOutData.nfcId).subscribe({
      next: (res: any) => {
        alert(res.message);
        this.loadHistoryFromBackend();
        this.checkOutData.nfcId = '';
      },
      error: (err) => {
        alert(err.error?.message || err.error || 'Lỗi xử lý thẻ!');
      }
    });
  }

  // Bộ lọc nội bộ trên bảng
  applyFilters() {
    let result = [...this.parkingHistory];
    if (this.filterConfig.status !== 'all') {
      result = result.filter(item => item.status === this.filterConfig.status);
    }
    if (this.filterConfig.plateNumber) {
      const searchStr = this.filterConfig.plateNumber.toLowerCase();
      result = result.filter(item => item.plateNumber.toLowerCase().includes(searchStr) || item.nfcId.toLowerCase().includes(searchStr));
    }
    this.filteredHistory = result;
  }

  // Bỏ đi hàm findVehicleOut vì C# đã tự tính toán hóa đơn khi gọi scanCard
  findVehicleOut() {}
}