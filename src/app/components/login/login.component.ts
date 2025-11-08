import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router'; 
import { Api } from '../../services/api';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule], // ← AGREGAR RouterModule
  template: `
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-6">
          <div class="card shadow">
            <div class="card-body p-5">
              <h2 class="text-center text-danger mb-4">Iniciar Sesión</h2>
              
              <form (ngSubmit)="onSubmit()">
                <div class="mb-3">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-control" [(ngModel)]="email" name="email" required>
                </div>
                
                <div class="mb-3">
                  <label class="form-label">Contraseña</label>
                  <input type="password" class="form-control" [(ngModel)]="password" name="password" required>
                </div>
                
                <button type="submit" class="btn btn-danger w-100" [disabled]="loading">
                  {{ loading ? 'Iniciando sesión...' : 'Iniciar Sesión' }}
                </button>
                
                <div class="text-center mt-3">
                  <a routerLink="/register" class="text-decoration-none">¿No tienes cuenta? Regístrate</a>
                </div>
              </form>

              <div *ngIf="error" class="alert alert-danger mt-3">
                {{ error }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  loading: boolean = false;
  error: string = '';

  constructor(private api: Api, private router: Router) {}

  onSubmit() {
    this.loading = true;
    this.error = '';

    this.api.login({ email: this.email, password: this.password }).subscribe({
      next: (response) => {
        this.loading = false;
        this.router.navigate(['/']); // Redirigir al home después del login
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.error || 'Error al iniciar sesión';
      }
    });
  }
}
