import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, 
  IonFooter, IonButtons, IonMenuButton, IonIcon, IonButton 
} from '@ionic/angular/standalone';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component'; 
import { addIcons } from 'ionicons';
import { 
  carOutline, cashOutline, searchOutline, chevronBackOutline, 
  chevronForwardOutline, optionsOutline, car, arrowUpOutline, bicycle, cameraOutline, refreshOutline, scanOutline, chevronDownOutline, saveOutline } from 'ionicons/icons';
import { Api } from '../../services/api';

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
  imports: [ IonButton, IonIcon, CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, IonFooter, IonButtons, IonMenuButton, NavbarComponent]
})
export class DashboardPage implements OnInit {
  stats = {
    totalVehicles: 0, availableSlots: 100, revenueToday: '0', fillRate: 0 
  };
  
  allRecords: ParkingRecord[] = [];
  filteredRecords: ParkingRecord[] = [];
  paginatedRecords: ParkingRecord[] = [];
  
  searchTerm: string = '';
  filterStatus: string = 'all'; 
  
  currentPage: number = 1;
  itemsPerPage: number = 4;
  totalPages: number = 1;

  constructor(private api: Api) { 
    addIcons({cameraOutline,refreshOutline,scanOutline,chevronDownOutline,saveOutline,optionsOutline,carOutline,cashOutline,searchOutline,chevronBackOutline,chevronForwardOutline,car,arrowUpOutline,bicycle});
  }

  ngOnInit() {
    this.loadDataFromDatabase();
  }

  loadDataFromDatabase() {
    this.api.getParkingHistory().subscribe({
      next: (response: any) => {
        if (response && response.data) {
          let totalRevenue = 0; 

          this.allRecords = response.data.map((item: any) => {
            const cost = item.totalCost || item.TotalCost || 0;
            totalRevenue += cost;

            return {
              id: `NFC-${item.cardID || item.CardID}`, 
              plateNumber: item.licensePlateIn || item.LicensePlateIn || 'N/A', 
              vehicleType: item.vehicleTypeID === 1 ? 'Xe máy' : 'Ô tô', 
              timeIn: item.checkInTime || item.CheckInTime, 
              status: (item.status === "Đang đỗ" || item.status === "In") ? 'In' : 'Out'
            };
          });

          const carsInParking = this.allRecords.filter(r => r.status === 'In').length;
          this.stats.totalVehicles = carsInParking;
          this.stats.availableSlots = 100 - carsInParking;
          this.stats.fillRate = Math.round((carsInParking / 100) * 100);
          this.stats.revenueToday = totalRevenue.toLocaleString('vi-VN'); 

          this.applyFilters();
        }
      },
      error: (err) => console.error('Lỗi API Dashboard:', err)
    });
  }

  applyFilters() {
    let temp = this.allRecords;
    
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      temp = temp.filter(r => r.plateNumber.toLowerCase().includes(term) || r.id.toLowerCase().includes(term));
    }
    
    if (this.filterStatus !== 'all') {
      temp = temp.filter(r => r.status === this.filterStatus);
    }

    this.filteredRecords = temp;
    this.totalPages = Math.ceil(this.filteredRecords.length / this.itemsPerPage) || 1;
    this.currentPage = 1; 
    this.updatePagination();
  }

  updatePagination() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedRecords = this.filteredRecords.slice(start, start + this.itemsPerPage);
  }
  
  nextPage() { if (this.currentPage < this.totalPages) { this.currentPage++; this.updatePagination(); } }
  prevPage() { if (this.currentPage > 1) { this.currentPage--; this.updatePagination(); } }
}