import { Component, Input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

export interface StatisticsData {
  totalMessages: number;
  partitionCount: number;
  replicationFactor: number;
  isHealthy: boolean;
  healthDescription: string;
  partitions: PartitionInfo[];
}

export interface PartitionInfo {
  partitionId: number;
  messageCount: number;
  lowWatermark: number;
  highWatermark: number;
  leader: number;
  replicas: number[];
  inSyncReplicas: number[];
}

@Component({
  selector: 'app-topic-statistics',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    DecimalPipe
  ],
  templateUrl: './topic-statistics.component.html',
  styleUrls: ['./topic-statistics.component.css']
})
export class TopicStatisticsComponent {
  @Input() totalMessages: number = 0;
  @Input() partitionCount: number = 0;
  @Input() replicationFactor: number = 0;
  @Input() isHealthy: boolean = true;
  @Input() healthDescription: string = '';
  @Input() partitions: PartitionInfo[] = [];

  get maxPartitionMessages(): number {
    if (!this.partitions || this.partitions.length === 0) return 0;
    return Math.max(...this.partitions.map(p => p.messageCount));
  }

  getPartitionPercentage(partition: PartitionInfo): number {
    if (this.maxPartitionMessages === 0) return 0;
    return (partition.messageCount / this.maxPartitionMessages) * 100;
  }

  getHealthClass(): string {
    return this.isHealthy ? 'healthy' : 'degraded';
  }

  getHealthIcon(): string {
    return this.isHealthy ? 'check_circle' : 'warning';
  }

  formatNumber(value: number): string {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
  }
}
