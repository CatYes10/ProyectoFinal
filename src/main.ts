import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http'; 
import { App } from './app/app.component'; 
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes'; 
import { importProvidersFrom } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

bootstrapApplication(App, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),

    importProvidersFrom(CommonModule, FormsModule, ReactiveFormsModule)
  ]
}).catch(err => console.error(err));

