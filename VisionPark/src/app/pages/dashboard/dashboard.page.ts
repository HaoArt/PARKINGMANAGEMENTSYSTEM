import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, 
  IonFooter, IonButtons, IonMenuButton, IonIcon, IonButton } from '@ionic/angular/standalone';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component'; 
import { addIcons } from 'ionicons';
import { carOutline, cashOutline, searchOutline, documentTextOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';

interface ParkingRecord {
  id: string;
  plateNumber: string;
  vehicleType: string;
  timeIn: string;
  status: 'In' | 'Out';
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [IonButton, 
    IonIcon, 
    CommonModule, 
    FormsModule, 
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar, 
    IonFooter,
    IonButtons,
    IonMenuButton,
    NavbarComponent
  ]
})
export class DashboardPage implements OnInit {
  stats = {
    totalVehicles: 150,
    availableSlots: 50,
    revenueToday: '2,500,000đ'
  };

  allRecords: ParkingRecord[] = [];
  filteredRecords: ParkingRecord[] = [];
  paginatedRecords: ParkingRecord[] = [];

  searchTerm: string = '';
  filterStatus: string = 'all';

  currentPage: number = 1;
  itemsPerPage: number = 4;
  totalPages: number = 13;

  constructor() { 
    addIcons({ carOutline, cashOutline, searchOutline, documentTextOutline, chevronBackOutline, chevronForwardOutline });
  }

  ngOnInit() {
    this.allRecords = [
      { id: 'NFC-1042', plateNumber: '29A-123.45', vehicleType: 'Ô tô', timeIn: '08:15 AM', status: 'In' },
      { id: 'NFC-0891', plateNumber: '30E-987.65', vehicleType: 'Ô tô', timeIn: '08:02 AM', status: 'In' },
      { id: 'NFC-2201', plateNumber: '29C-456.78', vehicleType: 'Xe tải nhỏ', timeIn: '07:45 AM', status: 'Out' },
      { id: 'NFC-1156', plateNumber: '29B-555.22', vehicleType: 'Ô tô', timeIn: '07:30 AM', status: 'Out' },
    ];
    this.applyFilters();
  }

  applyFilters() {
    let temp = this.allRecords;

    if (this.searchTerm) {
      const lowerTerm = this.searchTerm.toLowerCase();
      temp = temp.filter(r => r.plateNumber.toLowerCase().includes(lowerTerm) || r.id.toLowerCase().includes(lowerTerm));
    }

    if (this.filterStatus !== 'all') {
      temp = temp.filter(r => r.status === this.filterStatus);
    }

    this.filteredRecords = temp;
    this.updatePagination();
  }

  updatePagination() {
    this.paginatedRecords = this.filteredRecords;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }
}