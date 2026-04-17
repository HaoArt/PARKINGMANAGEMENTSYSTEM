import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonIcon,
  IonInput,
  IonCard,
  IonCardContent,
  IonList,
  IonItem,
  IonButton,
  NavController,
  LoadingController,
  ToastController,
  IonNote,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    IonNote,
    IonButton,
    IonItem,
    IonInput,
    IonList,
    IonCardContent,
    IonCard,
    IonIcon,
    IonContent,
    CommonModule,
    FormsModule,
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

  async handleLogin() {
    if (!this.loginData.username || !this.loginData.password) {
      this.showToast('Vui lòng nhập đầy đủ thông tin!');
      return;
    }
    const loading = await this.loadingCtrl.create({
      message: 'Đang kiểm tra thông tin...',
      animated: true,
    });
    await loading.present();
    setTimeout(async () => {
      await loading.dismiss();
      if (
        this.loginData.username === 'admin' &&
        this.loginData.password === '123'
      ) {
        this.showToast('Đăng nhập thành công!', 'success');
        this.navCtrl.navigateForward('/dashboard');
      } else {
        this.showToast('Sai tài khoản hoặc mật khẩu!', 'danger');
      }
    }, 1500);
  }

  async showToast(message: string, color: string = 'dark') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    toast.present();
  }
  ngOnInit() {}
}
