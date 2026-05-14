import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonContent, IonIcon, AlertController, ToastController, NavController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import * as icons from 'ionicons/icons';

import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { Api } from '../../services/api';

interface UserRecord {
  userID: number;
  userName: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createAt: string;
  faceImageUrl?: string;
}

@Component({
  selector: 'app-users',
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
  standalone: true,
  imports: [IonContent, IonIcon, CommonModule, FormsModule, NavbarComponent],
})
export class UsersPage implements OnInit {
  private api = inject(Api);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private cdr = inject(ChangeDetectorRef); 
  private navCtrl = inject(NavController);

  allUsers: UserRecord[] = [];
  users: UserRecord[] = [];
  paginatedUsers: UserRecord[] = [];

  // Phân trang
  currentPage: number = 1;
  itemsPerPage: number = 5;
  totalPages: number = 1;
  visiblePages: (number | string)[] = [];
  
  searchTerm: string = '';
  filterRole: string = 'all';
  filterStatus: string = 'all';
  isLoading = false;

  // --- BIẾN QUẢN LÝ MODAL ---
  showModal: boolean = false;
  modalMode: 'add' | 'edit' = 'add';
  editingUser: any = { userID: null, fullName: '', userName: '', password: '', role: 'Security', isActive: true };

  constructor() {

    addIcons({ ...icons, closeOutline: icons.closeOutline });

  }

  ngOnInit() {
    const role = localStorage.getItem('userRole');
    if (role !== 'Admin') {
      this.showToast('Bạn không có quyền truy cập trang này!', 'danger');
      this.navCtrl.navigateRoot('/dashboard');
      return;
    }
    this.loadUsers();
  }

  async showToast(message: string, color: 'success' | 'danger' = 'success') {
    const toast = await this.toastCtrl.create({
      message: message, duration: 2500, color: color, position: 'top',

      cssClass: `toast-top-right toast-${color}`,
      icon: color === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline'
    });
    toast.present();
  }

  loadUsers() {
    this.isLoading = true;
    this.api.getAllUsers().subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.allUsers = res.data.map((item: any) => ({
            ...item, 
            userID: item.userId || item.UserID || item.userID,
            faceImageUrl: item.faceImageUrl || item.FaceImageUrl
          }));
          this.applyFilters();
        }
        this.isLoading = false;
        this.cdr.detectChanges(); 
      },
      error: (err: any) => {
        console.error('Lỗi API lấy nhân viên:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  applyFilters() {
    let temp = this.allUsers;
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      temp = temp.filter(u => u.fullName.toLowerCase().includes(term) || u.userName.toLowerCase().includes(term));
    }
    if (this.filterRole !== 'all') temp = temp.filter(u => u.role === this.filterRole);
    if (this.filterStatus !== 'all') temp = temp.filter(u => u.isActive === (this.filterStatus === 'active'));
    this.users = temp;
    
    this.currentPage = 1;
    this.calculatePagination();
  }

  // --- LOGIC MỞ/ĐÓNG MODAL ---
  openAddModal() {
    this.modalMode = 'add';
    this.editingUser = { userID: null, fullName: '', userName: '', password: '', role: 'Security', isActive: true };
    this.showModal = true;
  }

  openEditModal(user: UserRecord) {
    this.modalMode = 'edit';
    this.editingUser = { 
      userID: user.userID, fullName: user.fullName, userName: user.userName, 
      password: '', role: user.role, isActive: user.isActive 
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }


  saveUser() {
    if (!this.editingUser.fullName || !this.editingUser.userName) {
      this.showToast('Họ tên và Tên đăng nhập không được để trống!', 'danger');
      return;
    }

    if (this.modalMode === 'add') {
      if (!this.editingUser.password) {
        this.showToast('Vui lòng nhập mật khẩu!', 'danger');
        return;
      }
      
      // SỬA Ở ĐÂY: Chỉ gửi đúng 4 trường cần thiết, tuyệt đối không gửi userID = null
      const payload = {
        fullName: this.editingUser.fullName,
        userName: this.editingUser.userName,
        password: this.editingUser.password,
        role: 'Security'
      };

      this.api.createUser(payload).subscribe({
        next: (res: any) => { 
          this.showToast('Thêm nhân viên thành công!', 'success'); 
          this.closeModal(); 
          this.loadUsers(); 
        },
        error: (err: any) => {
          // Bắt thêm lỗi validation mặc định của .NET (err.error.title) để dễ debug hơn
          const errorMsg = err.error?.Message || err.error?.title || 'Lỗi thêm nhân viên!';
          this.showToast(errorMsg, 'danger');
          console.error('Chi tiết lỗi API 400:', err.error);
        }
      });

    } else {
      
      // SỬA Ở ĐÂY: Dành riêng cho Update
      const payload = {
        fullName: this.editingUser.fullName, 
        userName: this.editingUser.userName,
        password: this.editingUser.password, 
        role: this.editingUser.role, 
        isActive: this.editingUser.isActive
      };

      this.api.updateUser(this.editingUser.userID, payload).subscribe({
        next: (res: any) => { 
          this.showToast('Cập nhật thành công!', 'success'); 
          this.closeModal(); 
          this.loadUsers(); 
        },
        error: (err: any) => {
          const errorMsg = err.error?.Message || err.error?.title || 'Lỗi cập nhật!';
          this.showToast(errorMsg, 'danger');
          console.error('Chi tiết lỗi API 400:', err.error);
        }
      });
    }
  }
  // --- XÓA NHÂN VIÊN ---
  async deleteUser(user: UserRecord) {
    if (user.role === 'Admin') return this.showToast('Không được phép xóa tài khoản Admin!', 'danger');
    if (!user.userID) return this.showToast('Không tìm thấy ID nhân viên!', 'danger');

    const alert = await this.alertCtrl.create({
      header: 'Xác nhận xóa',
      message: `Bạn có chắc chắn muốn XÓA VĨNH VIỄN nhân viên <strong>${user.fullName}</strong>?<br><br>Hành động này không thể hoàn tác.`,
      buttons: [
        { text: 'Hủy', role: 'cancel' },
        {
          text: 'Xóa nhân viên', role: 'destructive',
          handler: () => {
            this.api.deleteUser(user.userID).subscribe({
              next: (res: any) => { this.showToast('Đã xóa thành công!', 'success'); this.loadUsers(); },
              error: (err: any) => this.showToast(err.error?.Message || 'Lỗi xóa!', 'danger')
            });
          }
        }
      ]
    });
    await alert.present();
  }

  // --- LOGIC PHÂN TRANG ---
  calculatePagination() {
    this.totalPages = Math.ceil(this.users.length / this.itemsPerPage); 
    
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    } else if (this.totalPages === 0) {
      this.currentPage = 1;
    }
    
    this.updatePaginatedUsers();
    this.generatePages();
    this.cdr.detectChanges();
  }

  updatePaginatedUsers() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedUsers = this.users.slice(startIndex, endIndex);
  }

  generatePages() {
    const current = this.currentPage;
    const total = this.totalPages;
    const delta = 1;
    const range = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    range.push(1);
    for (let i = current - delta; i <= current + delta; i++) {
      if (i < total && i > 1) {
        range.push(i);
      }
    }
    if (total > 1) {
      range.push(total);
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    this.visiblePages = rangeWithDots;
  }

  goToPage(page: number | string) {
    if (typeof page === 'number' && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePaginatedUsers();
      this.generatePages();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedUsers();
      this.generatePages();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedUsers();
      this.generatePages();
    }
  }
}