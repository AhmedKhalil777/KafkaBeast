import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { KafkaApiService } from '../../services/kafka-api.service';
import { KafkaConnection, KafkaTopic, ConsumerGroup } from '../../models/kafka.models';
import { Subject, takeUntil } from 'rxjs';

interface ConnectionWithData extends KafkaConnection {
  topics?: KafkaTopic[];
  consumerGroups?: ConsumerGroup[];
  topicsExpanded?: boolean;
  consumersExpanded?: boolean;
  loadingTopics?: boolean;
  loadingConsumers?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatExpansionModule,
    MatTooltipModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  template: `
    <mat-sidenav-container class="sidebar-container">
      <mat-sidenav mode="side" opened class="sidebar" [class.collapsed]="isCollapsed" [style.width.px]="isCollapsed ? 64 : 280">
        <div class="sidebar-header">
          <h2 class="sidebar-title" *ngIf="!isCollapsed">
            <mat-icon>hub</mat-icon>
            Kafka Beast
          </h2>
          <mat-icon *ngIf="isCollapsed" class="collapsed-logo">hub</mat-icon>
          <button mat-icon-button class="collapse-btn" (click)="toggleCollapse()" [matTooltip]="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'">
            <mat-icon>{{ isCollapsed ? 'chevron_right' : 'chevron_left' }}</mat-icon>
          </button>
        </div>

        <mat-nav-list class="sidebar-nav">
          <a mat-list-item routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" [matTooltip]="isCollapsed ? 'Home' : ''" matTooltipPosition="right">
            <mat-icon>home</mat-icon>
            <span *ngIf="!isCollapsed">Home</span>
          </a>
          <a mat-list-item routerLink="/connections" routerLinkActive="active" [matTooltip]="isCollapsed ? 'Connections' : ''" matTooltipPosition="right">
            <mat-icon>settings</mat-icon>
            <span *ngIf="!isCollapsed">Connections</span>
          </a>
          <a mat-list-item routerLink="/topics" routerLinkActive="active" [matTooltip]="isCollapsed ? 'Topics' : ''" matTooltipPosition="right">
            <mat-icon>topic</mat-icon>
            <span *ngIf="!isCollapsed">Topics</span>
          </a>
          <a mat-list-item routerLink="/consumer-groups" routerLinkActive="active" [matTooltip]="isCollapsed ? 'Consumer Groups' : ''" matTooltipPosition="right">
            <mat-icon>group</mat-icon>
            <span *ngIf="!isCollapsed">Consumer Groups</span>
          </a>
          <a mat-list-item routerLink="/tools" routerLinkActive="active" [matTooltip]="isCollapsed ? 'Misc Tools' : ''" matTooltipPosition="right">
            <mat-icon>build</mat-icon>
            <span *ngIf="!isCollapsed">Misc Tools</span>
          </a>
        </mat-nav-list>

        <mat-divider></mat-divider>

        <div class="connections-section" *ngIf="!isCollapsed">
          <div class="section-header">
            <h3>Kafka Connections</h3>
            <button mat-icon-button (click)="refreshConnections()" matTooltip="Refresh connections">
              <mat-icon>refresh</mat-icon>
            </button>
          </div>

          <div *ngIf="loading" class="loading-container">
            <mat-spinner diameter="30"></mat-spinner>
          </div>

          <div *ngIf="!loading && connections.length === 0" class="empty-state">
            <mat-icon>info</mat-icon>
            <p>No connections found</p>
            <p class="hint">Add a connection to get started</p>
          </div>

          <mat-accordion *ngIf="!loading && connections.length > 0" multi="true" class="connections-accordion">
            <mat-expansion-panel *ngFor="let connection of connections" 
                                 [expanded]="connection.isActive"
                                 class="connection-panel">
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <div class="connection-header">
                    <mat-icon [class.active]="connection.isActive" 
                              [class.inactive]="!connection.isActive">
                      {{ connection.isActive ? 'link' : 'link_off' }}
                    </mat-icon>
                    <span class="connection-name">{{ connection.name }}</span>
                    <mat-icon *ngIf="connection.isActive" class="status-indicator" color="primary">
                      fiber_manual_record
                    </mat-icon>
                  </div>
                </mat-panel-title>
              </mat-expansion-panel-header>

              <div class="connection-content">
                <div class="connection-info">
                  <p class="connection-detail">
                    <mat-icon>dns</mat-icon>
                    <span>{{ connection.bootstrapServers }}</span>
                  </p>
                </div>

                <mat-divider></mat-divider>

                <!-- Topics Section -->
                <mat-expansion-panel class="nested-panel">
                  <mat-expansion-panel-header (click)="toggleTopics(connection)">
                    <mat-panel-title>
                      <div class="nested-header">
                        <mat-icon>topic</mat-icon>
                        <span [matBadge]="connection.topics?.length || 0" 
                              [matBadgeHidden]="!connection.topics || connection.topics.length === 0"
                              matBadgeColor="primary">Topics</span>
                        <mat-spinner *ngIf="connection.loadingTopics" 
                                     diameter="16" 
                                     class="inline-spinner">
                        </mat-spinner>
                      </div>
                    </mat-panel-title>
                  </mat-expansion-panel-header>
                  
                  <div *ngIf="connection.loadingTopics" class="loading-items">
                    <mat-spinner diameter="24"></mat-spinner>
                    <p>Loading topics...</p>
                  </div>
                  
                  <div *ngIf="!connection.loadingTopics && (!connection.topics || connection.topics.length === 0)" 
                       class="empty-items">
                    <mat-icon>info</mat-icon>
                    <p>No topics found</p>
                  </div>
                  
                  <mat-nav-list *ngIf="!connection.loadingTopics && connection.topics && connection.topics.length > 0">
                    <a mat-list-item *ngFor="let topic of connection.topics" 
                       class="topic-item"
                       [routerLink]="['/topics', connection.id, topic.name]"
                       routerLinkActive="active">
                      <mat-icon>description</mat-icon>
                      <span class="item-name">{{ topic.name }}</span>
                      <span class="item-meta">{{ topic.partitionCount }} partitions</span>
                    </a>
                  </mat-nav-list>
                </mat-expansion-panel>

                <!-- Consumer Groups Section -->
                <mat-expansion-panel class="nested-panel">
                  <mat-expansion-panel-header (click)="toggleConsumers(connection)">
                    <mat-panel-title>
                      <div class="nested-header">
                        <mat-icon>group</mat-icon>
                        <span [matBadge]="connection.consumerGroups?.length || 0" 
                              [matBadgeHidden]="!connection.consumerGroups || connection.consumerGroups.length === 0"
                              matBadgeColor="accent">Consumer Groups</span>
                        <mat-spinner *ngIf="connection.loadingConsumers" 
                                     diameter="16" 
                                     class="inline-spinner">
                        </mat-spinner>
                      </div>
                    </mat-panel-title>
                  </mat-expansion-panel-header>
                  
                  <div *ngIf="connection.loadingConsumers" class="loading-items">
                    <mat-spinner diameter="24"></mat-spinner>
                    <p>Loading consumer groups...</p>
                  </div>
                  
                  <div *ngIf="!connection.loadingConsumers && (!connection.consumerGroups || connection.consumerGroups.length === 0)" 
                       class="empty-items">
                    <mat-icon>info</mat-icon>
                    <p>No consumer groups found</p>
                  </div>
                  
                  <mat-nav-list *ngIf="!connection.loadingConsumers && connection.consumerGroups && connection.consumerGroups.length > 0">
                    <a mat-list-item *ngFor="let group of connection.consumerGroups" 
                       class="consumer-item"
                       [routerLink]="['/consumers', connection.id, group.groupId]"
                       routerLinkActive="active">
                      <mat-icon>group_work</mat-icon>
                      <span class="item-name">{{ group.groupId }}</span>
                      <span *ngIf="group.state" class="item-meta">{{ group.state }}</span>
                    </a>
                  </mat-nav-list>
                </mat-expansion-panel>
              </div>
            </mat-expansion-panel>
          </mat-accordion>
        </div>
      </mat-sidenav>

      <mat-sidenav-content class="main-content" [style.margin-left.px]="isCollapsed ? 64 : 280">
        <ng-content></ng-content>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .sidebar-container {
      height: 100vh;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
    }

    .sidebar {
      background: #ffffff;
      box-shadow: 2px 0 8px rgba(0,0,0,0.1);
      overflow-y: auto;
    }

    .sidebar-header {
      padding: 20px 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 68px;
    }

    .collapse-btn {
      color: white;
      opacity: 0.8;
    }

    .collapse-btn:hover {
      opacity: 1;
    }

    .collapsed-logo {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .sidebar.collapsed .sidebar-header {
      padding: 20px 8px;
      justify-content: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .sidebar.collapsed .collapse-btn {
      margin: 0;
    }

    .sidebar-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }

    .sidebar-title mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .sidebar-nav {
      padding-top: 8px;
    }

    .sidebar-nav a {
      color: #424242;
      font-weight: 500;
    }

    .sidebar-nav a:hover {
      background-color: #f5f5f5;
    }

    .sidebar-nav a.active {
      background-color: #e3f2fd;
      color: #1976d2;
    }

    .sidebar-nav mat-icon {
      margin-right: 16px;
      color: #757575;
    }

    .sidebar.collapsed .sidebar-nav mat-icon {
      margin-right: 0;
    }

    .sidebar.collapsed .sidebar-nav a {
      justify-content: center;
      padding: 12px 8px;
    }

    .sidebar-nav a.active mat-icon {
      color: #1976d2;
    }

    .connections-section {
      padding: 16px;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .section-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #757575;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      padding: 40px 0;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #9e9e9e;
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 12px;
      color: #bdbdbd;
    }

    .empty-state p {
      margin: 8px 0;
      font-size: 14px;
    }

    .empty-state .hint {
      font-size: 12px;
      color: #bdbdbd;
    }

    .connections-accordion {
      margin-top: 8px;
    }

    .connection-panel {
      margin-bottom: 8px;
      border-radius: 8px !important;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .connection-header {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
    }

    .connection-header mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .connection-header mat-icon.active {
      color: #4caf50;
    }

    .connection-header mat-icon.inactive {
      color: #9e9e9e;
    }

    .connection-name {
      flex: 1;
      font-weight: 500;
      font-size: 14px;
    }

    .status-indicator {
      font-size: 8px !important;
      width: 8px !important;
      height: 8px !important;
    }

    .connection-content {
      padding: 8px 0;
    }

    .connection-info {
      padding: 12px 0;
    }

    .connection-detail {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #757575;
      margin: 0;
    }

    .connection-detail mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .nested-panel {
      margin: 8px 0;
      border-radius: 4px !important;
    }

    .nested-header {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    }

    .nested-header mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #757575;
    }

    .nested-header span {
      flex: 1;
      font-size: 13px;
      font-weight: 500;
    }

    .inline-spinner {
      margin-left: auto;
    }

    .loading-items, .empty-items {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      color: #9e9e9e;
    }

    .loading-items mat-spinner {
      margin-bottom: 12px;
    }

    .empty-items mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      margin-bottom: 8px;
      color: #bdbdbd;
    }

    .empty-items p {
      margin: 0;
      font-size: 12px;
    }

    .topic-item, .consumer-item {
      padding-left: 40px !important;
      font-size: 13px;
    }

    .topic-item mat-icon, .consumer-item mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      margin-right: 12px;
      color: #757575;
    }

    .item-name {
      flex: 1;
      font-weight: 500;
    }

    .item-meta {
      font-size: 11px;
      color: #9e9e9e;
      margin-left: 8px;
    }

    .topic-item:hover, .consumer-item:hover {
      background-color: #f5f5f5;
    }

    .topic-item.active, .consumer-item.active {
      background-color: #e3f2fd;
      color: #1976d2;
    }

    .topic-item.active mat-icon, .consumer-item.active mat-icon {
      color: #1976d2;
    }

    .main-content {
      padding: 0;
      background: #f5f5f5;
      min-height: 100vh;
      transition: margin-left 0.2s ease;
    }

    mat-divider {
      margin: 8px 0;
    }
  `]
})
export class SidebarComponent implements OnInit, OnDestroy {
  connections: ConnectionWithData[] = [];
  loading = false;
  isCollapsed = false;
  private destroy$ = new Subject<void>();

  constructor(private kafkaApiService: KafkaApiService) {}

  ngOnInit(): void {
    this.loadConnections();
    // Restore collapsed state from localStorage
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      this.isCollapsed = savedState === 'true';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadConnections(): void {
    this.loading = true;
    this.kafkaApiService.getConnections()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (connections) => {
          this.connections = connections.map(conn => ({
            ...conn,
            topics: undefined,
            consumerGroups: undefined,
            topicsExpanded: false,
            consumersExpanded: false,
            loadingTopics: false,
            loadingConsumers: false
          }));
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading connections:', error);
          this.loading = false;
        }
      });
  }

  refreshConnections(): void {
    this.loadConnections();
  }

  toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
    localStorage.setItem('sidebarCollapsed', String(this.isCollapsed));
  }

  toggleTopics(connection: ConnectionWithData): void {
    if (!connection.topicsExpanded && !connection.loadingTopics) {
      connection.loadingTopics = true;
      connection.topicsExpanded = true;
      
      this.kafkaApiService.getTopics(connection.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (topics) => {
            connection.topics = topics;
            connection.loadingTopics = false;
          },
          error: (error) => {
            console.error('Error loading topics:', error);
            connection.topics = [];
            connection.loadingTopics = false;
          }
        });
    }
  }

  toggleConsumers(connection: ConnectionWithData): void {
    if (!connection.consumersExpanded && !connection.loadingConsumers) {
      connection.loadingConsumers = true;
      connection.consumersExpanded = true;
      
      this.kafkaApiService.getConsumerGroups(connection.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (groups) => {
            connection.consumerGroups = groups;
            connection.loadingConsumers = false;
          },
          error: (error) => {
            console.error('Error loading consumer groups:', error);
            connection.consumerGroups = [];
            connection.loadingConsumers = false;
          }
        });
    }
  }
}

