import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SerializationType, SerializationTypeInfo, ProduceMessageRequest, ProduceMessageResponse } from '../../../models/kafka.models';
import { KafkaApiService } from '../../../services/kafka-api.service';

export interface ExpressionSample {
  expression: string;
  description: string;
  category: 'encoding' | 'string' | 'json' | 'file' | 'date' | 'random';
}

export interface BatchFile {
  file: File;
  name: string;
  size: number;
  content: string;
}

export interface BatchExpression {
  variable: string;
  expression: string;
}

export interface BatchResult {
  fileName: string;
  success: boolean;
  partition?: number;
  offset?: number;
  error?: string;
}

export interface PartitionOption {
  partitionId: number;
}

@Component({
  selector: 'app-batch-producer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatExpansionModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatAutocompleteModule,
    MatTooltipModule
  ],
  templateUrl: './batch-producer.component.html',
  styleUrls: ['./batch-producer.component.css']
})
export class BatchProducerComponent {
  @Input() connectionId = '';
  @Input() topicName = '';
  @Input() serializationTypes: SerializationTypeInfo[] = [];
  @Input() partitions: PartitionOption[] = [];
  @Output() batchComplete = new EventEmitter<{ success: number; failed: number }>();

  // File state
  files: BatchFile[] = [];
  dragOver = false;

  // Expression state
  expressions: BatchExpression[] = [
    { variable: 'payload', expression: 'ToBase64String(FileContent)' }
  ];
  messageTemplate = '{\n  "payload": "$$payload",\n  "type": "document"\n}';

  // Settings
  messageKey = '';
  selectedPartition: number | undefined = undefined;
  keySerialization: SerializationType = SerializationType.String;
  valueSerialization: SerializationType = SerializationType.String;
  headers: { key: string; value: string }[] = [];

  // Progress state
  isProducing = false;
  progress = 0;
  results: BatchResult[] = [];

  SerializationType = SerializationType;

  constructor(
    private apiService: KafkaApiService,
    private snackBar: MatSnackBar
  ) {}

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processUploadedFiles(Array.from(files));
    }
  }

  async onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      // Convert FileList to array before any async operations
      const filesArray = Array.from(input.files);
      await this.processUploadedFiles(filesArray);
    }
    input.value = '';
  }

  private async processUploadedFiles(filesArray: File[]) {
    for (const file of filesArray) {
      try {
        const content = await this.readFileContent(file);
        this.files.push({
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

  removeFile(index: number) {
    this.files.splice(index, 1);
  }

  clearFiles() {
    this.files = [];
    this.results = [];
    this.progress = 0;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Expression methods
  addExpression() {
    this.expressions.push({ variable: '', expression: '' });
  }

  removeExpression(index: number) {
    this.expressions.splice(index, 1);
  }

  getExpressionExamples(): string[] {
    return this.expressionSamples.slice(0, 7).map(s => s.expression);
  }

  // Comprehensive expression samples with categories
  expressionSamples: ExpressionSample[] = [
    // Encoding functions
    { expression: 'FileContent.ToBase64String()', description: 'Convert file content to Base64', category: 'encoding' },
    { expression: 'FileContent.FromBase64String()', description: 'Decode Base64 content', category: 'encoding' },
    { expression: 'FileContent.ToHexString()', description: 'Convert to hexadecimal', category: 'encoding' },
    { expression: 'FileContent.ToUtf8()', description: 'Encode as UTF-8', category: 'encoding' },
    { expression: 'FileContent.UrlEncode()', description: 'URL encode content', category: 'encoding' },
    { expression: 'FileContent.UrlDecode()', description: 'URL decode content', category: 'encoding' },
    
    // String functions
    { expression: 'FileContent', description: 'Raw file content', category: 'string' },
    { expression: 'FileContent.ToUpperCase()', description: 'Convert to uppercase', category: 'string' },
    { expression: 'FileContent.ToLowerCase()', description: 'Convert to lowercase', category: 'string' },
    { expression: 'FileContent.Trim()', description: 'Remove leading/trailing whitespace', category: 'string' },
    { expression: 'FileContent.Replace("old", "new")', description: 'Replace text in content', category: 'string' },
    { expression: 'FileContent.Substring(0, 100)', description: 'Extract substring', category: 'string' },
    { expression: 'FileContent.Length()', description: 'Get content length', category: 'string' },
    { expression: 'FileContent.JsonEscape()', description: 'Escape for JSON string', category: 'string' },
    { expression: 'FileContent.XmlEscape()', description: 'Escape for XML', category: 'string' },
    { expression: 'FileContent.Split(",")[0]', description: 'Split and get element', category: 'string' },
    
    // JSON functions
    { expression: 'Json().property', description: 'Parse JSON and get property', category: 'json' },
    { expression: 'Json().nested.value', description: 'Get nested JSON property', category: 'json' },
    { expression: 'Json().items[0]', description: 'Get array element from JSON', category: 'json' },
    { expression: 'Json().items.length', description: 'Get JSON array length', category: 'json' },
    { expression: 'ToJson()', description: 'Convert to JSON string', category: 'json' },
    { expression: 'JsonPretty()', description: 'Format as pretty JSON', category: 'json' },
    { expression: 'JsonCompact()', description: 'Minify JSON', category: 'json' },
    
    // File info functions
    { expression: 'FileName', description: 'Original file name', category: 'file' },
    { expression: 'FileExtension', description: 'File extension (e.g., .txt)', category: 'file' },
    { expression: 'FileNameWithoutExtension', description: 'File name without extension', category: 'file' },
    { expression: 'FileSize', description: 'File size in bytes', category: 'file' },
    { expression: 'FileSizeKB', description: 'File size in kilobytes', category: 'file' },
    { expression: 'MimeType', description: 'Detected MIME type', category: 'file' },
    { expression: 'FileIndex', description: 'Index in batch (0-based)', category: 'file' },
    
    // Date/Time functions
    { expression: 'Now()', description: 'Current datetime ISO', category: 'date' },
    { expression: 'NowUtc()', description: 'Current UTC datetime', category: 'date' },
    { expression: 'Timestamp()', description: 'Unix timestamp (seconds)', category: 'date' },
    { expression: 'TimestampMs()', description: 'Unix timestamp (milliseconds)', category: 'date' },
    { expression: 'DateFormat("yyyy-MM-dd")', description: 'Format current date', category: 'date' },
    { expression: 'TimeFormat("HH:mm:ss")', description: 'Format current time', category: 'date' },
    
    // Random/Unique functions
    { expression: 'Uuid()', description: 'Generate UUID v4', category: 'random' },
    { expression: 'Guid()', description: 'Generate GUID', category: 'random' },
    { expression: 'RandomInt(1, 100)', description: 'Random integer in range', category: 'random' },
    { expression: 'RandomString(16)', description: 'Random alphanumeric string', category: 'random' },
    { expression: 'RandomHex(32)', description: 'Random hex string', category: 'random' },
    { expression: 'Sequence()', description: 'Auto-incrementing number', category: 'random' }
  ];

  // Filter samples by search text
  filterExpressionSamples(searchText: string): ExpressionSample[] {
    if (!searchText) return this.expressionSamples;
    const lower = searchText.toLowerCase();
    return this.expressionSamples.filter(s => 
      s.expression.toLowerCase().includes(lower) || 
      s.description.toLowerCase().includes(lower)
    );
  }

  // Get samples by category
  getSamplesByCategory(category: string): ExpressionSample[] {
    return this.expressionSamples.filter(s => s.category === category);
  }

  // Category labels/icons
  expressionCategories = [
    { key: 'encoding', label: 'Encoding', icon: 'code' },
    { key: 'string', label: 'String', icon: 'text_fields' },
    { key: 'json', label: 'JSON', icon: 'data_object' },
    { key: 'file', label: 'File Info', icon: 'description' },
    { key: 'date', label: 'Date/Time', icon: 'schedule' },
    { key: 'random', label: 'Random/ID', icon: 'casino' }
  ];

  // Track active expression input for autocomplete
  activeExpressionIndex = -1;

  setActiveExpression(index: number) {
    this.activeExpressionIndex = index;
  }

  applyExpressionSample(sample: ExpressionSample, index: number) {
    if (index >= 0 && index < this.expressions.length) {
      this.expressions[index].expression = sample.expression;
    }
  }

  setExpressionExample(example: string) {
    if (this.expressions.length > 0) {
      this.expressions[0].expression = example;
    }
  }

  isVariableUsed(variable: string): boolean {
    return this.messageTemplate.includes('$$' + variable);
  }

  // Header methods
  addHeader() {
    this.headers.push({ key: '', value: '' });
  }

  removeHeader(index: number) {
    this.headers.splice(index, 1);
  }

  // Produce methods
  async produceBatch() {
    if (this.files.length === 0) {
      this.showError('No files selected for batch produce');
      return;
    }

    this.isProducing = true;
    this.results = [];
    this.progress = 0;

    for (let i = 0; i < this.files.length; i++) {
      const batchFile = this.files[i];
      try {
        const message = this.applyTemplate(batchFile.content, batchFile.name);
        
        const request: ProduceMessageRequest = {
          connectionId: this.connectionId,
          topic: this.topicName,
          message,
          keySerialization: this.keySerialization,
          valueSerialization: this.valueSerialization
        };

        if (this.messageKey) {
          request.key = this.messageKey;
        }
        if (this.selectedPartition !== undefined) {
          request.partition = this.selectedPartition;
        }
        if (this.headers.length > 0) {
          request.headers = {};
          for (const h of this.headers) {
            if (h.key) request.headers[h.key] = h.value;
          }
        }

        const result = await this.apiService.produceMessage(request).toPromise();
        this.results.push({
          fileName: batchFile.name,
          success: result?.status === 'Success',
          partition: result?.partition,
          offset: result?.offset,
          error: result?.status !== 'Success' ? result?.status : undefined
        });
      } catch (err: any) {
        this.results.push({
          fileName: batchFile.name,
          success: false,
          error: err.error?.error || err.message || 'Unknown error'
        });
      }
      
      this.progress = Math.round(((i + 1) / this.files.length) * 100);
    }

    this.isProducing = false;
    const successCount = this.getSuccessCount();
    const failedCount = this.getFailureCount();
    this.showSuccess(`Batch complete: ${successCount}/${this.files.length} messages sent`);
    this.batchComplete.emit({ success: successCount, failed: failedCount });
  }

  private applyTemplate(fileContent: string, fileName: string): string {
    let result = this.messageTemplate;
    
    const variables: { [key: string]: string } = {};
    
    for (const expr of this.expressions) {
      if (!expr.variable || !expr.expression) continue;
      
      try {
        const value = this.evaluateExpression(expr.expression, fileContent, fileName);
        variables[expr.variable] = value;
      } catch (err: any) {
        throw new Error(`Expression error for $$${expr.variable}: ${err.message}`);
      }
    }
    
    for (const [varName, value] of Object.entries(variables)) {
      const placeholder = `$$${varName}`;
      result = result.split(placeholder).join(value);
    }
    
    return result;
  }

  private evaluateExpression(expression: string, fileContent: string, fileName: string): string {
    const operations = expression.split('.');
    let value: any = null;
    
    for (const op of operations) {
      const trimmedOp = op.trim();
      
      if (trimmedOp === 'FileContent') {
        value = fileContent;
        continue;
      }
      
      if (trimmedOp === 'FileName') {
        value = fileName;
        continue;
      }
      
      if (trimmedOp === 'ToBase64String()') {
        if (typeof value !== 'string') {
          throw new Error('ToBase64String() requires a string value');
        }
        value = btoa(unescape(encodeURIComponent(value)));
        continue;
      }
      
      if (trimmedOp === 'FromBase64String()') {
        if (typeof value !== 'string') {
          throw new Error('FromBase64String() requires a string value');
        }
        value = decodeURIComponent(escape(atob(value)));
        continue;
      }
      
      if (trimmedOp === 'Length()') {
        value = String(value?.length ?? 0);
        continue;
      }
      
      if (trimmedOp === 'JsonEscape()') {
        if (typeof value !== 'string') value = String(value);
        value = JSON.stringify(value).slice(1, -1);
        continue;
      }
      
      if (trimmedOp === 'ToUpperCase()') {
        if (typeof value !== 'string') value = String(value);
        value = value.toUpperCase();
        continue;
      }
      
      if (trimmedOp === 'ToLowerCase()') {
        if (typeof value !== 'string') value = String(value);
        value = value.toLowerCase();
        continue;
      }
      
      if (trimmedOp === 'Trim()') {
        if (typeof value !== 'string') value = String(value);
        value = value.trim();
        continue;
      }
      
      const base64Match = trimmedOp.match(/^ToBase64String\(FileContent\)$/i);
      if (base64Match) {
        value = btoa(unescape(encodeURIComponent(fileContent)));
        continue;
      }
      
      if (trimmedOp === 'Json()') {
        try {
          value = JSON.parse(value || fileContent);
        } catch {
          throw new Error('Invalid JSON content');
        }
        continue;
      }
      
      if (value && typeof value === 'object' && trimmedOp in value) {
        value = value[trimmedOp];
        continue;
      }
      
      throw new Error(`Unknown operation: ${trimmedOp}`);
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value ?? '');
  }

  getSuccessCount(): number {
    return this.results.filter(r => r.success).length;
  }

  getFailureCount(): number {
    return this.results.filter(r => !r.success).length;
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
}
