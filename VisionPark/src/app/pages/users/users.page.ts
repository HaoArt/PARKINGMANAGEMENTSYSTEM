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
import { Api } from '../../services/api'; // <-- KẾT NỐI API VÀO ĐÂY

interface UserRecord {
  UserId: number;
  Username: string;
  FullName: string;
  Role: string; 
  IsActive: boolean;
  CreatedAt: string;
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
  UsersList: UserRecord[] = [];
  FilteredUsers: UserRecord[] = [];

  // Nhúng biến api vào constructor
  constructor(private api: Api) {
    addIcons({ 
      addOutline, createOutline, trashOutline, 
      personOutline, shieldCheckmarkOutline, searchOutline,
      lockClosedOutline, lockOpenOutline
    });
  }

  ngOnInit() {
    this.loadUsersFromBackend(); // Tải dữ liệu thật khi mở trang
  }

  // --- LẤY DỮ LIỆU TỪ SQL SERVER ---
  loadUsersFromBackend() {
    this.api.getAllUsers().subscribe({
      next: (res: any) => {
        const rawData = res.data ? res.data : res; 
        
        // Hứng đúng chuẩn camelCase từ .NET trả về
        this.UsersList = rawData.map((u: any) => ({
          UserId: u.userId,
          Username: u.username, 
          FullName: u.fullName,
          Role: u.role,
          IsActive: u.isActive,
          CreatedAt: u.createdAt
        }));
        
        this.FilteredUsers = [...this.UsersList];
      },
      error: (err) => console.error('Lỗi lấy danh sách nhân viên:', err)
    });
  }

  // --- ĐỔI TRẠNG THÁI (KHÓA/MỞ KHÓA) ---
  toggleUserStatus(user: UserRecord) {
    this.api.toggleUserStatus(user.UserId).subscribe({
      next: () => {
        user.IsActive = !user.IsActive; // Cập nhật giao diện nếu C# báo thành công
      },
      error: (err) => alert('Có lỗi xảy ra khi đổi trạng thái nhân viên!')
    });
  }

  // --- XÓA TÀI KHOẢN ---
  deleteUser(userId: number) {
    if(confirm('Bạn có chắc chắn muốn xóa tài khoản này không?')) {
      this.api.deleteUser(userId).subscribe({
        next: () => {
          alert('Xóa thành công!');
          this.loadUsersFromBackend(); // Tải lại bảng sau khi xóa
        },
        error: (err) => alert('Lỗi khi xóa nhân viên!')
      });
    }
  }

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

  getRoleColor(role: string): string {
    switch (role) {
      case 'Admin': return 'danger';
      case 'Manager': return 'primary';
      case 'Security': return 'success';
      default: return 'medium';
    }
  }

  addNewUser() {
    alert('Chức năng mở Popup/Modal thêm nhân viên sẽ được gọi ở đây!');
  }
}