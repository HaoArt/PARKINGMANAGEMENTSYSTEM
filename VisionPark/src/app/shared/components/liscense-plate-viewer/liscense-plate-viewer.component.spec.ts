import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { LiscensePlateViewerComponent } from './liscense-plate-viewer.component';

describe('LiscensePlateViewerComponent', () => {
  let component: LiscensePlateViewerComponent;
  let fixture: ComponentFixture<LiscensePlateViewerComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ LiscensePlateViewerComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(LiscensePlateViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
