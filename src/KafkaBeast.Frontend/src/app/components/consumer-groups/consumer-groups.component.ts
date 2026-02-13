import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { KafkaApiService } from '../../services/kafka-api.service';
import { 
  KafkaConnection, 
  ConsumerGroupInfo, 
  ConsumerGroupDetails, 
  ConsumerGroupLag,
  ResetOffsetsRequest,
  OffsetResetType
} from '../../models/kafka.models';

@Component({
  selector: 'app-consumer-groups',
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
    MatMenuModule,
    MatDialogModule,
    MatDividerModule,
    MatExpansionModule,
    MatProgressBarModule,
    MatTabsModule
  ],
  templateUrl: './consumer-groups.component.html',
  styleUrls: ['./consumer-groups.component.css']
})
export class ConsumerGroupsComponent implements OnInit {
  connections: KafkaConnection[] = [];
  activeConnections: KafkaConnection[] = [];
  selectedConnectionId = '';
  consumerGroups: ConsumerGroupInfo[] = [];
  selectedGroup: ConsumerGroupInfo | null = null;
  groupDetails: ConsumerGroupDetails | null = null;
  groupLag: ConsumerGroupLag[] | null = null;
  groupToDelete: ConsumerGroupInfo | null = null;
  searchQuery = '';

  showResetModal = false;
  resetRequest: ResetOffsetsRequest = {
    groupId: '',
    resetType: OffsetResetType.Earliest,
    topicPartitions: []
  };
  resetTopic = '';
  resetPartitions = '*';
  resetTargetOffset = 0;
  resetTimestamp = '';

  isLoading = false;
  isLoadingDetails = false;
  isLoadingLag = false;
  isDeleting = false;
  isResetting = false;

  constructor(
    private apiService: KafkaApiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadConnections();
  }

  get filteredGroups(): ConsumerGroupInfo[] {
    if (!this.searchQuery) return this.consumerGroups;
    const query = this.searchQuery.toLowerCase();
    return this.consumerGroups.filter(g => 
      g.groupId.toLowerCase().includes(query)
    );
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
        this.showError('Failed to load connections: ' + error.message);
      }
    });
  }

  onConnectionChange() {
    this.groupDetails = null;
    this.groupLag = null;
    this.selectedGroup = null;
    if (this.selectedConnectionId) {
      this.loadConsumerGroups();
    } else {
      this.consumerGroups = [];
    }
  }

  loadConsumerGroups() {
    if (!this.selectedConnectionId) return;

    this.isLoading = true;
    this.apiService.getConsumerGroups(this.selectedConnectionId).subscribe({
      next: (groups) => {
        this.consumerGroups = groups.sort((a, b) => a.groupId.localeCompare(b.groupId));
        this.isLoading = false;
      },
      error: (error) => {
        this.showError('Failed to load consumer groups: ' + error.message);
        this.isLoading = false;
      }
    });
  }

  selectGroup(group: ConsumerGroupInfo) {
    this.selectedGroup = group;
    this.loadGroupDetails(group);
    this.loadGroupLag(group);
  }

  loadGroupDetails(group: ConsumerGroupInfo) {
    this.isLoadingDetails = true;
    this.apiService.getConsumerGroupDetails(this.selectedConnectionId, group.groupId).subscribe({
      next: (details) => {
        this.groupDetails = details;
        this.isLoadingDetails = false;
      },
      error: (error) => {
        this.showError('Failed to load group details: ' + error.message);
        this.isLoadingDetails = false;
      }
    });
  }

  loadGroupLag(group: ConsumerGroupInfo) {
    this.isLoadingLag = true;
    this.apiService.getConsumerGroupLag(this.selectedConnectionId, group.groupId).subscribe({
      next: (lag) => {
        this.groupLag = lag.sort((a, b) => {
          const topicCompare = a.topic.localeCompare(b.topic);
          return topicCompare !== 0 ? topicCompare : a.partition - b.partition;
        });
        this.isLoadingLag = false;
      },
      error: () => {
        this.groupLag = [];
        this.isLoadingLag = false;
      }
    });
  }

  getTotalLag(): number {
    return this.groupLag?.reduce((sum, l) => sum + l.lag, 0) || 0;
  }

  getLagSeverity(): string {
    const total = this.getTotalLag();
    if (total > 10000) return 'lag-critical';
    if (total > 1000) return 'lag-warning';
    return 'lag-normal';
  }

  getUniqueTopics(): string[] {
    if (!this.groupLag) return [];
    return [...new Set(this.groupLag.map(l => l.topic))];
  }

  getTopicLag(topic: string): number {
    return this.groupLag?.filter(l => l.topic === topic).reduce((sum, l) => sum + l.lag, 0) || 0;
  }

  getTopicLagSeverity(topic: string): string {
    const lag = this.getTopicLag(topic);
    if (lag > 5000) return 'lag-critical';
    if (lag > 500) return 'lag-warning';
    return 'lag-normal';
  }

  getTopicPartitions(topic: string): ConsumerGroupLag[] {
    return this.groupLag?.filter(l => l.topic === topic) || [];
  }

  getPartitionLagSeverity(lag: number): string {
    if (lag > 1000) return 'lag-critical';
    if (lag > 100) return 'lag-warning';
    return 'lag-normal';
  }

  getProgressValue(p: ConsumerGroupLag): number {
    if (p.endOffset === 0) return 100;
    return Math.min(100, (p.currentOffset / p.endOffset) * 100);
  }

  showResetOffsetsModal(group: ConsumerGroupInfo) {
    this.resetRequest = {
      groupId: group.groupId,
      resetType: OffsetResetType.Earliest,
      topicPartitions: []
    };
    this.resetTopic = '';
    this.resetPartitions = '*';
    this.resetTargetOffset = 0;
    this.resetTimestamp = '';
    this.showResetModal = true;
  }

  resetOffsets() {
    if (!this.resetTopic) return;

    this.isResetting = true;

    const partitions = this.resetPartitions === '*' 
      ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
      : this.resetPartitions.split(',').map(p => parseInt(p.trim(), 10)).filter(n => !isNaN(n));

    this.resetRequest.topicPartitions = partitions.map(p => ({
      topic: this.resetTopic,
      partition: p,
      targetOffset: this.resetRequest.resetType === OffsetResetType.Specific ? this.resetTargetOffset : undefined
    }));

    if (this.resetRequest.resetType === OffsetResetType.Timestamp && this.resetTimestamp) {
      this.resetRequest.timestamp = new Date(this.resetTimestamp).toISOString();
    }

    this.apiService.resetConsumerGroupOffsets(
      this.selectedConnectionId, 
      this.resetRequest.groupId, 
      this.resetRequest
    ).subscribe({
      next: () => {
        this.showSuccess('Offsets reset successfully');
        this.showResetModal = false;
        this.isResetting = false;
        if (this.selectedGroup) {
          this.loadGroupLag(this.selectedGroup);
        }
      },
      error: (error) => {
        this.showError('Failed to reset offsets: ' + (error.error?.error || error.message));
        this.isResetting = false;
      }
    });
  }

  confirmDeleteGroup(group: ConsumerGroupInfo) {
    this.groupToDelete = group;
  }

  deleteGroup() {
    if (!this.groupToDelete) return;

    this.isDeleting = true;
    const groupId = this.groupToDelete.groupId;
    
    this.apiService.deleteConsumerGroup(this.selectedConnectionId, groupId).subscribe({
      next: () => {
        this.showSuccess(`Consumer group ${groupId} deleted`);
        this.groupToDelete = null;
        this.isDeleting = false;
        
        if (this.selectedGroup?.groupId === groupId) {
          this.selectedGroup = null;
          this.groupDetails = null;
          this.groupLag = null;
        }
        
        this.loadConsumerGroups();
      },
      error: (error) => {
        this.showError('Failed to delete consumer group: ' + (error.error?.error || error.message));
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
