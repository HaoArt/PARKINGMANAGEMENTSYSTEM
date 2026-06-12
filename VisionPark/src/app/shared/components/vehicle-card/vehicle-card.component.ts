import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-vehicle-card',
  templateUrl: './vehicle-card.component.html',
  styleUrls: ['./vehicle-card.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class VehicleCardComponent implements OnInit {
  cards: any[] = [];
  private http = inject(HttpClient);

  constructor() {}

  ngOnInit() {
    this.loadCards();
  }

  loadCards() {
    // Sử dụng URL linh hoạt theo môi trường
    this.http.get<any[]>(`${environment.apiUrl}/api/Cards`).subscribe({
      next: (res) => {
        this.cards = res;
      },
      error: (err) => {
        console.error('Lỗi khi lấy danh sách thẻ:', err);
      },
    });
  }
}
