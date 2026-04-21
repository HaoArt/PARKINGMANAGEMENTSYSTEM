import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Api {
  login(credentials: any): Observable<any> {
  // Nhớ kiểm tra port 7154 hay 5295 cho đúng với backend của bạn nhé
  return this.http.post(`${this.baseUrl}/User/login`, credentials);
}
  // ĐIỀN ĐÚNG PORT CỦA .NET (Ví dụ: 5000, 7154, 5001...)
  private baseUrl = 'http://localhost:5295/api'; 

  constructor(private http: HttpClient) {}

  // 1. Gọi API lấy lịch sử bãi đỗ xe
  getParkingHistory(): Observable<any> {
    return this.http.get(`${this.baseUrl}/Parking/history`);
  }

  // 2. Gọi API quét thẻ (C# đang gộp cả In và Out vào chung 1 API scan-card)
  scanCard(cardUID: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/Parking/scan-card`, { CardUID: cardUID });
  }
  getAllUsers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/User`);
  }

  // Khóa / Mở khóa tài khoản
  toggleUserStatus(userId: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/User/toggle-status/${userId}`, {});
  }

  // Xóa tài khoản
  deleteUser(userId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/User/${userId}`);
  }
  
}