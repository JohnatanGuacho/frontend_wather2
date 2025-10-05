import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Map } from './pages/map/map';
import { AnalyzeReportComponent } from './pages/analyze-report/analyze-report'; // ✅ agrega esta línea

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'map', component: Map },
  { path: 'analyze-report', component: AnalyzeReportComponent }, // ✅ nueva ruta
  { path: '**', redirectTo: '' },
];
