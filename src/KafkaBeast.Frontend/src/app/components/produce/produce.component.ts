import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KafkaApiService } from '../../services/kafka-api.service';
import { KafkaConnection, ProduceMessageRequest, ProduceMessageResponse } from '../../models/kafka.models';

@Component({
  selector: 'app-produce',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card">
      <h2>Produce Messages</h2>

      <div class="form-group">
        <label>Connection</label>
        <select class="form-control" [(ngModel)]="selectedConnectionId" (change)="onConnectionChange()">
          <option value="">Select a connection</option>
          <option *ngFor="let conn of activeConnections" [value]="conn.id">
            {{ conn.name }} ({{ conn.bootstrapServers }})
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>Topic *</label>
        <input type="text" class="form-control" [(ngModel)]="request.topic" required />
      </div>

      <div class="form-group">
        <label>Key (optional)</label>
        <input type="text" class="form-control" [(ngModel)]="request.key" />
      </div>

      <div class="form-group">
        <label>Message *</label>
        <textarea class="form-control" [(ngModel)]="request.message" rows="5" required></textarea>
      </div>

      <button class="btn btn-success" (click)="produceMessage()" [disabled]="!canProduce">
        Produce Message
      </button>

      <div *ngIf="lastResult" class="card" style="margin-top: 20px;">
        <h3>Last Result</h3>
        <p><strong>Topic:</strong> {{ lastResult.topic }}</p>
        <p><strong>Partition:</strong> {{ lastResult.partition }}</p>
        <p><strong>Offset:</strong> {{ lastResult.offset }}</p>
        <p><strong>Status:</strong> {{ lastResult.status }}</p>
      </div>

      <div *ngIf="errorMessage" class="alert alert-error" style="margin-top: 20px;">
        {{ errorMessage }}
      </div>
      <div *ngIf="successMessage" class="alert alert-success" style="margin-top: 20px;">
        {{ successMessage }}
      </div>
    </div>
  `
})
export class ProduceComponent implements OnInit {
  connections: KafkaConnection[] = [];
  activeConnections: KafkaConnection[] = [];
  selectedConnectionId = '';
  request: ProduceMessageRequest = {
    connectionId: '',
    topic: '',
    message: ''
  };
  lastResult?: ProduceMessageResponse;
  errorMessage = '';
  successMessage = '';

  get canProduce(): boolean {
    return !!this.selectedConnectionId && !!this.request.topic && !!this.request.message;
  }

  constructor(private apiService: KafkaApiService) {}

  ngOnInit() {
    this.loadConnections();
  }

  loadConnections() {
    this.apiService.getConnections().subscribe({
      next: (connections) => {
        this.connections = connections;
        this.activeConnections = connections.filter(c => c.isActive);
        if (this.activeConnections.length > 0 && !this.selectedConnectionId) {
          this.selectedConnectionId = this.activeConnections[0].id;
          this.onConnectionChange();
        }
      },
      error: (error) => {
        this.errorMessage = 'Failed to load connections: ' + error.message;
      }
    });
  }

  onConnectionChange() {
    this.request.connectionId = this.selectedConnectionId;
  }

  produceMessage() {
    if (!this.canProduce) {
      this.errorMessage = 'Please fill in all required fields';
      return;
    }

    this.request.connectionId = this.selectedConnectionId;
    this.apiService.produceMessage(this.request).subscribe({
      next: (result) => {
        this.lastResult = result;
        this.successMessage = `Message produced successfully to topic ${this.request.topic}`;
        this.request.message = '';
        this.request.key = '';
        this.clearMessages();
      },
      error: (error) => {
        this.errorMessage = 'Error producing message: ' + error.message;
        this.clearMessages();
      }
    });
  }

  private clearMessages() {
    setTimeout(() => {
      this.errorMessage = '';
      this.successMessage = '';
    }, 5000);
  }
}

