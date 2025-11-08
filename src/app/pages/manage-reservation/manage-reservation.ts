import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api } from '../../services/api';

@Component({
  selector: 'app-manage-reservation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manage-reservation.html',
  styleUrls: ['./manage-reservation.css']
})
export class ManageReservationComponent implements OnInit {

  reservas: any[] = [];
  selectedReserva: any = null;
  loading: boolean = false;
  editing: boolean = false;
  errorMessage: string = '';

  constructor(private api: Api) {}

  ngOnInit(): void {
    this.cargarReservas();
  }

  // 🔹 Obtener todas las reservas del usuario autenticado
  cargarReservas(): void {
    this.loading = true;
    this.api.getUserReservations().subscribe({
      next: (response) => {
        this.reservas = response.reservas || [];
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error cargando reservas:', error);
        this.errorMessage = 'No se pudieron cargar las reservas. Intenta de nuevo más tarde.';
        this.loading = false;
      }
    });
  }

  // 🔹 Seleccionar una reserva para ver o editar
  verDetalles(reserva: any): void {
    this.selectedReserva = { ...reserva };
    this.editing = false;
  }

  // 🔹 Habilitar edición
  editarReserva(): void {
    this.editing = true;
  }

  // 🔹 Guardar cambios en la reserva
  guardarCambios(): void {
    if (!this.selectedReserva) return;

    if (!confirm('¿Deseas guardar los cambios en esta reserva?')) return;

    this.api.updateReservation(this.selectedReserva.id, this.selectedReserva).subscribe({
      next: (response) => {
        alert('✅ Reserva actualizada correctamente.');
        this.cargarReservas();
        this.selectedReserva = null;
      },
      error: (error) => {
        console.error('❌ Error actualizando reserva:', error);
        alert('Ocurrió un error al actualizar la reserva.');
      }
    });
  }

  // 🔹 Cancelar una reserva
  cancelarReserva(reservaId: number): void {
    if (!confirm('⚠️ ¿Estás seguro de que deseas cancelar esta reserva?')) return;

    this.api.cancelReservation(reservaId).subscribe({
      next: () => {
        alert('❌ Reserva cancelada correctamente.');
        this.cargarReservas();
      },
      error: (error) => {
        console.error('Error al cancelar reserva:', error);
        alert('No se pudo cancelar la reserva. Intenta más tarde.');
      }
    });
  }

  // 🔹 Regresar a la lista
  volverALista(): void {
    this.selectedReserva = null;
  }
}
