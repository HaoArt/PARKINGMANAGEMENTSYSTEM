import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TicketParkingPage } from './ticket-parking.page';

describe('TicketParkingPage', () => {
  let component: TicketParkingPage;
  let fixture: ComponentFixture<TicketParkingPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TicketParkingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
