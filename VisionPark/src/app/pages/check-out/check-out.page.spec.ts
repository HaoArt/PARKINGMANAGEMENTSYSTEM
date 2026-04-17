import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CheckOutPage } from './check-out.page';

describe('CheckOutPage', () => {
  let component: CheckOutPage;
  let fixture: ComponentFixture<CheckOutPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CheckOutPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
