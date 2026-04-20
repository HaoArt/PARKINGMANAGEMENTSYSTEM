import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonGrid, IonRow, IonCol, IonCard, 
  IonCardHeader, IonCardTitle, IonCardContent, 
  IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, 
  IonButton, IonIcon, IonToggle, IonSegment, IonSegmentButton, IonHeader, IonToolbar } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  saveOutline, settingsOutline, cashOutline, 
  hardwareChipOutline, carOutline, bicycleOutline 
} from 'ionicons/icons';

// Interface chuẩn hóa theo Database
interface PricingRule {
  RuleId: number;
  VehicleType: string;
  RuleType: string;
  BasePrice: number;
  BlockMinutes: number;
  PricePerBlock: number;
}

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  imports: [IonToolbar, IonHeader, 
    IonContent, IonGrid, IonRow, IonCol, IonCard, 
    IonCardHeader, IonCardTitle, IonCardContent, 
    IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, 
    IonButton, IonIcon, IonToggle, IonSegment, IonSegmentButton,
    CommonModule, FormsModule
  ]
})
export class SettingsPage implements OnInit {

  // Biến điều khiển Tab hiện tại
  CurrentTab: string = 'general';

  // Dữ liệu bảng SystemConfigs
  SystemConfig = {
    EnableAIPlateRecognition: true,
    AutoOpenBarrier: false,
    CameraIpIn: '192.168.1.101',
    CameraIpOut: '192.168.1.102',
    MaxCapacity: 500
  };

  // Dữ liệu bảng PricingRules
  PricingRules: PricingRule[] = [];

  constructor() {
    addIcons({ 
      saveOutline, settingsOutline, cashOutline, 
      hardwareChipOutline, carOutline, bicycleOutline 
    });
  }

  ngOnInit() {
    // Giả lập load dữ liệu từ DB
    this.PricingRules = [
      { RuleId: 1, VehicleType: 'Xe máy', RuleType: 'Block', BasePrice: 3000, BlockMinutes: 0, PricePerBlock: 0 },
      { RuleId: 2, VehicleType: 'Ô tô', RuleType: 'Block', BasePrice: 15000, BlockMinutes: 60, PricePerBlock: 5000 }
    ];
  }

  // Hàm chuyển tab
  segmentChanged(event: any) {
    this.CurrentTab = event.detail.value;
  }

  // Hàm lưu cài đặt
  saveSettings() {
    // Ở đây sau này bạn sẽ gọi API đẩy dữ liệu lên Backend .NET
    console.log('Cấu hình lưu:', this.SystemConfig);
    console.log('Bảng giá lưu:', this.PricingRules);
    alert('Đã lưu cấu hình thành công!');
  }

}