import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalyzeReport } from './analyze-report';

describe('AnalyzeReport', () => {
  let component: AnalyzeReport;
  let fixture: ComponentFixture<AnalyzeReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalyzeReport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnalyzeReport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
