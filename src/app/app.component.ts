import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Api } from './services/api';
import { HeaderComponent } from './components/header/header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent],
  template: `
    <!-- Header separado -->
    <app-header></app-header>

    <!-- Espacio para el fixed-top navbar -->
    <div style="height: 80px;"></div>

    <!-- Contenido principal -->
    <router-outlet></router-outlet>
    <!-- Footer -->
    <footer class="bg-dark text-white text-center py-3 mt-5">
      <div class="container">
        <p>&copy; 2025 AeroPusRiva. Todos los derechos reservados.</p>
      </div>
    </footer>
  `,
  styleUrls: ['./app.component.css']
})
export class App implements OnInit {
  isLoggedIn: boolean = false;
  currentUser: any = null;

  constructor(private api: Api, private router: Router) {}

  ngOnInit() {
    this.checkAuthStatus();
  }

  checkAuthStatus() {
    this.api.checkAuth().subscribe({
      next: (response) => {
        this.isLoggedIn = response.loggedIn;
        this.currentUser = response.user;
        
        // Si no está autenticado y no está en login/register, redirigir a login
        if (!this.isLoggedIn && !['/login', '/register'].includes(this.router.url)) {
          this.router.navigate(['/login']);
        }
      },
      error: () => {
        this.isLoggedIn = false;
        this.currentUser = null;
      }
    });
  }

  logout() {
    this.api.logout().subscribe({
      next: () => {
        this.isLoggedIn = false;
        this.currentUser = null;
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Error al cerrar sesión:', error);
        // Forzar logout localmente
        this.isLoggedIn = false;
        this.currentUser = null;
        this.router.navigate(['/login']);
      }
    });
  }
}