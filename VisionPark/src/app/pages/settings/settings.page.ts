import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Api } from '../../services/api';
import { inject } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';
import { 
  IonContent, IonGrid, IonRow, IonCol, IonCard, 
  IonCardHeader, IonCardTitle, IonCardContent, 
  IonItem, IonLabel, IonInput, 
  IonButton, IonIcon, IonSegment, IonSegmentButton, IonHeader, IonToolbar 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  saveOutline, settingsOutline, cashOutline, 
  carOutline, bicycleOutline, businessOutline, timeOutline, callOutline 
} from 'ionicons/icons';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

// Interface Bảng giá mới: Theo lượt, tháng, quý, năm
interface PricingRule {
  RuleId: number;
  VehicleType: string;
  PricePerEntry: number;
  PricePerMonth: number;
  PricePerQuarter: number;
  PricePerYear: number;
}


@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,

  imports: [IonToolbar, IonHeader, 
    IonContent, IonGrid, IonRow, IonCol, IonCard, 
    IonCardHeader, IonCardTitle, IonCardContent, 
    IonItem, IonLabel, IonInput, 
    IonButton, IonIcon, IonSegment, IonSegmentButton,
    CommonModule, FormsModule, NavbarComponent
  ]
})

  export class SettingsPage implements OnInit {

  CurrentTab: string = 'general';
  SystemConfig: any = {};
  PricingRules: any[] = [];


  private api = inject(Api);
  private toastCtrl = inject(ToastController);

  constructor() {
    addIcons({ saveOutline, settingsOutline, cashOutline, carOutline, bicycleOutline, businessOutline, timeOutline, callOutline });

  }

  ngOnInit() {
    this.loadSettings();

  }

  loadSettings() {
    this.api.getSettings().subscribe({
      next: (res: any) => {
        // Hứng dữ liệu Cài đặt chung
        if (res?.systemConfig) {
          this.SystemConfig = {
            ParkingName: res.systemConfig.parkingName || res.systemConfig.ParkingName,
            MaxCapacity: res.systemConfig.maxCapacity || res.systemConfig.MaxCapacity,
            OpenTime: res.systemConfig.openTime || res.systemConfig.OpenTime,
            CloseTime: res.systemConfig.closeTime || res.systemConfig.CloseTime,
            Hotline: res.systemConfig.hotline || res.systemConfig.Hotline
          };
        }
        
        // Hứng dữ liệu Bảng giá
        if (res?.pricingRules) {
          this.PricingRules = res.pricingRules.map((r: any) => ({
            RuleId: r.ruleId || r.RuleId,
            VehicleType: r.vehicleType || r.VehicleType,
            PricePerEntry: r.pricePerEntry || r.PricePerEntry,
            PricePerMonth: r.pricePerMonth || r.PricePerMonth,
            PricePerQuarter: r.pricePerQuarter || r.PricePerQuarter,
            PricePerYear: r.pricePerYear || r.PricePerYear
          }));
        }
      },
      error: (err) => console.error('Lỗi lấy settings:', err)
    });

  }

  segmentChanged(event: any) {
    this.CurrentTab = event.detail.value;
  }


  async saveSettings() {
    const payload = {
      SystemConfig: this.SystemConfig,
      PricingRules: this.PricingRules
    };

    this.api.saveSettings(payload).subscribe({
      next: async (res: any) => {
        const toast = await this.toastCtrl.create({
          message: res.message || 'Lưu cấu hình thành công!',
          duration: 2500, color: 'success', position: 'top', cssClass: 'toast-top-right toast-success'
        });
        toast.present();
      },
      error: async (err) => {
        const toast = await this.toastCtrl.create({
          message: 'Lỗi khi lưu cài đặt!',
          duration: 2500, color: 'danger', position: 'top', cssClass: 'toast-top-right toast-danger'
        });
        toast.present();

      }
    });
  }
}