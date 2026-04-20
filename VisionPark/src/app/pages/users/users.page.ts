import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonGrid, IonRow, IonCol, IonCard, 
  IonCardHeader, IonCardTitle, IonCardContent, 
  IonButton, IonIcon, IonBadge, IonSearchbar, IonHeader, IonToolbar } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  addOutline, createOutline, trashOutline, 
  personOutline, shieldCheckmarkOutline, searchOutline,
  lockClosedOutline, lockOpenOutline
} from 'ionicons/icons';

// Giao diện chuẩn hóa theo bảng Users trong Database C#
interface UserRecord {
  UserId: number;
  Username: string;
  FullName: string;
  Role: string; // 'Admin', 'Security', 'Manager'
  IsActive: boolean;
  CreatedAt: Date;
}

@Component({
  selector: 'app-users',
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
  standalone: true,
  imports: [IonToolbar, IonHeader, 
    IonContent, IonGrid, IonRow, IonCol, IonCard, 
    IonCardHeader, IonCardTitle, IonCardContent, 
    IonButton, IonIcon, IonBadge, IonSearchbar,
    CommonModule, FormsModule
  ]
})
export class UsersPage implements OnInit {

  SearchTerm: string = '';
  
  // Dữ liệu mẫu giả lập từ DB
  UsersList: UserRecord[] = [];
  FilteredUsers: UserRecord[] = [];

  constructor() {
    addIcons({ 
      addOutline, createOutline, trashOutline, 
      personOutline, shieldCheckmarkOutline, searchOutline,
      lockClosedOutline, lockOpenOutline
    });
  }

  ngOnInit() {
    // Khởi tạo dữ liệu mẫu
    this.UsersList = [
      { UserId: 1, Username: 'admin', FullName: 'Trần Đức Thành Nhuận', Role: 'Admin', IsActive: true, CreatedAt: new Date('2025-01-01') },
      { UserId: 2, Username: 'baove_ca1', FullName: 'Nguyễn Văn A', Role: 'Security', IsActive: true, CreatedAt: new Date('2026-02-15') },
      { UserId: 3, Username: 'baove_ca2', FullName: 'Lê Thị B', Role: 'Security', IsActive: false, CreatedAt: new Date('2026-03-10') },
      { UserId: 4, Username: 'quanly_01', FullName: 'Phạm C', Role: 'Manager', IsActive: true, CreatedAt: new Date('2026-04-01') },
    ];
    this.FilteredUsers = [...this.UsersList];
  }

  // Hàm tìm kiếm nhân viên
  filterUsers() {
    if (!this.SearchTerm) {
      this.FilteredUsers = [...this.UsersList];
      return;
    }
    const term = this.SearchTerm.toLowerCase();
    this.FilteredUsers = this.UsersList.filter(u => 
      u.FullName.toLowerCase().includes(term) || 
      u.Username.toLowerCase().includes(term)
    );
  }

  // Hàm tạo màu cho Badge phân quyền
  getRoleColor(role: string): string {
    switch (role) {
      case 'Admin': return 'danger';
      case 'Manager': return 'primary';
      case 'Security': return 'success';
      default: return 'medium';
    }
  }

  // Hàm thay đổi trạng thái (Khóa / Mở khóa tài khoản)
  toggleUserStatus(user: UserRecord) {
    user.IsActive = !user.IsActive;
    // Ở đây sau này sẽ gọi API update xuống C#
    console.log(`Đã thay đổi trạng thái của ${user.Username} thành ${user.IsActive}`);
  }

  // Nút thêm nhân viên
  addNewUser() {
    alert('Chức năng mở Popup/Modal thêm nhân viên sẽ được gọi ở đây!');
  }
}