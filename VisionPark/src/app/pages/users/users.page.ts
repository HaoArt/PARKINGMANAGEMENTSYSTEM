import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, AlertController } from '@ionic/angular/standalone';
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

  allUsers: UserRecord[] = [];
  users: UserRecord[] = [];
  
  searchTerm: string = '';
  filterRole: string = 'all';
  filterStatus: string = 'all';
  isLoading = false;

  constructor() {
    addIcons({ ...icons });
  }

  ngOnInit() {
    this.loadUsers();
  }

  // 1. LẤY DỮ LIỆU TỪ BACKEND
  loadUsers() {
    this.isLoading = true;
    this.api.getAllUsers().subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.allUsers = res.data;
          this.applyFilters();
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Lỗi API lấy nhân viên:', err);
        this.isLoading = false;
      }
    });
  }

  // 2. BỘ LỌC
  applyFilters() {
    let temp = this.allUsers;
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      temp = temp.filter(u => u.fullName.toLowerCase().includes(term) || u.userName.toLowerCase().includes(term));
    }
    if (this.filterRole !== 'all') {
      temp = temp.filter(u => u.role === this.filterRole);
    }
    if (this.filterStatus !== 'all') {
      const isActive = this.filterStatus === 'active';
      temp = temp.filter(u => u.isActive === isActive);
    }
    this.users = temp;
  }

  // 3. THÊM NHÂN VIÊN
  async addUser() {
    const alert = await this.alertCtrl.create({
      header: 'Thêm nhân viên mới',
      inputs: [
        { name: 'fullName', type: 'text', placeholder: 'Họ và tên' },
        { name: 'userName', type: 'text', placeholder: 'Tên đăng nhập' },
        { name: 'password', type: 'password', placeholder: 'Mật khẩu' },
        { name: 'role', type: 'text', value: 'Security', placeholder: 'Vai trò (Admin/Security)' }
      ],
      buttons: [
        { text: 'Hủy', role: 'cancel' },
        {
          text: 'Tạo tài khoản',
          handler: (data) => {
            if (!data.fullName || !data.userName || !data.password) return false;
            this.api.createUser(data).subscribe({
              next: (res: any) => { window.alert(res.message); this.loadUsers(); },
              error: (err: any) => window.alert(err.error?.Message || 'Lỗi thêm nhân viên!')
            });
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  // 4. SỬA NHÂN VIÊN
  async editUser(user: UserRecord) {
    const alert = await this.alertCtrl.create({
      header: 'Cập nhật thông tin',
      inputs: [
        { name: 'fullName', type: 'text', value: user.fullName, placeholder: 'Họ và tên' },
        { name: 'role', type: 'text', value: user.role, placeholder: 'Vai trò (Admin/Security)' },
        { name: 'isActive', type: 'text', value: user.isActive ? '1' : '0', placeholder: 'Trạng thái (1: Hoạt động, 0: Khóa)' }
      ],
      buttons: [
        { text: 'Hủy', role: 'cancel' },
        {
          text: 'Lưu thay đổi',
          handler: (data) => {
            if (!data.fullName || !data.role) return false;
            const payload = {
              fullName: data.fullName,
              role: data.role,
              isActive: data.isActive === '1'
            };
            this.api.updateUser(user.userID, payload).subscribe({
              next: (res: any) => { window.alert(res.message); this.loadUsers(); },
              error: (err: any) => window.alert(err.error?.Message || 'Lỗi cập nhật!')
            });
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  // 5. XÓA NHÂN VIÊN
  deleteUser(user: UserRecord) {
    if (user.role === 'Admin') {
      window.alert('Hệ thống từ chối: Không được phép xóa tài khoản Admin!');
      return;
    }
    if (window.confirm(`Bạn có chắc muốn XÓA VĨNH VIỄN nhân viên ${user.fullName}?`)) {
      this.api.deleteUser(user.userID).subscribe({
        next: (res: any) => { window.alert(res.message); this.loadUsers(); },
        error: (err: any) => window.alert(err.error?.Message || 'Lỗi xóa nhân viên!')
      });
    }
  }
}