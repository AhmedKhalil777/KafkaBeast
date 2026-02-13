import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { KafkaApiService } from '../../services/kafka-api.service';
import { KafkaConnection, KafkaTopic, ConsumerGroupInfo } from '../../models/kafka.models';
import { forkJoin } from 'rxjs';

interface QuickAction {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

interface ConnectionStats {
  connection: KafkaConnection;
  topicCount: number;
  consumerGroupCount: number;
  isLoading: boolean;
  error?: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule
  ],
  template: `
    <div class="home-container">
      <!-- Hero Section -->
      <div class="hero-section fade-in">
        <div class="hero-content">
          <div class="hero-icon">
            <mat-icon>bolt</mat-icon>
          </div>
          <h1 class="hero-title">Welcome to Kafka Beast</h1>
          <p class="hero-subtitle">Your powerful dashboard for managing Apache Kafka clusters with ease</p>
        </div>
        <div class="hero-decoration"></div>
      </div>

      <!-- Stats Overview -->
      <div class="stats-section fade-in" style="animation-delay: 0.1s">
        <div class="stats-grid">
          <div class="stat-card primary">
            <div class="stat-icon">
              <mat-icon>cable</mat-icon>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ totalConnections }}</span>
              <span class="stat-label">Connections</span>
            </div>
            <div class="stat-badge" *ngIf="activeConnections > 0">
              {{ activeConnections }} active
            </div>
          </div>
          
          <div class="stat-card accent">
            <div class="stat-icon">
              <mat-icon>topic</mat-icon>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ totalTopics }}</span>
              <span class="stat-label">Topics</span>
            </div>
          </div>
          
          <div class="stat-card success">
            <div class="stat-icon">
              <mat-icon>groups</mat-icon>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ totalConsumerGroups }}</span>
              <span class="stat-label">Consumer Groups</span>
            </div>
          </div>
          
          <div class="stat-card info">
            <div class="stat-icon">
              <mat-icon>dns</mat-icon>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ totalBrokers }}</span>
              <span class="stat-label">Brokers</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="section fade-in" style="animation-delay: 0.2s">
        <h2 class="section-title">
          <mat-icon>flash_on</mat-icon>
          Quick Actions
        </h2>
        <div class="actions-grid">
          <div *ngFor="let action of quickActions" 
               class="action-card"
               [style.--accent-color]="action.color"
               (click)="navigate(action.route)">
            <div class="action-icon" [style.background]="action.color + '15'" [style.color]="action.color">
              <mat-icon>{{ action.icon }}</mat-icon>
            </div>
            <div class="action-content">
              <h3>{{ action.title }}</h3>
              <p>{{ action.description }}</p>
            </div>
            <mat-icon class="action-arrow">arrow_forward</mat-icon>
          </div>
        </div>
      </div>

      <!-- Connections Overview -->
      <div class="section fade-in" style="animation-delay: 0.3s">
        <div class="section-header">
          <h2 class="section-title">
            <mat-icon>storage</mat-icon>
            Connections Overview
          </h2>
          <button mat-stroked-button color="primary" routerLink="/connections">
            <mat-icon>settings</mat-icon>
            Manage Connections
          </button>
        </div>
        
        <div *ngIf="isLoading" class="loading-state">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading connection data...</p>
        </div>

        <div *ngIf="!isLoading && connectionStats.length === 0" class="empty-state">
          <mat-icon>cloud_off</mat-icon>
          <h3>No Connections Configured</h3>
          <p>Set up your first Kafka connection to get started</p>
          <button mat-raised-button color="primary" routerLink="/connections">
            <mat-icon>add</mat-icon>
            Add Connection
          </button>
        </div>

        <div *ngIf="!isLoading && connectionStats.length > 0" class="connections-grid">
          <div *ngFor="let stats of connectionStats" class="connection-card" (click)="goToTopics(stats.connection.id)">
            <div class="connection-header">
              <div class="connection-status" [class.active]="stats.connection.isActive" [class.inactive]="!stats.connection.isActive">
                <div class="status-dot"></div>
                <span>{{ stats.connection.isActive ? 'Active' : 'Inactive' }}</span>
              </div>
              <mat-icon class="connection-menu" matTooltip="Click to view topics">open_in_new</mat-icon>
            </div>
            <h3 class="connection-name">{{ stats.connection.name }}</h3>
            <p class="connection-servers">{{ stats.connection.bootstrapServers }}</p>
            
            <mat-divider></mat-divider>
            
            <div class="connection-metrics" *ngIf="!stats.isLoading && !stats.error">
              <div class="metric">
                <mat-icon>topic</mat-icon>
                <span class="metric-value">{{ stats.topicCount }}</span>
                <span class="metric-label">Topics</span>
              </div>
              <div class="metric">
                <mat-icon>groups</mat-icon>
                <span class="metric-value">{{ stats.consumerGroupCount }}</span>
                <span class="metric-label">Groups</span>
              </div>
            </div>
            
            <div class="connection-loading" *ngIf="stats.isLoading">
              <mat-spinner diameter="24"></mat-spinner>
              <span>Loading stats...</span>
            </div>
            
            <div class="connection-error" *ngIf="stats.error">
              <mat-icon>warning</mat-icon>
              <span>Unable to fetch stats</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Features Section -->
      <div class="section fade-in" style="animation-delay: 0.4s">
        <h2 class="section-title">
          <mat-icon>auto_awesome</mat-icon>
          What You Can Do
        </h2>
        <div class="features-grid">
          <div class="feature-card">
            <mat-icon>send</mat-icon>
            <h4>Produce Messages</h4>
            <p>Send messages to topics with custom keys, headers, and serialization options</p>
          </div>
          <div class="feature-card">
            <mat-icon>download</mat-icon>
            <h4>Consume Messages</h4>
            <p>Read messages from topics with real-time streaming and advanced filtering</p>
          </div>
          <div class="feature-card">
            <mat-icon>analytics</mat-icon>
            <h4>Monitor Groups</h4>
            <p>Track consumer group lag, offsets, and reset positions when needed</p>
          </div>
          <div class="feature-card">
            <mat-icon>build</mat-icon>
            <h4>Utility Tools</h4>
            <p>Base64 encoding, XML conversion, and other handy utilities</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
    }

    /* Hero Section */
    .hero-section {
      background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
      border-radius: var(--border-radius-lg);
      padding: 48px;
      margin-bottom: 32px;
      position: relative;
      overflow: hidden;
      color: white;
    }

    .hero-content {
      position: relative;
      z-index: 1;
    }

    .hero-icon {
      width: 64px;
      height: 64px;
      background: rgba(255,255,255,0.2);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }

    .hero-icon mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: white;
    }

    .hero-title {
      font-size: 36px;
      font-weight: 700;
      margin: 0 0 12px 0;
      letter-spacing: -0.02em;
    }

    .hero-subtitle {
      font-size: 18px;
      margin: 0;
      opacity: 0.9;
      max-width: 500px;
    }

    .hero-decoration {
      position: absolute;
      top: -50%;
      right: -10%;
      width: 400px;
      height: 400px;
      background: rgba(255,255,255,0.1);
      border-radius: 50%;
    }

    /* Stats Section */
    .stats-section {
      margin-bottom: 32px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
    }

    .stat-card {
      background: var(--bg-primary);
      border-radius: var(--border-radius);
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-sm);
      position: relative;
      transition: all var(--transition-fast);
    }

    .stat-card:hover {
      box-shadow: var(--shadow-md);
      transform: translateY(-2px);
    }

    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-icon mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .stat-card.primary .stat-icon {
      background: rgba(99, 102, 241, 0.12);
      color: var(--primary-color);
    }

    .stat-card.accent .stat-icon {
      background: rgba(236, 72, 153, 0.12);
      color: var(--accent-color);
    }

    .stat-card.success .stat-icon {
      background: rgba(16, 185, 129, 0.12);
      color: var(--success-color);
    }

    .stat-card.info .stat-icon {
      background: rgba(59, 130, 246, 0.12);
      color: var(--info-color);
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.2;
    }

    .stat-label {
      font-size: 14px;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .stat-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      background: rgba(16, 185, 129, 0.12);
      color: var(--success-color);
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    /* Section Styling */
    .section {
      margin-bottom: 32px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 20px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 20px 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .section-header .section-title {
      margin-bottom: 0;
    }

    .section-title mat-icon {
      color: var(--primary-color);
    }

    /* Quick Actions */
    .actions-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
    }

    .action-card {
      background: var(--bg-primary);
      border-radius: var(--border-radius);
      padding: 20px;
      cursor: pointer;
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-sm);
      transition: all var(--transition-fast);
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .action-card:hover {
      border-color: var(--accent-color);
      box-shadow: var(--shadow-md);
      transform: translateY(-2px);
    }

    .action-card:hover .action-arrow {
      transform: translateX(4px);
      color: var(--accent-color);
    }

    .action-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .action-icon mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .action-content {
      flex: 1;
      min-width: 0;
    }

    .action-content h3 {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 4px 0;
    }

    .action-content p {
      font-size: 13px;
      color: var(--text-secondary);
      margin: 0;
      line-height: 1.4;
    }

    .action-arrow {
      color: var(--text-muted);
      transition: all var(--transition-fast);
      flex-shrink: 0;
    }

    /* Connections Grid */
    .connections-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }

    .connection-card {
      background: var(--bg-primary);
      border-radius: var(--border-radius);
      padding: 20px;
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-sm);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .connection-card:hover {
      box-shadow: var(--shadow-md);
      border-color: var(--primary-light);
    }

    .connection-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 500;
    }

    .connection-status.active {
      color: var(--success-color);
    }

    .connection-status.inactive {
      color: var(--text-muted);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }

    .connection-menu {
      color: var(--text-muted);
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .connection-name {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 4px 0;
    }

    .connection-servers {
      font-size: 13px;
      color: var(--text-secondary);
      margin: 0 0 16px 0;
      font-family: monospace;
    }

    .connection-metrics {
      display: flex;
      gap: 24px;
      margin-top: 16px;
    }

    .metric {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .metric mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--text-muted);
    }

    .metric-value {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .metric-label {
      font-size: 13px;
      color: var(--text-secondary);
    }

    .connection-loading, .connection-error {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 16px;
      font-size: 13px;
      color: var(--text-secondary);
    }

    .connection-error {
      color: var(--warn-color);
    }

    /* Features Grid */
    .features-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
    }

    .feature-card {
      background: var(--bg-primary);
      border-radius: var(--border-radius);
      padding: 24px;
      border: 1px solid var(--border-color);
      text-align: center;
    }

    .feature-card mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: var(--primary-color);
      margin-bottom: 12px;
    }

    .feature-card h4 {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 8px 0;
    }

    .feature-card p {
      font-size: 13px;
      color: var(--text-secondary);
      margin: 0;
      line-height: 1.5;
    }

    /* Loading & Empty States */
    .loading-state, .empty-state {
      text-align: center;
      padding: 48px 24px;
      background: var(--bg-primary);
      border-radius: var(--border-radius);
      border: 1px solid var(--border-color);
    }

    .loading-state mat-spinner, .empty-state mat-icon {
      margin: 0 auto 16px;
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--text-muted);
    }

    .empty-state h3 {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 8px 0;
    }

    .empty-state p {
      font-size: 14px;
      color: var(--text-secondary);
      margin: 0 0 20px 0;
    }

    /* Responsive */
    @media (max-width: 1200px) {
      .stats-grid, .actions-grid, .features-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .connections-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .home-container {
        padding: 16px;
      }
      .hero-section {
        padding: 32px 24px;
      }
      .hero-title {
        font-size: 28px;
      }
      .stats-grid, .actions-grid, .features-grid, .connections-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class HomeComponent implements OnInit {
  connections: KafkaConnection[] = [];
  connectionStats: ConnectionStats[] = [];
  isLoading = true;

  totalConnections = 0;
  activeConnections = 0;
  totalTopics = 0;
  totalConsumerGroups = 0;
  totalBrokers = 0;

  quickActions: QuickAction[] = [
    {
      title: 'Manage Connections',
      description: 'Configure Kafka cluster connections',
      icon: 'cable',
      route: '/connections',
      color: '#6366f1'
    },
    {
      title: 'Browse Topics',
      description: 'View and manage Kafka topics',
      icon: 'topic',
      route: '/topics',
      color: '#ec4899'
    },
    {
      title: 'Consumer Groups',
      description: 'Monitor consumer group offsets',
      icon: 'groups',
      route: '/consumer-groups',
      color: '#10b981'
    },
    {
      title: 'Utility Tools',
      description: 'Base64, XML converters & more',
      icon: 'build',
      route: '/tools',
      color: '#f59e0b'
    }
  ];

  constructor(
    private apiService: KafkaApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.isLoading = true;
    
    this.apiService.getConnections().subscribe({
      next: (connections) => {
        this.connections = connections;
        this.totalConnections = connections.length;
        this.activeConnections = connections.filter(c => c.isActive).length;
        
        // Initialize connection stats
        this.connectionStats = connections.map(conn => ({
          connection: conn,
          topicCount: 0,
          consumerGroupCount: 0,
          isLoading: true
        }));
        
        this.isLoading = false;
        
        // Load stats for each active connection
        connections.filter(c => c.isActive).forEach((conn, index) => {
          this.loadConnectionStats(conn.id, index);
        });
        
        // Mark inactive connections as not loading
        this.connectionStats.forEach((stats, index) => {
          if (!stats.connection.isActive) {
            stats.isLoading = false;
          }
        });
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  loadConnectionStats(connectionId: string, index: number) {
    const statsIndex = this.connectionStats.findIndex(s => s.connection.id === connectionId);
    if (statsIndex === -1) return;

    forkJoin({
      topics: this.apiService.getTopics(connectionId),
      groups: this.apiService.getConsumerGroups(connectionId)
    }).subscribe({
      next: (result) => {
        this.connectionStats[statsIndex].topicCount = result.topics.length;
        this.connectionStats[statsIndex].consumerGroupCount = result.groups.length;
        this.connectionStats[statsIndex].isLoading = false;
        
        // Update totals
        this.totalTopics = this.connectionStats.reduce((sum, s) => sum + s.topicCount, 0);
        this.totalConsumerGroups = this.connectionStats.reduce((sum, s) => sum + s.consumerGroupCount, 0);
        
        // Estimate brokers (simplified - could be enhanced with actual broker count API)
        this.totalBrokers = this.activeConnections;
      },
      error: () => {
        this.connectionStats[statsIndex].isLoading = false;
        this.connectionStats[statsIndex].error = 'Failed to load stats';
      }
    });
  }

  navigate(route: string) {
    this.router.navigate([route]);
  }

  goToTopics(connectionId: string) {
    this.router.navigate(['/topics'], { queryParams: { connection: connectionId } });
  }
}


