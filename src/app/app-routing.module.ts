import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register';
import { ReservationComponent } from './components/reservation/reservation';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'reservation', component: ReservationComponent }
];
