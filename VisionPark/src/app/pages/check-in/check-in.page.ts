import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonGrid, IonRow, IonCol, IonCard, 
  IonCardHeader, IonCardTitle, IonCardContent, 
  IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, 
  IonButton, IonIcon, IonList, IonBadge 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  idCardOutline, carOutline, bicycleOutline, 
  timeOutline, checkmarkCircleOutline, addOutline 
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
    IonContent, IonGrid, IonRow, IonCol, IonCard, 
    IonCardHeader, IonCardTitle, IonCardContent, 
    IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, 
    IonButton, IonIcon, IonList, IonBadge, 
    CommonModule, FormsModule
  ]
})
export class CheckInPage implements OnInit {
  
  // Model liên kết với Form
  CheckInData = {
    CardUid: '',
    PlateNumber: '',
    VehicleType: 'Xe máy'
  };

  // Danh sách lịch sử Check-in tạm thời
  RecentCheckIns: CheckInRecord[] = [];

  constructor() {
    // Đăng ký các icon sẽ dùng trên giao diện
    addIcons({ 
      idCardOutline, carOutline, bicycleOutline, 
      timeOutline, checkmarkCircleOutline, addOutline 
    });
  }

  ngOnInit() {
    // Khởi tạo một vài dữ liệu mẫu để bạn dễ hình dung giao diện
    this.RecentCheckIns = [
      { CardUid: 'NFC_88291A', PlateNumber: '75A-123.45', VehicleType: 'Ô tô', TimeIn: new Date() },
      { CardUid: 'NFC_33928B', PlateNumber: '75F1-888.88', VehicleType: 'Xe máy', TimeIn: new Date(Date.now() - 300000) }
    ];
  }

  // Hàm xử lý khi bấm nút "Xác nhận vào bãi"
  onSubmit() {
    if (!this.CheckInData.CardUid || !this.CheckInData.PlateNumber) {
      alert('Vui lòng nhập đầy đủ Mã thẻ và Biển số!');
      return;
    }

    // Tạo record mới
    const newRecord: CheckInRecord = {
      CardUid: this.CheckInData.CardUid,
      PlateNumber: this.CheckInData.PlateNumber,
      VehicleType: this.CheckInData.VehicleType,
      TimeIn: new Date()
    };

    // Đẩy record mới lên đầu danh sách
    this.RecentCheckIns.unshift(newRecord);

    // Xóa trắng form để chuẩn bị cho xe tiếp theo
    this.CheckInData = {
      CardUid: '',
      PlateNumber: '',
      VehicleType: 'Xe máy' // Giữ mặc định là xe máy cho tiện
    };
  }
}