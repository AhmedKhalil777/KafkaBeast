import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { KafkaApiService } from '../../services/kafka-api.service';
import { KafkaConnection, ConnectionTestResult, ClusterInfo, SecurityProtocol } from '../../models/kafka.models';
import { ConnectionDialogComponent } from './connection-dialog/connection-dialog.component';

@Component({
  selector: 'app-connections',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatChipsModule,
    ConnectionDialogComponent
  ],
  templateUrl: './connections.component.html',
  styleUrls: ['./connections.component.css']
})
export class ConnectionsComponent implements OnInit {
  connections: KafkaConnection[] = [];
  showDialog = false;
  isEditing = false;
  displayedColumns = ['name', 'servers', 'security', 'status', 'actions'];
  currentConnection: KafkaConnection = this.getEmptyConnection();
  testResult: ConnectionTestResult | null = null;
  clusterInfo: ClusterInfo | null = null;
  testingConnection: string | null = null;

  constructor(
    private apiService: KafkaApiService,
    private snackBar: MatSnackBar
  ) {}

  getSecurityProtocolLabel(protocol?: SecurityProtocol): string {
    const protocolLabels = {
      [SecurityProtocol.Plaintext]: 'Plaintext',
      [SecurityProtocol.Ssl]: 'SSL',
      [SecurityProtocol.SaslPlaintext]: 'SASL Plaintext',
      [SecurityProtocol.SaslSsl]: 'SASL SSL'
    };
    return protocolLabels[protocol ?? SecurityProtocol.Plaintext];
  }

  ngOnInit() {
    this.loadConnections();
  }
  
  private getEmptyConnection(): KafkaConnection {
    return {
      id: '',
      name: '',
      bootstrapServers: 'localhost:9092',
      securityProtocol: SecurityProtocol.Plaintext,
      sslEndpointIdentificationAlgorithm: true,
      isActive: true,
      createdAt: new Date().toISOString()
    };
  }

  loadConnections() {
    this.apiService.getConnections().subscribe({
      next: (connections) => {
        this.connections = connections;
      },
      error: (error) => {
        this.showError('Failed to load connections: ' + error.message);
      }
    });
  }

  openAddDialog() {
    this.isEditing = false;
    this.currentConnection = this.getEmptyConnection();
    this.showDialog = true;
  }

  editConnection(connection: KafkaConnection) {
    this.isEditing = true;
    this.currentConnection = { ...connection };
    this.showDialog = true;
  }

  closeDialog() {
    this.showDialog = false;
  }

  saveConnection(connection: KafkaConnection) {
    if (this.isEditing) {
      this.apiService.updateConnection(connection).subscribe({
        next: () => {
          this.showSuccess('Connection updated successfully');
          this.closeDialog();
          this.loadConnections();
        },
        error: (error) => {
          this.showError('Failed to update connection: ' + error.message);
        }
      });
    } else {
      this.apiService.createConnection(connection).subscribe({
        next: () => {
          this.showSuccess('Connection added successfully');
          this.closeDialog();
          this.loadConnections();
        },
        error: (error) => {
          this.showError('Failed to create connection: ' + error.message);
        }
      });
    }
  }

  deleteConnection(id: string) {
    if (confirm('Are you sure you want to delete this connection?')) {
      this.apiService.deleteConnection(id).subscribe({
        next: () => {
          this.showSuccess('Connection deleted successfully');
          this.loadConnections();
        },
        error: (error) => {
          this.showError('Failed to delete connection: ' + error.message);
        }
      });
    }
  }

  testConnection(connection: KafkaConnection) {
    this.testingConnection = connection.id;
    this.testResult = null;
    this.clusterInfo = null;

    this.apiService.testConnection(connection.id).subscribe({
      next: (result) => {
        this.testResult = result;
        this.testingConnection = null;
      },
      error: (error) => {
        this.testResult = {
          success: false,
          message: error.error?.message || error.message || 'Connection test failed'
        };
        this.testingConnection = null;
      }
    });
  }

  viewClusterInfo(connection: KafkaConnection) {
    this.testResult = null;
    this.clusterInfo = null;

    this.apiService.getClusterInfo(connection.id).subscribe({
      next: (info) => {
        this.clusterInfo = info;
      },
      error: (error) => {
        this.showError('Failed to get cluster info: ' + (error.error?.error || error.message));
      }
    });
  }

  private showSuccess(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar']
    });
  }
}