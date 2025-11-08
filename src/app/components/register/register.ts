import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Api } from '../../services/api';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {
  // Datos del formulario
  fullName: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  acceptTerms: boolean = false;
  
  // Estados de validación
  isLoading: boolean = false;
  fullNameInvalid: boolean = false;
  fullNameError: string = '';
  emailInvalid: boolean = false;
  emailError: string = '';
  passwordInvalid: boolean = false;
  passwordError: string = '';
  confirmPasswordInvalid: boolean = false;
  termsInvalid: boolean = false;
  
  // Fortaleza de contraseña
  passwordStrength: number = 0;
  passwordStrengthText: string = '';
  passwordStrengthClass: string = '';
  passwordStrengthTextClass: string = '';

  constructor(
    private router: Router,
    private api: Api
  ) {}

  // 📧 VALIDACIÓN DE EMAIL
  validateEmail(): void {
    this.emailInvalid = false;
    this.emailError = '';

    if (!this.email) {
      this.emailInvalid = true;
      this.emailError = 'El email es requerido';
      return;
    }

    // Validar formato de email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.emailInvalid = true;
      this.emailError = 'Formato de email inválido';
      return;
    }

    // Validar dominios permitidos
    const dominio = this.email.split('@')[1];
    const dominiosPermitidos = ['gmail.com', 'outlook.com'];
    
    if (!dominiosPermitidos.includes(dominio.toLowerCase())) {
      this.emailInvalid = true;
      this.emailError = 'Solo se permiten emails de @gmail.com y @outlook.com';
      return;
    }
  }

  // 🔐 VALIDACIÓN DE CONTRASEÑA
  validatePassword(): void {
    this.passwordInvalid = false;
    this.passwordError = '';

    if (!this.password) {
      this.passwordInvalid = true;
      this.passwordError = 'La contraseña es requerida';
      return;
    }

    // Mínimo 8 caracteres
    if (this.password.length < 8) {
      this.passwordInvalid = true;
      this.passwordError = 'La contraseña debe tener al menos 8 caracteres';
      return;
    }

    // Al menos 1 mayúscula
    if (!/(?=.*[A-Z])/.test(this.password)) {
      this.passwordInvalid = true;
      this.passwordError = 'Debe contener al menos una letra mayúscula';
      return;
    }

    // Al menos 1 número
    if (!/(?=.*\d)/.test(this.password)) {
      this.passwordInvalid = true;
      this.passwordError = 'Debe contener al menos un número';
      return;
    }

    // Al menos 1 carácter especial
    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(this.password)) {
      this.passwordInvalid = true;
      this.passwordError = 'Debe contener al menos un carácter especial (!@#$%^&* etc.)';
      return;
    }
  }

  // 📊 VERIFICAR FORTALEZA DE CONTRASEÑA
  checkPasswordStrength(): void {
    if (!this.password) {
      this.passwordStrength = 0;
      return;
    }

    let strength = 0;

    // Longitud
    if (this.password.length >= 8) strength += 1;
    if (this.password.length >= 12) strength += 1;

    // Complejidad
    if (/[A-Z]/.test(this.password)) strength += 1;
    if (/[a-z]/.test(this.password)) strength += 1;
    if (/\d/.test(this.password)) strength += 1;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.password)) strength += 1;

    // Determinar texto y clase
    if (strength <= 2) {
      this.passwordStrengthText = 'Débil';
      this.passwordStrengthClass = 'strength-weak';
      this.passwordStrengthTextClass = 'text-danger';
    } else if (strength <= 4) {
      this.passwordStrengthText = 'Media';
      this.passwordStrengthClass = 'strength-medium';
      this.passwordStrengthTextClass = 'text-warning';
    } else {
      this.passwordStrengthText = 'Fuerte';
      this.passwordStrengthClass = 'strength-strong';
      this.passwordStrengthTextClass = 'text-success';
    }

    this.passwordStrength = strength;
  }

  // 👤 VALIDACIÓN NOMBRE COMPLETO
  validateFullName(): void {
    this.fullNameInvalid = false;
    this.fullNameError = '';

    if (!this.fullName) {
      this.fullNameInvalid = true;
      this.fullNameError = 'El nombre completo es requerido';
      return;
    }

    if (this.fullName.length < 2) {
      this.fullNameInvalid = true;
      this.fullNameError = 'El nombre debe tener al menos 2 caracteres';
      return;
    }

    // Validar que tenga al menos un espacio (nombre y apellido)
    if (!this.fullName.includes(' ')) {
      this.fullNameInvalid = true;
      this.fullNameError = 'Ingresa nombre y apellido';
      return;
    }
  }

  // 🔄 VALIDACIÓN CONFIRMAR CONTRASEÑA
  validateConfirmPassword(): void {
    this.confirmPasswordInvalid = false;

    if (!this.confirmPassword) {
      this.confirmPasswordInvalid = true;
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.confirmPasswordInvalid = true;
    }
  }

  // ✅ VERIFICAR SI EL FORMULARIO ES VÁLIDO
  isFormValid(): boolean {
    return !this.fullNameInvalid && 
           !this.emailInvalid && 
           !this.passwordInvalid && 
           !this.confirmPasswordInvalid &&
           this.acceptTerms &&
           this.fullName.length > 0 &&
           this.email.length > 0 &&
           this.password.length > 0 &&
           this.confirmPassword.length > 0;
  }

  // 🚀 ENVÍO DEL FORMULARIO
  onSubmit() {
    // Ejecutar todas las validaciones
    this.validateFullName();
    this.validateEmail();
    this.validatePassword();
    this.validateConfirmPassword();
    this.termsInvalid = !this.acceptTerms;

    if (!this.isFormValid()) {
      alert('Por favor corrige los errores en el formulario');
      return;
    }

    this.isLoading = true;

    const userData = {
      name: this.fullName,
      email: this.email,
      password: this.password
    };

    this.api.register(userData).subscribe({
      next: (response) => {
        console.log('Registro exitoso:', response);
        alert(`¡Cuenta creada exitosamente! Bienvenido ${this.fullName}`);
        this.router.navigate(['/login']);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error en registro:', error);
        
        if (error.status === 400) {
          alert('Error: ' + (error.error?.message || 'Datos inválidos'));
        } else if (error.status === 409) {
          alert('Este correo electrónico ya está registrado');
        } else if (error.status === 0) {
          alert('No se puede conectar al servidor. Verifica que la API esté ejecutándose.');
        } else {
          alert('Error del servidor: ' + (error.error?.message || 'Intenta nuevamente'));
        }
        
        this.isLoading = false;
      }
    });
  }

  goToLogin(event: Event) {
    event.preventDefault();
    this.router.navigate(['/login']);
  }
}