import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KafkaApiService } from '../../services/kafka-api.service';
import { KafkaConnection } from '../../models/kafka.models';

@Component({
  selector: 'app-connections',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card">
      <h2>Kafka Connections</h2>
      <button class="btn btn-primary" (click)="openAddDialog()" style="margin-bottom: 20px;">Add Connection</button>

      <div *ngIf="connections.length > 0" class="table-container" style="overflow-x: auto;">
        <table class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Bootstrap Servers</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let conn of connections">
              <td>{{ conn.name }}</td>
              <td>{{ conn.bootstrapServers }}</td>
              <td>
                <span [style.color]="conn.isActive ? 'green' : 'gray'">
                  {{ conn.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td>{{ conn.createdAt | date:'short' }}</td>
              <td>
                <button class="btn btn-primary" (click)="editConnection(conn)" style="margin-right: 5px; padding: 5px 10px;">Edit</button>
                <button class="btn btn-danger" (click)="deleteConnection(conn.id)" style="padding: 5px 10px;">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="connections.length === 0" class="alert alert-info">
        No connections configured. Add your first connection to get started.
      </div>
    </div>

    <!-- Dialog -->
    <div *ngIf="showDialog" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
      <div style="background: white; padding: 30px; border-radius: 8px; max-width: 500px; width: 90%;">
        <h3>{{ isEditing ? 'Edit' : 'Add' }} Connection</h3>
        <div class="form-group">
          <label>Connection Name</label>
          <input type="text" class="form-control" [(ngModel)]="currentConnection.name" />
        </div>
        <div class="form-group">
          <label>Bootstrap Servers</label>
          <input type="text" class="form-control" [(ngModel)]="currentConnection.bootstrapServers" />
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" [(ngModel)]="currentConnection.isActive" />
            Active
          </label>
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
          <button class="btn" (click)="closeDialog()">Cancel</button>
          <button class="btn btn-primary" (click)="saveConnection()">Save</button>
        </div>
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
export class ConnectionsComponent implements OnInit {
  connections: KafkaConnection[] = [];
  showDialog = false;
  isEditing = false;
  currentConnection: KafkaConnection = {
    id: '',
    name: '',
    bootstrapServers: 'localhost:9092',
    isActive: true,
    createdAt: new Date().toISOString()
  };
  errorMessage = '';
  successMessage = '';

  constructor(private apiService: KafkaApiService) {}

  ngOnInit() {
    this.loadConnections();
  }

  loadConnections() {
    this.apiService.getConnections().subscribe({
      next: (connections) => {
        this.connections = connections;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load connections: ' + error.message;
      }
    });
  }

  openAddDialog() {
    this.isEditing = false;
    this.currentConnection = {
      id: '',
      name: '',
      bootstrapServers: 'localhost:9092',
      isActive: true,
      createdAt: new Date().toISOString()
    };
    this.showDialog = true;
    this.clearMessages();
  }

  editConnection(connection: KafkaConnection) {
    this.isEditing = true;
    this.currentConnection = { ...connection };
    this.showDialog = true;
    this.clearMessages();
  }

  closeDialog() {
    this.showDialog = false;
    this.clearMessages();
  }

  saveConnection() {
    if (!this.currentConnection.name || !this.currentConnection.bootstrapServers) {
      this.errorMessage = 'Name and Bootstrap Servers are required';
      return;
    }

    if (this.isEditing) {
      this.apiService.updateConnection(this.currentConnection).subscribe({
        next: () => {
          this.successMessage = 'Connection updated successfully';
          this.closeDialog();
          this.loadConnections();
        },
        error: (error) => {
          this.errorMessage = 'Failed to update connection: ' + error.message;
        }
      });
    } else {
      this.apiService.createConnection(this.currentConnection).subscribe({
        next: () => {
          this.successMessage = 'Connection added successfully';
          this.closeDialog();
          this.loadConnections();
        },
        error: (error) => {
          this.errorMessage = 'Failed to create connection: ' + error.message;
        }
      });
    }
  }

  deleteConnection(id: string) {
    if (confirm('Are you sure you want to delete this connection?')) {
      this.apiService.deleteConnection(id).subscribe({
        next: () => {
          this.successMessage = 'Connection deleted successfully';
          this.loadConnections();
        },
        error: (error) => {
          this.errorMessage = 'Failed to delete connection: ' + error.message;
        }
      });
    }
  }

  private clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
    setTimeout(() => {
      this.errorMessage = '';
      this.successMessage = '';
    }, 5000);
  }
}

