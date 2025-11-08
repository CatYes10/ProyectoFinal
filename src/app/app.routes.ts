import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register';
import { ReservationComponent } from './components/reservation/reservation';
import { HomeComponent } from './pages/home/home';
import { authGuard } from './guards/auth-guard'; 
import { ReportsComponent } from './components/reportes/reportes';
import { ManageReservationComponent } from './pages/manage-reservation/manage-reservation';



export const routes: Routes = [
  { path: '', component: HomeComponent, canActivate: [authGuard] },
  { path: 'reservation', component: ReservationComponent, canActivate: [authGuard] }, 
  { path: 'reports', component: ReportsComponent, canActivate: [authGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'manage-reservation', component: ManageReservationComponent },
  { path: '**', redirectTo: '' },
];