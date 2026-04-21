import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonBadge,
  IonSearchbar,
  IonText,
  IonSelect,
  IonButton,
  IonIcon,
  IonSelectOption,
  IonItem,
  IonInput,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import * as icons from 'ionicons/icons';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { Api } from '../../services/api';

interface ParkingRecord {
  nfcId: string;
  plateNumberIn: string;
  plateNumberOut: string;
  vehicleType: string;
  checkInTime: string;
  checkOutTime: string;
  status: 'In' | 'Out';
}

interface ScanResultData {
  action: string;
  message: string;
  customerName: string;
  plateNumber: string;
  vehicleType: string;
  expiryDate: string;
  status: string;
  isSuccess: boolean;
}

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
  standalone: true,
  imports: [
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
    IonSearchbar,
    IonText,
    IonButton,
    IonSelect,
    IonSelectOption,
    IonIcon,
    CommonModule,
    FormsModule,
    NavbarComponent,
  ],
})
export class HistoryPage implements OnInit {
  private api = inject(Api);
  private toastCtrl = inject(ToastController);
  private isScanLocked = false; 
  private lastScannedUid = '';
  parkingHistory: ParkingRecord[] = [];
  filteredHistory: ParkingRecord[] = [];
  isLoading = false;
  

  inputNfcId = '';
  filterConfig = { plateNumber: '', status: 'all' };

  scanResult: ScanResultData | null = null;

  constructor() {
    addIcons({ ...icons });
  }

  ngOnInit() {
    this.fetchData();
  }

  fetchData() {
    this.isLoading = true;
    this.api.getParkingHistory().subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.parkingHistory = res.data.map((item: any) =>
            this.mapBackendToFrontend(item),
          );
          this.applyFilters();
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Lỗi API:', err);
        this.isLoading = false;
      },
    });
  }

  private mapBackendToFrontend(item: any): ParkingRecord {
    return {
      nfcId: item.cardID,
      plateNumberIn: item.licensePlateIn || '---',
      plateNumberOut: item.licensePlateOut || '---', // Hứng biển số lúc ra
      vehicleType: item.vehicleTypeID === 1 ? 'Ô tô' : 'Xe máy',
      checkInTime: item.checkInTime,
      checkOutTime: item.checkOutTime, // C# đã trả về string ("... HH:mm" hoặc "Chưa ra khỏi bãi")
      status: item.status === 'Đang đỗ' ? 'In' : 'Out',
    };
  }

  onProcessCard(nfcId: string) {
    if (!nfcId) return alert('Vui lòng nhập hoặc quét mã thẻ!');

    this.isLoading = true;
    this.api.scanCard(nfcId).subscribe({
      next: (res: any) => {
        const data = res.data;

        this.scanResult = {
          action: res.action,
          message: res.message,
          customerName: data?.customerName || '---',
          plateNumber: data?.plateNumber || '---',
          vehicleType:
            data?.vehicleType?.name || data?.vehicleType?.typeName || '---', // Đã map theo C# mới
          expiryDate: data?.expiryDate || '---',
          status: data?.status || '---',
          isSuccess: res.action === 'CHECK_IN' || res.action === 'CHECK_OUT',
        };

        this.inputNfcId = '';
        this.fetchData();
      },
      error: (err) => {
        this.scanResult = {
          action: 'ERROR',
          message: err.error?.message || err.error || 'Lỗi xử lý thẻ!',
          customerName: '---',
          plateNumber: '---',
          vehicleType: '---',
          expiryDate: '---',
          status: '---',
          isSuccess: false,
        };
        this.isLoading = false;
      },
    });
  }

  applyFilters() {
    const { plateNumber, status } = this.filterConfig;
    const searchStr = plateNumber.toLowerCase().trim();

    this.filteredHistory = this.parkingHistory.filter((item) => {
      const matchStatus = status === 'all' || item.status === status;
      const matchSearch =
        !searchStr ||
        item.plateNumberIn.toLowerCase().includes(searchStr) ||
        item.plateNumberOut.toLowerCase().includes(searchStr) ||
        item.nfcId.toLowerCase().includes(searchStr);
      return matchStatus && matchSearch;
    });
  }
}
