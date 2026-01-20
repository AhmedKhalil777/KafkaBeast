import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KafkaApiService } from '../../services/kafka-api.service';
import { KafkaSignalRService } from '../../services/kafka-signalr.service';
import { KafkaConnection, ConsumeMessageRequest, ConsumedMessage } from '../../models/kafka.models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-consume',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card">
      <h2>Consume Messages</h2>

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
        <label>Group ID (optional)</label>
        <input type="text" class="form-control" [(ngModel)]="request.groupId" />
      </div>

      <div class="form-group">
        <label>Max Messages</label>
        <input type="number" class="form-control" [(ngModel)]="maxMessages" min="1" max="100" />
      </div>

      <div class="form-group">
        <label>
          <input type="checkbox" [(ngModel)]="request.autoOffsetReset" />
          Read from beginning
        </label>
      </div>

      <div style="display: flex; gap: 10px;">
        <button class="btn btn-primary" (click)="consumeBatch()" [disabled]="!canConsume || isConsuming">
          Consume Messages (Batch)
        </button>
        <button class="btn btn-success" (click)="startRealTimeConsume()" [disabled]="!canConsume || isConsuming">
          Start Real-time
        </button>
        <button *ngIf="isConsuming" class="btn btn-danger" (click)="stopConsuming()">
          Stop
        </button>
      </div>

      <div *ngIf="connectionStatus" class="alert alert-info" style="margin-top: 20px;">
        SignalR Status: {{ connectionStatus }}
      </div>
    </div>

    <div *ngIf="consumedMessages.length > 0" class="card" style="margin-top: 20px;">
      <h3>Consumed Messages ({{ consumedMessages.length }})</h3>
      <div class="table-container" style="overflow-x: auto; max-height: 500px; overflow-y: auto;">
        <table class="table">
          <thead>
            <tr>
              <th>Topic</th>
              <th>Partition</th>
              <th>Offset</th>
              <th>Key</th>
              <th>Value</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let msg of consumedMessages">
              <td>{{ msg.topic }}</td>
              <td>{{ msg.partition }}</td>
              <td>{{ msg.offset }}</td>
              <td>{{ msg.key || '-' }}</td>
              <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">{{ msg.value }}</td>
              <td>{{ msg.timestamp | date:'short' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div *ngIf="errorMessage" class="alert alert-error" style="margin-top: 20px;">
      {{ errorMessage }}
    </div>
    <div *ngIf="successMessage" class="alert alert-success" style="margin-top: 20px;">
      {{ successMessage }}
    </div>
  `
})
export class ConsumeComponent implements OnInit, OnDestroy {
  connections: KafkaConnection[] = [];
  activeConnections: KafkaConnection[] = [];
  selectedConnectionId = '';
  request: ConsumeMessageRequest = {
    connectionId: '',
    topic: '',
    autoOffsetReset: true
  };
  maxMessages = 10;
  consumedMessages: ConsumedMessage[] = [];
  isConsuming = false;
  connectionStatus = '';
  errorMessage = '';
  successMessage = '';
  private messageSubscription?: Subscription;
  private errorSubscription?: Subscription;

  get canConsume(): boolean {
    return !!this.selectedConnectionId && !!this.request.topic;
  }

  constructor(
    private apiService: KafkaApiService,
    private signalRService: KafkaSignalRService
  ) {}

  ngOnInit() {
    this.loadConnections();
    this.startSignalRConnection();
  }

  ngOnDestroy() {
    this.stopConsuming();
    this.messageSubscription?.unsubscribe();
    this.errorSubscription?.unsubscribe();
    this.signalRService.stopConnection();
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

  startSignalRConnection() {
    this.signalRService.startConnection().then(() => {
      this.connectionStatus = this.signalRService.getConnectionState();
      this.messageSubscription = this.signalRService.messages$.subscribe(message => {
        this.consumedMessages.push(message);
      });
      this.errorSubscription = this.signalRService.errors$.subscribe(error => {
        this.errorMessage = error;
        this.clearMessages();
      });
    }).catch(error => {
      this.errorMessage = 'Failed to connect to SignalR: ' + error;
      this.clearMessages();
    });
  }

  consumeBatch() {
    if (!this.canConsume) {
      this.errorMessage = 'Please fill in all required fields';
      return;
    }

    this.request.connectionId = this.selectedConnectionId;
    this.isConsuming = true;
    this.consumedMessages = [];

    this.apiService.consumeBatch(this.request, this.maxMessages).subscribe({
      next: (messages) => {
        this.consumedMessages = messages;
        if (messages.length > 0) {
          this.successMessage = `Consumed ${messages.length} message(s)`;
        } else {
          this.successMessage = 'No messages found';
        }
        this.isConsuming = false;
        this.clearMessages();
      },
      error: (error) => {
        this.errorMessage = 'Error consuming messages: ' + error.message;
        this.isConsuming = false;
        this.clearMessages();
      }
    });
  }

  startRealTimeConsume() {
    if (!this.canConsume) {
      this.errorMessage = 'Please fill in all required fields';
      return;
    }

    this.request.connectionId = this.selectedConnectionId;
    this.isConsuming = true;
    this.consumedMessages = [];

    this.signalRService.startConsuming(this.request).then(() => {
      this.successMessage = 'Started real-time consumption';
      this.clearMessages();
    }).catch(error => {
      this.errorMessage = 'Failed to start consumption: ' + error;
      this.isConsuming = false;
      this.clearMessages();
    });
  }

  stopConsuming() {
    if (this.selectedConnectionId && this.request.topic) {
      this.signalRService.stopConsuming(this.selectedConnectionId, this.request.topic);
    }
    this.isConsuming = false;
  }

  private clearMessages() {
    setTimeout(() => {
      this.errorMessage = '';
      this.successMessage = '';
    }, 5000);
  }
}

