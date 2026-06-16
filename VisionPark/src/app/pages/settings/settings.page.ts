import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Api } from '../../services/api';
import { ToastController } from '@ionic/angular/standalone';
import {
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonHeader,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  saveOutline,
  settingsOutline,
  cashOutline,
  carOutline,
  bicycleOutline,
  businessOutline,
  timeOutline,
  callOutline,
  refreshOutline,
  textOutline, // Added for new UI
  carSportOutline, // Added for new UI
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

  imports: [
    IonToolbar,
    IonHeader,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    CommonModule,
    FormsModule,
    NavbarComponent,
  ],
})
export class SettingsPage implements OnInit {
  CurrentTab: string = 'general';
  SystemConfig: any = {};
  PricingRules: any[] = [];
  isLoading: boolean = false;
  isSaving: boolean = false;

  // Dữ liệu mặc định cho thẻ lượt
  GuestPrices: any = {
    CarBasePrice: 15000,
    CarExtraPerHour: 5000,
    BikeBasePrice: 5000,
    BikeExtraPerHour: 2000
  };

  private api = inject(Api);
  private toastCtrl = inject(ToastController);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    addIcons({
      saveOutline,
      settingsOutline,
      cashOutline,
      carOutline,
      bicycleOutline,
      businessOutline,
      timeOutline,
      callOutline,
      refreshOutline,
      textOutline,
      carSportOutline,
    });
  }

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.isLoading = true;
    this.api.getSettings().subscribe({
      next: (res: any) => {
        const data = res?.data || res;

        // Hứng dữ liệu Cài đặt chung
        if (data?.systemConfig || data?.SystemConfig) {
          const sys = data.systemConfig || data.SystemConfig;
          this.SystemConfig = {
            ParkingName: sys.parkingName ?? sys.ParkingName ?? '',
            MaxCapacity: sys.maxCapacity ?? sys.MaxCapacity ?? 0,
            OpenTime: sys.openTime ?? sys.OpenTime ?? '',
            CloseTime: sys.closeTime ?? sys.CloseTime ?? '',
            Hotline: sys.hotline ?? sys.Hotline ?? '',
          };
        }

        // Hứng dữ liệu Bảng giá
        if (data?.pricingRules || data?.PricingRules) {
          const rules = data.pricingRules || data.PricingRules;
          this.PricingRules = rules.map((r: any) => ({
            RuleId: r.ruleId ?? r.RuleId ?? 0,
            VehicleType: r.vehicleType ?? r.VehicleType ?? '---',
            PricePerEntry: r.pricePerEntry ?? r.PricePerEntry ?? 0,
            PricePerMonth: r.pricePerMonth ?? r.PricePerMonth ?? 0,
            PricePerQuarter: r.pricePerQuarter ?? r.PricePerQuarter ?? 0,
            PricePerYear: r.pricePerYear ?? r.PricePerYear ?? 0,
          }));
        }
        
        // Hứng dữ liệu Bảng giá thẻ lượt (GuestPrices)
        if (data?.guestPrices || data?.GuestPrices) {
          const guest = data.guestPrices || data.GuestPrices;
          this.GuestPrices = {
            CarBasePrice: guest.carBasePrice ?? guest.CarBasePrice ?? 15000,
            CarExtraPerHour: guest.carExtraPerHour ?? guest.CarExtraPerHour ?? 5000,
            BikeBasePrice: guest.bikeBasePrice ?? guest.BikeBasePrice ?? 5000,
            BikeExtraPerHour: guest.bikeExtraPerHour ?? guest.BikeExtraPerHour ?? 2000,
          };
        }
        
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Lỗi lấy settings:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  segmentChanged(event: any) {
    this.CurrentTab = event.detail.value;
  }

  async saveSettings() {
    this.isSaving = true;

    const payload = {
      systemConfig: {
        parkingName: this.SystemConfig.ParkingName,
        maxCapacity: Number(this.SystemConfig.MaxCapacity) || 0,
        openTime: this.SystemConfig.OpenTime,
        closeTime: this.SystemConfig.CloseTime,
        hotline: this.SystemConfig.Hotline,
      },
      pricingRules: this.PricingRules.map((r) => ({
        ruleId: Number(r.RuleId),
        pricePerEntry: Number(r.PricePerEntry) || 0,
        pricePerMonth: Number(r.PricePerMonth) || 0,
        pricePerQuarter: Number(r.PricePerQuarter) || 0,
        pricePerYear: Number(r.PricePerYear) || 0,
      })),
      // Gửi cấu hình thẻ lượt xuống Backend
      guestPrices: {
        carBasePrice: Number(this.GuestPrices.CarBasePrice) || 15000,
        carExtraPerHour: Number(this.GuestPrices.CarExtraPerHour) || 5000,
        bikeBasePrice: Number(this.GuestPrices.BikeBasePrice) || 5000,
        bikeExtraPerHour: Number(this.GuestPrices.BikeExtraPerHour) || 2000,
      }
    };

    this.api.saveSettings(payload).subscribe({
      next: async (res: any) => {
        this.isSaving = false;
        const toast = await this.toastCtrl.create({
          message: res.message || 'Lưu cấu hình thành công!',
          duration: 2500,
          color: 'dark',
          position: 'top',
        });
        toast.present();
        this.loadSettings(); // Tải lại để đồng bộ chắc chắn với DB
      },
      error: async (err) => {
        this.isSaving = false;
        const toast = await this.toastCtrl.create({
          message:
            err.error?.message ||
            err.error?.Message ||
            err.error?.title ||
            'Lỗi khi lưu cài đặt!',
          duration: 2500,
          color: 'dark',
          position: 'top',
        });
        toast.present();
      },
    });
  }
}
