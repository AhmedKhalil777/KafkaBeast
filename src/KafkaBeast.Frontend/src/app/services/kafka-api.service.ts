import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  KafkaConnection, 
  ProduceMessageRequest, 
  ProduceMessageResponse, 
  ConsumeMessageRequest, 
  ConsumedMessage, 
  KafkaTopic, 
  ConsumerGroup,
  ConnectionTestResult,
  ClusterInfo,
  TopicDetails,
  TopicWatermarks,
  CreateTopicRequest,
  ConsumerGroupInfo,
  ConsumerGroupDetails,
  ConsumerGroupLag,
  ResetOffsetsRequest,
  BatchProduceRequest,
  BatchProduceResponse,
  SerializationTypeInfo,
  SerializationPreview,
  SerializationType
} from '../models/kafka.models';
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

  // Connection Admin
  testConnection(connectionId: string): Observable<ConnectionTestResult> {
    return this.http.get<ConnectionTestResult>(`${this.apiUrl}/connections/${connectionId}/admin/test`);
  }

  getClusterInfo(connectionId: string): Observable<ClusterInfo> {
    return this.http.get<ClusterInfo>(`${this.apiUrl}/connections/${connectionId}/admin/cluster-info`);
  }

  // Produce
  produceMessage(request: ProduceMessageRequest): Observable<ProduceMessageResponse> {
    return this.http.post<ProduceMessageResponse>(`${this.apiUrl}/produce`, request);
  }

  produceBatch(request: BatchProduceRequest): Observable<BatchProduceResponse> {
    return this.http.post<BatchProduceResponse>(`${this.apiUrl}/produce/batch`, request);
  }

  flushProducer(connectionId: string, timeoutSeconds: number = 30): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/produce/${connectionId}/flush?timeoutSeconds=${timeoutSeconds}`, {});
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

  getTopicDetails(connectionId: string, topicName: string): Observable<TopicDetails> {
    return this.http.get<TopicDetails>(`${this.apiUrl}/connections/${connectionId}/topics/${topicName}`);
  }

  getTopicWatermarks(connectionId: string, topicName: string): Observable<TopicWatermarks> {
    return this.http.get<TopicWatermarks>(`${this.apiUrl}/connections/${connectionId}/topics/${topicName}/watermarks`);
  }

  createTopic(connectionId: string, request: CreateTopicRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/connections/${connectionId}/topics`, request);
  }

  deleteTopic(connectionId: string, topicName: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/connections/${connectionId}/topics/${topicName}`);
  }

  // Consumer Groups
  getConsumerGroups(connectionId: string): Observable<ConsumerGroupInfo[]> {
    return this.http.get<ConsumerGroupInfo[]>(`${this.apiUrl}/connections/${connectionId}/consumer-groups`);
  }

  getConsumerGroupDetails(connectionId: string, groupId: string): Observable<ConsumerGroupDetails> {
    return this.http.get<ConsumerGroupDetails>(`${this.apiUrl}/connections/${connectionId}/consumer-groups/${groupId}`);
  }

  getConsumerGroupLag(connectionId: string, groupId: string): Observable<ConsumerGroupLag[]> {
    return this.http.get<ConsumerGroupLag[]>(`${this.apiUrl}/connections/${connectionId}/consumer-groups/${groupId}/lag`);
  }

  deleteConsumerGroup(connectionId: string, groupId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/connections/${connectionId}/consumer-groups/${groupId}`);
  }

  resetConsumerGroupOffsets(connectionId: string, groupId: string, request: ResetOffsetsRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/connections/${connectionId}/consumer-groups/${groupId}/reset-offsets`, request);
  }

  // Serialization
  getSerializationTypes(): Observable<SerializationTypeInfo[]> {
    return this.http.get<SerializationTypeInfo[]>(`${this.apiUrl}/serialization/types`);
  }

  detectSerializationType(data: string, isBase64: boolean = false): Observable<{ type: SerializationType; name: string }> {
    return this.http.post<{ type: SerializationType; name: string }>(`${this.apiUrl}/serialization/detect`, { data, isBase64 });
  }

  previewSerialization(data: string, serializationType: SerializationType, avroSchema?: string, protobufSchema?: string): Observable<SerializationPreview> {
    return this.http.post<SerializationPreview>(`${this.apiUrl}/serialization/preview`, {
      data,
      serializationType,
      avroSchema,
      protobufSchema
    });
  }
}

