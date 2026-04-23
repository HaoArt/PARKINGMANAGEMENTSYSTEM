import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, AlertController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import * as icons from 'ionicons/icons';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

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

  // 1. TẢI DỮ LIỆU GIẢ
  loadUsers() {
    this.isLoading = true;
    setTimeout(() => {
      this.allUsers = [
        { userID: 1, fullName: 'Nguyễn Văn A', userName: 'admin.nva', role: 'Admin', isActive: true, createAt: '20/04/2026' },
        { userID: 2, fullName: 'Trần Thị B', userName: 'sec.ttb', role: 'Security', isActive: true, createAt: '21/04/2026' },
        { userID: 3, fullName: 'Lê Văn M', userName: 'sec.lvm', role: 'Security', isActive: false, createAt: '22/04/2026' },
      ];
      this.applyFilters();
      this.isLoading = false;
    }, 300); // Giả lập độ trễ mạng
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

  // 3. THÊM NHÂN VIÊN GIẢ
  async addUser() {
    const alert = await this.alertCtrl.create({
      header: 'Thêm nhân viên mới',
      inputs: [
        { name: 'fullName', type: 'text', placeholder: 'Họ và tên' },
        { name: 'userName', type: 'text', placeholder: 'Tên đăng nhập' },
        { name: 'role', type: 'text', value: 'Security', placeholder: 'Vai trò (Admin/Security)' }
      ],
      buttons: [
        { text: 'Hủy', role: 'cancel' },
        {
          text: 'Tạo tài khoản',
          handler: (data) => {
            if (!data.fullName || !data.userName) {
              window.alert('Vui lòng nhập đủ thông tin!');
              return false;
            }
            
            // Tạo record mới đẩy vào mảng giả
            const newUser: UserRecord = {
              userID: Date.now(),
              fullName: data.fullName,
              userName: data.userName,
              role: data.role || 'Security',
              isActive: true,
              createAt: new Date().toLocaleDateString('vi-VN')
            };

            this.allUsers.unshift(newUser); // Thêm lên đầu mảng
            this.applyFilters();
            window.alert('Đã thêm nhân viên thành công (Dữ liệu giả)!');
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  // 4. XÓA NHÂN VIÊN GIẢ
  deleteUser(user: UserRecord) {
    if (user.role === 'Admin') {
      window.alert('Hệ thống từ chối: Không được phép xóa tài khoản Admin!');
      return;
    }
    if (window.confirm(`Bạn có chắc muốn XÓA nhân viên ${user.fullName}?`)) {
      // Lọc bỏ user bị xóa khỏi mảng giả
      this.allUsers = this.allUsers.filter(u => u.userID !== user.userID);
      this.applyFilters();
      window.alert('Đã xóa thành công (Dữ liệu giả)!');
    }
  }

  editUser(user: UserRecord) {
    alert('Chức năng sửa đang cập nhật!');
  }
}