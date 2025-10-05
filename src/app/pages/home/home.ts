import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],          // <- IMPORTANTE para usar routerLink en la plantilla
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {}
