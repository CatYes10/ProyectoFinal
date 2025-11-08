import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api } from '../../services/api';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.html',
  styleUrls: ['./reportes.css']
})
export class ReportsComponent implements OnInit {
  // Estadísticas
  userCount: number = 0;
  totalReservations: number = 0;
  occupiedSeats: number = 0;
  reservationsPerUser: number = 0;
  businessOccupied: number = 0;
  economyOccupied: number = 0;
  businessFree: number = 0;
  economyFree: number = 0;
  manualSelections: number = 0;
  randomSelections: number = 0;
  modifiedSeats: number = 0;
  canceledSeats: number = 0;
  archivoSeleccionado: File | null = null;
  cargandoXML: boolean = false;
  resultadoCarga: any = null;
  erroresCarga: any[] = [];

  // Fechas
  fechasDisponibles: string[] = [];
  fechaSeleccionada: string = '';
  mostrarTodasLasFechas: boolean = true;

  // Diagrama de asientos
  businessDiagram: any[] = [];
  economyDiagram: any[] = [];
  asientosOcupadosReales: string[] = [];
  fechaDiagrama: string = '';

  isLoading: boolean = true;
  error: string = '';
  noDataForDate: boolean = false;

  constructor(private api: Api) {}

  ngOnInit() {
    this.loadFechasDisponibles();
  }

  loadFechasDisponibles() {
    this.api.getFechasDisponibles().subscribe({
      next: (response) => {
        if (response.success) {
          this.fechasDisponibles = response.data;
          console.log('📅 Fechas disponibles:', this.fechasDisponibles);
          this.loadReportsData();
        }
      },
      error: (error) => {
        console.error('Error cargando fechas:', error);
        this.loadReportsData();
      }
    });
  }

  loadReportsData() {
    this.isLoading = true;
    this.error = '';
    this.noDataForDate = false;

    if (this.mostrarTodasLasFechas || !this.fechaSeleccionada) {
      this.loadReportesGenerales();
    } else {
      this.loadReportesPorFecha();
    }
  }

  loadReportesGenerales() {
    console.log('📊 Cargando reportes generales...');
    this.api.getReportsStats().subscribe({
      next: (response) => {
        if (response.success) {
          this.setDataFromResponse(response.data);
          this.noDataForDate = false;
          // Cargar asientos ocupados generales
          this.loadAsientosOcupadosGenerales();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando reportes generales:', error);
        this.error = 'Error al cargar los datos de reportes';
        this.isLoading = false;
      }
    });
  }

  loadReportesPorFecha() {
    console.log(`📊 Cargando reportes para fecha: ${this.fechaSeleccionada}`);
    this.api.getReportsStatsByFecha(this.fechaSeleccionada).subscribe({
      next: (response) => {
        if (response.success) {
          if (response.data === null) {
            this.noDataForDate = true;
            this.limpiarDatos();
          } else {
            this.setDataFromResponse(response.data);
            this.noDataForDate = false;
            // Cargar asientos ocupados para la fecha específica
            this.loadAsientosOcupadosPorFecha(this.fechaSeleccionada);
          }
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando reportes por fecha:', error);
        this.error = 'Error al cargar los datos para esta fecha';
        this.isLoading = false;
      }
    });
  }

  // 🔥 MÉTODO FALTANTE - AGREGAR ESTE
  loadAsientosOcupadosReales() {
  if (this.mostrarTodasLasFechas || !this.fechaSeleccionada) {
    this.loadAsientosOcupadosGenerales();
  } else {
    this.loadAsientosOcupadosPorFecha(this.fechaSeleccionada);
  }
  
  // 🔥 REGENERAR DIAGRAMA DESPUÉS DE CARGAR ASIENTOS
  setTimeout(() => {
    this.generateSeatDiagram();
    console.log('🎯 Diagrama regenerado después de cargar asientos ocupados');
  }, 300);
}
  loadAsientosOcupadosGenerales() {
  console.log('🔄 Cargando asientos ocupados generales...');
  this.api.getAsientosOcupados().subscribe({
    next: (response) => {
      if (response.success) {
        this.asientosOcupadosReales = response.data;
        this.fechaDiagrama = 'Todas las fechas';
        console.log('✅ Asientos ocupados generales:', this.asientosOcupadosReales);
        
        // 🔥 REGENERAR DIAGRAMA
        this.generateSeatDiagram();
      }
    },
    error: (error) => {
      console.error('❌ Error cargando asientos ocupados generales:', error);
    }
  });
}

loadAsientosOcupadosPorFecha(fecha: string) {
  console.log(`🔄 Cargando asientos ocupados para fecha: ${fecha}`);
  this.api.getAsientosOcupadosPorFecha(fecha).subscribe({
    next: (response) => {
      if (response.success) {
        this.asientosOcupadosReales = response.data;
        this.fechaDiagrama = fecha;
        console.log(`✅ Asientos ocupados para ${fecha}:`, this.asientosOcupadosReales);
        
        // 🔥 REGENERAR DIAGRAMA
        this.generateSeatDiagram();
      }
    },
    error: (error) => {
      console.error(`❌ Error cargando asientos ocupados para ${fecha}:`, error);
    }
  });
}
 setDataFromResponse(data: any) {
  this.userCount = Number(data.usercount || 0);
  this.totalReservations = Number(data.totalreservations || 0);
  this.occupiedSeats = Number(data.occupiedseats || 0);
  this.reservationsPerUser = Number(data.reservationsperuser || 0);
  this.businessOccupied = Number(data.businessoccupied || 0);
  this.economyOccupied = Number(data.economyoccupied || 0);
  this.businessFree = Number(data.businessfree || 0);
  this.economyFree = Number(data.economyfree || 0);
  this.manualSelections = Number(data.manualselections || 0);
  this.randomSelections = Number(data.randomselections || 0);
  this.modifiedSeats = Number(data.modifiedseats || 0);
  this.canceledSeats = Number(data.canceledseats || 0);
}

  limpiarDatos() {
    this.userCount = 0;
    this.totalReservations = 0;
    this.occupiedSeats = 0;
    this.reservationsPerUser = 0;
    this.businessOccupied = 0;
    this.economyOccupied = 0;
    this.businessFree = 0;
    this.economyFree = 0;
    this.manualSelections = 0;
    this.randomSelections = 0;
    this.modifiedSeats = 0;
    this.canceledSeats = 0;
    this.asientosOcupadosReales = [];
    this.fechaDiagrama = '';
  }

  onFechaChange() {
    if (this.fechaSeleccionada) {
      this.mostrarTodasLasFechas = false;
      this.loadReportsData();
    }
  }

  onMostrarTodasChange() {
    this.mostrarTodasLasFechas = true;
    this.fechaSeleccionada = '';
    this.loadReportsData();
  }

  // 🔥 MÉTODOS PARA CARGA DE XML
  // 🔥 MÉTODO MEJORADO PARA SELECCIÓN DE ARCHIVO
onFileSelected(event: any) {
  const file: File = event.target.files[0];
  
  if (file) {
    console.log('📄 Archivo seleccionado:', {
      nombre: file.name,
      tamaño: file.size,
      tipo: file.type
    });

    // Validar que sea XML
    const esXML = file.type === 'text/xml' || 
                  file.type === 'application/xml' || 
                  file.name.toLowerCase().endsWith('.xml');
    
    if (esXML) {
      // Validaciones adicionales
      if (file.size === 0) {
        alert('El archivo está vacío');
        event.target.value = '';
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        alert('El archivo es demasiado grande (máximo 10MB)');
        event.target.value = '';
        return;
      }

      this.archivoSeleccionado = file;
      this.resultadoCarga = null;
      this.erroresCarga = [];
      
      console.log('✅ Archivo XML válido seleccionado');
      
    } else {
      alert('❌ Por favor selecciona un archivo XML válido (.xml)');
      event.target.value = '';
    }
  }
}
  cargarArchivoXML() {
  if (!this.archivoSeleccionado) {
    alert('Por favor selecciona un archivo XML primero');
    return;
  }

  this.cargandoXML = true;
  this.resultadoCarga = null;
  this.erroresCarga = [];

  console.log('🔄 Iniciando carga de archivo XML...');

  this.api.cargarArchivoXML(this.archivoSeleccionado).subscribe({
    next: (event: any) => {
      if (event.type === 4) { // HttpResponse
        console.log('✅ Respuesta completa recibida:', event.body);
        
        if (event.body.success) {
          this.resultadoCarga = event.body;
          this.erroresCarga = event.body.resumen.detallesErrores;
          
          // 🔥 ACTUALIZACIÓN CRÍTICA - REGENERAR DIAGRAMA DESPUÉS DE CARGA
          console.log('🔄 Recargando datos después de carga XML...');
          
          // 1. Recargar asientos ocupados
          this.loadAsientosOcupadosReales();
          
          // 2. Recargar reportes generales
          this.loadReportsData();
          
          // 3. 🔥 REGENERAR EL DIAGRAMA CON LOS NUEVOS DATOS
          setTimeout(() => {
            this.generateSeatDiagram();
            console.log('🎯 Diagrama regenerado después de carga XML');
            console.log('📊 Nuevos asientos ocupados:', this.asientosOcupadosReales);
          }, 500);
          
          console.log('📊 Carga completada exitosamente');
        } else {
          this.erroresCarga = [{ error: event.body.error }];
        }
        
        this.cargandoXML = false;
      }
    },
    error: (error) => {
      console.error('❌ Error cargando XML:', error);
      this.erroresCarga = [{ error: 'Error de conexión: ' + error.message }];
      this.cargandoXML = false;
    }
  });
}
  limpiarCarga() {
    this.archivoSeleccionado = null;
    this.resultadoCarga = null;
    this.erroresCarga = [];
    // Limpiar input file
    const fileInput = document.getElementById('xmlFileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  viewSeatDiagram() {
  // 🔥 REGENERAR SIEMPRE ANTES DE MOSTRAR
  this.generateSeatDiagram();
  const modal = new (window as any).bootstrap.Modal(document.getElementById('seatDiagramModal'));
  modal.show();
}
  generateSeatDiagram() {
  // Estructura CORREGIDA según tu diseño original
  const businessRows = ['I', 'G', 'D', 'C', 'A']; // 5 filas negocios
  
  // ✅ ECONOMY ROWS CORREGIDO - TODAS LAS LETRAS
  const economyRows = ['I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A']; // 9 filas económicas
  
  console.log('🔄 Generando diagrama con filas económicas:', economyRows);

  // Clase de Negocios (Columnas 1-2)
  this.businessDiagram = [];
  businessRows.forEach(row => {
    const rowSeats = [];
    for (let col = 1; col <= 2; col++) {
      const seatNumber = `${row}${col}`;
      const isOccupied = this.isSeatOccupiedReal(seatNumber);
      
      rowSeats.push({
        number: seatNumber,
        type: 'negocios',
        occupied: isOccupied,
        class: 'business-seat'
      });
    }
    this.businessDiagram.push(rowSeats);
  });

  // Clase Económica (Columnas 3-7) - ✅ AHORA CON E y F
  this.economyDiagram = [];
  economyRows.forEach(row => {
    const rowSeats = [];
    for (let col = 3; col <= 7; col++) {
      const seatNumber = `${row}${col}`;
      const isOccupied = this.isSeatOccupiedReal(seatNumber);
      
      rowSeats.push({
        number: seatNumber,
        type: 'economico',
        occupied: isOccupied,
        class: 'economy-seat'
      });
    }
    this.economyDiagram.push(rowSeats);
  });

  console.log('🎯 Diagrama generado para fecha:', this.fechaDiagrama);
  console.log('💼 Asientos negocios:', this.businessDiagram.length + ' filas');
  console.log('💺 Asientos económicos:', this.economyDiagram.length + ' filas');
  console.log('💼 Asientos negocios ocupados:', this.businessDiagram.flat().filter(seat => seat.occupied).map(seat => seat.number));
  console.log('💺 Asientos económicos ocupados:', this.economyDiagram.flat().filter(seat => seat.occupied).map(seat => seat.number));
  
  // Verificar que E y F están incluidos
  const todasLasFilasEconomicas = this.economyDiagram.map(row => row[0].number.charAt(0));
  console.log('🔍 Filas económicas en diagrama:', todasLasFilasEconomicas);
  console.log('✅ ¿Incluye E?', todasLasFilasEconomicas.includes('E'));
  console.log('✅ ¿Incluye F?', todasLasFilasEconomicas.includes('F'));
}
  isSeatOccupiedReal(seatNumber: string): boolean {
    // Usar los datos reales de la base de datos según la fecha seleccionada
    return this.asientosOcupadosReales.includes(seatNumber);
  }

  getSeatIcon(seat: any): string {
    if (seat.occupied) {
      return seat.type === 'negocios' ? '💼' : '💺';
    } else {
      return seat.type === 'negocios' ? '🟦' : '🟩';
    }
  }

  getSeatTooltip(seat: any): string {
    const status = seat.occupied ? 'Ocupado' : 'Disponible';
    const type = seat.type === 'negocios' ? 'Negocios' : 'Económico';
    return `${seat.number} - ${type} - ${status}`;
  }

  // Método para contar asientos ocupados en el diagrama
  getTotalAsientosOcupadosEnDiagrama(): number {
    const businessOcupados = this.businessDiagram.flat().filter(seat => seat.occupied).length;
    const economyOcupados = this.economyDiagram.flat().filter(seat => seat.occupied).length;
    return businessOcupados + economyOcupados;
  }

  // Método para obtener el título del diagrama según la fecha
  getTituloDiagrama(): string {
    if (this.fechaDiagrama === 'Todas las fechas') {
      return 'Diagrama de Asientos - Todas las Fechas';
    } else {
      return `Diagrama de Asientos - ${this.fechaDiagrama}`;
    }
  }

 exportToXML(): void {
  this.api.exportReservationsToXML().subscribe({
    next: (response: Blob) => {
      const url = window.URL.createObjectURL(response);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'asientos-reservados.xml';
      link.click();
      window.URL.revokeObjectURL(url);
      alert('Archivo XML descargado exitosamente');
    },
    error: (error: any) => {
      console.error('Error descargando XML:', error);
      alert('Error al descargar el archivo XML');
    }
  });
}

}