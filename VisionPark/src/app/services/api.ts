import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Api {
  private http = inject(HttpClient);
  public avatarUpdated = new Subject<string>(); // Phát sự kiện khi ảnh đại diện thay đổi

  private baseUrl = environment.apiUrl;
  private getAuthOptions() {
    let headers = new HttpHeaders();
    let token = localStorage.getItem('token');

    if (token) {
      // Tự động gọt bỏ dấu ngoặc kép thừa (nếu có)
      token = token.replace(/^"(.*)"$/, '$1');
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return { headers };
  }

  // Chuyển đổi đường dẫn ảnh tương đối thành URL tuyệt đối (trỏ về Server Backend)
  getFullImageUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:image')) return path;
    const serverUrl = this.baseUrl.endsWith('/api')
      ? this.baseUrl.slice(0, -4)
      : this.baseUrl;
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return `${serverUrl}${cleanPath}`;
  }

  getAllCards(filterParams: any = {}): Observable<any> {
    let params = new HttpParams();
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
    return this.http.get(`${this.baseUrl}/Cards`, { params });
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
  scanCard(cardUID: string, cardToken?: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/Parking/scan-card`, {
      cardUID,
      cardToken,
    });
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

  // Xuất báo cáo PDF lịch sử đỗ xe (Luồng tải File nhị phân)
  exportParkingHistoryPdf(filterParams: any = {}): Observable<Blob> {
    let params = new HttpParams();
    if (filterParams.searchTerm) {
      params = params.set('searchTerm', filterParams.searchTerm);
    }
    if (filterParams.status) {
      params = params.set('status', filterParams.status);
    }

    const options = this.getAuthOptions();
    return this.http.get(`${this.baseUrl}/Report/export-pdf`, {
      headers: options.headers,
      params: params,
      responseType: 'blob', // Bắt buộc để tải File
    });
  }

  // Gọi dữ liệu phân trang trực tiếp cho Dashboard
  getDashboardRecords(filterParams: any = {}): Observable<any> {
    let params = new HttpParams();
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
    const options = this.getAuthOptions();
    return this.http.get(`${this.baseUrl}/Dashboard/records`, { headers: options.headers, params });
  }

  // Xuất báo cáo CSV Dashboard (Luồng tải File nhị phân)
  exportDashboardCsv(filterParams: any = {}): Observable<Blob> {
    let params = new HttpParams();
    if (filterParams.searchTerm) params = params.set('searchTerm', filterParams.searchTerm);
    if (filterParams.status) params = params.set('status', filterParams.status);

    const options = this.getAuthOptions();
    return this.http.get(`${this.baseUrl}/Dashboard/export`, {
      headers: options.headers,
      params: params,
      responseType: 'blob',
    });
  }

  registerMonthly(formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/Ticket/register-monthly`, formData);
  }
  getMonthlyTickets(filterParams: any = {}): Observable<any> {
    let params = new HttpParams();
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
    return this.http.get(`${this.baseUrl}/Ticket/monthly-tickets`, { params });
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

  // Lấy thông tin tài khoản đang đăng nhập (kèm ảnh mới nhất)
  getCurrentUser(): Observable<any> {
    return this.http.get(`${this.baseUrl}/Auth/me`, this.getAuthOptions());
  }
  
  // Lấy danh sách nhân viên
  getAllUsers(filterParams: any = {}): Observable<any> {
    let params = new HttpParams();
    if (filterParams.searchTerm) {
      params = params.set('searchTerm', filterParams.searchTerm);
    }
    if (filterParams.role) {
      params = params.set('role', filterParams.role);
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
    return this.http.get(`${this.baseUrl}/Users`, { params });
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
    return this.http.delete(
      `${this.baseUrl}/Users/delete/${id}`,
      this.getAuthOptions(),
    );
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
    return this.http.post(`${this.baseUrl}/FaceScan/register`, {
      userId,
      base64Image,
    });
  }

  // Nhận diện khuôn mặt để chấm công
  recognizeFace(base64Image: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/FaceScan/recognize`,
      { base64Image },
      this.getAuthOptions(),
    );
  }
  // Quét khuôn mặt realtime (không lưu vào CSDL)
  detectFaceLive(base64Image: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/FaceScan/detect-live`, {
      base64Image,
    });
  }

  // Lấy lịch sử quét khuôn mặt (bao gồm ảnh đã được vẽ khung)
  getFaceHistory(): Observable<any> {
    return this.http.get(`${this.baseUrl}/FaceScan/history`);
  }

  // New method for attendance summary
  getAttendanceSummary(): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/Attendance/summary`,
      this.getAuthOptions(),
    );
  }

  // Lấy dữ liệu tổng doanh thu cho Dashboard
  getDashboardSummary(): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/Dashboard/summary`,
      this.getAuthOptions(),
    );
  }
}
