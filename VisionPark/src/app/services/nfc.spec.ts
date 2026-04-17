import { TestBed } from '@angular/core/testing';

import { Nfc } from './nfc';

describe('Nfc', () => {
  let service: Nfc;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Nfc);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
