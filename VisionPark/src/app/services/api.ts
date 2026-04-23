import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
  getParkingHistory(filterParams: any = {}) {
    let params = new HttpParams();

    // Tự động nhặt các tham số có giá trị để gắn vào URL
    if (filterParams.searchTerm) {
      params = params.set('searchTerm', filterParams.searchTerm);
    }
    if (filterParams.status) {
      params = params.set('status', filterParams.status);
    }
    if (filterParams.pageNumber) {
      params = params.set('pageNumber', filterParams.pageNumber);
    }
    if (filterParams.pageSize) {
      params = params.set('pageSize', filterParams.pageSize);
    }
    return this.http.get(`${this.baseUrl}/Parking/history`, { params });
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
  // Lấy danh sách nhân viên
  getAllUsers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/Users`);
  }

  // Thêm nhân viên
  createUser(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/Users/create`, data);
  }

  // Sửa nhân viên
  updateUser(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/Users/update/${id}`, data);
  }

  // Xóa nhân viên
  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/Users/delete/${id}`);
  }
}
