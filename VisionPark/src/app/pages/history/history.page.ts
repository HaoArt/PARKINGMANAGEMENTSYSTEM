import { Component, OnInit } from '@angular/core';
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
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { downloadOutline, filterOutline } from 'ionicons/icons';

interface ParkingRecord {
  nfcId: string;
  plateNumber: string;
  vehicleType: 'Xe máy' | 'Ô tô';
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
    IonButton,
    IonSelectOption,
    IonIcon,
    CommonModule,
    FormsModule,
  ],
})
export class HistoryPage implements OnInit {
  parkingHistory: ParkingRecord[] = [
    {
      nfcId: 'NFC_100101',
      plateNumber: '73A-123.45',
      vehicleType: 'Ô tô',
      checkInTime: new Date('2026-04-16T07:30:00'),
      checkOutTime: new Date('2026-04-16T11:00:00'),
      duration: 3.5,
      totalCost: 40000,
      status: 'Out',
    },
    {
      nfcId: 'NFC_100102',
      plateNumber: '75F1-888.88',
      vehicleType: 'Xe máy',
      checkInTime: new Date('2026-04-16T08:15:00'),
      status: 'In',
    },
    {
      nfcId: 'NFC_100103',
      plateNumber: '71B-001.23',
      vehicleType: 'Ô tô',
      checkInTime: new Date('2026-04-16T08:45:00'),
      checkOutTime: new Date('2026-04-16T09:45:00'),
      duration: 1,
      totalCost: 15000,
      status: 'Out',
    },
    {
      nfcId: 'NFC_100104',
      plateNumber: '75H1-567.89',
      vehicleType: 'Xe máy',
      checkInTime: new Date('2026-04-16T09:00:00'),
      status: 'In',
    },
    {
      nfcId: 'NFC_100105',
      plateNumber: '75A-999.99',
      vehicleType: 'Ô tô',
      checkInTime: new Date('2026-04-16T06:00:00'),
      checkOutTime: new Date('2026-04-16T16:00:00'),
      duration: 10,
      totalCost: 120000,
      status: 'Out',
    },
    {
      nfcId: 'NFC_100106',
      plateNumber: '75K1-246.35',
      vehicleType: 'Xe máy',
      checkInTime: new Date('2026-04-16T10:30:00'),
      status: 'In',
    },
    {
      nfcId: 'NFC_100107',
      plateNumber: '75F1-111.22',
      vehicleType: 'Xe máy',
      checkInTime: new Date('2026-04-16T11:00:00'),
      checkOutTime: new Date('2026-04-16T12:00:00'),
      duration: 1,
      totalCost: 3000,
      status: 'Out',
    },
    {
      nfcId: 'NFC_100108',
      plateNumber: '75B-222.44',
      vehicleType: 'Ô tô',
      checkInTime: new Date('2026-04-16T13:00:00'),
      status: 'In',
    },
    {
      nfcId: 'NFC_100109',
      plateNumber: '75C1-333.55',
      vehicleType: 'Xe máy',
      checkInTime: new Date('2026-04-16T14:20:00'),
      checkOutTime: new Date('2026-04-16T15:50:00'),
      duration: 1.5,
      totalCost: 5000,
      status: 'Out',
    },
    {
      nfcId: 'NFC_100110',
      plateNumber: '75A-444.66',
      vehicleType: 'Ô tô',
      checkInTime: new Date('2026-04-16T15:00:00'),
      status: 'In',
    },
    {
      nfcId: 'NFC_100111',
      plateNumber: '75F1-777.88',
      vehicleType: 'Xe máy',
      checkInTime: new Date('2026-04-16T07:00:00'),
      checkOutTime: new Date('2026-04-16T16:30:00'),
      duration: 9.5,
      totalCost: 15000,
      status: 'Out',
    },
    {
      nfcId: 'NFC_100112',
      plateNumber: '75B-888.00',
      vehicleType: 'Ô tô',
      checkInTime: new Date('2026-04-16T16:10:00'),
      status: 'In',
    },
  ];
  filteredHistory: ParkingRecord[] = [];

  filterConfig = {
    plateNumber: '',
    status: 'all', // 'all', 'In', 'Out'
    vehicleType: 'all',
    dateFrom: '',
    dateTo: '',
    sortByCost: 'none', // 'none', 'asc', 'desc'
  };

  constructor() {
    addIcons({ downloadOutline, filterOutline });
  }

  ngOnInit() {
    this.filteredHistory = [...this.parkingHistory];
  }

  applyFilters() {
    let result = [...this.parkingHistory];
    if (this.filterConfig.status !== 'all') {
      result = result.filter(
        (item) => item.status === this.filterConfig.status,
      );
    }
    if (this.filterConfig.dateFrom) {
      const from = new Date(this.filterConfig.dateFrom).getTime();
      result = result.filter(
        (item) => new Date(item.checkInTime).getTime() >= from,
      );
    }
    if (this.filterConfig.dateTo) {
      const to = new Date(this.filterConfig.dateTo).getTime();
      result = result.filter(
        (item) => new Date(item.checkInTime).getTime() <= to,
      );
    }
    if (this.filterConfig.sortByCost !== 'none') {
      result.sort((a, b) => {
        const costA = a.totalCost || 0;
        const costB = b.totalCost || 0;
        return this.filterConfig.sortByCost === 'asc'
          ? costA - costB
          : costB - costA;
      });
    }
    if (this.filterConfig.plateNumber) {
      const searchStr = this.filterConfig.plateNumber.toLowerCase();
      result = result.filter((item) =>
        item.plateNumber.toLowerCase().includes(searchStr),
      );
    }
    this.filteredHistory = result;
  }
  getBadgeColor(status: string) {
    return status === 'In' ? 'success' : 'medium';
  }
  resetFilters() {
    this.filterConfig = {
      plateNumber: '',
      status: 'all',
      vehicleType: 'all',
      dateFrom: '',
      dateTo: '',
      sortByCost: 'none',
    };
    this.applyFilters();
  }
}
