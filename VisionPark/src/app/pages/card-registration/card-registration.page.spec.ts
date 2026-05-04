import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardRegistrationPage } from './card-registration.page';

describe('CardRegistrationPage', () => {
  let component: CardRegistrationPage;
  let fixture: ComponentFixture<CardRegistrationPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CardRegistrationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
