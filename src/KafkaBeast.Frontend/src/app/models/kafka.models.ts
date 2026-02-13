export interface KafkaConnection {
  id: string;
  name: string;
  bootstrapServers: string;
  
  // Security Settings
  securityProtocol?: SecurityProtocol;
  
  // SASL Settings
  saslMechanism?: SaslMechanism;
  saslUsername?: string;
  saslPassword?: string;
  saslOauthBearerToken?: string;
  saslOauthBearerTokenEndpointUrl?: string;
  saslKerberosServiceName?: string;
  saslKerberosPrincipal?: string;
  saslKerberosKeytab?: string;
  
  // SSL Settings
  sslCaLocation?: string;
  sslCertificateLocation?: string;
  sslKeyLocation?: string;
  sslKeyPassword?: string;
  sslCaPem?: string;
  sslCertificatePem?: string;
  sslKeyPem?: string;
  sslEndpointIdentificationAlgorithm?: boolean;
  
  // Schema Registry
  schemaRegistryUrl?: string;
  schemaRegistryUsername?: string;
  schemaRegistryPassword?: string;
  
  // Advanced Client Settings
  messageTimeoutMs?: number;
  requestTimeoutMs?: number;
  sessionTimeoutMs?: number;
  connectionsMaxIdleMs?: number;
  metadataMaxAgeMs?: number;
  socketTimeoutMs?: number;
  maxInFlight?: number;
  clientId?: string;
  compressionType?: CompressionType;
  acks?: Acks;
  enableIdempotence?: boolean;
  
  additionalConfig?: { [key: string]: string };
  createdAt: string;
  isActive: boolean;
}

export enum SecurityProtocol {
  Plaintext = 0,
  Ssl = 1,
  SaslPlaintext = 2,
  SaslSsl = 3
}

export enum SaslMechanism {
  Plain = 0,
  ScramSha256 = 1,
  ScramSha512 = 2,
  Gssapi = 3,
  OauthBearer = 4
}

export enum CompressionType {
  None = 0,
  Gzip = 1,
  Snappy = 2,
  Lz4 = 3,
  Zstd = 4
}

export enum Acks {
  None = 0,
  Leader = 1,
  All = 2
}

// Serialization Support
export enum SerializationType {
  String = 0,
  Json = 1,
  Avro = 2,
  Protobuf = 3,
  MessagePack = 4,
  ByteArray = 5,
  Base64 = 6,
  Xml = 7
}

export interface SerializationTypeInfo {
  type: SerializationType;
  name: string;
  description: string;
  requiresSchema: boolean;
  isSchemaRegistryBased: boolean;
}

export interface SerializationConfig {
  schemaRegistryUrl?: string;
  avroSchema?: string;
  protobufSchema?: string;
}

export interface SerializationPreview {
  success: boolean;
  error?: string;
  serializedSize: number;
  serializedBase64: string;
  serializedHex: string;
  deserializedValue: string;
  serializationType: string;
}

export interface ProduceMessageRequest {
  connectionId: string;
  topic: string;
  key?: string;
  message: string;
  headers?: { [key: string]: string };
  partition?: number;
  keySerialization?: SerializationType;
  valueSerialization?: SerializationType;
  schemaRegistryUrl?: string;
  avroSchema?: string;
  protobufSchema?: string;
}

export interface ProduceMessageResponse {
  topic: string;
  partition: number;
  offset: number;
  status: string;
  keySerialization?: string;
  valueSerialization?: string;
}

export interface BatchProduceRequest {
  connectionId: string;
  topic: string;
  messages: BatchMessage[];
  keySerialization?: SerializationType;
  valueSerialization?: SerializationType;
  schemaRegistryUrl?: string;
  avroSchema?: string;
  protobufSchema?: string;
}

export interface BatchMessage {
  key?: string;
  value: string;
  headers?: { [key: string]: string };
  keySerialization?: SerializationType;
  valueSerialization?: SerializationType;
}

export interface BatchProduceResponse {
  successCount: number;
  failureCount: number;
  results: BatchProduceResult[];
}

export interface BatchProduceResult {
  index: number;
  success: boolean;
  error?: string;
  partition?: number;
  offset?: number;
}

export interface ConsumeMessageRequest {
  connectionId: string;
  topic: string;
  groupId?: string;
  autoOffsetReset: boolean;
  partition?: number;
  startOffset?: number;
  startTimestamp?: string;
  keySerialization?: SerializationType;
  valueSerialization?: SerializationType;
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

// Connection Test
export interface ConnectionTestResult {
  success: boolean;
  message: string;
  brokerCount?: number;
  topicCount?: number;
  clusterId?: string;
}

// Cluster Info
export interface ClusterInfo {
  controllerId: number;
  brokers: BrokerInfo[];
  topicCount: number;
}

export interface BrokerInfo {
  brokerId: number;
  host: string;
  port: number;
}

// Topic Management
export interface KafkaTopic {
  name: string;
  partitionCount: number;
  replicationFactor: number;
  connectionId: string;
  isInternal?: boolean;
}

export interface TopicDetails {
  name: string;
  connectionId: string;
  partitionCount: number;
  replicationFactor: number;
  partitions: PartitionInfo[];
  configurations: { [key: string]: string };
}

export interface PartitionInfo {
  partitionId: number;
  leader: number;
  replicas: number[];
  isrs: number[];
}

export interface TopicWatermarks {
  topicName: string;
  partitionWatermarks: PartitionWatermark[];
  totalMessages: number;
}

export interface PartitionWatermark {
  partition: number;
  lowOffset: number;
  highOffset: number;
  messageCount: number;
}

export interface CreateTopicRequest {
  topicName: string;
  numPartitions: number;
  replicationFactor: number;
  configurations?: { [key: string]: string };
}

// Consumer Group Management
export interface ConsumerGroupInfo {
  groupId: string;
  state: string;
  protocolType: string;
  connectionId: string;
}

export interface ConsumerGroupDetails {
  groupId: string;
  state: string;
  protocolType: string;
  coordinator?: BrokerInfo;
  members: ConsumerGroupMember[];
}

export interface ConsumerGroupMember {
  memberId: string;
  clientId: string;
  host: string;
  assignment: TopicPartitionAssignment[];
}

export interface TopicPartitionAssignment {
  topic: string;
  partition: number;
}

export interface ConsumerGroupLag {
  topic: string;
  partition: number;
  currentOffset: number;
  endOffset: number;
  lag: number;
}

export interface ResetOffsetsRequest {
  groupId: string;
  resetType: OffsetResetType;
  topicPartitions: TopicPartitionTarget[];
  timestamp?: string;
}

export interface TopicPartitionTarget {
  topic: string;
  partition: number;
  targetOffset?: number;
}

export enum OffsetResetType {
  Earliest = 0,
  Latest = 1,
  Specific = 2,
  Timestamp = 3
}

// Legacy compatibility
export interface ConsumerGroup {
  groupId: string;
  connectionId: string;
  state?: string;
  members?: number;
}

