import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';

export interface ConfigCategory {
  icon: string;
  label: string;
  keys: string[];
}

export interface ConfigItem {
  key: string;
  value: string;
  description?: string;
}

@Component({
  selector: 'app-topic-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatExpansionModule,
    MatChipsModule,
    MatButtonModule
  ],
  templateUrl: './topic-settings.component.html',
  styleUrls: ['./topic-settings.component.css']
})
export class TopicSettingsComponent implements OnChanges {
  @Input() configurations: { [key: string]: string } | null = null;
  @Output() deleteRequested = new EventEmitter<void>();

  searchQuery = '';
  expandedCategories: Set<string> = new Set(['retention', 'performance']);

  configCategories: { [key: string]: ConfigCategory } = {
    retention: {
      icon: 'schedule',
      label: 'Retention',
      keys: ['retention.ms', 'retention.bytes', 'delete.retention.ms', 'segment.ms', 'segment.bytes', 'segment.index.bytes', 'min.compaction.lag.ms', 'max.compaction.lag.ms', 'message.timestamp.type', 'message.timestamp.difference.max.ms']
    },
    performance: {
      icon: 'speed',
      label: 'Performance',
      keys: ['compression.type', 'max.message.bytes', 'index.interval.bytes', 'flush.messages', 'flush.ms', 'file.delete.delay.ms', 'preallocate', 'segment.jitter.ms']
    },
    replication: {
      icon: 'content_copy',
      label: 'Replication',
      keys: ['min.insync.replicas', 'unclean.leader.election.enable', 'leader.replication.throttled.replicas', 'follower.replication.throttled.replicas']
    },
    cleanup: {
      icon: 'cleaning_services',
      label: 'Cleanup',
      keys: ['cleanup.policy', 'min.cleanable.dirty.ratio']
    }
  };

  configDescriptions: { [key: string]: string } = {
    'retention.ms': 'How long messages are retained before being deleted (-1 for infinite)',
    'retention.bytes': 'Maximum size of the log before deletion (-1 for infinite)',
    'delete.retention.ms': 'Time to retain delete tombstones for compacted topics',
    'segment.ms': 'Time after which the log will roll to a new segment',
    'segment.bytes': 'Maximum size of a segment before rolling',
    'compression.type': 'Compression type: producer, gzip, snappy, lz4, zstd, uncompressed',
    'max.message.bytes': 'Maximum size of a message that can be produced',
    'min.insync.replicas': 'Minimum number of replicas that must acknowledge writes',
    'cleanup.policy': 'delete, compact, or delete,compact',
    'preallocate': 'Pre-allocate file space for new segments',
    'flush.messages': 'Number of messages before flushing to disk',
    'flush.ms': 'Time interval before flushing to disk',
    'unclean.leader.election.enable': 'Allow replicas not in ISR to be elected as leader'
  };

  ngOnChanges(changes: SimpleChanges) {
    // Reset search when configurations change
    if (changes['configurations']) {
      this.searchQuery = '';
    }
  }

  getCategoryKeys(): string[] {
    return Object.keys(this.configCategories);
  }

  getConfigsForCategory(categoryKey: string): ConfigItem[] {
    if (!this.configurations) return [];
    
    const category = this.configCategories[categoryKey];
    if (!category) return [];
    
    return category.keys
      .filter(key => key in this.configurations!)
      .map(key => ({
        key,
        value: this.configurations![key],
        description: this.configDescriptions[key]
      }))
      .filter(c => !this.searchQuery || 
        c.key.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        c.value.toLowerCase().includes(this.searchQuery.toLowerCase()));
  }

  getUncategorizedConfigs(): ConfigItem[] {
    if (!this.configurations) return [];
    
    const categorizedKeys = new Set<string>();
    Object.values(this.configCategories).forEach(cat => 
      cat.keys.forEach(k => categorizedKeys.add(k))
    );
    
    return Object.entries(this.configurations)
      .filter(([key]) => !categorizedKeys.has(key))
      .map(([key, value]) => ({ 
        key, 
        value, 
        description: this.configDescriptions[key] 
      }))
      .filter(c => !this.searchQuery || 
        c.key.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        c.value.toLowerCase().includes(this.searchQuery.toLowerCase()));
  }

  isCategoryExpanded(category: string): boolean {
    return this.expandedCategories.has(category);
  }

  toggleCategory(category: string, expanded: boolean) {
    if (expanded) {
      this.expandedCategories.add(category);
    } else {
      this.expandedCategories.delete(category);
    }
  }

  formatConfigValue(key: string, value: string): string {
    if (key.endsWith('.ms')) {
      const ms = parseInt(value, 10);
      if (isNaN(ms)) return value;
      if (ms === -1) return 'Infinite';
      if (ms < 1000) return `${ms}ms`;
      if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
      if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
      if (ms < 86400000) return `${(ms / 3600000).toFixed(1)}h`;
      return `${(ms / 86400000).toFixed(1)}d`;
    }
    
    if (key.endsWith('.bytes')) {
      const bytes = parseInt(value, 10);
      if (isNaN(bytes)) return value;
      if (bytes === -1) return 'Infinite';
      if (bytes < 1024) return `${bytes}B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
      if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
    }
    
    return value;
  }

  getConfigChipColor(key: string, value: string): string {
    if (key === 'min.insync.replicas' && parseInt(value, 10) < 2) {
      return 'warn';
    }
    if (key === 'unclean.leader.election.enable' && value === 'true') {
      return 'warn';
    }
    if (key === 'compression.type' && value !== 'producer') {
      return 'accent';
    }
    return '';
  }

  clearSearch() {
    this.searchQuery = '';
  }

  confirmDelete() {
    this.deleteRequested.emit();
  }
}
