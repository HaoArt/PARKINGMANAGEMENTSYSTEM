import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Api {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  // Hàm tiện ích để đính kèm Token JWT vào Header
  private getAuthOptions() {
    let headers = new HttpHeaders();
    const token = localStorage.getItem('token');

    // Bật log để kiểm tra token có tồn tại không
    console.log(
      'Token lấy từ Local Storage:',
      token ? token.substring(0, 20) + '...' : 'NULL',
    );

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return { headers };
  }

  getAllCards(): Observable<any> {
    return this.http.get(`${this.baseUrl}/Cards`);
  }

  createCard(cardData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/Cards`, cardData);
  }

  // Cập nhật thông tin thẻ
  updateCard(cardId: number, cardData: any) {
    return this.http.put(`${this.baseUrl}/Cards/${cardId}`, cardData);
  }

  // Xóa thẻ
  deleteCard(cardId: number) {
    return this.http.delete(`${this.baseUrl}/Cards/${cardId}`);
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

  getSettings(): Observable<any> {
    return this.http.get(`${this.baseUrl}/Settings`, this.getAuthOptions());
  }

  saveSettings(payload: any): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/Settings/update`,
      payload,
      this.getAuthOptions(),
    );
  }

  // Quét và nhận diện khuôn mặt từ ảnh Base64
  detectFace(base64Image: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/FaceScan/detect`, { base64Image });
  }

  // Đăng ký khuôn mặt cho User
  registerFace(userId: number, base64Image: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/FaceScan/register`, { userId, base64Image });
  }

  // Nhận diện khuôn mặt để chấm công
  recognizeFace(base64Image: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/FaceScan/recognize`, { base64Image });
  }

  // Quét khuôn mặt realtime (không lưu vào CSDL)
  detectFaceLive(base64Image: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/FaceScan/detect-live`, { base64Image });
  }

  // Lấy lịch sử quét khuôn mặt (bao gồm ảnh đã được vẽ khung)
  getFaceHistory(): Observable<any> {
    return this.http.get(`${this.baseUrl}/FaceScan/history`);
  }
}
