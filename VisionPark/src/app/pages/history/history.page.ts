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

interface ParkingRecord {
  nfcId: string;
  plateNumber: string;
  vehicleType: string;
  checkInTime: Date;
  checkOutTime?: Date;
  duration?: number;
  totalCost?: number;
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
  
  // Dữ liệu form Check-in
  checkInData = {
    nfcId: '',
    plateNumber: '',
    vehicleType: 'Ô tô'
  };

  // Dữ liệu form Check-out
  checkOutData = {
    nfcId: '',
    plateNumber: '--',
    timeIn: '',
    totalCost: 0
  };

  parkingHistory: ParkingRecord[] = [];
  filteredHistory: ParkingRecord[] = [];

  filterConfig = {
    plateNumber: '',
    status: 'all'
  };

  constructor() {
    // Đăng ký các icon sẽ dùng trên giao diện mới
    addIcons({
      downloadOutline, filterOutline, timeOutline, searchOutline,
      logInOutline, logOutOutline, idCardOutline, carOutline, checkmarkCircleOutline,
      chevronDownOutline, documentTextOutline, cashOutline
    });
  }

  ngOnInit() {
    // Để trống mảng để hiển thị giao diện "Chưa có giao dịch" như trong ảnh
    // Bạn có thể thêm dữ liệu mẫu vào đây để xem dạng bảng
    this.parkingHistory = [];
    this.applyFilters();
  }

  // --- LOGIC CHECK-IN ---
  onCheckIn() {
    if (!this.checkInData.nfcId || !this.checkInData.plateNumber) {
      alert('Vui lòng nhập đủ thông tin!');
      return;
    }
    const newRecord: ParkingRecord = {
      nfcId: this.checkInData.nfcId,
      plateNumber: this.checkInData.plateNumber,
      vehicleType: this.checkInData.vehicleType,
      checkInTime: new Date(),
      status: 'In'
    };
    this.parkingHistory.unshift(newRecord);
    this.applyFilters();
    this.checkInData = { nfcId: '', plateNumber: '', vehicleType: 'Ô tô' };
  }

  // --- LOGIC TÌM VÀ CHECK-OUT ---
  findVehicleOut() {
    if (!this.checkOutData.nfcId) {
      this.checkOutData.plateNumber = '--';
      this.checkOutData.timeIn = '';
      this.checkOutData.totalCost = 0;
      return;
    }
    const record = this.parkingHistory.find(x => x.nfcId === this.checkOutData.nfcId && x.status === 'In');
    if (record) {
      this.checkOutData.plateNumber = record.plateNumber;
      this.checkOutData.timeIn = record.checkInTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + (record.checkInTime.getHours() >= 12 ? 'PM' : 'AM');
      this.checkOutData.totalCost = record.vehicleType === 'Ô tô' ? 20000 : 5000; // Giả lập tính tiền
    } else {
      this.checkOutData.plateNumber = '--';
      this.checkOutData.timeIn = '';
      this.checkOutData.totalCost = 0;
    }
  }

  onCheckOut() {
    const index = this.parkingHistory.findIndex(x => x.nfcId === this.checkOutData.nfcId && x.status === 'In');
    if (index !== -1) {
      this.parkingHistory[index].status = 'Out';
      this.parkingHistory[index].checkOutTime = new Date();
      this.parkingHistory[index].totalCost = this.checkOutData.totalCost;
      this.applyFilters();
      this.checkOutData = { nfcId: '', plateNumber: '--', timeIn: '', totalCost: 0 };
    } else {
      alert('Không tìm thấy xe trong bãi với mã thẻ này!');
    }
  }

  // --- LOGIC BỘ LỌC ---
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
}