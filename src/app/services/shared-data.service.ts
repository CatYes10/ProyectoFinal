import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SharedDataService {
  private selectedDestinationSource = new BehaviorSubject<string>('');
  selectedDestination$ = this.selectedDestinationSource.asObservable();

  setSelectedDestination(destination: string) {
    this.selectedDestinationSource.next(destination);
  }

  getSelectedDestination(): string {
    return this.selectedDestinationSource.value;
  }

  clearSelectedDestination() {
    this.selectedDestinationSource.next('');
  }
}