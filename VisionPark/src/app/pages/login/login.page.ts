import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonIcon,
  IonInput,
  IonCard,
  IonCardContent,
  IonItem,
  IonButton,
  NavController,
  LoadingController,
  ToastController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonImg,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personOutline, lockClosedOutline } from 'ionicons/icons';
import { Api } from '../../services/api';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    IonImg,
    IonCardTitle,
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon,
    IonInput,
    IonCard,
    IonCardContent,
    IonItem,
    IonButton,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonCardHeader,
    IonCardSubtitle,
  ],
})
export class LoginPage implements OnInit {
  loginData = {
    username: '',
    password: '',
  };

  constructor(
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private navCtrl: NavController,
    private api: Api,
  ) {
    addIcons({ personOutline, lockClosedOutline });
  }

  ngOnInit() {}

  async handleLogin() {
    if (!this.loginData.username || !this.loginData.password) {
      this.showToast('Vui lòng nhập tài khoản và mật khẩu!', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Đang xác thực...',
    });
    await loading.present();

    this.api.login(this.loginData).subscribe({
      next: async (res: any) => {
        await loading.dismiss();

        const name = res.fullName || res.FullName || res.username || 'User';
        const role = res.role || res.Role || 'Security';
        // Lấy token từ response (Tuỳ thuộc vào backend trả về object như thế nào)
        const token =
          res.token || res.Token || res.data?.token || res.data?.Token;

        this.showToast(`Xin chào ${name}!`, 'success');

        // Lưu thông tin vào bộ nhớ trình duyệt
        localStorage.setItem('userRole', role);
        localStorage.setItem('fullName', name);
        if (token) {
          localStorage.setItem('token', token);
        } else {
          console.warn('Không tìm thấy token trong API response:', res);
        }

        this.navCtrl.navigateRoot('/dashboard');
      },
      error: async (err) => {
        await loading.dismiss();
        console.error('Lỗi đăng nhập chi tiết: ' + JSON.stringify(err));

        // Kiểm tra lỗi trả về từ Backend (như "Sai mật khẩu", "Tài khoản bị khóa")
        let errorMsg = 'Mất kết nối đến Server!';
        if (err.error) {
          errorMsg =
            typeof err.error === 'string'
              ? err.error
              : err.error.message || errorMsg;
        }

        this.showToast(errorMsg, 'danger');
      },
    });
  }

  async showToast(message: string, color: string = 'dark') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
    });
    toast.present();
  }
}
