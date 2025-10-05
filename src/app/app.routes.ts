import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Map } from './pages/map/map';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'map', component: Map },
  { path: '**', redirectTo: '' },
];
