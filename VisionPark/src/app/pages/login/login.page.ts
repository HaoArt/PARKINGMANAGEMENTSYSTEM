import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonIcon, IonInput, IonCard, IonCardContent,
  IonItem, IonButton, NavController, LoadingController,
  ToastController, IonHeader, IonToolbar, IonTitle, 
  IonCardHeader, IonCardSubtitle, IonCardTitle } from '@ionic/angular/standalone';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonCardTitle, 
    CommonModule, FormsModule, IonContent, IonIcon, IonInput, 
    IonCard, IonCardContent, IonItem, IonButton, IonHeader, 
    IonToolbar, IonTitle, IonCardHeader, IonCardSubtitle
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
  ) {}

  ngOnInit() {}

  async handleLogin() {
    // 1. Kiểm tra nhập liệu
    if (!this.loginData.username || !this.loginData.password) {
      this.showToast('Vui lòng nhập tài khoản và mật khẩu!', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Đang đăng nhập...',
      duration: 1000 // Giả lập thời gian xử lý
    });
    await loading.present();

    // 2. Kiểm tra dữ liệu ảo (admin / 123)
    if (this.loginData.username === 'admin' && this.loginData.password === '123') {
      await loading.dismiss();
      this.showToast('Đăng nhập thành công!', 'success');
      
      // Chuyển sang trang dashboard lập tức
      this.navCtrl.navigateRoot('/dashboard'); 
    } else {
      await loading.dismiss();
      this.showToast('Tài khoản hoặc mật khẩu không đúng!', 'danger');
    }
  }

  async showToast(message: string, color: string = 'dark') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    toast.present();
  }
}