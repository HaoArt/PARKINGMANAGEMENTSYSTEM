import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonIcon,
  ToastController,
  AlertController, // Thêm AlertController để làm hộp thoại xác nhận xóa
  Platform,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import * as icons from 'ionicons/icons';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { Api } from '../../services/api';
import { NFC, Ndef } from '@awesome-cordova-plugins/nfc/ngx';

interface CardRecord {
  cardID: number;
  cardUID: string;
  status: string;
  cardType: string;
}

@Component({
  selector: 'app-card-registration',
  templateUrl: './card-registration.page.html',
  styleUrls: ['./card-registration.page.scss'],
  standalone: true,
  imports: [IonContent, IonIcon, CommonModule, FormsModule, NavbarComponent],
  providers: [NFC, Ndef],
})
export class CardRegistrationPage implements OnInit {
  private api = inject(Api);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController); // Tiêm Alert
  private platform = inject(Platform);

  isLoading = false;
  isSubmitting = false;
  isEditing = false; // Biến kiểm tra xem đang Thêm hay Sửa
  editingCardId: number | null = null; // Lưu ID thẻ đang sửa

  systemCards: CardRecord[] = [];
  paginatedCards: CardRecord[] = [];

  // Phân trang
  currentPage: number = 1;
  itemsPerPage: number = 5;
  totalPages: number = 1;
  visiblePages: (number | string)[] = [];

  // Dữ liệu thẻ trên Form (Thêm trường status để Admin có thể khóa thẻ)
  cardForm = {
    cardUID: '',
    cardType: 'Monthly',
    status: 'Active' 
  };

  constructor(
    private nfc: NFC,
    private cdr: ChangeDetectorRef,
  ) {
    addIcons({ ...icons });
  }

  ngOnInit() {
    this.loadSystemCards();
    this.startNFC(); 
  }

  startNFC() {
    if (this.platform.is('capacitor') || this.platform.is('cordova')) {
      this.nfc.addTagDiscoveredListener().subscribe({
        next: (event: any) => {
          const scannedUID = this.nfc.bytesToHexString(event.tag.id).toUpperCase();
          this.cardForm.cardUID = scannedUID;
          this.cdr.detectChanges(); 
          this.showToast('Đã nhận mã thẻ: ' + scannedUID, 'success');
        },
        error: (err) => console.error('Lỗi NFC:', err)
      });
    } else {
      console.warn('NFC plugin chỉ hoạt động trên thiết bị thực (Android/iOS). Môi trường hiện tại là trình duyệt.');
    }
  }

  loadSystemCards() {
    this.isLoading = true;
    this.api.getAllCards().subscribe({
      next: (res: any) => {
        // CẬP NHẬT: Xử lý dữ liệu trả về trực tiếp dưới dạng mảng
        let rawData = [];
        if (res && res.data) {
          rawData = res.data; 
        } else if (Array.isArray(res)) {
          rawData = res;      
        }

        this.systemCards = rawData.map((item: any) => {
          return {
            cardID: item.cardID || item.CardID,
            cardUID: item.cardUID || item.CardUID,
            cardType: item.cardType || item.CardType,
            status: item.status || item.Status
          };
        });

        this.currentPage = 1;
        this.calculatePagination();

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Lỗi tải danh sách thẻ:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  } 

  // Chuyển sang chế độ Sửa khi bấm vào icon Edit trên bảng
  editCard(item: CardRecord) {
    this.isEditing = true;
    this.editingCardId = item.cardID;
    
    // Đổ dữ liệu từ bảng lên Form
    this.cardForm = {
      cardUID: item.cardUID,
      cardType: item.cardType,
      status: item.status
    };
  }

  // Hủy chế độ sửa
  cancelEdit() {
    this.isEditing = false;
    this.editingCardId = null;
    this.resetForm();
  }

  // Hàm Lưu (Gộp chung cả Thêm mới và Cập nhật)
  saveCard() {
    if (!this.cardForm.cardUID) {
      this.showToast('Vui lòng quẹt thẻ để lấy mã NFC!', 'warning');
      return;
    }

    this.isSubmitting = true;

    if (this.isEditing && this.editingCardId) {
      // GỌI API CẬP NHẬT
      this.api.updateCard(this.editingCardId, this.cardForm).subscribe({
        next: (res: any) => {
          this.showToast('Cập nhật thẻ thành công!', 'success');
          this.cancelEdit();
          this.loadSystemCards();
          this.isSubmitting = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.showToast(err.error?.message || 'Lỗi khi cập nhật thẻ!', 'danger');
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      // GỌI API THÊM MỚI
      this.api.createCard(this.cardForm).subscribe({
        next: (res: any) => {
          this.showToast('Thêm thẻ thành công!', 'success');
          this.resetForm();
          this.loadSystemCards();
          this.isSubmitting = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.showToast(err.error?.message || 'Lỗi khi lưu thẻ!', 'danger');
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  // Hàm Xóa có hộp thoại xác nhận
  async deleteCard(cardID: number) {
    const alert = await this.alertCtrl.create({
      header: 'Xác nhận xóa',
      message: 'Bạn có chắc chắn muốn xóa thẻ này ra khỏi hệ thống?',
      buttons: [
        { text: 'Hủy', role: 'cancel' },
        {
          text: 'Xóa',
          role: 'destructive',
          handler: () => {
            this.api.deleteCard(cardID).subscribe({
              next: () => {
                this.showToast('Đã xóa thẻ thành công!', 'success');
                if (this.editingCardId === cardID) this.cancelEdit();
                this.loadSystemCards();
              },
              error: (err) => {
                this.showToast('Lỗi khi xóa thẻ!', 'danger');
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  resetForm() {
    this.cardForm = {
      cardUID: '',
      cardType: 'Monthly',
      status: 'Active'
    };
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'danger') {
    let iconName = 'alert-circle-outline';
    if (color === 'success') iconName = 'checkmark-circle-outline';
    else if (color === 'warning') iconName = 'warning-outline';

    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'top',
      icon: iconName,
      cssClass: 'toast-top-right'
    });
    toast.present();
  }

  // --- LOGIC PHÂN TRANG ---
  calculatePagination() {
    this.totalPages = Math.ceil(this.systemCards.length / this.itemsPerPage);
    
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    } else if (this.totalPages === 0) {
      this.currentPage = 1;
    }
    
    this.updatePaginatedCards();
    this.generatePages();
  }

  updatePaginatedCards() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedCards = this.systemCards.slice(startIndex, endIndex);
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
      this.updatePaginatedCards();
      this.generatePages();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedCards();
      this.generatePages();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedCards();
      this.generatePages();
    }
  }
}