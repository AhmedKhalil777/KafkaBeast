# Frontend Integration Guide - SignalR Consumer

## Quick Start

### 1. Connect to SignalR Hub

```typescript
import * as signalR from '@microsoft/signalr';

export class ConsumerService {
  private hubConnection: signalR.HubConnection;

  constructor() {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/kafka')
      .withAutomaticReconnect([0, 2000, 10000])
      .build();

    this.setupHubListeners();
  }

  private setupHubListeners() {
    // Listen for consumed messages
    this.hubConnection.on('MessageReceived', (message: ConsumedMessage) => {
      console.log('Message received:', message);
      this.onMessageReceived(message);
    });

    // Listen for errors
    this.hubConnection.on('Error', (error: string) => {
      console.error('Consumption error:', error);
      this.onConsumptionError(error);
    });

    // Handle connection state
    this.hubConnection.onreconnected((connectionId) => {
      console.log('Reconnected with connection ID:', connectionId);
    });

    this.hubConnection.onclose((error) => {
      console.error('Connection closed:', error);
    });
  }

  async start() {
    try {
      await this.hubConnection.start();
      console.log('Connected to Kafka Hub');
    } catch (err) {
      console.error('Connection failed:', err);
    }
  }

  async startConsuming(request: ConsumeMessageRequest) {
    try {
      await this.hubConnection.invoke('StartConsuming', request);
      console.log('Started consuming from:', request.topic);
    } catch (err) {
      console.error('Failed to start consuming:', err);
    }
  }

  async stopConsuming(connectionId: string, topic: string) {
    try {
      await this.hubConnection.invoke('StopConsuming', connectionId, topic);
      console.log('Stopped consuming from:', topic);
    } catch (err) {
      console.error('Failed to stop consuming:', err);
    }
  }

  private onMessageReceived(message: ConsumedMessage) {
    // Handle message received from Kafka
    // Add to your component's message list, update UI, etc.
  }

  private onConsumptionError(error: string) {
    // Handle consumption error
    // Show error message to user
  }
}
```

### 2. Component Implementation Example

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ConsumeMessageRequest, ConsumedMessage } from '../models';

@Component({
  selector: 'app-consumer',
  templateUrl: './consumer.component.html',
  styleUrls: ['./consumer.component.css']
})
export class ConsumerComponent implements OnInit, OnDestroy {
  consumeRequest: ConsumeMessageRequest = {
    connectionId: '',
    topic: '',
    groupId: '',
    autoOffsetReset: true,
    keySerialization: 'String',
    valueSerialization: 'String'
  };

  consumedMessages: ConsumedMessage[] = [];
  isConsuming = false;
  errorMessage: string | null = null;

  constructor(private consumerService: ConsumerService) {}

  ngOnInit() {
    this.consumerService.start();
  }

  startConsume() {
    if (!this.consumeRequest.connectionId || !this.consumeRequest.topic) {
      this.errorMessage = 'Connection ID and Topic are required';
      return;
    }

    this.isConsuming = true;
    this.errorMessage = null;
    this.consumedMessages = [];
    this.consumerService.startConsuming(this.consumeRequest);
  }

  stopConsume() {
    if (this.isConsuming) {
      this.consumerService.stopConsuming(
        this.consumeRequest.connectionId,
        this.consumeRequest.topic
      );
      this.isConsuming = false;
    }
  }

  ngOnDestroy() {
    if (this.isConsuming) {
      this.stopConsume();
    }
  }
}
```

### 3. Message Display Template

```html
<div class="consumer-container">
  <div class="controls">
    <mat-form-field>
      <mat-label>Connection</mat-label>
      <mat-select [(ngModel)]="consumeRequest.connectionId">
        <mat-option *ngFor="let conn of connections" [value]="conn.id">
          {{ conn.name }}
        </mat-option>
      </mat-select>
    </mat-form-field>

    <mat-form-field>
      <mat-label>Topic</mat-label>
      <input matInput [(ngModel)]="consumeRequest.topic" placeholder="Topic name">
    </mat-form-field>

    <mat-form-field>
      <mat-label>Consumer Group</mat-label>
      <input matInput [(ngModel)]="consumeRequest.groupId" placeholder="Consumer group (optional)">
    </mat-form-field>

    <mat-form-field>
      <mat-label>Key Serialization</mat-label>
      <mat-select [(ngModel)]="consumeRequest.keySerialization">
        <mat-option value="String">String</mat-option>
        <mat-option value="Json">JSON</mat-option>
        <mat-option value="Avro">Avro</mat-option>
        <mat-option value="Protobuf">Protobuf</mat-option>
      </mat-select>
    </mat-form-field>

    <mat-form-field>
      <mat-label>Value Serialization</mat-label>
      <mat-select [(ngModel)]="consumeRequest.valueSerialization">
        <mat-option value="String">String</mat-option>
        <mat-option value="Json">JSON</mat-option>
        <mat-option value="Avro">Avro</mat-option>
        <mat-option value="Protobuf">Protobuf</mat-option>
      </mat-select>
    </mat-form-field>

    <button mat-raised-button color="primary" 
            (click)="startConsume()" 
            [disabled]="isConsuming">
      {{ isConsuming ? 'Consuming...' : 'Start Consuming' }}
    </button>

    <button mat-raised-button color="warn" 
            (click)="stopConsume()" 
            [disabled]="!isConsuming">
      Stop
    </button>
  </div>

  <div *ngIf="errorMessage" class="error-message">
    {{ errorMessage }}
  </div>

  <div class="messages-container">
    <div *ngIf="consumedMessages.length === 0" class="no-messages">
      No messages consumed yet
    </div>

    <div *ngFor="let msg of consumedMessages" class="message-card">
      <div class="message-header">
        <span class="topic">{{ msg.topic }}</span>
        <span class="offset">Offset: {{ msg.offset }}</span>
        <span class="partition">Partition: {{ msg.partition }}</span>
      </div>

      <div class="message-body">
        <div class="message-key" *ngIf="msg.key">
          <strong>Key:</strong> {{ msg.key }}
        </div>
        <div class="message-value">
          <strong>Value:</strong> {{ msg.value }}
        </div>
      </div>

      <div class="message-meta">
        <span class="timestamp">{{ msg.timestamp | date:'medium' }}</span>
        <span class="serialization">
          {{ msg.keySerializationType }}/{{ msg.valueSerializationType }}
        </span>
      </div>

      <div *ngIf="msg.headers" class="message-headers">
        <strong>Headers:</strong>
        <div *ngFor="let key of getHeaderKeys(msg.headers)" class="header">
          {{ key }}: {{ msg.headers[key] }}
        </div>
      </div>

      <div *ngIf="msg.deserializationError" class="error">
        <strong>Error:</strong> {{ msg.deserializationError }}
      </div>
    </div>
  </div>
</div>
```

## Models

```typescript
export interface ConsumeMessageRequest {
  connectionId: string;
  topic: string;
  groupId?: string;
  autoOffsetReset: boolean;
  partition?: number;
  startOffset?: number;
  startTimestamp?: string;
  keySerialization?: string;
  valueSerialization?: string;
  schemaRegistryUrl?: string;
  avroSchema?: string;
  protobufSchema?: string;
}

export interface ConsumedMessage {
  topic: string;
  key?: string;
  value: string;
  offset: number;
  partition: number;
  timestamp: string;
  headers?: { [key: string]: string };
  rawKeyBase64?: string;
  rawValueBase64?: string;
  keySerializationType?: string;
  valueSerializationType?: string;
  deserializationError?: string;
}
```

## Error Handling

The service handles various error scenarios:

1. **Deserialization Errors** - Sent in `deserializationError` field
2. **Connection Errors** - Handled by SignalR with automatic reconnect
3. **Kafka Errors** - Sent via the `Error` hub method
4. **Group Authorization Errors** - Common cause: missing group ID or permissions

## Performance Tips

1. **Message Buffer Limit** - Consider implementing a max message count in the frontend
2. **Virtual Scrolling** - For large message volumes, use Angular CDK virtual scrolling
3. **Message Cleanup** - Clear old messages periodically to free memory
4. **Batch Processing** - Group messages for bulk UI updates

## Troubleshooting

### Issue: "Group authorization failed"
- Ensure the group ID is provided in the request
- Verify broker SASL/authorization configuration

### Issue: Messages not appearing
- Check browser console for connection errors
- Verify topic name is correct
- Ensure broker is reachable

### Issue: Slow message display
- Check message size and serialization complexity
- Monitor network bandwidth
- Consider filtering messages on the backend


