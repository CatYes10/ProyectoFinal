import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { SharedDataService } from '../../services/shared-data.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent {

  ofertas = [
    {
      titulo: 'Viaja por todo el mundo',
      descripcion: 'Aprovecha nuestras ofertas especiales para los clientes VIP, sino eres uno aun entonces que esperas para hacerlo 🛩️',
      imagen: 'assets/oferta1.png',
      precio: 'Q900.00',
      destino: 'Flores, Petén (FRS)'
    },
    {
      titulo: 'Escápate a Brasil',
      descripcion: 'Disfruta nuestras mejores ofertas especiales para una aventura tropical 🌴',
      imagen: 'assets/oferta2.png',
      precio: 'Q1050.00',
      destino: 'Janeiro, Brasil (BRA)'
    },
    {
      titulo: 'Último minuto ☄️',
      descripcion: 'Reserva hoy y viaja mañana con precios imperdibles 💼',
      imagen: 'assets/oferta3.png',
      precio: 'Q1000.00',
      destino: 'Chile (CL)'
    }
  ];

  constructor(
    private sharedDataService: SharedDataService,
    private router: Router
  ) {}

  reservarOferta(oferta: any) {
    console.log(`Reservando oferta: ${oferta.titulo} - Destino: ${oferta.destino}`);
    
    // Guardar el destino en el servicio
    this.sharedDataService.setSelectedDestination(oferta.destino);
    
    
    this.router.navigate(['/reservation']);
  }
}