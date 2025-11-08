import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Api } from '../services/api';

export const authGuard: CanActivateFn = (route, state) => {
  const api = inject(Api);
  const router = inject(Router);

  // Verificar si el usuario está autenticado
  return new Promise<boolean>((resolve) => {
    api.checkAuth().subscribe({
      next: (response) => {
        console.log('🛡️ AuthGuard response:', response);
        
        if (response.authenticated) { // ✅ Cambiado de loggedIn a authenticated
          console.log('✅ Usuario autenticado, permitiendo acceso');
          resolve(true);
        } else {
          console.log('❌ Usuario NO autenticado, redirigiendo a login');
          router.navigate(['/login']);
          resolve(false);
        }
      },
      error: (error) => {
        console.error('❌ Error en AuthGuard:', error);
        router.navigate(['/login']);
        resolve(false);
      }
    });
  });
};