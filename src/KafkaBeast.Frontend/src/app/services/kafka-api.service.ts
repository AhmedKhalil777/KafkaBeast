import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { KafkaConnection, ProduceMessageRequest, ProduceMessageResponse, ConsumeMessageRequest, ConsumedMessage, KafkaTopic, ConsumerGroup } from '../models/kafka.models';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class KafkaApiService {
  private get apiUrl(): string {
    return `${environment.apiUrl}/api`;
  }

  constructor(private http: HttpClient) {}

  // Connections
  getConnections(): Observable<KafkaConnection[]> {
    return this.http.get<KafkaConnection[]>(`${this.apiUrl}/connections`);
  }

  getConnection(id: string): Observable<KafkaConnection> {
    return this.http.get<KafkaConnection>(`${this.apiUrl}/connections/${id}`);
  }

  createConnection(connection: KafkaConnection): Observable<KafkaConnection> {
    return this.http.post<KafkaConnection>(`${this.apiUrl}/connections`, connection);
  }

  updateConnection(connection: KafkaConnection): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/connections/${connection.id}`, connection);
  }

  deleteConnection(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/connections/${id}`);
  }

  setConnectionActive(id: string, isActive: boolean): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/connections/${id}/active`, isActive);
  }

  // Produce
  produceMessage(request: ProduceMessageRequest): Observable<ProduceMessageResponse> {
    return this.http.post<ProduceMessageResponse>(`${this.apiUrl}/produce`, request);
  }

  // Consume
  consumeBatch(request: ConsumeMessageRequest, maxMessages: number = 10, timeoutSeconds: number = 5): Observable<ConsumedMessage[]> {
    return this.http.post<ConsumedMessage[]>(
      `${this.apiUrl}/consume/batch?maxMessages=${maxMessages}&timeoutSeconds=${timeoutSeconds}`,
      request
    );
  }

  // Topics
  getTopics(connectionId: string): Observable<KafkaTopic[]> {
    return this.http.get<KafkaTopic[]>(`${this.apiUrl}/connections/${connectionId}/topics`);
  }

  // Consumer Groups
  getConsumerGroups(connectionId: string): Observable<ConsumerGroup[]> {
    return this.http.get<ConsumerGroup[]>(`${this.apiUrl}/connections/${connectionId}/consumer-groups`);
  }
}

