import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedDataService } from '../../services/shared-data.service';
import { Api } from '../../services/api';

interface Seat {
  label: string;
  type: 'negocios' | 'economico';
  occupied: boolean;
  selected: boolean;
}

interface Passenger {
  name: string;
  cui: string;
  type: 'negocios' | 'economico';
  luggage: boolean;
  seat?: string;
  departamento?: string;
  municipio?: string;
  // Propiedades de validación
  cuiInvalid?: boolean;
  cuiError?: string;
  nameInvalid?: boolean;
  nameError?: string;
}

@Component({
  selector: 'app-reservation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reservation.html',
  styleUrls: ['./reservation.css']
})
export class ReservationComponent implements OnInit {
  origin: string = 'Ciudad de Guatemala (GUA)';
  destination: string = '';
  departureDate: string = '';
  returnDate: string = '';
  today: string = new Date().toISOString().split('T')[0];
  
  // Tipo de vuelo
  flightType: 'roundtrip' | 'oneway' = 'roundtrip';

  cities: string[] = [
    'Ciudad de Guatemala (GUA)',
    'Flores, Petén (FRS)',
    'San Salvador (SAL)',
    'San José, Costa Rica (SJO)',
    'Janeiro, Brasil (BRA)',
    'Chile (CL)',
    'Argentina (ARG)'
  ];

  adults: number = 1;
  children: number = 0;
  passengerPanelOpen: boolean = false;

  showSeatMap: boolean = false;
  showForm: boolean = false;
  showSummary: boolean = false;

  seatRows: Seat[][] = [];
  passengers: Passenger[] = [];
  selectedSeats: Seat[] = [];

  seatCount: number = 1;
  selectionMode: 'manual' | 'automatic' = 'manual';

  activeFilter: string = 'todos';

  // 🔥 NUEVAS PROPIEDADES PARA LOS REQUISITOS
  showSeatMessage: boolean = false;
  seatMessage: string = '';
  lastSelectedSeat: Seat | null = null;
  isSelectingIndividual: boolean = false;
  currentSelectionStep: number = 0;

  // 🔥 NUEVAS PROPIEDADES PARA BACKEND
  availableFlights: any[] = [];
  availableSeats: any[] = [];
  isLoggedIn: boolean = false;

  // 🔥 NUEVO: Departamentos y municipios de Guatemala
  departamentos: any[] = [
    { codigo: '01', nombre: 'Guatemala' },
    { codigo: '02', nombre: 'El Progreso' },
    { codigo: '03', nombre: 'Sacatepéquez' },
    { codigo: '04', nombre: 'Chimaltenango' },
    { codigo: '05', nombre: 'Escuintla' },
    { codigo: '06', nombre: 'Santa Rosa' },
    { codigo: '07', nombre: 'Sololá' },
    { codigo: '08', nombre: 'Totonicapán' },
    { codigo: '09', nombre: 'Quetzaltenango' },
    { codigo: '10', nombre: 'Suchitepéquez' },
    { codigo: '11', nombre: 'Retalhuleu' },
    { codigo: '12', nombre: 'San Marcos' },
    { codigo: '13', nombre: 'Huehuetenango' },
    { codigo: '14', nombre: 'Quiché' },
    { codigo: '15', nombre: 'Baja Verapaz' },
    { codigo: '16', nombre: 'Alta Verapaz' },
    { codigo: '17', nombre: 'Petén' },
    { codigo: '18', nombre: 'Izabal' },
    { codigo: '19', nombre: 'Zacapa' },
    { codigo: '20', nombre: 'Chiquimula' },
    { codigo: '21', nombre: 'Jalapa' },
    { codigo: '22', nombre: 'Jutiapa' }
  ];

  municipios: { [key: string]: string[] } = {
    '01': ['Guatemala', 'Santa Catarina Pinula', 'San José Pinula', 'San José del Golfo', 'Palencia', 'Chinautla', 'San Pedro Ayampuc', 'Mixco', 'San Pedro Sacatepéquez', 'San Juan Sacatepéquez', 'San Raymundo', 'Chuarrancho', 'Fraijanes', 'Amatitlán', 'Villa Nueva', 'Villa Canales', 'San Miguel Petapa'],
    '02': ['Guastatoya', 'Morazán', 'San Agustín Acasaguastlán', 'San Cristóbal Acasaguastlán', 'El Jícaro', 'Sansare', 'Sanarate', 'San Antonio La Paz'],
    '03': ['Antigua Guatemala', 'Jocotenango', 'Pastores', 'Sumpango', 'Santo Domingo Xenacoj', 'Santiago Sacatepéquez', 'San Bartolomé Milpas Altas', 'San Lucas Sacatepéquez', 'Santa Lucía Milpas Altas', 'Magdalena Milpas Altas', 'Santa María de Jesús', 'Ciudad Vieja', 'San Miguel Dueñas', 'Alotenango', 'San Antonio Aguas Calientes', 'Santa Catarina Barahona'],
    '04': ['Chimaltenango', 'San José Poaquil', 'San Martín Jilotepeque', 'Comalapa', 'Santa Apolonia', 'Tecpán Guatemala', 'Patzún', 'Pochuta', 'Patzicía', 'Santa Cruz Balanyá', 'Acatenango', 'Yepocapa', 'San Andrés Itzapa', 'Parramos', 'Zaragoza', 'El Tejar'],
    '05': ['Escuintla', 'Santa Lucía Cotzumalguapa', 'La Democracia', 'Siquinalá', 'Masagua', 'Tiquisate', 'La Gomera', 'Guanagazapa', 'San José', 'Iztapa', 'Palín', 'San Vicente Pacaya', 'Nueva Concepción'],
    '06': ['Cuilapa', 'Barberena', 'Santa Rosa de Lima', 'Casillas', 'San Rafael Las Flores', 'Oratorio', 'San Juan Tecuaco', 'Chiquimulilla', 'Taxisco', 'Santa María Ixhuatán', 'Guazacapán', 'Santa Cruz Naranjo', 'Pueblo Nuevo Viñas', 'Nueva Santa Rosa'],
    '07': ['Sololá', 'San José Chacayá', 'Santa María Visitación', 'Santa Lucia Utatlán', 'Nahualá', 'Santa Catarina Ixtahuacán', 'Santa Clara La Laguna', 'Concepción', 'San Andrés Semetabaj', 'Panajachel', 'Santa Catarina Palopó', 'San Antonio Palopó', 'San Lucas Tolimán', 'Santa Cruz La Laguna', 'San Pablo La Laguna', 'San Marcos La Laguna', 'San Juan La Laguna', 'San Pedro La Laguna', 'Santiago Atitlán'],
    '17': ['Flores', 'San José', 'San Benito', 'San Andrés', 'La Libertad', 'San Francisco', 'Santa Ana', 'Dolores', 'San Luis', 'Sayaxché', 'Melchor de Mencos', 'Poptún', 'Las Cruces', 'El Chal'],
    '18': ['Puerto Barrios', 'Livingston', 'El Estor', 'Morales', 'Los Amates'],
    '19': ['Zacapa', 'Estanzuela', 'Río Hondo', 'Gualán', 'Teculután', 'Usumatlán', 'Cabañas', 'San Diego', 'La Unión', 'Huité'],
    '20': ['Chiquimula', 'San José La Arada', 'San Juan Ermita', 'Jocotán', 'Camotán', 'Olopa', 'Esquipulas', 'Concepción Las Minas', 'Quezaltepeque', 'San Jacinto', 'Ipala'],
    '21': ['Jalapa', 'San Pedro Pinula', 'San Luis Jilotepeque', 'San Manuel Chaparrón', 'San Carlos Alzatate', 'Monjas', 'Mataquescuintla'],
    '22': ['Jutiapa', 'El Progreso', 'Santa Catarina Mita', 'Agua Blanca', 'Asunción Mita', 'Yupiltepeque', 'Atescatempa', 'Jerez', 'El Adelanto', 'Zapotitlán', 'Comapa', 'Jalpatagua', 'Conguaco', 'Moyuta', 'Pasaco', 'San José Acatempa', 'Quesada']
  };

  constructor(
    private sharedDataService: SharedDataService,
    private api: Api
  ) {}

  ngOnInit() {
    this.testBackendConnection();
    this.checkAuthStatus();
    this.loadFlights();
    this.loadSeats();

    const selectedDestination = this.sharedDataService.getSelectedDestination();
    if (selectedDestination) {
      this.destination = selectedDestination;
      
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      this.departureDate = nextWeek.toISOString().split('T')[0];
      
      console.log(`Destino pre-cargado desde Home: ${this.destination}`);
      
      this.sharedDataService.clearSelectedDestination();
    }
  }

  // 🔥 NUEVO: Probar conexión con backend
  testBackendConnection() {
    this.api.getHealth().subscribe({
      next: (response) => {
        console.log('✅ Backend conectado:', response);
      },
      error: (error) => {
        console.error('❌ Error conectando al backend:', error);
      }
    });
  }

  // 🔥 NUEVO: Verificar autenticación
  checkAuthStatus() {
    this.api.checkAuth().subscribe({
      next: (response) => {
        this.isLoggedIn = response.loggedIn;
        if (this.isLoggedIn) {
          console.log('Usuario autenticado:', response.user);
        }
      },
      error: (error) => {
        console.error('Error verificando autenticación:', error);
      }
    });
  }

  // 🔥 NUEVO: Cargar vuelos desde backend
  loadFlights() {
    this.api.getFlights().subscribe({
      next: (response) => {
        this.availableFlights = response.data;
        console.log('Vuelos cargados:', this.availableFlights);
      },
      error: (error) => {
        console.error('Error cargando vuelos:', error);
        // Fallback a datos locales si hay error
        this.availableFlights = [
          { id: 1, origen: 'Ciudad de Guatemala (GUA)', destino: 'Flores, Petén (FRS)', tipo_vuelo: 'ida', precio_base: 800 },
          { id: 2, origen: 'Ciudad de Guatemala (GUA)', destino: 'San Salvador (SAL)', tipo_vuelo: 'ida', precio_base: 850 }
        ];
      }
    });
  }

  // 🔥 NUEVO: Cargar asientos desde backend
  loadSeats() {
    this.api.getSeats().subscribe({
      next: (response) => {
        this.availableSeats = response.data;
        console.log('Asientos cargados:', this.availableSeats);
      },
      error: (error) => {
        console.error('Error cargando asientos:', error);
      }
    });
  }

  // 🔥 NUEVO: Cargar asientos ocupados por fecha
  loadOccupiedSeats(date: string, destination: string): void {
    this.api.getOccupiedSeatsByDateAndDestination(date, destination).subscribe({
      next: (occupiedSeats: string[]) => {
        console.log('Asientos ocupados para', date, 'en', destination, ':', occupiedSeats);
        
        // Actualizar el estado de los asientos en el mapa
        this.seatRows.forEach(row => {
          row.forEach(seat => {
            // Marcar como ocupado si está en la lista de asientos ocupados
            seat.occupied = occupiedSeats.includes(seat.label);
          });
        });
      },
      error: (error: any) => {
        console.error('Error cargando asientos ocupados:', error);
      }
    });
  }

  setFilter(filter: string) {
    this.activeFilter = filter;
  }

  shouldShowSection(section: string): boolean {
    if (this.activeFilter === 'todos') return true;
    return this.activeFilter === section;
  }

  reservarDesdeOfertas(destino: string) {
    this.destination = destino;
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    this.departureDate = nextWeek.toISOString().split('T')[0];
    
    setTimeout(() => {
      const searchForm = document.querySelector('.search-form');
      if (searchForm) {
        searchForm.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }

  setFlightType(type: 'roundtrip' | 'oneway') {
    this.flightType = type;
    if (type === 'oneway') {
      this.returnDate = '';
    }
  }

  searchFlights() {
    if (!this.origin || !this.destination || !this.departureDate) {
      alert('Por favor completa todos los campos obligatorios.');
      return;
    }
    
    if (this.flightType === 'roundtrip' && !this.returnDate) {
      alert('Por favor selecciona la fecha de vuelta.');
      return;
    }
    
    this.generateSeatSelection();
  }

  togglePassengerPanel() {
    this.passengerPanelOpen = !this.passengerPanelOpen;
  }

  changeAdults(delta: number) {
    const newVal = this.adults + delta;
    if (newVal >= 1 && newVal <= 10) this.adults = newVal; 
  }

  changeChildren(delta: number) {
    const newVal = this.children + delta;
    if (newVal >= 0 && newVal <= 10) this.children = newVal; 
  }

  generateSeatSelection() {
    const totalPassengers = this.adults + this.children;
    this.seatCount = totalPassengers;
    this.showSeatMap = true;
    this.showForm = false;
    this.showSummary = false;
    this.selectedSeats = [];
    this.isSelectingIndividual = false;
    this.currentSelectionStep = 0;
    this.showSeatMessage = false;

    // ✅ CORREGIDO: Pasar fecha Y destino
    this.loadOccupiedSeats(this.departureDate, this.destination);

    // 🔥 MEJORADO: Usar asientos reales del backend si están disponibles
    if (this.availableSeats.length > 0) {
      this.generateSeatsFromBackend();
    } else {
      this.generateMockSeats();
    }
  }

  // 🔥 NUEVO: Generar asientos desde datos del backend
  generateSeatsFromBackend() {
    const rows = 'IGFDCA'.split('');
    this.seatRows = rows.map(row =>
      Array.from({ length: 7 }, (_, colIndex) => {
        const seatNumber = `${row}${colIndex + 1}`;
        const backendSeat = this.availableSeats.find(s => s.numero_asiento === seatNumber);
        
        return {
          label: seatNumber,
          type: colIndex < 2 ? 'negocios' : 'economico',
          occupied: backendSeat ? backendSeat.ocupado : Math.random() < 0.3,
          selected: false
        };
      })
    );
  }

  // 🔥 NUEVO: Generar asientos mock (fallback)
  generateMockSeats() {
    const rows = 'IGFDCA'.split('');
    this.seatRows = rows.map(row =>
      Array.from({ length: 7 }, (_, colIndex) => ({
        label: `${row}${colIndex + 1}`,
        type: colIndex < 2 ? 'negocios' : 'economico',
        occupied: Math.random() < 0.3,
        selected: false
      }))
    );
  }

  // 🔥 NUEVO MÉTODO PARA MANEJAR CLIC EN ASIENTO
  handleSeatClick(seat: Seat) {
    if (this.isSelectingIndividual) {
      this.selectIndividualSeat(seat);
    } else {
      this.selectSeat(seat);
    }
  }

  // 🔥 MÉTODO MEJORADO PARA INICIAR SELECCIÓN MANUAL PASO A PASO
  startManualSelection() {
    this.selectionMode = 'manual';
    this.isSelectingIndividual = true;
    this.currentSelectionStep = 0;
    this.clearSelection();
    this.showSeatMessage = false;
    
    setTimeout(() => {
      alert(`🎯 MODO SELECCIÓN INDIVIDUAL ACTIVADO\n\n• Seleccionarás ${this.seatCount} asientos UNO POR UNO\n• Después de cada asiento verás una confirmación\n• Podrás cambiar el último asiento seleccionado\n• Se te preguntará si continuar con el siguiente\n\n¡Haz clic en tu primer asiento!`);
    }, 300);
  }

  // 🔥 NUEVO MÉTODO PARA SELECCIÓN PASO A PASO
  selectIndividualSeat(seat: Seat) {
    if (seat.occupied || seat.selected) return;

    seat.selected = true;
    this.selectedSeats.push(seat);
    this.currentSelectionStep++;
    
    this.showSeatConfirmation(seat);
    
    if (this.currentSelectionStep >= this.seatCount) {
      setTimeout(() => {
        const confirmAll = confirm(`✅ ¡Todos los asientos seleccionados!\n\nAsientos: ${this.selectedSeats.map(s => s.label).join(', ')}\n\n¿Confirmar esta selección?`);
        if (confirmAll) {
          this.confirmSeats();
        } else {
          this.modifyLastSelection();
        }
      }, 1000);
    } else {
      this.askToContinue();
    }
  }

  // 🔥 NUEVO MÉTODO PARA MOSTRAR CONFIRMACIÓN
  showSeatConfirmation(seat: Seat) {
    const today = new Date().toLocaleDateString();
    this.seatMessage = `✅ Asiento ${seat.label} (${seat.type}) reservado el ${today}`;
    this.showSeatMessage = true;
    this.lastSelectedSeat = seat;
  }

  // 🔥 NUEVO MÉTODO PARA PREGUNTAR SI CONTINUAR
  askToContinue() {
    const remaining = this.seatCount - this.currentSelectionStep;
    setTimeout(() => {
      const continueRes = confirm(`✅ Asiento reservado correctamente.\n\n¿Desea continuar reservando el siguiente asiento? (Faltan ${remaining} asientos)`);
      if (!continueRes) {
        this.finalizePartialSelection();
      }
    }, 500);
  }

  // 🔥 NUEVO MÉTODO PARA FINALIZAR SELECCIÓN PARCIAL
  finalizePartialSelection() {
    if (this.selectedSeats.length > 0) {
      const confirmRes = confirm(`Has seleccionado ${this.selectedSeats.length} de ${this.seatCount} asientos.\n¿Deseas confirmar con esta selección?`);
      if (confirmRes) {
        this.confirmSeats();
      } else {
        this.clearSelection();
        this.currentSelectionStep = 0;
        this.showSeatMessage = false;
        this.lastSelectedSeat = null;
      }
    }
  }

  // 🔥 NUEVO MÉTODO PARA MODIFICAR ÚLTIMA SELECCIÓN
  modifyLastSelection() {
    if (this.lastSelectedSeat) {
      this.lastSelectedSeat.selected = false;
      this.selectedSeats = this.selectedSeats.filter(s => s !== this.lastSelectedSeat);
      this.currentSelectionStep--;
      this.showSeatMessage = false;
      this.lastSelectedSeat = null;
    }
  }

  // 🔥 NUEVO MÉTODO PARA CERRAR MENSAJE
  dismissMessage() {
    this.showSeatMessage = false;
  }

  // MÉTODO ORIGINAL (para cuando no está en modo individual)
  selectSeat(seat: Seat) {
    if (seat.occupied) return;

    const selectedSeats = this.seatRows.flat().filter(s => s.selected);
    
    if (!seat.selected && selectedSeats.length >= this.seatCount) {
      alert(`Solo puedes seleccionar ${this.seatCount} asientos.`);
      return;
    }

    seat.selected = !seat.selected;
    this.updateSelectedSeats();
  }

  selectAutomaticSeats() {
    this.clearSelection();
    const freeSeats = this.seatRows.flat().filter(seat => !seat.occupied);
    const groupedSeats = this.findGroupedSeats(freeSeats, this.seatCount);
    
    if (groupedSeats.length >= this.seatCount) {
      groupedSeats.slice(0, this.seatCount).forEach(seat => {
        seat.selected = true;
      });
    } else {
      freeSeats.slice(0, this.seatCount).forEach(seat => {
        seat.selected = true;
      });
    }
    
    this.updateSelectedSeats();
    
    if (this.selectedSeats.length > 0) {
      const seatLabels = this.selectedSeats.map(s => s.label).join(', ');
      this.seatMessage = `✅ Asientos asignados automáticamente: ${seatLabels}`;
      this.showSeatMessage = true;
    }
  }

  selectRandomSeats() {
    this.clearSelection();
    const freeSeats = this.seatRows.flat().filter(seat => !seat.occupied);
    const shuffled = [...freeSeats].sort(() => 0.5 - Math.random());
    
    shuffled.slice(0, this.seatCount).forEach(seat => {
      seat.selected = true;
    });
    
    this.updateSelectedSeats();
    
    if (this.selectedSeats.length > 0) {
      const seatLabels = this.selectedSeats.map(s => s.label).join(', ');
      this.seatMessage = `✅ Asientos asignados aleatoriamente: ${seatLabels}`;
      this.showSeatMessage = true;
    }
  }

  private clearSelection() {
    this.seatRows.flat().forEach(seat => seat.selected = false);
    this.selectedSeats = [];
  }

  private updateSelectedSeats() {
    this.selectedSeats = this.seatRows.flat().filter(seat => seat.selected);
  }

  private findGroupedSeats(seats: Seat[], count: number): Seat[] {
    const seatsByRow = new Map<string, Seat[]>();
    
    seats.forEach(seat => {
      const row = seat.label[0];
      if (!seatsByRow.has(row)) {
        seatsByRow.set(row, []);
      }
      seatsByRow.get(row)!.push(seat);
    });
    
    for (const [row, rowSeats] of seatsByRow) {
      if (rowSeats.length >= count) {
        rowSeats.sort((a, b) => {
          const aNum = parseInt(a.label.substring(1));
          const bNum = parseInt(b.label.substring(1));
          return aNum - bNum;
        });
        
        for (let i = 0; i <= rowSeats.length - count; i++) {
          const group = rowSeats.slice(i, i + count);
          const isConsecutive = group.every((seat, index) => {
            const seatNum = parseInt(seat.label.substring(1));
            return seatNum === parseInt(group[0].label.substring(1)) + index;
          });
          
          if (isConsecutive) {
            return group;
          }
        }
      }
    }
    
    return [];
  }

  confirmSeats() {
    if (this.selectedSeats.length !== this.seatCount) {
      alert(`Por favor selecciona ${this.seatCount} asientos.`);
      return;
    }

    this.passengers = this.selectedSeats.map((seat, index) => ({
      name: '',
      cui: '',
      type: seat.type,
      luggage: false,
      seat: seat.label,
      departamento: '',
      municipio: '',
      cuiInvalid: false,
      cuiError: '',
      nameInvalid: false,
      nameError: ''
    }));

    this.showSeatMap = false;
    this.showForm = true;
    this.isSelectingIndividual = false;
  }

  // 🔥 NUEVO: VALIDACIÓN DE CUI GUATEMALTECO
  validateCUI(passengerIndex: number): void {
    const passenger = this.passengers[passengerIndex];
    passenger.cuiInvalid = false;
    passenger.cuiError = '';

    if (!passenger.cui) {
      passenger.cuiInvalid = true;
      passenger.cuiError = 'El CUI es requerido';
      return;
    }

    // Limpiar el CUI (quitar espacios y guiones)
    const cuiLimpio = passenger.cui.replace(/[-\s]/g, '');
    
    // Validar longitud (debe tener 13 dígitos completos)
    if (cuiLimpio.length !== 13) {
      passenger.cuiInvalid = true;
      passenger.cuiError = 'El CUI debe tener 13 dígitos completos';
      return;
    }
    
    // Validar que sean solo números
    if (!/^\d+$/.test(cuiLimpio)) {
      passenger.cuiInvalid = true;
      passenger.cuiError = 'El CUI debe contener solo números';
      return;
    }
    
    // Validar departamento (dígitos 9-10)
    const codigoDepartamento = parseInt(cuiLimpio.substring(8, 10));
    if (codigoDepartamento < 1 || codigoDepartamento > 22) {
      passenger.cuiInvalid = true;
      passenger.cuiError = 'Código de departamento inválido (debe ser entre 01-22)';
      return;
    }
    
    // Validar municipio (dígitos 11-12)
    const codigoMunicipio = parseInt(cuiLimpio.substring(10, 12));
    if (codigoMunicipio < 1 || codigoMunicipio > 99) {
      passenger.cuiInvalid = true;
      passenger.cuiError = 'Código de municipio inválido';
      return;
    }
    
    // Validar dígito verificador (último dígito)
    const digitosVerificadorCalculado = this.calcularDigitoVerificador(cuiLimpio.substring(0, 12));
    if (cuiLimpio[12] !== digitosVerificadorCalculado) {
      passenger.cuiInvalid = true;
      passenger.cuiError = 'Dígito verificador inválido';
      return;
    }
  }

  // 🔥 NUEVO: VALIDAR DÍGITO VERIFICADOR DEL CUI
  private validarDigitoVerificador(cui: string): boolean {
    // Algoritmo simplificado para validar dígito verificador
    const digitoVerificador = parseInt(cui[12]);
    const suma = cui.substring(0, 12).split('').reduce((acc, digit, index) => {
      return acc + (parseInt(digit) * (index % 2 === 0 ? 1 : 2));
    }, 0);
    
    const modulo = suma % 10;
    return digitoVerificador === modulo;
  }

  // 🔥 NUEVO: ACTUALIZAR DEPARTAMENTO Y MUNICIPIO DESDE CUI
  private actualizarUbicacionDesdeCUI(passengerIndex: number, cui: string): void {
    const passenger = this.passengers[passengerIndex];
    
    // Extraer códigos del CUI (dígitos 9-12)
    const codigoDepartamento = cui.substring(8, 10);
    const codigoMunicipio = parseInt(cui.substring(10, 12));
    
    // Buscar departamento
    const departamento = this.departamentos.find(depto => depto.codigo === codigoDepartamento);
    if (departamento) {
      passenger.departamento = departamento.codigo;
      
      // Buscar municipio basado en el código
      const municipiosDepto = this.municipios[codigoDepartamento];
      if (municipiosDepto && municipiosDepto.length >= codigoMunicipio) {
        passenger.municipio = municipiosDepto[codigoMunicipio - 1];
      }
    }
  }

  // 🔥 NUEVO: FORMATEAR CUI (solo permite 8 dígitos de entrada)
  formatCUI(passengerIndex: number): void {
    const passenger = this.passengers[passengerIndex];
    if (passenger.cui) {
      // Remover cualquier guión existente
    let cuiLimpio = passenger.cui.replace(/[-\s]/g, '');
      
      // Limitar a 8 caracteres (lo que el usuario ingresa - número RENAP)
      if (cuiLimpio.length > 13) {
        cuiLimpio = cuiLimpio.substring(0, 13);
      }
      
      passenger.cui = cuiLimpio;
      
      // Si tenemos departamento y municipio, actualizar CUI completo automáticamente
    if (passenger.departamento && passenger.municipio && cuiLimpio.length === 8) {
      this.actualizarCUI(passengerIndex);
    } else {
      // Si no se cumplen las condiciones, solo mostrar el valor sin formato automático
      passenger.cui = cuiLimpio;
    }
    }
  }

  // 🔥 NUEVO: VALIDAR NOMBRE DEL PASAJERO
  validatePassengerName(passengerIndex: number): void {
    const passenger = this.passengers[passengerIndex];
    passenger.nameInvalid = false;
    passenger.nameError = '';

    if (!passenger.name) {
      passenger.nameInvalid = true;
      passenger.nameError = 'El nombre es requerido';
      return;
    }

    if (passenger.name.length < 2) {
      passenger.nameInvalid = true;
      passenger.nameError = 'El nombre debe tener al menos 2 caracteres';
      return;
    }

    // Validar que tenga al menos nombre y apellido
    const partesNombre = passenger.name.trim().split(' ');
    if (partesNombre.length < 2) {
      passenger.nameInvalid = true;
      passenger.nameError = 'Ingrese nombre y apellido completo';
      return;
    }

    // Validar que no contenga números ni caracteres especiales
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(passenger.name)) {
      passenger.nameInvalid = true;
      passenger.nameError = 'El nombre solo puede contener letras y espacios';
      return;
    }
  }

  // 🔥 NUEVO: OBTENER MUNICIPIOS POR DEPARTAMENTO (CORREGIDO)
  getMunicipiosByDepartamento(codigoDepartamento: string | undefined): string[] {
    if (!codigoDepartamento) {
      return [];
    }
    return this.municipios[codigoDepartamento] || [];
  }

  // 🔥 NUEVO: CAMBIAR DEPARTAMENTO (CON AUTOCOMPLETADO DE CUI)
  onDepartamentoChange(passengerIndex: number): void {
    const passenger = this.passengers[passengerIndex];
    passenger.municipio = ''; // Reset municipio cuando cambia departamento
    this.actualizarCUI(passengerIndex);
  }

  // 🔥 NUEVO: CAMBIAR MUNICIPIO (CON AUTOCOMPLETADO DE CUI)
  onMunicipioChange(passengerIndex: number): void {
    this.actualizarCUI(passengerIndex);
  }

actualizarCUI(passengerIndex: number): void {
  const passenger = this.passengers[passengerIndex];

  if (passenger.departamento && passenger.municipio) {
    const municipios = this.getMunicipiosByDepartamento(passenger.departamento);
    const index = municipios.findIndex(m => m === passenger.municipio);

    if (index !== -1) {
      // Asegurar dos dígitos siempre
      const codigoDepartamento = passenger.departamento.toString().padStart(2, '0');
      const codigoMunicipio = (index + 1).toString().padStart(2, '0');

      // 4 dígitos de ubicación
      const digitosUbicacion = codigoDepartamento + codigoMunicipio;

      // CUI base del usuario (8 dígitos RENAP)
      const cuiLimpio = passenger.cui ? passenger.cui.replace(/[-\s]/g, '') : '';

      if (cuiLimpio.length === 8) {
        const digitosRENAP = cuiLimpio;

        // ✅ CUI base con 12 dígitos
        const baseCUI = digitosRENAP + digitosUbicacion;

        // ✅ Calcular dígito verificador correctamente
        const digitoVerificador = this.calcularDigitoVerificador(baseCUI);

        // ✅ Concatenar todo (13 dígitos finales)
        const cuiCompleto = baseCUI + digitoVerificador;

        passenger.cui = cuiCompleto;

        console.log('✅ CUI generado correctamente:', passenger.cui);
        console.log('Longitud final:', cuiCompleto.length);
      }
    }
  }
}

  // 🔥 NUEVO: CALCULAR DÍGITO VERIFICADOR SEGÚN ALGORITMO OFICIAL
  private calcularDigitoVerificador(cui12Digitos: string): string {
    // Algoritmo oficial del RENAP para calcular el dígito verificador
    let suma = 0;
    for (let i = 0; i < 12; i++) {
      const digito = parseInt(cui12Digitos[i]);
      const factor = (i % 2 === 0) ? 1 : 2;
      let producto = digito * factor;
      
      // Si el producto es mayor a 9, sumar los dígitos
      if (producto > 9) {
        producto = Math.floor(producto / 10) + (producto % 10);
      }
      
      suma += producto;
    }
    
    const modulo = suma % 10;
    const digitoVerificador = modulo === 0 ? 0 : 10 - modulo;
    
    return digitoVerificador.toString();
  }

  // 🔥 NUEVO: FORMATEAR CUI COMPLETO CON GUIONES
  private formatearCUICompleto(cui: string): string {
    const cuiLimpio = cui.replace(/[-\s]/g, '');
    
    if (cuiLimpio.length >= 13) {
      return `${cuiLimpio.substring(0, 4)}-${cuiLimpio.substring(4, 8)}-${cuiLimpio.substring(8, 12)}-${cuiLimpio.substring(12, 13)}`;
    } else {
      return cuiLimpio;
    }
  }

  // 🔥 NUEVO: VALIDAR FORMULARIO COMPLETO DE PASAJEROS
  isPassengerFormValid(): boolean {
    return this.passengers.every(passenger => 
      passenger.name && 
      passenger.cui &&
      passenger.departamento &&
      passenger.municipio &&
      !passenger.nameInvalid &&
      !passenger.cuiInvalid
    );
  }

  // 🔥 MEJORADO: Enviar reserva al backend
  submitReservation(): void {
    // Validar todos los campos antes de enviar
    this.passengers.forEach((_, index) => {
      this.validatePassengerName(index);
      this.validateCUI(index);
    });

    if (!this.isPassengerFormValid()) {
      alert('Por favor corrige todos los errores en el formulario antes de continuar.');
      return;
    }

    const invalidPassenger = this.passengers.find(p => !p.name || !p.cui || !p.departamento || !p.municipio);
    if (invalidPassenger) {
      alert('Por favor completa todos los datos de los pasajeros.');
      return;
    }

    // 🔥 ACTUALIZADO: Incluir departamento y municipio en los datos
    const reservationData = {
      vuelo_id: this.getFlightIdFromSelection(),
      fecha_salida: this.departureDate,
      fecha_regreso: this.flightType === 'roundtrip' ? this.returnDate : null,
      pasajeros: this.passengers.map(passenger => ({
        nombre: passenger.name,
        cui: passenger.cui,
        departamento: passenger.departamento,
        municipio: passenger.municipio,
        tiene_equipaje: passenger.luggage,
        tipo_asiento: passenger.type
      })),
      metodo_seleccion: this.selectionMode,
      asientos_seleccionados: this.selectedSeats.map(seat => seat.label)
    };

    // 🔥 NUEVO: Enviar al backend
    this.api.createReservation(reservationData).subscribe({
      next: (response) => {
        console.log('✅ Reserva creada en backend:', response);
        this.showForm = false;
        this.showSummary = true;
        
        // Actualizar con datos reales de la respuesta
        this.passengers = response.reserva.pasajeros;
      },
      error: (error) => {
        console.error('❌ Error creando reserva:', error);
        alert('Error al crear la reserva: ' + (error.error?.error || 'Error del servidor'));
        
        // Fallback: continuar sin backend
        this.showForm = false;
        this.showSummary = true;
      }
    });
  }

  // 🔥 NUEVO: Obtener flight_id basado en la selección
  private getFlightIdFromSelection(): number {
    // Buscar vuelo que coincida con origen, destino y tipo
    const matchingFlight = this.availableFlights.find(flight => 
      flight.origen === this.origin && 
      flight.destino === this.destination &&
      flight.tipo_vuelo === (this.flightType === 'roundtrip' ? 'ida_vuelta' : 'ida')
    );
    
    return matchingFlight ? matchingFlight.id : 1; // Fallback a ID 1
  }

  finalizeReservation(): void {
    alert('Reserva confirmada 🎉\n¡Buen viaje!');
    this.resetForm();
  }

  backToSeatMap(): void {
    this.showForm = false;
    this.showSeatMap = true;
  }

  backToSearch(): void {
    this.showSeatMap = false;
    this.showForm = false;
    this.showSummary = false;
    this.selectedSeats = [];
    this.passengers = []; 
    this.isSelectingIndividual = false;
  }

  backToStart(): void {
    this.showSeatMap = false;
    this.showForm = false;
    this.showSummary = false;
    this.selectedSeats = [];
    this.passengers = []; 
    this.isSelectingIndividual = false;
  }

  private resetForm(): void {
    this.showSeatMap = false;
    this.showForm = false;
    this.showSummary = false;
    this.selectedSeats = [];
    this.passengers = [];
    this.origin = 'Ciudad de Guatemala (GUA)';
    this.destination = '';
    this.departureDate = '';
    this.returnDate = '';
    this.adults = 1;
    this.children = 0;
    this.flightType = 'roundtrip';
    this.activeFilter = 'todos'; 
    this.passengerPanelOpen = false;
    this.isSelectingIndividual = false;
    this.currentSelectionStep = 0;
    this.showSeatMessage = false;
  }
}