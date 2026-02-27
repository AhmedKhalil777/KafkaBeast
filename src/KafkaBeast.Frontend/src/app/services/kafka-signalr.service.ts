import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { ConsumedMessage, ConsumeMessageRequest } from '../models/kafka.models';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class KafkaSignalRService {
  private hubConnection?: HubConnection;
  private messageSubject = new Subject<ConsumedMessage>();
  private errorSubject = new Subject<string>();
  private connectionStateSubject = new Subject<string>();

  public messages$ = this.messageSubject.asObservable();
  public errors$ = this.errorSubject.asObservable();
  public connectionState$ = this.connectionStateSubject.asObservable();

  constructor() {}

  startConnection(): Promise<void> {
    if (this.hubConnection?.state === HubConnectionState.Connected) {
      return Promise.resolve();
    }

    const hubUrl = `${environment.signalRUrl}/hubs/kafka`;
    
    this.hubConnection = new HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .build();

    // Listen for consumed messages
    this.hubConnection.on('MessageReceived', (message: ConsumedMessage) => {
      console.log('MessageReceived event:', message);
      this.messageSubject.next(message);
    });

    // Listen for errors
    this.hubConnection.on('Error', (error: string) => {
      console.error('Error event from hub:', error);
      this.errorSubject.next(error);
    });

    // Handle connection state changes
    this.hubConnection.onreconnected((connectionId) => {
      console.log('Reconnected to hub with connection ID:', connectionId);
      this.connectionStateSubject.next('reconnected');
    });

    this.hubConnection.onreconnecting((error) => {
      console.warn('Attempting to reconnect:', error);
      this.connectionStateSubject.next('reconnecting');
    });

    this.hubConnection.onclose((error) => {
      console.warn('Connection closed:', error);
      this.connectionStateSubject.next('disconnected');
    });

    return this.hubConnection.start();
  }

  stopConnection(): Promise<void> {
    if (this.hubConnection) {
      return this.hubConnection.stop();
    }
    return Promise.resolve();
  }

  startConsuming(request: ConsumeMessageRequest): Promise<void> {
    if (!this.hubConnection || this.hubConnection.state !== HubConnectionState.Connected) {
      return Promise.reject('SignalR connection not established');
    }
    console.log('Invoking StartConsuming with request:', request);
    return this.hubConnection.invoke('StartConsuming', request);
  }

  stopConsuming(connectionId: string, topic: string, groupId: string): Promise<void> {
    if (!this.hubConnection || this.hubConnection.state !== HubConnectionState.Connected) {
      return Promise.reject('SignalR connection not established');
    }
    console.log('Invoking StopConsuming for:', connectionId, topic, groupId);
    return this.hubConnection.invoke('StopConsuming', connectionId, topic, groupId);
  }

  getConnectionState(): string {
    return this.hubConnection?.state || 'Disconnected';
  }

  isConnected(): boolean {
    return this.hubConnection?.state === HubConnectionState.Connected;
  }
}

