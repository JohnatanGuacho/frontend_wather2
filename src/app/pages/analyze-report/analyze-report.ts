import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-analyze-report',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analyze-report.html',   // ✅ corregido
  styleUrls: ['./analyze-report.css'],    // ✅ corregido
})
export class AnalyzeReportComponent implements OnInit {
  data: any = null;

  ngOnInit(): void {
    const stored = localStorage.getItem('analyzeResult');
    if (stored) {
      this.data = JSON.parse(stored);
      console.log('📊 Informe recibido:', this.data);
    }
  }

  getClimateSummary() {
    const temp = this.data?.climate?.properties?.parameter?.T2M;
    const prec = this.data?.climate?.properties?.parameter?.PRECTOTCORR;
    if (!temp || !prec) return null;

    const temps = Object.values(temp) as number[];
    const precs = Object.values(prec) as number[];
    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
    const avgPrec = precs.reduce((a, b) => a + b, 0) / precs.length;

    return { avgTemp: avgTemp.toFixed(2), avgPrec: avgPrec.toFixed(2) };
  }
}
