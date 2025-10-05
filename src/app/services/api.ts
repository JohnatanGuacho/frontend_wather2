import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // ✅ Método para analizar la zona seleccionada
  analyzeZone(lat: number, lon: number, iso3: string): Observable<any> {
    const url = `${this.baseUrl}/analyze?lat=${lat}&lon=${lon}&iso3=${iso3}`;
    return this.http.get(url);
  }
}
