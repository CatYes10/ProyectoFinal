import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Api } from '../../services/api';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
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
        this.isLoggedIn = false;
        this.currentUser = null;
        this.router.navigate(['/login']);
      }
    });
  }
}