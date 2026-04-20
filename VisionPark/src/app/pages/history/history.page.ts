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
  logInOutline, logOutOutline, idCardOutline, carOutline, checkmarkCircleOutline
} from 'ionicons/icons';

// Đã chuẩn hóa tên biến theo PascalCase (Viết hoa chữ cái đầu)
interface ParkingRecord {
  NfcId: string;
  PlateNumber: string;
  VehicleType: 'Xe máy' | 'Ô tô' | string;
  CheckInTime: Date;
  CheckOutTime?: Date;
  Duration?: number;
  TotalCost?: number;
  Status: 'In' | 'Out';
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
    IonSelectOption, IonIcon, CommonModule, FormsModule,
  ],
})
export class HistoryPage implements OnInit {
  
  // DỮ LIỆU FORM QUÉT VÀO / RA
  CheckInData = {
    NfcId: '',
    PlateNumber: '',
    VehicleType: 'Xe máy'
  };

  CheckOutData = {
    NfcId: '',
    PlateNumber: 'Chưa có thông tin',
    TimeIn: '',
    TotalCost: 0
  };

  // DỮ LIỆU LỊCH SỬ
  ParkingHistory: ParkingRecord[] = [
    { NfcId: 'NFC_100101', PlateNumber: '73A-123.45', VehicleType: 'Ô tô', CheckInTime: new Date('2026-04-16T07:30:00'), CheckOutTime: new Date('2026-04-16T11:00:00'), Duration: 3.5, TotalCost: 40000, Status: 'Out' },
    { NfcId: 'NFC_100102', PlateNumber: '75F1-888.88', VehicleType: 'Xe máy', CheckInTime: new Date('2026-04-16T08:15:00'), Status: 'In' },
    { NfcId: 'NFC_100103', PlateNumber: '71B-001.23', VehicleType: 'Ô tô', CheckInTime: new Date('2026-04-16T08:45:00'), CheckOutTime: new Date('2026-04-16T09:45:00'), Duration: 1, TotalCost: 15000, Status: 'Out' },
  ];
  
  FilteredHistory: ParkingRecord[] = [];

  FilterConfig = {
    PlateNumber: '',
    Status: 'all', 
    VehicleType: 'all',
    DateFrom: '',
    DateTo: '',
    SortByCost: 'none', 
  };

  constructor() {
    addIcons({
      downloadOutline, filterOutline, timeOutline, searchOutline,
      logInOutline, logOutOutline, idCardOutline, carOutline, checkmarkCircleOutline
    });
  }

  ngOnInit() {
    this.FilteredHistory = [...this.ParkingHistory];
  }

  // --- LOGIC XE VÀO ---
  onCheckIn() {
    if (!this.CheckInData.NfcId || !this.CheckInData.PlateNumber) {
      alert('Vui lòng nhập đủ thông tin xe vào!');
      return;
    }
    const newRecord: ParkingRecord = {
      NfcId: this.CheckInData.NfcId,
      PlateNumber: this.CheckInData.PlateNumber,
      VehicleType: this.CheckInData.VehicleType,
      CheckInTime: new Date(),
      Status: 'In'
    };
    this.ParkingHistory.unshift(newRecord);
    this.applyFilters();
    this.CheckInData = { NfcId: '', PlateNumber: '', VehicleType: 'Xe máy' };
  }

  // --- LOGIC TÌM & XE RA ---
  findVehicleOut() {
    const record = this.ParkingHistory.find(x => x.NfcId === this.CheckOutData.NfcId && x.Status === 'In');
    if (record) {
      this.CheckOutData.PlateNumber = record.PlateNumber;
      this.CheckOutData.TimeIn = record.CheckInTime.toLocaleString('vi-VN');
      this.CheckOutData.TotalCost = record.VehicleType === 'Ô tô' ? 20000 : 5000; // Giả lập tính tiền
    } else {
      this.CheckOutData.PlateNumber = 'Không tìm thấy thẻ In';
      this.CheckOutData.TotalCost = 0;
    }
  }

  onCheckOut() {
    const index = this.ParkingHistory.findIndex(x => x.NfcId === this.CheckOutData.NfcId && x.Status === 'In');
    if (index !== -1) {
      this.ParkingHistory[index].Status = 'Out';
      this.ParkingHistory[index].CheckOutTime = new Date();
      this.ParkingHistory[index].TotalCost = this.CheckOutData.TotalCost;
      this.applyFilters();
      this.CheckOutData = { NfcId: '', PlateNumber: 'Chưa có thông tin', TimeIn: '', TotalCost: 0 };
      alert('Thanh toán thành công!');
    }
  }

  // --- LOGIC BỘ LỌC ---
  applyFilters() {
    let result = [...this.ParkingHistory];
    
    if (this.FilterConfig.Status !== 'all') {
      result = result.filter(item => item.Status === this.FilterConfig.Status);
    }
    if (this.FilterConfig.DateFrom) {
      const from = new Date(this.FilterConfig.DateFrom).getTime();
      result = result.filter(item => new Date(item.CheckInTime).getTime() >= from);
    }
    if (this.FilterConfig.DateTo) {
      const to = new Date(this.FilterConfig.DateTo).getTime();
      result = result.filter(item => new Date(item.CheckInTime).getTime() <= to);
    }
    if (this.FilterConfig.SortByCost !== 'none') {
      result.sort((a, b) => {
        const costA = a.TotalCost || 0;
        const costB = b.TotalCost || 0;
        return this.FilterConfig.SortByCost === 'asc' ? costA - costB : costB - costA;
      });
    }
    if (this.FilterConfig.PlateNumber) {
      const searchStr = this.FilterConfig.PlateNumber.toLowerCase();
      result = result.filter(item => item.PlateNumber.toLowerCase().includes(searchStr));
    }
    
    this.FilteredHistory = result;
  }

  getBadgeColor(status: string) {
    return status === 'In' ? 'success' : 'medium';
  }

  resetFilters() {
    this.FilterConfig = {
      PlateNumber: '', Status: 'all', VehicleType: 'all', DateFrom: '', DateTo: '', SortByCost: 'none'
    };
    this.applyFilters();
  }
}