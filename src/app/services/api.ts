import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Api {
  // 🔹 Ajusta la URL base según tu entorno backend
  private baseUrl = 'http://localhost:3000/api'; 

  constructor(private http: HttpClient) {}

  login(credentials: { email: string; password: string }) {
  return this.http.post<any>(`${this.baseUrl}/auth/login`, credentials, { withCredentials: true });
}

  register(userData: { name: string; email: string; password: string }) {
    return this.http.post<any>(`${this.baseUrl}/auth/register`, userData);
  }

  logout(): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/logout`, {});
  }
checkAuth(): Observable<any> {
  return this.http.get(`${this.baseUrl}/auth/check`, { withCredentials: true });
}

  // =============================================
  // ✈️ VUELOS
  // =============================================
  getFlights(): Observable<any> {
    return this.http.get(`${this.baseUrl}/flights`);
  }

  // =============================================
  // 💺 ASIENTOS
  // =============================================
  getSeats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/seats`);
  }

  getOccupiedSeatsByDateAndDestination(date: string, destination: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/seats/occupied`, {
      params: { date, destination }
    });
  }




  // =============================================
  createReservation(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/reservations`, data);
  }

  getUserReservations(): Observable<any> {
    return this.http.get(`${this.baseUrl}/reservations/user`);
  }

  updateReservation(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/reservations/${id}`, data);
  }

  cancelReservation(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/reservations/${id}`);
  }

  // =============================================
  // 🧩 IMPORTAR / EXPORTAR XML
  // =============================================



  // =============================================
  // ❤️ SALUD DEL SERVIDOR
  // =============================================
  getHealth(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health`);
  }


  // 🔹 Reportes generales
getReportsStats() {
  return this.http.get<any>(`${this.baseUrl}/reports/stats`);
}


// 🔹 Reportes por fecha
getReportsStatsByFecha(fecha: string) {
  return this.http.get<any>(`${this.baseUrl}/reports/stats/${fecha}`);
}

// 🔹 Asientos ocupados (todos)
getAsientosOcupados() {
  return this.http.get<any>(`${this.baseUrl}/reports/asientos-ocupados`);
}

// 🔹 Asientos ocupados por fecha
getAsientosOcupadosPorFecha(fecha: string) {
  return this.http.get<any>(`${this.baseUrl}/reports/asientos-ocupados/${fecha}`);
}

// 🔹 Fechas disponibles
getFechasDisponibles() {
  return this.http.get<any>(`${this.baseUrl}/reports/fechas-disponibles`);
}

// 🔹 Cargar archivo XML
cargarArchivoXML(archivo: File) {
  const formData = new FormData();
  formData.append('file', archivo);
  return this.http.post<any>(`${this.baseUrl}/reports/upload-xml`, formData, {
    reportProgress: true,
    observe: 'events'
  });
}

// 🔹 Exportar reservas a XML
exportReservationsToXML() {
  return this.http.get(`${this.baseUrl}/reports/export-xml`, { responseType: 'blob' });
}

}