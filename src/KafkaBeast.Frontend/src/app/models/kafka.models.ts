export interface KafkaConnection {
  id: string;
  name: string;
  bootstrapServers: string;
  additionalConfig?: { [key: string]: string };
  createdAt: string;
  isActive: boolean;
}

export interface ProduceMessageRequest {
  connectionId: string;
  topic: string;
  key?: string;
  message: string;
  headers?: { [key: string]: string };
}

export interface ProduceMessageResponse {
  topic: string;
  partition: number;
  offset: number;
  status: string;
}

export interface ConsumeMessageRequest {
  connectionId: string;
  topic: string;
  groupId?: string;
  autoOffsetReset: boolean;
}

export interface ConsumedMessage {
  topic: string;
  key?: string;
  value: string;
  offset: number;
  partition: number;
  timestamp: string;
  headers?: { [key: string]: string };
}

export interface KafkaTopic {
  name: string;
  partitionCount: number;
  replicationFactor: number;
  connectionId: string;
}

export interface ConsumerGroup {
  groupId: string;
  connectionId: string;
  state?: string;
  members?: number;
}

