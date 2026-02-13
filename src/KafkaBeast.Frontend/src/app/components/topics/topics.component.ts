import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatDialogModule } from '@angular/material/dialog';
import { KafkaApiService } from '../../services/kafka-api.service';
import { 
  KafkaConnection, 
  KafkaTopic, 
  TopicWatermarks,
  CreateTopicRequest
} from '../../models/kafka.models';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

interface TopicTableRow {
  name: string;
  partitionCount: number;
  replicationFactor: number;
  messageCount: number;
  isInternal: boolean;
}

@Component({
  selector: 'app-topics',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatSortModule,
    MatDialogModule
  ],
  template: `
    <div class="topics-container">
      <!-- Header -->
      <div class="page-header fade-in">
        <div class="header-content">
          <h1 class="page-title">Topics</h1>
          <p class="page-subtitle">Browse and manage Kafka topics</p>
        </div>
        <div class="header-actions" *ngIf="selectedConnectionId">
          <button mat-stroked-button (click)="loadTopics()" [disabled]="isLoading">
            <mat-icon>refresh</mat-icon>
            Refresh
          </button>
          <button mat-raised-button color="primary" (click)="showCreateModal = true">
            <mat-icon>add</mat-icon>
            Create Topic
          </button>
        </div>
      </div>

      <!-- Connection Selection -->
      <mat-card class="connection-card fade-in">
        <mat-card-content>
          <div class="connection-row">
            <mat-form-field appearance="fill" subscriptSizing="dynamic" class="dense-field connection-field">
              <mat-label>Connection</mat-label>
              <mat-select [(ngModel)]="selectedConnectionId" (selectionChange)="onConnectionChange()">
                <mat-option *ngFor="let conn of activeConnections" [value]="conn.id">
                  <div class="connection-option">
                    <span class="conn-name">{{ conn.name }}</span>
                    <span class="conn-server">{{ conn.bootstrapServers }}</span>
                  </div>
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="fill" subscriptSizing="dynamic" class="dense-field search-field" *ngIf="selectedConnectionId">
              <mat-label>Search topics</mat-label>
              <mat-icon matPrefix>search</mat-icon>
              <input matInput [(ngModel)]="searchFilter" (ngModelChange)="applyFilter()" placeholder="Filter...">
              <button mat-icon-button matSuffix *ngIf="searchFilter" (click)="searchFilter = ''; applyFilter()">
                <mat-icon>close</mat-icon>
              </button>
            </mat-form-field>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-container">
        <mat-spinner diameter="48"></mat-spinner>
        <p>Loading topics...</p>
      </div>

      <!-- No Connection State -->
      <mat-card *ngIf="!selectedConnectionId && !isLoading" class="empty-state-card fade-in">
        <div class="empty-state">
          <mat-icon>link_off</mat-icon>
          <h3>No Connection Selected</h3>
          <p>Select an active connection to view topics</p>
        </div>
      </mat-card>

      <!-- Topics Table -->
      <mat-card *ngIf="selectedConnectionId && !isLoading" class="topics-table-card fade-in">
        <div class="table-container">
          <table mat-table [dataSource]="dataSource" matSort class="topics-table">
            <!-- Name Column -->
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Topic Name</th>
              <td mat-cell *matCellDef="let topic">
                <div class="topic-name-cell">
                  <mat-icon *ngIf="topic.isInternal" class="internal-icon" matTooltip="Internal topic">settings</mat-icon>
                  <span class="topic-name">{{ topic.name }}</span>
                </div>
              </td>
            </ng-container>

            <!-- Partitions Column -->
            <ng-container matColumnDef="partitionCount">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Partitions</th>
              <td mat-cell *matCellDef="let topic">
                <mat-chip class="partition-chip">{{ topic.partitionCount }}</mat-chip>
              </td>
            </ng-container>

            <!-- Replication Factor Column -->
            <ng-container matColumnDef="replicationFactor">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Replication</th>
              <td mat-cell *matCellDef="let topic">
                <span class="replication-badge">{{ topic.replicationFactor }}x</span>
              </td>
            </ng-container>

            <!-- Messages Column -->
            <ng-container matColumnDef="messageCount">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Messages</th>
              <td mat-cell *matCellDef="let topic">
                <span *ngIf="topic.messageCount >= 0" class="message-count">{{ topic.messageCount | number }}</span>
                <span *ngIf="topic.messageCount < 0" class="message-count na">N/A</span>
              </td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let topic">
                <button mat-icon-button color="warn" 
                        (click)="confirmDelete(topic, $event)" 
                        matTooltip="Delete topic"
                        [disabled]="topic.isInternal">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" 
                (click)="openTopic(row)"
                class="clickable-row"></tr>
          </table>
        </div>

        <mat-paginator [pageSizeOptions]="[10, 25, 50, 100]"
                       showFirstLastButtons
                       aria-label="Select page of topics">
        </mat-paginator>

        <!-- Empty Table State -->
        <div *ngIf="dataSource.data.length === 0" class="empty-table-state">
          <mat-icon>inbox</mat-icon>
          <h3>No Topics Found</h3>
          <p>{{ searchFilter ? 'No topics match your search' : 'This cluster has no topics' }}</p>
        </div>
      </mat-card>

      <!-- Create Topic Modal -->
      <div *ngIf="showCreateModal" class="modal-overlay" (click)="showCreateModal = false">
        <mat-card class="create-modal" (click)="$event.stopPropagation()">
          <mat-card-header>
            <mat-icon mat-card-avatar>add_circle</mat-icon>
            <mat-card-title>Create New Topic</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-form-field appearance="fill" subscriptSizing="dynamic" class="dense-field full-width">
              <mat-label>Topic Name</mat-label>
              <input matInput [(ngModel)]="newTopic.topicName" placeholder="my-topic">
            </mat-form-field>
            
            <div class="form-row">
              <mat-form-field appearance="fill" subscriptSizing="dynamic" class="dense-field">
                <mat-label>Partitions</mat-label>
                <input matInput type="number" [(ngModel)]="newTopic.numPartitions" min="1">
              </mat-form-field>
              
              <mat-form-field appearance="fill" subscriptSizing="dynamic" class="dense-field">
                <mat-label>Replication Factor</mat-label>
                <input matInput type="number" [(ngModel)]="newTopic.replicationFactor" min="1">
              </mat-form-field>
            </div>
          </mat-card-content>
          <mat-card-actions align="end">
            <button mat-button (click)="showCreateModal = false">Cancel</button>
            <button mat-raised-button color="primary" 
                    (click)="createTopic()" 
                    [disabled]="!newTopic.topicName || isCreating">
              {{ isCreating ? 'Creating...' : 'Create' }}
            </button>
          </mat-card-actions>
        </mat-card>
      </div>

      <!-- Delete Confirmation Modal -->
      <div *ngIf="showDeleteModal" class="modal-overlay" (click)="showDeleteModal = false">
        <mat-card class="delete-modal" (click)="$event.stopPropagation()">
          <mat-card-header>
            <mat-icon mat-card-avatar color="warn">warning</mat-icon>
            <mat-card-title>Delete Topic</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>Are you sure you want to delete <strong>{{ topicToDelete?.name }}</strong>?</p>
            <p class="warning-text">This action cannot be undone. All messages will be lost.</p>
          </mat-card-content>
          <mat-card-actions align="end">
            <button mat-button (click)="showDeleteModal = false">Cancel</button>
            <button mat-raised-button color="warn" (click)="deleteTopic()" [disabled]="isDeleting">
              {{ isDeleting ? 'Deleting...' : 'Delete' }}
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .topics-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .header-content {
      display: flex;
      flex-direction: column;
    }

    .page-title {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }

    .page-subtitle {
      margin: 4px 0 0;
      color: var(--text-secondary);
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    /* Connection Card */
    .connection-card {
      margin-bottom: 24px;
    }

    .connection-row {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    /* Dense Form Fields */
    .dense-field {
      --mat-form-field-container-height: 44px;
      --mat-form-field-container-vertical-padding: 10px;
    }

    .dense-field ::ng-deep .mat-mdc-form-field-infix {
      min-height: 44px;
      padding-top: 10px !important;
      padding-bottom: 10px !important;
    }

    .dense-field ::ng-deep .mdc-text-field--filled {
      border-radius: 8px;
    }

    .connection-field {
      min-width: 280px;
      flex: 1;
    }

    .search-field {
      min-width: 220px;
      flex: 1;
      max-width: 320px;
    }

    .connection-option {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
      line-height: 1.3;
    }

    .conn-name {
      font-weight: 500;
    }

    .conn-server {
      font-size: 11px;
      color: var(--text-secondary);
    }

    /* Loading */
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      gap: 16px;
      color: var(--text-secondary);
    }

    /* Empty States */
    .empty-state-card, .empty-table-state {
      text-align: center;
      padding: 60px 20px;
    }

    .empty-state, .empty-table-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: var(--text-secondary);
    }

    .empty-state mat-icon, .empty-table-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      opacity: 0.5;
      margin-bottom: 16px;
    }

    .empty-state h3, .empty-table-state h3 {
      margin: 0 0 8px;
      font-size: 18px;
    }

    .empty-state p, .empty-table-state p {
      margin: 0;
      font-size: 14px;
    }

    /* Table */
    .topics-table-card {
      overflow: hidden;
    }

    .table-container {
      overflow-x: auto;
    }

    .topics-table {
      width: 100%;
    }

    .clickable-row {
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .clickable-row:hover {
      background-color: rgba(99, 102, 241, 0.08);
    }

    .topic-name-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .internal-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--text-secondary);
    }

    .topic-name {
      font-weight: 500;
      font-family: monospace;
    }

    .partition-chip {
      font-size: 12px !important;
      background: rgba(99, 102, 241, 0.1) !important;
      color: var(--primary-color) !important;
    }

    .replication-badge {
      display: inline-block;
      padding: 4px 10px;
      background: var(--bg-tertiary);
      border-radius: var(--border-radius-sm);
      font-size: 13px;
      font-weight: 500;
    }

    .message-count {
      font-family: monospace;
      font-weight: 500;
    }

    .message-count.na {
      color: var(--text-secondary);
    }

    /* Modals */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 24px;
    }

    .create-modal, .delete-modal {
      width: 100%;
      max-width: 500px;
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

    .warning-text {
      color: var(--warn-color);
      font-weight: 500;
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .header-actions {
        width: 100%;
      }

      .connection-row {
        flex-direction: column;
      }

      .form-row {
        flex-direction: column;
      }
    }
  `]
})
export class TopicsComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  connections: KafkaConnection[] = [];
  activeConnections: KafkaConnection[] = [];
  selectedConnectionId = '';
  
  dataSource = new MatTableDataSource<TopicTableRow>([]);
  displayedColumns = ['name', 'partitionCount', 'replicationFactor', 'messageCount', 'actions'];
  searchFilter = '';
  
  isLoading = false;
  
  // Create Modal
  showCreateModal = false;
  isCreating = false;
  newTopic: CreateTopicRequest = {
    topicName: '',
    numPartitions: 3,
    replicationFactor: 1
  };
  
  // Delete Modal
  showDeleteModal = false;
  isDeleting = false;
  topicToDelete: TopicTableRow | null = null;

  constructor(
    private router: Router,
    private apiService: KafkaApiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadConnections();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
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
      error: (err) => this.showError('Failed to load connections: ' + err.message)
    });
  }

  onConnectionChange() {
    this.loadTopics();
  }

  loadTopics() {
    if (!this.selectedConnectionId) return;
    
    this.isLoading = true;
    this.dataSource.data = [];
    
    this.apiService.getTopics(this.selectedConnectionId).subscribe({
      next: (topics) => {
        // First, build basic topic list
        const tableRows: TopicTableRow[] = topics.map(t => ({
          name: t.name,
          partitionCount: t.partitionCount,
          replicationFactor: t.replicationFactor,
          messageCount: -1, // Will be filled by watermarks
          isInternal: t.name.startsWith('_') || t.name.startsWith('__')
        }));
        
        this.dataSource.data = tableRows;
        this.isLoading = false;
        
        // Then load watermarks for each topic (in background)
        this.loadWatermarksForTopics(tableRows);
      },
      error: (err) => {
        this.showError('Failed to load topics: ' + err.message);
        this.isLoading = false;
      }
    });
  }

  loadWatermarksForTopics(topics: TopicTableRow[]) {
    // Load watermarks in batches to avoid overwhelming the API
    const batchSize = 10;
    const batches: TopicTableRow[][] = [];
    
    for (let i = 0; i < topics.length; i += batchSize) {
      batches.push(topics.slice(i, i + batchSize));
    }

    batches.forEach((batch, batchIndex) => {
      setTimeout(() => {
        const requests = batch.map(topic =>
          this.apiService.getTopicWatermarks(this.selectedConnectionId, topic.name).pipe(
            map((watermarks: TopicWatermarks) => ({ name: topic.name, messageCount: watermarks.totalMessages })),
            catchError(() => of({ name: topic.name, messageCount: -1 }))
          )
        );

        forkJoin(requests).subscribe({
          next: (results) => {
            const updatedData = [...this.dataSource.data];
            results.forEach((result: { name: string; messageCount: number }) => {
              const topic = updatedData.find(t => t.name === result.name);
              if (topic) {
                topic.messageCount = result.messageCount;
              }
            });
            this.dataSource.data = updatedData;
          }
        });
      }, batchIndex * 100); // Stagger batches
    });
  }

  applyFilter() {
    this.dataSource.filter = this.searchFilter.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  openTopic(topic: TopicTableRow) {
    this.router.navigate(['/topics', topic.name]);
  }

  // Create Topic
  createTopic() {
    if (!this.newTopic.topicName) return;
    
    this.isCreating = true;
    this.apiService.createTopic(this.selectedConnectionId, this.newTopic).subscribe({
      next: () => {
        this.showSuccess(`Topic "${this.newTopic.topicName}" created successfully`);
        this.showCreateModal = false;
        this.newTopic = {
          topicName: '',
          numPartitions: 3,
          replicationFactor: 1
        };
        this.loadTopics();
      },
      error: (err) => {
        this.showError('Failed to create topic: ' + (err.error?.error || err.message));
      },
      complete: () => {
        this.isCreating = false;
      }
    });
  }

  // Delete Topic
  confirmDelete(topic: TopicTableRow, event: Event) {
    event.stopPropagation();
    this.topicToDelete = topic;
    this.showDeleteModal = true;
  }

  deleteTopic() {
    if (!this.topicToDelete) return;
    
    this.isDeleting = true;
    this.apiService.deleteTopic(this.selectedConnectionId, this.topicToDelete.name).subscribe({
      next: () => {
        this.showSuccess(`Topic "${this.topicToDelete?.name}" deleted`);
        this.showDeleteModal = false;
        this.topicToDelete = null;
        this.loadTopics();
      },
      error: (err) => {
        this.showError('Failed to delete topic: ' + (err.error?.error || err.message));
      },
      complete: () => {
        this.isDeleting = false;
      }
    });
  }

  private showSuccess(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  private showError(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }
}
