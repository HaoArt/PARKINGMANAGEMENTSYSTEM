import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Api {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getCards(): Observable<any> {
    return this.http.get(`${this.baseUrl}/Card`);
  }

  createCard(cardData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/Card`, cardData);
  }
  scanCard(cardUID: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/Parking/scan-card`, { cardUID });
  }
  getParkingHistory(): Observable<any> {
    return this.http.get(`${this.baseUrl}/Parking/history`);
  }
  registerMonthly(formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/Ticket/register-monthly`, formData);
  }
  getMonthlyTickets(): Observable<any> {
    return this.http.get(`${this.baseUrl}/Ticket/monthly-tickets`);
  }
  getVehicleTypes(): Observable<any> {
    return this.http.get(`${this.baseUrl}/VehicleTypes`);
  }
  addVehicleType(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/VehicleTypes`, data);
  }
  login(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/Auth/login`, data);
  }
}
