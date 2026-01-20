import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
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

  public messages$ = this.messageSubject.asObservable();
  public errors$ = this.errorSubject.asObservable();

  constructor() {}

  startConnection(): Promise<void> {
    const hubUrl = `${environment.signalRUrl}/hubs/kafka`;
    
    this.hubConnection = new HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .build();

    this.hubConnection.on('MessageReceived', (message: ConsumedMessage) => {
      this.messageSubject.next(message);
    });

    this.hubConnection.on('Error', (error: string) => {
      this.errorSubject.next(error);
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
    if (!this.hubConnection) {
      return Promise.reject('Connection not started');
    }
    return this.hubConnection.invoke('StartConsuming', request);
  }

  stopConsuming(connectionId: string, topic: string): Promise<void> {
    if (!this.hubConnection) {
      return Promise.reject('Connection not started');
    }
    return this.hubConnection.invoke('StopConsuming', connectionId, topic);
  }

  getConnectionState(): string {
    return this.hubConnection?.state || 'Disconnected';
  }
}

