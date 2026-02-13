import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { EditorComponent } from 'ngx-monaco-editor-v2';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { KafkaApiService } from '../../services/kafka-api.service';
import { KafkaSignalRService } from '../../services/kafka-signalr.service';
import { Subscription } from 'rxjs';

// Sub-components
import { MessageViewerComponent } from './message-viewer/message-viewer.component';
import { BatchProducerComponent } from './batch-producer/batch-producer.component';
import { TopicSettingsComponent } from './topic-settings/topic-settings.component';
import { TopicStatisticsComponent, PartitionInfo as StatsPartitionInfo } from './topic-statistics/topic-statistics.component';
import { 
  KafkaConnection, 
  TopicDetails, 
  TopicWatermarks,
  PartitionWatermark,
  ConsumeMessageRequest,
  ConsumedMessage,
  ProduceMessageRequest,
  ProduceMessageResponse,
  SerializationType,
  SerializationTypeInfo
} from '../../models/kafka.models';

interface PartitionInfo {
  partitionId: number;
  leader: number;
  replicas: number[];
  isrs: number[];
  lowOffset: number;
  highOffset: number;
  messageCount: number;
}

@Component({
  selector: 'app-topic-detail',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatMenuModule,
    MatDialogModule,
    MatDividerModule,
    MatTabsModule,
    MatExpansionModule,
    MatSlideToggleModule,
    MatProgressBarModule,
    MatButtonToggleModule,
    MatAutocompleteModule,
    // Sub-components
    MessageViewerComponent,
    BatchProducerComponent,
    TopicSettingsComponent,
    TopicStatisticsComponent,
    // Monaco Editor
    EditorComponent
  ],
  templateUrl: './topic-detail.component.html',
  styleUrls: ['./topic-detail.component.css']
})
export class TopicDetailComponent implements OnInit, OnDestroy {
  SerializationType = SerializationType;
  
  topicName = '';
  selectedConnectionId = '';
  connections: KafkaConnection[] = [];
  activeConnections: KafkaConnection[] = [];
  
  topicDetails: TopicDetails | null = null;
  topicWatermarks: TopicWatermarks | null = null;
  partitionInfoList: PartitionInfo[] = [];
  
  activeTabIndex = 0;
  isLoading = false;
  
  // Partition columns
  partitionColumns = ['partitionId', 'leader', 'replicas', 'isrs', 'lowOffset', 'highOffset', 'messageCount'];
  
  // Consume
  consumeRequest: ConsumeMessageRequest = {
    connectionId: '',
    topic: '',
    autoOffsetReset: true,
    valueSerialization: SerializationType.String
  };
  maxMessages = 100;
  consumedMessages: ConsumedMessage[] = [];
  useRealtime = false;
  isConsuming = false;
  
  // Produce
  produceRequest: ProduceMessageRequest = {
    connectionId: '',
    topic: '',
    message: '',
    keySerialization: SerializationType.String,
    valueSerialization: SerializationType.String
  };
  produceHeaders: { key: string; value: string }[] = [];
  produceResult: ProduceMessageResponse | null = null;
  isProducing = false;
  
  // Batch Produce
  produceMode: 'single' | 'batch' = 'single';
  batchFiles: { file: File; name: string; size: number; content: string }[] = [];
  batchExpressions: { variable: string; expression: string }[] = [
    { variable: 'payload', expression: 'ToBase64String(FileContent)' }
  ];
  batchMessageTemplate = '{\n  "payload": "$$payload",\n  "type": "document"\n}';
  batchResults: { fileName: string; success: boolean; partition?: number; offset?: number; error?: string }[] = [];
  isBatchProducing = false;
  batchProgress = 0;
  batchDragOver = false;
  
  // Serialization
  serializationTypes: SerializationTypeInfo[] = [];
  
  // Delete
  showDeleteConfirm = false;
  isDeleting = false;
  
  // Message Preview
  showPreviewModal = false;
  showContentModal = false;
  contentModalData = '';
  contentModalMode: 'text' | 'json' | 'xml' = 'text';
  previewMessage: ConsumedMessage | null = null;
  previewType: 'key' | 'value' = 'value';
  previewContent = '';
  previewMode: 'text' | 'json' | 'xml' | 'tree' | 'expression' = 'text';
  
  // Monaco XML Editor
  formattedXmlContent = '';
  xmlEditorOptions = {
    theme: 'vs-dark',
    language: 'xml',
    readOnly: true,
    automaticLayout: true,
    minimap: { enabled: true },
    wordWrap: 'on' as const,
    scrollBeyondLastLine: false,
    fontSize: 13,
    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
    lineNumbers: 'on' as const,
    folding: true,
    foldingStrategy: 'indentation' as const,
    renderLineHighlight: 'all' as const,
    scrollbar: {
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10
    }
  };

  // Monaco Editor for Producer (editable)
  producerEditorOptions = {
    theme: 'vs-dark',
    language: 'json',
    readOnly: false,
    automaticLayout: true,
    minimap: { enabled: false },
    wordWrap: 'on' as const,
    scrollBeyondLastLine: false,
    fontSize: 13,
    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
    lineNumbers: 'on' as const,
    folding: true,
    renderLineHighlight: 'line' as const,
    scrollbar: {
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8
    },
    tabSize: 2,
    formatOnPaste: true,
    formatOnType: true
  };

  jsonPath: string[] = [];
  currentJsonNode: any = null;
  parsedJson: any = null;
  expandedNodes: Set<string> = new Set();
  
  // Inline Viewer State
  selectedMessageIndex: number = -1;
  messageTransformExpression = '';
  transformApplied = false;
  transformError = '';
  originalPreviewContent = '';
  
  // Expression Evaluator
  expressionInput = '';
  expressionResult: any = null;
  expressionError = '';
  expressionViewMode: 'text' | 'json' | 'xml' | 'tree' = 'text';
  expressionParsedJson: any = null;
  expressionExpandedNodes: Set<string> = new Set();
  formattedExpressionXml = '';
  expressionExamples = [
    'Json(Value).payload',
    'Json(Value).data.ToStringFromBase64()',
    'Json(Value).content.ToStringFromBase64().JsonView()',
    'Json(Value).xml.ToStringFromBase64().XmlView()',
    'Value.ToStringFromBase64()',
    'Json(Key).id'
  ];

  // Transform Expression Samples
  transformExpressionSamples = [
    // JSON parsing
    { expression: 'Json(Value)', description: 'Parse message value as JSON', category: 'json' },
    { expression: 'Json(Key)', description: 'Parse message key as JSON', category: 'json' },
    { expression: 'Json(Value).property', description: 'Get property from JSON value', category: 'json' },
    { expression: 'Json(Value).nested.path', description: 'Get nested property', category: 'json' },
    { expression: 'Json(Value).items[0]', description: 'Get array element', category: 'json' },
    { expression: 'Json(Value).data.length', description: 'Get array length', category: 'json' },
    
    // Base64 decoding
    { expression: 'Value.ToStringFromBase64()', description: 'Decode Base64 value to string', category: 'base64' },
    { expression: 'Key.ToStringFromBase64()', description: 'Decode Base64 key to string', category: 'base64' },
    { expression: 'Json(Value).payload.ToStringFromBase64()', description: 'Decode Base64 property', category: 'base64' },
    { expression: 'Json(Value).data.ToStringFromBase64()', description: 'Decode data field from Base64', category: 'base64' },
    { expression: 'Json(Value).content.ToStringFromBase64()', description: 'Decode content from Base64', category: 'base64' },
    
    // View transformations
    { expression: 'Value.JsonView()', description: 'Format value as pretty JSON', category: 'view' },
    { expression: 'Value.XmlView()', description: 'Format value as pretty XML', category: 'view' },
    { expression: 'Json(Value).data.ToStringFromBase64().JsonView()', description: 'Decode Base64 and format as JSON', category: 'view' },
    { expression: 'Json(Value).xml.ToStringFromBase64().XmlView()', description: 'Decode Base64 and format as XML', category: 'view' },
    { expression: 'Value.ParseJson()', description: 'Parse string as JSON object', category: 'view' },
    
    // String operations
    { expression: 'Value.ToUpperCase()', description: 'Convert to uppercase', category: 'string' },
    { expression: 'Value.ToLowerCase()', description: 'Convert to lowercase', category: 'string' },
    { expression: 'Value.Trim()', description: 'Remove whitespace', category: 'string' },
    { expression: 'Value.Length()', description: 'Get string length', category: 'string' },
    { expression: 'Value.Substring(0, 100)', description: 'Get substring', category: 'string' },
    { expression: 'Value.Replace("old", "new")', description: 'Replace text', category: 'string' },
    
    // Combined expressions
    { expression: 'Json(Value).payload.ToStringFromBase64().ParseJson().data', description: 'Multi-step: Base64 decode, parse, extract', category: 'combined' },
    { expression: 'Json(Value).message.ToStringFromBase64().JsonView()', description: 'Decode embedded JSON and format', category: 'combined' },
    { expression: 'Json(Value).body.ToStringFromBase64().XmlView()', description: 'Decode embedded XML and format', category: 'combined' }
  ];

  transformExpressionCategories = [
    { key: 'json', label: 'JSON Parsing', icon: 'data_object' },
    { key: 'base64', label: 'Base64 Decode', icon: 'code' },
    { key: 'view', label: 'View Format', icon: 'visibility' },
    { key: 'string', label: 'String Ops', icon: 'text_fields' },
    { key: 'combined', label: 'Combined', icon: 'merge' }
  ];

  getTransformSamplesByCategory(category: string) {
    return this.transformExpressionSamples.filter(s => s.category === category);
  }

  filterTransformSamples(searchText: string) {
    if (!searchText) return this.transformExpressionSamples;
    const lower = searchText.toLowerCase();
    return this.transformExpressionSamples.filter(s =>
      s.expression.toLowerCase().includes(lower) ||
      s.description.toLowerCase().includes(lower)
    );
  }
  
  // Settings/Configuration
  configSearchQuery = '';
  expandedConfigCategories: Set<string> = new Set(['retention', 'performance']);
  
  configCategories: { [key: string]: { icon: string; label: string; keys: string[] } } = {
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
  
  // Subscriptions
  private messageSubscription?: Subscription;
  private errorSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: KafkaApiService,
    private signalRService: KafkaSignalRService,
    private snackBar: MatSnackBar,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.topicName = params.get('topicName') || '';
      this.consumeRequest.topic = this.topicName;
      this.produceRequest.topic = this.topicName;
    });
    
    this.loadConnections();
    this.loadSerializationTypes();
    this.setupSignalR();
  }

  ngOnDestroy() {
    this.stopConsuming();
    this.messageSubscription?.unsubscribe();
    this.errorSubscription?.unsubscribe();
  }

  loadConnections() {
    this.apiService.getConnections().subscribe({
      next: (connections) => {
        this.connections = connections;
        this.activeConnections = connections.filter(c => c.isActive);
        if (this.activeConnections.length > 0 && !this.selectedConnectionId) {
          this.selectedConnectionId = this.activeConnections[0].id;
          this.onConnectionChange();
        }
      },
      error: (err) => this.showError('Failed to load connections: ' + err.message)
    });
  }

  loadSerializationTypes() {
    this.apiService.getSerializationTypes().subscribe({
      next: (types) => this.serializationTypes = types,
      error: () => {
        this.serializationTypes = [
          { type: SerializationType.String, name: 'String', description: 'Plain text', requiresSchema: false, isSchemaRegistryBased: false },
          { type: SerializationType.Json, name: 'JSON', description: 'JSON format', requiresSchema: false, isSchemaRegistryBased: false },
          { type: SerializationType.ByteArray, name: 'ByteArray', description: 'Raw binary', requiresSchema: false, isSchemaRegistryBased: false },
          { type: SerializationType.Base64, name: 'Base64', description: 'Base64 encoded', requiresSchema: false, isSchemaRegistryBased: false }
        ];
      }
    });
  }

  setupSignalR() {
    this.signalRService.startConnection();
    
    this.messageSubscription = this.signalRService.messages$.subscribe((message: ConsumedMessage) => {
      if (message && message.topic === this.topicName) {
        this.consumedMessages.unshift(message);
      }
    });

    this.errorSubscription = this.signalRService.errors$.subscribe((error: string) => {
      if (error) this.showError('Consumer error: ' + error);
    });
  }

  onConnectionChange() {
    this.consumeRequest.connectionId = this.selectedConnectionId;
    this.produceRequest.connectionId = this.selectedConnectionId;
    this.loadTopicData();
  }

  loadTopicData() {
    if (!this.selectedConnectionId || !this.topicName) return;
    
    this.isLoading = true;
    this.partitionInfoList = [];
    
    this.apiService.getTopicDetails(this.selectedConnectionId, this.topicName).subscribe({
      next: (details) => {
        this.topicDetails = details;
        this.loadWatermarks();
      },
      error: (err) => {
        this.showError('Failed to load topic details: ' + err.message);
        this.isLoading = false;
      }
    });
  }

  loadWatermarks() {
    this.apiService.getTopicWatermarks(this.selectedConnectionId, this.topicName).subscribe({
      next: (watermarks) => {
        this.topicWatermarks = watermarks;
        this.mergePartitionInfo();
        this.isLoading = false;
      },
      error: () => {
        this.mergePartitionInfo();
        this.isLoading = false;
      }
    });
  }

  mergePartitionInfo() {
    if (!this.topicDetails) return;
    
    this.partitionInfoList = this.topicDetails.partitions.map(p => {
      const watermark = this.topicWatermarks?.partitionWatermarks.find(w => w.partition === p.partitionId);
      return {
        partitionId: p.partitionId,
        leader: p.leader,
        replicas: p.replicas,
        isrs: p.isrs,
        lowOffset: watermark?.lowOffset ?? 0,
        highOffset: watermark?.highOffset ?? 0,
        messageCount: watermark?.messageCount ?? 0
      };
    });
  }

  goBack() {
    this.router.navigate(['/topics']);
  }

  getUniqueReplicas(): number {
    if (!this.topicDetails) return 0;
    const allReplicas = new Set<number>();
    this.topicDetails.partitions.forEach(p => p.replicas.forEach(r => allReplicas.add(r)));
    return allReplicas.size;
  }

  getConfigEntries(config: { [key: string]: string }): { key: string; value: string }[] {
    return Object.entries(config).map(([key, value]) => ({ key, value }));
  }

  // Settings helper methods
  getConfigCategoryKeys(): string[] {
    return Object.keys(this.configCategories);
  }

  getConfigsForCategory(categoryKey: string): { key: string; value: string; description?: string }[] {
    if (!this.topicDetails?.configurations) return [];
    
    const category = this.configCategories[categoryKey];
    if (!category) return [];
    
    return category.keys
      .filter(key => key in this.topicDetails!.configurations)
      .map(key => ({
        key,
        value: this.topicDetails!.configurations[key],
        description: this.configDescriptions[key]
      }))
      .filter(c => !this.configSearchQuery || 
        c.key.toLowerCase().includes(this.configSearchQuery.toLowerCase()) ||
        c.value.toLowerCase().includes(this.configSearchQuery.toLowerCase()));
  }

  getUncategorizedConfigs(): { key: string; value: string; description?: string }[] {
    if (!this.topicDetails?.configurations) return [];
    
    const categorizedKeys = new Set<string>();
    Object.values(this.configCategories).forEach(cat => 
      cat.keys.forEach(k => categorizedKeys.add(k))
    );
    
    return Object.entries(this.topicDetails.configurations)
      .filter(([key]) => !categorizedKeys.has(key))
      .map(([key, value]) => ({ 
        key, 
        value, 
        description: this.configDescriptions[key] 
      }))
      .filter(c => !this.configSearchQuery || 
        c.key.toLowerCase().includes(this.configSearchQuery.toLowerCase()) ||
        c.value.toLowerCase().includes(this.configSearchQuery.toLowerCase()));
  }

  toggleConfigCategory(category: string) {
    if (this.expandedConfigCategories.has(category)) {
      this.expandedConfigCategories.delete(category);
    } else {
      this.expandedConfigCategories.add(category);
    }
  }

  isConfigCategoryExpanded(category: string): boolean {
    return this.expandedConfigCategories.has(category);
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

  // Consume methods
  consumeMessages() {
    this.isConsuming = true;
    this.apiService.consumeBatch(this.consumeRequest, this.maxMessages).subscribe({
      next: (messages: ConsumedMessage[]) => {
        this.consumedMessages = messages;
        this.isConsuming = false;
        this.showSuccess(`Consumed ${messages.length} messages`);
      },
      error: (err: any) => {
        this.showError('Failed to consume: ' + (err.error?.error || err.message));
        this.isConsuming = false;
      }
    });
  }

  startRealtimeConsume() {
    this.isConsuming = true;
    this.signalRService.startConsuming(this.consumeRequest);
  }

  stopConsuming() {
    this.signalRService.stopConsuming(this.selectedConnectionId, this.topicName);
    this.isConsuming = false;
  }

  clearMessages() {
    this.consumedMessages = [];
  }

  exportMessages() {
    const data = JSON.stringify(this.consumedMessages, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.topicName}-messages-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  getHeaderKeys(headers: { [key: string]: string }): string[] {
    return Object.keys(headers);
  }

  formatMessageValue(value: string): string {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  // Produce methods
  produceMessage() {
    if (!this.produceRequest.message) return;

    if (this.produceHeaders.length > 0) {
      this.produceRequest.headers = {};
      for (const h of this.produceHeaders) {
        if (h.key) this.produceRequest.headers[h.key] = h.value;
      }
    }

    this.isProducing = true;
    this.apiService.produceMessage(this.produceRequest).subscribe({
      next: (result: ProduceMessageResponse) => {
        this.produceResult = result;
        this.isProducing = false;
        if (result.status === 'Success') {
          this.showSuccess('Message sent successfully');
          this.loadWatermarks();
        }
      },
      error: (err: any) => {
        this.produceResult = {
          topic: this.topicName,
          partition: -1,
          offset: -1,
          status: err.error?.error || err.message
        };
        this.isProducing = false;
      }
    });
  }

  addHeader() {
    this.produceHeaders.push({ key: '', value: '' });
  }

  removeHeader(index: number) {
    this.produceHeaders.splice(index, 1);
  }

  clearProduceForm() {
    this.produceRequest.key = '';
    this.produceRequest.message = '';
    this.produceRequest.partition = undefined;
    this.produceHeaders = [];
    this.produceResult = null;
  }

  onValueSerializationChange() {
    const lang = this.getProducerEditorLanguage();
    this.producerEditorOptions = { ...this.producerEditorOptions, language: lang };
  }

  getProducerEditorLanguage(): string {
    switch (this.produceRequest.valueSerialization) {
      case SerializationType.Json:
        return 'json';
      case SerializationType.Xml:
        return 'xml';
      case SerializationType.Avro:
      case SerializationType.Protobuf:
        return 'json'; // Schema-based, often JSON-like
      default:
        return 'plaintext';
    }
  }

  // Batch Produce Methods
  onBatchDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.batchDragOver = true;
  }

  onBatchDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.batchDragOver = false;
  }

  onBatchDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.batchDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processUploadedFiles(Array.from(files));
    }
  }

  async onBatchFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      // Convert FileList to array before any async operations
      const filesArray = Array.from(input.files);
      await this.processUploadedFiles(filesArray);
    }
    input.value = ''; // Reset to allow re-selecting same files
  }

  private async processUploadedFiles(files: File[]) {
    for (const file of files) {
      try {
        const content = await this.readFileContent(file);
        this.batchFiles.push({
          file,
          name: file.name,
          size: file.size,
          content
        });
      } catch (err) {
        this.showError(`Failed to read file: ${file.name}`);
      }
    }
  }

  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  removeBatchFile(index: number) {
    this.batchFiles.splice(index, 1);
  }

  clearBatchFiles() {
    this.batchFiles = [];
    this.batchResults = [];
    this.batchProgress = 0;
  }

  addBatchExpression() {
    this.batchExpressions.push({ variable: '', expression: '' });
  }

  removeBatchExpression(index: number) {
    this.batchExpressions.splice(index, 1);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async produceBatch() {
    if (this.batchFiles.length === 0) {
      this.showError('No files selected for batch produce');
      return;
    }

    this.isBatchProducing = true;
    this.batchResults = [];
    this.batchProgress = 0;

    for (let i = 0; i < this.batchFiles.length; i++) {
      const batchFile = this.batchFiles[i];
      try {
        const message = this.applyBatchTemplate(batchFile.content, batchFile.name);
        
        const request: ProduceMessageRequest = {
          connectionId: this.selectedConnectionId,
          topic: this.topicName,
          message,
          keySerialization: this.produceRequest.keySerialization,
          valueSerialization: this.produceRequest.valueSerialization
        };

        if (this.produceRequest.key) {
          request.key = this.produceRequest.key;
        }
        if (this.produceRequest.partition !== undefined) {
          request.partition = this.produceRequest.partition;
        }
        if (this.produceHeaders.length > 0) {
          request.headers = {};
          for (const h of this.produceHeaders) {
            if (h.key) request.headers[h.key] = h.value;
          }
        }

        const result = await this.apiService.produceMessage(request).toPromise();
        this.batchResults.push({
          fileName: batchFile.name,
          success: result?.status === 'Success',
          partition: result?.partition,
          offset: result?.offset,
          error: result?.status !== 'Success' ? result?.status : undefined
        });
      } catch (err: any) {
        this.batchResults.push({
          fileName: batchFile.name,
          success: false,
          error: err.error?.error || err.message || 'Unknown error'
        });
      }
      
      this.batchProgress = Math.round(((i + 1) / this.batchFiles.length) * 100);
    }

    this.isBatchProducing = false;
    const successCount = this.batchResults.filter(r => r.success).length;
    this.showSuccess(`Batch complete: ${successCount}/${this.batchFiles.length} messages sent`);
    this.loadWatermarks();
  }

  private applyBatchTemplate(fileContent: string, fileName: string): string {
    let result = this.batchMessageTemplate;
    
    // Build variables map from expressions
    const variables: { [key: string]: string } = {};
    
    for (const expr of this.batchExpressions) {
      if (!expr.variable || !expr.expression) continue;
      
      try {
        const value = this.evaluateBatchExpression(expr.expression, fileContent, fileName);
        variables[expr.variable] = value;
      } catch (err: any) {
        throw new Error(`Expression error for $$${expr.variable}: ${err.message}`);
      }
    }
    
    // Replace $$variable placeholders in template
    for (const [varName, value] of Object.entries(variables)) {
      const placeholder = `$$${varName}`;
      result = result.split(placeholder).join(value);
    }
    
    return result;
  }

  private evaluateBatchExpression(expression: string, fileContent: string, fileName: string): string {
    // Parse chain of operations
    const operations = expression.split('.');
    let value: any = null;
    
    for (const op of operations) {
      const trimmedOp = op.trim();
      
      // FileContent - the raw file content
      if (trimmedOp === 'FileContent') {
        value = fileContent;
        continue;
      }
      
      // FileName - the name of the file
      if (trimmedOp === 'FileName') {
        value = fileName;
        continue;
      }
      
      // ToBase64String() - convert to base64
      if (trimmedOp === 'ToBase64String()') {
        if (typeof value !== 'string') {
          throw new Error('ToBase64String() requires a string value');
        }
        value = btoa(unescape(encodeURIComponent(value)));
        continue;
      }
      
      // FromBase64String() - decode from base64
      if (trimmedOp === 'FromBase64String()') {
        if (typeof value !== 'string') {
          throw new Error('FromBase64String() requires a string value');
        }
        value = decodeURIComponent(escape(atob(value)));
        continue;
      }
      
      // Length() - get length
      if (trimmedOp === 'Length()') {
        value = String(value?.length ?? 0);
        continue;
      }
      
      // JsonEscape() - escape for JSON string
      if (trimmedOp === 'JsonEscape()') {
        if (typeof value !== 'string') value = String(value);
        value = JSON.stringify(value).slice(1, -1); // Remove quotes
        continue;
      }
      
      // ToUpperCase()
      if (trimmedOp === 'ToUpperCase()') {
        if (typeof value !== 'string') value = String(value);
        value = value.toUpperCase();
        continue;
      }
      
      // ToLowerCase()
      if (trimmedOp === 'ToLowerCase()') {
        if (typeof value !== 'string') value = String(value);
        value = value.toLowerCase();
        continue;
      }
      
      // Trim()
      if (trimmedOp === 'Trim()') {
        if (typeof value !== 'string') value = String(value);
        value = value.trim();
        continue;
      }
      
      // ToBase64String(FileContent) - combined operation
      const base64Match = trimmedOp.match(/^ToBase64String\(FileContent\)$/i);
      if (base64Match) {
        value = btoa(unescape(encodeURIComponent(fileContent)));
        continue;
      }
      
      // JsonPath access - e.g., Json().field.subfield
      if (trimmedOp === 'Json()') {
        try {
          value = JSON.parse(value || fileContent);
        } catch {
          throw new Error('Invalid JSON content');
        }
        continue;
      }
      
      // Property access for objects
      if (value && typeof value === 'object' && trimmedOp in value) {
        value = value[trimmedOp];
        continue;
      }
      
      throw new Error(`Unknown operation: ${trimmedOp}`);
    }
    
    // Convert final value to string
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value ?? '');
  }

  getBatchExpressionExamples(): string[] {
    return [
      'FileContent.ToBase64String()',
      'FileContent',
      'FileContent.JsonEscape()',
      'FileName',
      'FileContent.Length()',
      'Json().payload',
      'FileContent.ToUpperCase()'
    ];
  }

  getBatchSuccessCount(): number {
    return this.batchResults.filter(r => r.success).length;
  }

  getBatchFailureCount(): number {
    return this.batchResults.filter(r => !r.success).length;
  }

  // Statistics methods
  isHealthy(): boolean {
    if (!this.partitionInfoList.length) return true;
    return this.partitionInfoList.every(p => p.isrs.length === p.replicas.length);
  }

  getHealthDescription(): string {
    if (!this.partitionInfoList.length) return 'No partition data';
    const unhealthy = this.partitionInfoList.filter(p => p.isrs.length < p.replicas.length).length;
    if (unhealthy === 0) return 'All partitions fully replicated';
    return `${unhealthy} partition(s) under-replicated`;
  }

  getPartitionPercentage(partition: PartitionInfo): number {
    const total = this.topicWatermarks?.totalMessages || 0;
    if (total === 0) return 0;
    return (partition.messageCount / total) * 100;
  }

  // Get partitions in format for statistics component
  get statisticsPartitions(): StatsPartitionInfo[] {
    return this.partitionInfoList.map(p => ({
      partitionId: p.partitionId,
      messageCount: p.messageCount,
      lowWatermark: p.lowOffset,
      highWatermark: p.highOffset,
      leader: p.leader,
      replicas: p.replicas,
      inSyncReplicas: p.isrs
    }));
  }

  // Delete methods
  confirmDelete() {
    this.showDeleteConfirm = true;
  }

  deleteTopic() {
    this.isDeleting = true;
    this.apiService.deleteTopic(this.selectedConnectionId, this.topicName).subscribe({
      next: () => {
        this.showSuccess('Topic deleted successfully');
        this.router.navigate(['/topics']);
      },
      error: (err) => {
        this.showError('Failed to delete topic: ' + (err.error?.error || err.message));
        this.isDeleting = false;
      }
    });
  }

  private showSuccess(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  private showError(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  // Preview Modal Methods
  openPreview(msg: ConsumedMessage, type: 'key' | 'value', event: Event) {
    event.stopPropagation();
    this.previewMessage = msg;
    this.previewType = type;
    this.previewContent = type === 'key' ? (msg.key || '') : msg.value;
    this.jsonPath = [];
    this.parsedJson = null;
    this.currentJsonNode = null;
    this.expandedNodes = new Set(['root']);
    
    if (this.isValidJson(this.previewContent)) {
      this.previewMode = 'json';
      this.parsedJson = JSON.parse(this.previewContent);
      this.currentJsonNode = this.parsedJson;
      this.formattedXmlContent = '';
    } else if (this.isValidXml(this.previewContent)) {
      this.previewMode = 'xml';
      this.formattedXmlContent = this.formatXml(this.previewContent);
    } else {
      this.previewMode = 'text';
      this.formattedXmlContent = '';
    }
    
    this.showPreviewModal = true;
  }

  // Inline Message Viewer Methods
  selectMessage(msg: ConsumedMessage, index: number) {
    this.selectedMessageIndex = index;
    this.previewMessage = msg;
    this.previewType = 'value';
    this.originalPreviewContent = msg.value;
    this.transformError = '';
    
    if (this.messageTransformExpression && this.transformApplied) {
      this.applyTransformToMessage(msg);
    } else {
      this.previewContent = msg.value;
      this.updatePreviewMode();
    }
  }

  switchPreviewType(type: 'key' | 'value') {
    if (!this.previewMessage) return;
    this.previewType = type;
    this.originalPreviewContent = type === 'key' ? (this.previewMessage.key || '') : this.previewMessage.value;
    
    if (this.messageTransformExpression && this.transformApplied) {
      this.applyTransformToMessage(this.previewMessage);
    } else {
      this.previewContent = this.originalPreviewContent;
      this.updatePreviewMode();
    }
  }

  applyTransform() {
    if (!this.messageTransformExpression) return;
    this.transformApplied = true;
    this.transformError = '';
    
    if (this.previewMessage) {
      this.applyTransformToMessage(this.previewMessage);
    }
  }

  clearTransform() {
    this.messageTransformExpression = '';
    this.transformApplied = false;
    this.transformError = '';
    
    if (this.previewMessage) {
      this.previewContent = this.originalPreviewContent;
      this.updatePreviewMode();
    }
  }

  private applyTransformToMessage(msg: ConsumedMessage) {
    try {
      const tempContent = this.previewType === 'key' ? (msg.key || '') : msg.value;
      this.originalPreviewContent = tempContent;
      
      const result = this.parseAndExecuteExpression(this.messageTransformExpression);
      
      if (typeof result.value === 'object') {
        this.previewContent = JSON.stringify(result.value, null, 2);
      } else {
        this.previewContent = String(result.value ?? '');
      }
      
      if (result.viewMode !== 'text') {
        this.previewMode = result.viewMode;
      } else {
        this.updatePreviewMode();
      }
      
      if (this.isValidJson(this.previewContent)) {
        this.parsedJson = JSON.parse(this.previewContent);
      } else {
        this.parsedJson = null;
      }
      
      this.transformError = '';
    } catch (error: any) {
      this.transformError = error.message || 'Transform failed';
      this.previewContent = this.originalPreviewContent;
      this.updatePreviewMode();
    }
  }

  private updatePreviewMode() {
    this.expandedNodes = new Set(['root']);
    
    if (this.isValidJson(this.previewContent)) {
      this.previewMode = 'json';
      this.parsedJson = JSON.parse(this.previewContent);
      this.formattedXmlContent = '';
    } else if (this.isValidXml(this.previewContent)) {
      this.previewMode = 'xml';
      this.parsedJson = null;
      this.formattedXmlContent = this.formatXml(this.previewContent);
    } else {
      this.previewMode = 'text';
      this.parsedJson = null;
      this.formattedXmlContent = '';
    }
  }

  truncateValue(value: string, maxLen: number): string {
    if (!value) return '(empty)';
    if (value.length <= maxLen) return value;
    return value.substring(0, maxLen) + '...';
  }

  closePreview() {
    this.showPreviewModal = false;
    this.previewMessage = null;
    this.previewContent = '';
    this.jsonPath = [];
    this.parsedJson = null;
    this.currentJsonNode = null;
    this.expandedNodes.clear();
  }

  // Simple Content Modal Methods
  openContentModal(content: string) {
    this.contentModalData = content;
    if (this.isValidJson(content)) {
      this.contentModalMode = 'json';
    } else if (this.isValidXml(content)) {
      this.contentModalMode = 'xml';
      this.formattedXmlContent = this.formatXml(content);
    } else {
      this.contentModalMode = 'text';
    }
    this.showContentModal = true;
  }

  closeContentModal() {
    this.showContentModal = false;
    this.contentModalData = '';
  }

  isValidJson(str: string): boolean {
    if (!str) return false;
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  isValidXml(str: string): boolean {
    if (!str) return false;
    const trimmed = str.trim();
    return trimmed.startsWith('<') && trimmed.endsWith('>');
  }

  highlightJson(json: string): SafeHtml {
    try {
      const obj = JSON.parse(json);
      const formatted = JSON.stringify(obj, null, 2);
      const highlighted = formatted
        .replace(/(".*?"):/g, '<span class="json-key">$1</span>:')
        .replace(/: (".*?")/g, ': <span class="json-string">$1</span>')
        .replace(/: (\d+)/g, ': <span class="json-number">$1</span>')
        .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
        .replace(/: (null)/g, ': <span class="json-null">$1</span>');
      return this.sanitizer.bypassSecurityTrustHtml(highlighted);
    } catch {
      return this.sanitizer.bypassSecurityTrustHtml(json);
    }
  }

  highlightXml(xml: string): SafeHtml {
    let formatted = this.formatXml(xml);
    
    formatted = formatted
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    formatted = formatted
      .replace(/(&lt;\/?)(\w[\w:-]*)/g, '$1<span class="xml-tag">$2</span>')
      .replace(/\s([\w:-]+)=/g, ' <span class="xml-attr">$1</span>=')
      .replace(/=(&quot;|"|')([^"']*?)(\1|&quot;)/g, '=<span class="xml-string">"$2"</span>')
      .replace(/(&lt;!--)(.*?)(--&gt;)/g, '<span class="xml-comment">$1$2$3</span>');
    
    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }

  formatXml(xml: string): string {
    let formatted = '';
    let indent = 0;
    const lines = xml.replace(/>\s*</g, '>\n<').split('\n');
    
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      
      if (line.startsWith('</')) {
        indent = Math.max(0, indent - 1);
      }
      
      formatted += '  '.repeat(indent) + line + '\n';
      
      if (line.startsWith('<') && !line.startsWith('</') && !line.startsWith('<?') && 
          !line.startsWith('<!') && !line.endsWith('/>') && !line.includes('</')) {
        indent++;
      }
    }
    
    return formatted.trim();
  }

  copyToClipboard(content: string) {
    navigator.clipboard.writeText(content).then(() => {
      this.showSuccess('Copied to clipboard');
    });
  }

  downloadContent() {
    let extension = 'txt';
    let mimeType = 'text/plain';
    
    if (this.previewMode === 'json') {
      extension = 'json';
      mimeType = 'application/json';
    } else if (this.previewMode === 'xml') {
      extension = 'xml';
      mimeType = 'application/xml';
    }
    
    const blob = new Blob([this.previewContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `message-${this.previewMessage?.partition}-${this.previewMessage?.offset}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // JSON Tree Navigation
  toggleNode(path: string) {
    if (this.expandedNodes.has(path)) {
      this.expandedNodes.delete(path);
    } else {
      this.expandedNodes.add(path);
    }
  }

  isNodeExpanded(path: string): boolean {
    return this.expandedNodes.has(path);
  }

  getNodePath(parentPath: string, key: string): string {
    return parentPath ? `${parentPath}.${key}` : key;
  }

  expandAll() {
    this.expandAllNodes(this.parsedJson, 'root');
  }

  private expandAllNodes(node: any, path: string) {
    if (this.isExpandable(node)) {
      this.expandedNodes.add(path);
      const entries = this.getObjectEntries(node);
      for (const entry of entries) {
        this.expandAllNodes(entry.value, this.getNodePath(path, entry.key));
      }
    }
  }

  collapseAll() {
    this.expandedNodes.clear();
    this.expandedNodes.add('root');
  }

  navigateToRoot() {
    this.jsonPath = [];
    this.currentJsonNode = this.parsedJson;
  }

  navigateToPath(index: number) {
    this.jsonPath = this.jsonPath.slice(0, index + 1);
    this.currentJsonNode = this.getNodeAtPath(this.jsonPath);
  }

  navigateInto(key: string) {
    this.jsonPath.push(key);
    this.currentJsonNode = this.getNodeAtPath(this.jsonPath);
  }

  getNodeAtPath(path: string[]): any {
    let node = this.parsedJson;
    for (const segment of path) {
      if (node && typeof node === 'object') {
        node = node[segment];
      } else {
        return null;
      }
    }
    return node;
  }

  isObject(value: any): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  isExpandable(value: any): boolean {
    return this.isObject(value) || this.isArray(value);
  }

  getObjectEntries(obj: any): { key: string; value: any }[] {
    if (Array.isArray(obj)) {
      return obj.map((value, index) => ({ key: String(index), value }));
    }
    return Object.entries(obj).map(([key, value]) => ({ key, value }));
  }

  getObjectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  getValueIcon(value: any): string {
    if (value === null) return 'block';
    if (typeof value === 'string') return 'text_fields';
    if (typeof value === 'number') return 'tag';
    if (typeof value === 'boolean') return 'toggle_on';
    return 'help';
  }

  getValueClass(value: any): string {
    if (value === null) return 'value-null';
    if (typeof value === 'string') return 'value-string';
    if (typeof value === 'number') return 'value-number';
    if (typeof value === 'boolean') return 'value-boolean';
    return '';
  }

  formatTreeValue(value: any): string {
    if (value === null) return 'null';
    if (typeof value === 'string') return `"${value}"`;
    return String(value);
  }

  // Expression Evaluator Methods
  evaluateExpression() {
    this.expressionError = '';
    this.expressionResult = null;
    this.expressionParsedJson = null;
    this.expressionExpandedNodes = new Set(['expr-root']);
    this.formattedExpressionXml = '';
    
    if (!this.expressionInput.trim()) {
      this.expressionError = 'Please enter an expression';
      return;
    }

    try {
      const result = this.parseAndExecuteExpression(this.expressionInput.trim());
      this.expressionResult = result.value;
      this.expressionViewMode = result.viewMode;
      
      if (this.isValidJson(this.getExpressionResultString())) {
        this.expressionParsedJson = JSON.parse(this.getExpressionResultString());
      }
      
      if (this.expressionViewMode === 'xml' || this.isValidXml(this.getExpressionResultString())) {
        this.formattedExpressionXml = this.formatXml(this.getExpressionResultString());
      }
    } catch (error: any) {
      this.expressionError = error.message || 'Invalid expression';
    }
  }

  parseAndExecuteExpression(expr: string): { value: any; viewMode: 'text' | 'json' | 'xml' | 'tree' } {
    let viewMode: 'text' | 'json' | 'xml' | 'tree' = 'text';
    
    if (expr.endsWith('.JsonView()')) {
      expr = expr.slice(0, -'.JsonView()'.length);
      viewMode = 'json';
    } else if (expr.endsWith('.XmlView()')) {
      expr = expr.slice(0, -'.XmlView()'.length);
      viewMode = 'xml';
    } else if (expr.endsWith('.TreeView()')) {
      expr = expr.slice(0, -'.TreeView()'.length);
      viewMode = 'tree';
    } else if (expr.endsWith('.TextView()')) {
      expr = expr.slice(0, -'.TextView()'.length);
      viewMode = 'text';
    }

    const parts = this.tokenizeExpression(expr);
    let value: any = null;

    for (const part of parts) {
      value = this.executeExpressionPart(part, value);
    }

    return { value, viewMode };
  }

  tokenizeExpression(expr: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let parenDepth = 0;
    let bracketDepth = 0;
    
    for (let i = 0; i < expr.length; i++) {
      const char = expr[i];
      
      if (char === '(') {
        parenDepth++;
        current += char;
      } else if (char === ')') {
        parenDepth--;
        current += char;
      } else if (char === '[' && parenDepth === 0 && bracketDepth === 0) {
        if (current) {
          tokens.push(current);
          current = '';
        }
        current = char;
        bracketDepth++;
      } else if (char === '[') {
        bracketDepth++;
        current += char;
      } else if (char === ']') {
        bracketDepth--;
        current += char;
        if (bracketDepth === 0 && parenDepth === 0) {
          tokens.push(current);
          current = '';
        }
      } else if (char === '.' && parenDepth === 0 && bracketDepth === 0) {
        if (current) {
          tokens.push(current);
        }
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current) {
      tokens.push(current);
    }
    
    return tokens;
  }

  executeExpressionPart(part: string, currentValue: any): any {
    const jsonMatch = part.match(/^Json\((Value|Key)\)$/i);
    if (jsonMatch) {
      const source = jsonMatch[1].toLowerCase() === 'key' 
        ? (this.previewMessage?.key || '') 
        : this.previewContent;
      try {
        return JSON.parse(source);
      } catch {
        throw new Error(`Cannot parse ${jsonMatch[1]} as JSON`);
      }
    }

    if (part === 'Value') {
      return this.previewContent;
    }
    if (part === 'Key') {
      return this.previewMessage?.key || '';
    }

    if (part === 'ToStringFromBase64()') {
      if (typeof currentValue !== 'string') {
        currentValue = String(currentValue);
      }
      try {
        return atob(currentValue);
      } catch {
        throw new Error('Invalid Base64 string');
      }
    }

    if (part === 'ToBase64()') {
      if (typeof currentValue !== 'string') {
        currentValue = String(currentValue);
      }
      return btoa(currentValue);
    }

    if (part === 'ParseJson()') {
      if (typeof currentValue !== 'string') {
        throw new Error('ParseJson() requires a string value');
      }
      try {
        return JSON.parse(currentValue);
      } catch {
        throw new Error('Cannot parse as JSON');
      }
    }

    if (part === 'ToString()') {
      if (typeof currentValue === 'object') {
        return JSON.stringify(currentValue, null, 2);
      }
      return String(currentValue);
    }

    if (part === 'Length()') {
      if (Array.isArray(currentValue)) {
        return currentValue.length;
      }
      if (typeof currentValue === 'string') {
        return currentValue.length;
      }
      if (typeof currentValue === 'object' && currentValue !== null) {
        return Object.keys(currentValue).length;
      }
      throw new Error('Cannot get length of this value');
    }

    if (part === 'Keys()') {
      if (typeof currentValue === 'object' && currentValue !== null) {
        return Object.keys(currentValue);
      }
      throw new Error('Keys() requires an object');
    }

    if (part === 'Values()') {
      if (typeof currentValue === 'object' && currentValue !== null) {
        return Object.values(currentValue);
      }
      throw new Error('Values() requires an object');
    }

    const firstMatch = part.match(/^First\((\d*)\)$/);
    if (firstMatch) {
      if (!Array.isArray(currentValue)) {
        throw new Error('First() requires an array');
      }
      const n = firstMatch[1] ? parseInt(firstMatch[1], 10) : 1;
      return n === 1 ? currentValue[0] : currentValue.slice(0, n);
    }

    const lastMatch = part.match(/^Last\((\d*)\)$/);
    if (lastMatch) {
      if (!Array.isArray(currentValue)) {
        throw new Error('Last() requires an array');
      }
      const n = lastMatch[1] ? parseInt(lastMatch[1], 10) : 1;
      return n === 1 ? currentValue[currentValue.length - 1] : currentValue.slice(-n);
    }

    const indexMatch = part.match(/^\[(\d+)\]$/);
    if (indexMatch) {
      const index = parseInt(indexMatch[1], 10);
      if (Array.isArray(currentValue)) {
        if (index >= currentValue.length) {
          throw new Error(`Index ${index} out of bounds`);
        }
        return currentValue[index];
      }
      throw new Error('Cannot index non-array value');
    }

    if (currentValue === null || currentValue === undefined) {
      throw new Error(`Cannot access property '${part}' of null/undefined`);
    }
    
    if (typeof currentValue === 'object') {
      if (!(part in currentValue)) {
        throw new Error(`Property '${part}' not found`);
      }
      return currentValue[part];
    }

    throw new Error(`Unknown operation: ${part}`);
  }

  getExpressionResultString(): string {
    if (this.expressionResult === null || this.expressionResult === undefined) {
      return '';
    }
    if (typeof this.expressionResult === 'object') {
      return JSON.stringify(this.expressionResult, null, 2);
    }
    return String(this.expressionResult);
  }

  toggleExpressionNode(path: string) {
    if (this.expressionExpandedNodes.has(path)) {
      this.expressionExpandedNodes.delete(path);
    } else {
      this.expressionExpandedNodes.add(path);
    }
  }

  isExpressionNodeExpanded(path: string): boolean {
    return this.expressionExpandedNodes.has(path);
  }
}
