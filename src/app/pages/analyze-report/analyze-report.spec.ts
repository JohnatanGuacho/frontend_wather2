import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { AnalyzeReportComponent } from './analyze-report';

describe('AnalyzeReportComponent', () => {
  let component: AnalyzeReportComponent;
  let fixture: ComponentFixture<AnalyzeReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // Como es standalone, lo importamos directamente.
      // RouterTestingModule evita errores por routerLink en el template.
      imports: [AnalyzeReportComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalyzeReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render title text', () => {
    const el: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Informe de Análisis Ambiental');
  });
});
