import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonIcon,
  ToastController,
  AlertController,
  Platform,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  wifiOutline,
  chevronDownOutline,
  closeOutline,
  saveOutline,
  addCircleOutline,
  refreshOutline,
  createOutline,
  trashOutline,
  cubeOutline,
  chevronBackOutline,
  chevronForwardOutline,
  informationCircleOutline, // Added for helper text
  star,
  starHalf,
  cardOutline,
} from 'ionicons/icons';
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
  imports: [
    IonContent,
    IonIcon,
    CommonModule,
    FormsModule,
    NavbarComponent,
  ],
  providers: [NFC, Ndef],
})
export class CardRegistrationPage implements OnInit {
  private api = inject(Api);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private platform = inject(Platform);

  isLoading = false;
  isSubmitting = false;
  
  showEditModal = false;
  editForm = {
    cardID: 0,
    cardUID: '',
    cardType: 'Monthly',
    status: 'Active',
  };

  paginatedCards: CardRecord[] = [];

  currentPage: number = 1;
  itemsPerPage: number = 5;
  totalPages: number = 1;
  visiblePages: (number | string)[] = [];

  searchTerm: string = '';

  cardForm = {
    cardUID: '',
    cardType: 'Monthly',
    status: 'Active',
  };

  constructor(
    private nfc: NFC,
    private cdr: ChangeDetectorRef,
  ) {
    // Explicitly add icons used in HTML
    addIcons({
      wifiOutline,
      chevronDownOutline,
      closeOutline,
      saveOutline,
      addCircleOutline,
      refreshOutline,
      createOutline,
      trashOutline,
      cubeOutline,
      chevronBackOutline,
      chevronForwardOutline,
      informationCircleOutline,
      star,
      starHalf,
      cardOutline,
    });
  }

  ngOnInit() {
    this.loadSystemCards();
    this.startNFC();
  }

  startNFC() {
    if (this.platform.is('capacitor') || this.platform.is('cordova')) {
      this.nfc.addTagDiscoveredListener().subscribe({
        next: (event: any) => this.handleTagEvent(event),
        error: (err) => console.error('Lỗi NFC Tag:', err),
      });

      this.nfc.addNdefListener().subscribe({
        next: (event: any) => this.handleTagEvent(event),
        error: (err) => console.error('Lỗi NFC NDEF:', err),
      });
    } else {
      console.warn('NFC plugin chỉ hoạt động trên thiết bị thực.');
    }
  }

  handleTagEvent(event: any) {
    if (event && event.tag && event.tag.id) {
      const scannedUID = this.nfc.bytesToHexString(event.tag.id).toUpperCase();
      this.cardForm.cardUID = scannedUID;

      this.cdr.detectChanges();
      this.showToast('Đã nhận mã thẻ: ' + scannedUID, 'success');
    }
  }

  loadSystemCards() {
    this.isLoading = true;
    const params = {
      searchTerm: this.searchTerm,
      pageNumber: this.currentPage,
      pageSize: this.itemsPerPage
    };

    this.api.getAllCards(params).subscribe({
      next: (res: any) => {
        // Dữ liệu đã được chuẩn hóa CamelCase từ Backend
        this.paginatedCards = res?.data || res || [];

        const totalCount = res?.totalCount || 0;
        this.totalPages = Math.ceil(totalCount / this.itemsPerPage) || 1;
        this.generatePages();

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

  onNavbarSearch(searchTerm: string) {
    this.searchTerm = searchTerm;
    this.currentPage = 1; // Reset về trang 1 khi tìm kiếm
    this.loadSystemCards();
  }

  editCard(item: CardRecord) {
    this.editForm = {
      cardID: item.cardID,
      cardUID: item.cardUID,
      cardType: item.cardType,
      status: item.status,
    };
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
  }

  saveCard() {
    if (!this.cardForm.cardUID) {
      this.showToast('Vui lòng quẹt thẻ để lấy mã NFC!', 'warning');
      return;
    }

    this.isSubmitting = true;

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
      },
    });
  }

  updateCard() {
    this.isSubmitting = true;
    this.api.updateCard(this.editForm.cardID, this.editForm).subscribe({
      next: (res: any) => {
        this.showToast('Cập nhật thẻ thành công!', 'success');
        this.closeEditModal();
        this.loadSystemCards();
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.showToast(
          err.error?.message || 'Lỗi khi cập nhật thẻ!',
          'danger',
        );
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
    });
  }

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
                this.loadSystemCards();
              },
              error: (err) => {
                this.showToast('Lỗi khi xóa thẻ!', 'danger');
              },
            });
          },
        },
      ],
    });
    await alert.present();
  }

  resetForm() {
    this.cardForm = {
      cardUID: '',
      cardType: 'Monthly',
      status: 'Active',
    };
  }

  async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning' = 'danger',
  ) {
    let iconName = 'alert-circle-outline';
    if (color === 'success') iconName = 'checkmark-circle-outline';
    else if (color === 'warning') iconName = 'warning-outline';

    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'top',
      icon: iconName,
      cssClass: 'toast-top-right',
    });
    toast.present();
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
      this.loadSystemCards();
      this.generatePages();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadSystemCards();
      this.generatePages();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadSystemCards();
      this.generatePages();
    }
  }
}
