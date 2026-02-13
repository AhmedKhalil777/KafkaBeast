import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { KafkaApiService } from '../../services/kafka-api.service';
import { KafkaConnection, ConnectionTestResult, ClusterInfo, SecurityProtocol, SaslMechanism, CompressionType, Acks } from '../../models/kafka.models';

@Component({
  selector: 'app-connections',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatTableModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTabsModule,
    MatChipsModule
  ],
  template: `
    <div class="connections-container">
      <div class="page-header">
        <mat-icon class="page-icon">hub</mat-icon>
        <div class="page-title">
          <h1>Kafka Connections</h1>
          <p>Manage your Kafka cluster connections</p>
        </div>
        <button mat-raised-button color="primary" (click)="openAddDialog()">
          <mat-icon>add</mat-icon>
          Add Connection
        </button>
      </div>

      <!-- Connections List -->
      <mat-card *ngIf="connections.length > 0" class="connections-card">
        <mat-card-content>
          <table mat-table [dataSource]="connections" class="connections-table">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let conn">
                <div class="connection-name-cell">
                  <mat-icon [class.active]="conn.isActive">{{ conn.isActive ? 'link' : 'link_off' }}</mat-icon>
                  <span>{{ conn.name }}</span>
                </div>
              </td>
            </ng-container>
            <ng-container matColumnDef="servers">
              <th mat-header-cell *matHeaderCellDef>Bootstrap Servers</th>
              <td mat-cell *matCellDef="let conn">{{ conn.bootstrapServers }}</td>
            </ng-container>
            <ng-container matColumnDef="security">
              <th mat-header-cell *matHeaderCellDef>Security</th>
              <td mat-cell *matCellDef="let conn">
                <mat-chip-set>
                  <mat-chip>{{ getSecurityProtocolLabel(conn.securityProtocol) }}</mat-chip>
                </mat-chip-set>
              </td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let conn">
                <span class="status-badge" [class.active]="conn.isActive" [class.inactive]="!conn.isActive">
                  {{ conn.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let conn">
                <button mat-icon-button matTooltip="Test Connection" (click)="testConnection(conn)" [disabled]="testingConnection === conn.id">
                  <mat-icon>{{ testingConnection === conn.id ? 'hourglass_empty' : 'wifi_tethering' }}</mat-icon>
                </button>
                <button mat-icon-button matTooltip="Cluster Info" (click)="viewClusterInfo(conn)">
                  <mat-icon>info</mat-icon>
                </button>
                <button mat-icon-button matTooltip="Edit" (click)="editConnection(conn)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button matTooltip="Delete" color="warn" (click)="deleteConnection(conn.id)">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </mat-card-content>
      </mat-card>

      <mat-card *ngIf="connections.length === 0" class="empty-card">
        <mat-card-content>
          <mat-icon>cloud_off</mat-icon>
          <h3>No connections configured</h3>
          <p>Add your first Kafka connection to get started</p>
          <button mat-raised-button color="primary" (click)="openAddDialog()">
            <mat-icon>add</mat-icon>
            Add Connection
          </button>
        </mat-card-content>
      </mat-card>

      <!-- Test Result -->
      <mat-card *ngIf="testResult" class="result-card" [class.success]="testResult.success" [class.failure]="!testResult.success">
        <mat-card-header>
          <mat-icon mat-card-avatar>{{ testResult.success ? 'check_circle' : 'error' }}</mat-icon>
          <mat-card-title>Connection Test Result</mat-card-title>
          <button mat-icon-button (click)="testResult = null" class="close-btn">
            <mat-icon>close</mat-icon>
          </button>
        </mat-card-header>
        <mat-card-content>
          <p><strong>Status:</strong> {{ testResult.success ? 'Connected' : 'Failed' }}</p>
          <p><strong>Message:</strong> {{ testResult.message }}</p>
          <p *ngIf="testResult.brokerCount"><strong>Brokers:</strong> {{ testResult.brokerCount }}</p>
          <p *ngIf="testResult.topicCount"><strong>Topics:</strong> {{ testResult.topicCount }}</p>
        </mat-card-content>
      </mat-card>

      <!-- Cluster Info -->
      <mat-card *ngIf="clusterInfo" class="cluster-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>dns</mat-icon>
          <mat-card-title>Cluster Information</mat-card-title>
          <button mat-icon-button (click)="clusterInfo = null" class="close-btn">
            <mat-icon>close</mat-icon>
          </button>
        </mat-card-header>
        <mat-card-content>
          <div class="cluster-stats">
            <div class="stat"><span class="label">Controller ID</span><span class="value">{{ clusterInfo.controllerId }}</span></div>
            <div class="stat"><span class="label">Total Topics</span><span class="value">{{ clusterInfo.topicCount }}</span></div>
            <div class="stat"><span class="label">Brokers</span><span class="value">{{ clusterInfo.brokers.length }}</span></div>
          </div>
          <mat-divider></mat-divider>
          <h4>Broker Details</h4>
          <table mat-table [dataSource]="clusterInfo.brokers" class="brokers-table">
            <ng-container matColumnDef="brokerId"><th mat-header-cell *matHeaderCellDef>ID</th><td mat-cell *matCellDef="let b">{{ b.brokerId }}</td></ng-container>
            <ng-container matColumnDef="host"><th mat-header-cell *matHeaderCellDef>Host</th><td mat-cell *matCellDef="let b">{{ b.host }}</td></ng-container>
            <ng-container matColumnDef="port"><th mat-header-cell *matHeaderCellDef>Port</th><td mat-cell *matCellDef="let b">{{ b.port }}</td></ng-container>
            <tr mat-header-row *matHeaderRowDef="['brokerId', 'host', 'port']"></tr>
            <tr mat-row *matRowDef="let row; columns: ['brokerId', 'host', 'port'];"></tr>
          </table>
        </mat-card-content>
      </mat-card>
    </div>

    <!-- Connection Dialog -->
    @if (showDialog) {
      <div class="modal-overlay" (click)="closeDialog()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ isEditing ? 'Edit' : 'Add' }} Connection</h2>
            <button mat-icon-button (click)="closeDialog()"><mat-icon>close</mat-icon></button>
          </div>
          
          <mat-tab-group class="config-tabs">
            <!-- Basic Tab -->
            <mat-tab label="Basic">
              <div class="tab-content">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Connection Name</mat-label>
                  <input matInput [(ngModel)]="currentConnection.name" placeholder="My Kafka Cluster" />
                  <mat-hint>A friendly name to identify this connection</mat-hint>
                </mat-form-field>
                
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Bootstrap Servers</mat-label>
                  <input matInput [(ngModel)]="currentConnection.bootstrapServers" placeholder="localhost:9092" />
                  <mat-hint>Comma-separated list of broker addresses (host:port)</mat-hint>
                </mat-form-field>
                
                <mat-checkbox [(ngModel)]="currentConnection.isActive" color="primary">
                  Set as Active Connection
                </mat-checkbox>
              </div>
            </mat-tab>
            
            <!-- Security Tab -->
            <mat-tab label="Security">
              <div class="tab-content">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Security Protocol</mat-label>
                  <mat-select [(ngModel)]="currentConnection.securityProtocol" (selectionChange)="onSecurityProtocolChange()">
                    <mat-option [value]="0">PLAINTEXT</mat-option>
                    <mat-option [value]="1">SSL</mat-option>
                    <mat-option [value]="2">SASL_PLAINTEXT</mat-option>
                    <mat-option [value]="3">SASL_SSL</mat-option>
                  </mat-select>
                  <mat-hint>Choose the security protocol for broker communication</mat-hint>
                </mat-form-field>
                
                <!-- SASL Settings -->
                @if (isSaslEnabled()) {
                  <mat-expansion-panel class="settings-panel" expanded>
                    <mat-expansion-panel-header>
                      <mat-panel-title><mat-icon>security</mat-icon> SASL Authentication</mat-panel-title>
                    </mat-expansion-panel-header>
                    
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>SASL Mechanism</mat-label>
                      <mat-select [(ngModel)]="currentConnection.saslMechanism">
                        <mat-option [value]="0">PLAIN</mat-option>
                        <mat-option [value]="1">SCRAM-SHA-256</mat-option>
                        <mat-option [value]="2">SCRAM-SHA-512</mat-option>
                        <mat-option [value]="3">GSSAPI (Kerberos)</mat-option>
                        <mat-option [value]="4">OAUTHBEARER</mat-option>
                      </mat-select>
                    </mat-form-field>
                    
                    @if (isBasicSaslAuth()) {
                      <div class="form-row">
                        <mat-form-field appearance="outline">
                          <mat-label>Username</mat-label>
                          <input matInput [(ngModel)]="currentConnection.saslUsername" />
                        </mat-form-field>
                        <mat-form-field appearance="outline">
                          <mat-label>Password</mat-label>
                          <input matInput type="password" [(ngModel)]="currentConnection.saslPassword" />
                        </mat-form-field>
                      </div>
                    }
                    
                    @if (currentConnection.saslMechanism === 4) {
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>OAuth Bearer Token Endpoint URL</mat-label>
                        <input matInput [(ngModel)]="currentConnection.saslOauthBearerTokenEndpointUrl" />
                      </mat-form-field>
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>OAuth Bearer Token</mat-label>
                        <textarea matInput [(ngModel)]="currentConnection.saslOauthBearerToken" rows="3"></textarea>
                      </mat-form-field>
                    }
                    
                    @if (currentConnection.saslMechanism === 3) {
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Kerberos Service Name</mat-label>
                        <input matInput [(ngModel)]="currentConnection.saslKerberosServiceName" placeholder="kafka" />
                      </mat-form-field>
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Kerberos Principal</mat-label>
                        <input matInput [(ngModel)]="currentConnection.saslKerberosPrincipal" />
                      </mat-form-field>
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Kerberos Keytab Path</mat-label>
                        <input matInput [(ngModel)]="currentConnection.saslKerberosKeytab" />
                      </mat-form-field>
                    }
                  </mat-expansion-panel>
                }
                
                <!-- SSL Settings -->
                @if (isSslEnabled()) {
                  <mat-expansion-panel class="settings-panel">
                    <mat-expansion-panel-header>
                      <mat-panel-title><mat-icon>lock</mat-icon> SSL/TLS Configuration</mat-panel-title>
                    </mat-expansion-panel-header>
                    
                    <p class="section-hint">Configure SSL certificates using file paths or paste PEM content directly</p>
                    
                    <h4>Certificate Authority</h4>
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>CA Certificate Path</mat-label>
                      <input matInput [(ngModel)]="currentConnection.sslCaLocation" placeholder="/path/to/ca.pem" />
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>CA Certificate (PEM)</mat-label>
                      <textarea matInput [(ngModel)]="currentConnection.sslCaPem" rows="4" placeholder="-----BEGIN CERTIFICATE-----"></textarea>
                    </mat-form-field>
                    
                    <mat-divider></mat-divider>
                    
                    <h4>Client Certificate</h4>
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Client Certificate Path</mat-label>
                      <input matInput [(ngModel)]="currentConnection.sslCertificateLocation" placeholder="/path/to/client.pem" />
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Client Certificate (PEM)</mat-label>
                      <textarea matInput [(ngModel)]="currentConnection.sslCertificatePem" rows="4" placeholder="-----BEGIN CERTIFICATE-----"></textarea>
                    </mat-form-field>
                    
                    <mat-divider></mat-divider>
                    
                    <h4>Client Private Key</h4>
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Private Key Path</mat-label>
                      <input matInput [(ngModel)]="currentConnection.sslKeyLocation" placeholder="/path/to/client.key" />
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Private Key (PEM)</mat-label>
                      <textarea matInput [(ngModel)]="currentConnection.sslKeyPem" rows="4" placeholder="-----BEGIN PRIVATE KEY-----"></textarea>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Private Key Password</mat-label>
                      <input matInput type="password" [(ngModel)]="currentConnection.sslKeyPassword" />
                    </mat-form-field>
                    
                    <mat-checkbox [(ngModel)]="currentConnection.sslEndpointIdentificationAlgorithm" color="primary">
                      Enable SSL Endpoint Identification (hostname verification)
                    </mat-checkbox>
                  </mat-expansion-panel>
                }
              </div>
            </mat-tab>
            
            <!-- Schema Registry Tab -->
            <mat-tab label="Schema Registry">
              <div class="tab-content">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Schema Registry URL</mat-label>
                  <input matInput [(ngModel)]="currentConnection.schemaRegistryUrl" placeholder="http://localhost:8081" />
                  <mat-hint>URL of the Confluent Schema Registry</mat-hint>
                </mat-form-field>
                
                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Schema Registry Username</mat-label>
                    <input matInput [(ngModel)]="currentConnection.schemaRegistryUsername" />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Schema Registry Password</mat-label>
                    <input matInput type="password" [(ngModel)]="currentConnection.schemaRegistryPassword" />
                  </mat-form-field>
                </div>
              </div>
            </mat-tab>
            
            <!-- Advanced Tab -->
            <mat-tab label="Advanced">
              <div class="tab-content">
                <mat-expansion-panel class="settings-panel" expanded>
                  <mat-expansion-panel-header>
                    <mat-panel-title><mat-icon>speed</mat-icon> Timeouts</mat-panel-title>
                  </mat-expansion-panel-header>
                  
                  <div class="form-grid">
                    <mat-form-field appearance="outline">
                      <mat-label>Message Timeout (ms)</mat-label>
                      <input matInput type="number" [(ngModel)]="currentConnection.messageTimeoutMs" placeholder="300000" />
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Request Timeout (ms)</mat-label>
                      <input matInput type="number" [(ngModel)]="currentConnection.requestTimeoutMs" placeholder="30000" />
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Session Timeout (ms)</mat-label>
                      <input matInput type="number" [(ngModel)]="currentConnection.sessionTimeoutMs" placeholder="45000" />
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Socket Timeout (ms)</mat-label>
                      <input matInput type="number" [(ngModel)]="currentConnection.socketTimeoutMs" placeholder="60000" />
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Connections Max Idle (ms)</mat-label>
                      <input matInput type="number" [(ngModel)]="currentConnection.connectionsMaxIdleMs" placeholder="540000" />
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Metadata Max Age (ms)</mat-label>
                      <input matInput type="number" [(ngModel)]="currentConnection.metadataMaxAgeMs" placeholder="300000" />
                    </mat-form-field>
                  </div>
                </mat-expansion-panel>
                
                <mat-expansion-panel class="settings-panel">
                  <mat-expansion-panel-header>
                    <mat-panel-title><mat-icon>tune</mat-icon> Producer Settings</mat-panel-title>
                  </mat-expansion-panel-header>
                  
                  <div class="form-row">
                    <mat-form-field appearance="outline">
                      <mat-label>Compression</mat-label>
                      <mat-select [(ngModel)]="currentConnection.compressionType">
                        <mat-option [value]="undefined">Default</mat-option>
                        <mat-option [value]="0">None</mat-option>
                        <mat-option [value]="1">GZIP</mat-option>
                        <mat-option [value]="2">Snappy</mat-option>
                        <mat-option [value]="3">LZ4</mat-option>
                        <mat-option [value]="4">ZSTD</mat-option>
                      </mat-select>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Acks</mat-label>
                      <mat-select [(ngModel)]="currentConnection.acks">
                        <mat-option [value]="undefined">Default</mat-option>
                        <mat-option [value]="0">None (0)</mat-option>
                        <mat-option [value]="1">Leader (1)</mat-option>
                        <mat-option [value]="2">All (-1)</mat-option>
                      </mat-select>
                    </mat-form-field>
                  </div>
                  
                  <div class="form-row">
                    <mat-form-field appearance="outline">
                      <mat-label>Max In-Flight Requests</mat-label>
                      <input matInput type="number" [(ngModel)]="currentConnection.maxInFlight" placeholder="5" />
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Client ID</mat-label>
                      <input matInput [(ngModel)]="currentConnection.clientId" placeholder="kafka-beast" />
                    </mat-form-field>
                  </div>
                  
                  <mat-checkbox [(ngModel)]="currentConnection.enableIdempotence" color="primary">
                    Enable Idempotence (exactly-once semantics)
                  </mat-checkbox>
                </mat-expansion-panel>
                
                <mat-expansion-panel class="settings-panel">
                  <mat-expansion-panel-header>
                    <mat-panel-title><mat-icon>code</mat-icon> Custom Configuration</mat-panel-title>
                  </mat-expansion-panel-header>
                  
                  <p class="section-hint">Add any additional librdkafka configuration properties</p>
                  
                  <div *ngFor="let config of configList; let i = index" class="config-row">
                    <mat-form-field appearance="outline">
                      <mat-label>Key</mat-label>
                      <input matInput [(ngModel)]="config.key" placeholder="property.name" />
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Value</mat-label>
                      <input matInput [(ngModel)]="config.value" />
                    </mat-form-field>
                    <button mat-icon-button color="warn" (click)="removeConfig(i)"><mat-icon>delete</mat-icon></button>
                  </div>
                  <button mat-stroked-button (click)="addConfig()"><mat-icon>add</mat-icon> Add Property</button>
                </mat-expansion-panel>
              </div>
            </mat-tab>
          </mat-tab-group>
          
          <div class="modal-footer">
            <button mat-stroked-button (click)="closeDialog()">Cancel</button>
            <button mat-raised-button color="primary" (click)="saveConnection()">
              <mat-icon>save</mat-icon>
              {{ isEditing ? 'Update' : 'Create' }} Connection
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .connections-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .page-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .page-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #1976d2;
    }
    
    .page-title {
      flex: 1;
    }
    
    .page-title h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 500;
      color: #333;
    }
    
    .page-title p {
      margin: 4px 0 0 0;
      color: #666;
      font-size: 14px;
    }
    
    .connections-card {
      margin-bottom: 24px;
    }
    
    .connections-table {
      width: 100%;
    }
    
    .connection-name-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .connection-name-cell mat-icon {
      color: #9e9e9e;
    }
    
    .connection-name-cell mat-icon.active {
      color: #4caf50;
    }
    
    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    
    .status-badge.active {
      background: #e8f5e9;
      color: #2e7d32;
    }
    
    .status-badge.inactive {
      background: #f5f5f5;
      color: #757575;
    }
    
    .empty-card {
      text-align: center;
      padding: 60px 24px;
    }
    
    .empty-card mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #bdbdbd;
      margin-bottom: 16px;
    }
    
    .empty-card h3 {
      margin: 0 0 8px 0;
      color: #424242;
    }
    
    .empty-card p {
      color: #757575;
      margin-bottom: 24px;
    }
    
    .result-card, .cluster-card {
      margin-bottom: 24px;
    }
    
    .result-card.success {
      border-left: 4px solid #4caf50;
    }
    
    .result-card.failure {
      border-left: 4px solid #f44336;
    }
    
    .result-card mat-card-header mat-icon[mat-card-avatar] {
      background: transparent;
    }
    
    .result-card.success mat-icon[mat-card-avatar] {
      color: #4caf50;
    }
    
    .result-card.failure mat-icon[mat-card-avatar] {
      color: #f44336;
    }
    
    .close-btn {
      position: absolute;
      right: 16px;
      top: 16px;
    }
    
    .cluster-stats {
      display: flex;
      gap: 32px;
      padding: 16px 0;
    }
    
    .cluster-stats .stat {
      display: flex;
      flex-direction: column;
    }
    
    .cluster-stats .label {
      font-size: 12px;
      color: #757575;
    }
    
    .cluster-stats .value {
      font-size: 24px;
      font-weight: 500;
      color: #1976d2;
    }
    
    .brokers-table {
      width: 100%;
      margin-top: 16px;
    }
    
    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    
    .modal-content {
      background: #fff;
      border-radius: 12px;
      max-width: 800px;
      width: 95%;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .modal-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
    }
    
    .config-tabs {
      flex: 1;
      overflow: hidden;
    }
    
    ::ng-deep .config-tabs .mat-mdc-tab-body-wrapper {
      flex: 1;
      overflow-y: auto;
      max-height: calc(90vh - 200px);
    }
    
    .tab-content {
      padding: 24px;
    }
    
    .full-width {
      width: 100%;
    }
    
    .form-row {
      display: flex;
      gap: 16px;
    }
    
    .form-row mat-form-field {
      flex: 1;
    }
    
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    
    .settings-panel {
      margin-bottom: 16px;
    }
    
    .settings-panel mat-panel-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .settings-panel mat-panel-title mat-icon {
      color: #1976d2;
    }
    
    .section-hint {
      color: #757575;
      font-size: 13px;
      margin-bottom: 16px;
    }
    
    .config-row {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    
    .config-row mat-form-field {
      flex: 1;
    }
    
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
      background: #fafafa;
    }
    
    h4 {
      margin: 16px 0 12px 0;
      font-size: 14px;
      font-weight: 500;
      color: #424242;
    }
    
    mat-checkbox {
      margin: 16px 0;
    }
  `]
})
export class ConnectionsComponent implements OnInit {
  connections: KafkaConnection[] = [];
  showDialog = false;
  isEditing = false;
  displayedColumns = ['name', 'servers', 'security', 'status', 'actions'];
  currentConnection: KafkaConnection = this.getEmptyConnection();
  configList: { key: string; value: string }[] = [];
  testResult: ConnectionTestResult | null = null;
  clusterInfo: ClusterInfo | null = null;
  testingConnection: string | null = null;
  errorMessage = '';
  successMessage = '';

  securityProtocols = [
    { value: SecurityProtocol.Plaintext, label: 'Plaintext' },
    { value: SecurityProtocol.Ssl, label: 'SSL' },
    { value: SecurityProtocol.SaslPlaintext, label: 'SASL Plaintext' },
    { value: SecurityProtocol.SaslSsl, label: 'SASL SSL' }
  ];

  saslMechanisms = [
    { value: SaslMechanism.Plain, label: 'PLAIN' },
    { value: SaslMechanism.ScramSha256, label: 'SCRAM-SHA-256' },
    { value: SaslMechanism.ScramSha512, label: 'SCRAM-SHA-512' },
    { value: SaslMechanism.Gssapi, label: 'GSSAPI (Kerberos)' },
    { value: SaslMechanism.OauthBearer, label: 'OAuthBearer' }
  ];

  compressionTypes = [
    { value: CompressionType.None, label: 'None' },
    { value: CompressionType.Gzip, label: 'Gzip' },
    { value: CompressionType.Snappy, label: 'Snappy' },
    { value: CompressionType.Lz4, label: 'LZ4' },
    { value: CompressionType.Zstd, label: 'Zstd' }
  ];

  acksOptions = [
    { value: Acks.None, label: 'None (0)' },
    { value: Acks.Leader, label: 'Leader (1)' },
    { value: Acks.All, label: 'All (-1)' }
  ];

  constructor(
    private apiService: KafkaApiService,
    private snackBar: MatSnackBar
  ) {}

  // Helper methods for security configuration
  isSaslEnabled(): boolean {
    return this.currentConnection.securityProtocol === SecurityProtocol.SaslPlaintext ||
           this.currentConnection.securityProtocol === SecurityProtocol.SaslSsl;
  }

  isSslEnabled(): boolean {
    return this.currentConnection.securityProtocol === SecurityProtocol.Ssl ||
           this.currentConnection.securityProtocol === SecurityProtocol.SaslSsl;
  }

  isBasicSaslAuth(): boolean {
    return this.currentConnection.saslMechanism === SaslMechanism.Plain ||
           this.currentConnection.saslMechanism === SaslMechanism.ScramSha256 ||
           this.currentConnection.saslMechanism === SaslMechanism.ScramSha512;
  }

  getSecurityProtocolLabel(protocol?: SecurityProtocol): string {
    const secProtocol = protocol ?? this.currentConnection.securityProtocol;
    const found = this.securityProtocols.find(p => p.value === secProtocol);
    return found?.label || 'Plaintext';
  }

  onSecurityProtocolChange(): void {
    // Clear SASL settings when switching away from SASL
    if (!this.isSaslEnabled()) {
      this.currentConnection.saslMechanism = undefined;
      this.currentConnection.saslUsername = undefined;
      this.currentConnection.saslPassword = undefined;
      this.currentConnection.saslOauthBearerToken = undefined;
      this.currentConnection.saslOauthBearerTokenEndpointUrl = undefined;
      this.currentConnection.saslKerberosServiceName = undefined;
      this.currentConnection.saslKerberosPrincipal = undefined;
      this.currentConnection.saslKerberosKeytab = undefined;
    }
    // Clear SSL settings when switching away from SSL
    if (!this.isSslEnabled()) {
      this.currentConnection.sslCaLocation = undefined;
      this.currentConnection.sslCertificateLocation = undefined;
      this.currentConnection.sslKeyLocation = undefined;
      this.currentConnection.sslKeyPassword = undefined;
      this.currentConnection.sslCaPem = undefined;
      this.currentConnection.sslCertificatePem = undefined;
      this.currentConnection.sslKeyPem = undefined;
    }
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
        this.snackBar.open('Failed to load connections: ' + error.message, 'Close', { duration: 5000 });
      }
    });
  }

  openAddDialog() {
    this.isEditing = false;
    this.currentConnection = this.getEmptyConnection();
    this.configList = [];
    this.showDialog = true;
    this.clearMessages();
  }

  editConnection(connection: KafkaConnection) {
    this.isEditing = true;
    this.currentConnection = { 
      ...connection,
      // Ensure enums are properly copied
      securityProtocol: connection.securityProtocol ?? SecurityProtocol.Plaintext,
      saslMechanism: connection.saslMechanism,
      compressionType: connection.compressionType,
      acks: connection.acks
    };
    this.configList = connection.additionalConfig
      ? Object.entries(connection.additionalConfig).map(([key, value]) => ({ key, value }))
      : [];
    this.showDialog = true;
    this.clearMessages();
  }

  closeDialog() {
    this.showDialog = false;
    this.clearMessages();
  }

  addConfig() {
    this.configList.push({ key: '', value: '' });
  }

  removeConfig(index: number) {
    this.configList.splice(index, 1);
  }

  saveConnection() {
    if (!this.currentConnection.name || !this.currentConnection.bootstrapServers) {
      this.errorMessage = 'Name and Bootstrap Servers are required';
      return;
    }

    // Build additional config
    if (this.configList.length > 0) {
      this.currentConnection.additionalConfig = {};
      for (const c of this.configList) {
        if (c.key) {
          this.currentConnection.additionalConfig[c.key] = c.value;
        }
      }
    } else {
      this.currentConnection.additionalConfig = undefined;
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
        this.errorMessage = 'Failed to get cluster info: ' + (error.error?.error || error.message);
        this.clearMessages();
      }
    });
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


