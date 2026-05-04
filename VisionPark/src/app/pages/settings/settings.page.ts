import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonSegment, IonSegmentButton, IonLabel, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonInput } from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { settingsOutline, cashOutline, saveOutline, businessOutline, callOutline, carOutline, bicycleOutline, checkmarkCircleOutline, alertCircleOutline } from 'ionicons/icons';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { Api } from '../../services/api';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  imports: [IonContent, IonSegment, IonSegmentButton, IonLabel, IonIcon, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonInput, CommonModule, FormsModule, NavbarComponent]
})
export class SettingsPage implements OnInit {
  private api = inject(Api);
  private toastCtrl = inject(ToastController);

  CurrentTab: string = 'general';

  SystemConfig = {
    ParkingName: 'Vision Park',
    MaxCapacity: 100,
    OpenTime: '06:00',
    CloseTime: '22:00',
    Hotline: '1900 1234'
  };

  PricingRules: any[] = [
    { RuleId: 1, VehicleType: 'Xe máy', PricePerEntry: 5000, PricePerMonth: 150000, PricePerQuarter: 400000, PricePerYear: 1500000 },
    { RuleId: 2, VehicleType: 'Ô tô', PricePerEntry: 20000, PricePerMonth: 1000000, PricePerQuarter: 2800000, PricePerYear: 10000000 }
  ];

  constructor() {
    addIcons({ settingsOutline, cashOutline, saveOutline, businessOutline, callOutline, carOutline, bicycleOutline, checkmarkCircleOutline, alertCircleOutline });
  }

  ngOnInit() {
    this.loadSettings();
  }

  segmentChanged(event: any) {
    this.CurrentTab = event.detail.value;
  }

  async showToast(message: string, color: 'success' | 'danger' = 'success') {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 2500,
      position: 'top',
      cssClass: `toast-top-right toast-${color}`,
      icon: color === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline'
    });
    toast.present();
  }

  loadSettings() {
    this.api.getSettings().subscribe({
      next: (res: any) => {
        if (res.systemConfig || res.SystemConfig) {
          const sysConf = res.systemConfig || res.SystemConfig;
          this.SystemConfig.ParkingName = sysConf.parkingName || sysConf.ParkingName || this.SystemConfig.ParkingName;
          this.SystemConfig.MaxCapacity = sysConf.maxCapacity || sysConf.MaxCapacity || this.SystemConfig.MaxCapacity;
          this.SystemConfig.OpenTime = sysConf.openTime || sysConf.OpenTime || this.SystemConfig.OpenTime;
          this.SystemConfig.CloseTime = sysConf.closeTime || sysConf.CloseTime || this.SystemConfig.CloseTime;
          this.SystemConfig.Hotline = sysConf.hotline || sysConf.Hotline || this.SystemConfig.Hotline;
        }
        
        if (res.pricingRules || res.PricingRules) {
          const rules = res.pricingRules || res.PricingRules;
          this.PricingRules = rules.map((r: any) => ({
            RuleId: r.ruleId || r.RuleId,
            VehicleType: r.vehicleType || r.VehicleType,
            PricePerEntry: r.pricePerEntry || r.PricePerEntry,
            PricePerMonth: r.pricePerMonth || r.PricePerMonth,
            PricePerQuarter: r.pricePerQuarter || r.PricePerQuarter,
            PricePerYear: r.pricePerYear || r.PricePerYear
          }));
        }
      },
      error: (err: any) => console.error("Lỗi lấy dữ liệu cấu hình", err)
    });
  }

  saveSettings() {
    const payload = {
      SystemConfig: this.SystemConfig,
      PricingRules: this.PricingRules
    };

    this.api.saveSettings(payload).subscribe({
      next: (res: any) => {
        this.showToast(res.message || res.Message || 'Lưu cài đặt thành công!', 'success');
      },
      error: (err: any) => {
        this.showToast('Lỗi khi lưu cài đặt!', 'danger');
        console.error(err);
      }
    });
  }
}