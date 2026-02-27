# Code Changes Reference

## 1. Backend Model Changes

### File: `KafkaBeast.Dashboard/Models/KafkaConnection.cs`

#### Added Enum
```csharp
public enum ConsumptionPeriodType
{
    Duration,
    Manual
}
```

#### Updated ConsumeMessageRequest Class
```csharp
public class ConsumeMessageRequest
{
    public string ConnectionId { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public string? GroupId { get; set; }
    public bool AutoOffsetReset { get; set; } = true;
    public int? Partition { get; set; }
    public long? StartOffset { get; set; }
    public DateTime? StartTimestamp { get; set; }
    
    // Serialization settings
    public SerializationType KeySerialization { get; set; } = SerializationType.String;
    public SerializationType ValueSerialization { get; set; } = SerializationType.String;
    public string? SchemaRegistryUrl { get; set; }
    public string? AvroSchema { get; set; }
    public string? ProtobufSchema { get; set; }
    
    // Consumption period settings [NEW]
    public ConsumptionPeriodType ConsumptionPeriodType { get; set; } = ConsumptionPeriodType.Manual;
    public int ConsumptionDurationSeconds { get; set; } = 30;
}
```

---

## 2. Backend Service Changes

### File: `KafkaBeast.Dashboard/Services/KafkaConsumerService.cs`

#### Added Field
```csharp
private readonly ConcurrentDictionary<string, CancellationTokenSource> _batchCancellationTokens = new();
```

#### Updated ConsumeMessagesAsync Method
```csharp
public Task<List<ConsumedMessage>> ConsumeMessagesAsync(
    ConsumeMessageRequest request,
    int maxMessages = 10,
    TimeSpan? timeout = null,
    CancellationToken cancellationToken = default)
{
    var messages = new List<ConsumedMessage>();
    IConsumer<byte[], byte[]>? consumer = null;
    
    // Create a batch consumption ID for tracking
    var batchId = $"batch-{request.ConnectionId}-{request.Topic}-{Guid.NewGuid()}";
    var batchCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
    _batchCancellationTokens[batchId] = batchCts;

    try
    {
        consumer = CreateConsumer(request.ConnectionId, request);
        consumer.Subscribe(request.Topic);

        // Determine timeout based on consumption period type
        TimeSpan timeoutValue;
        if (request.ConsumptionPeriodType == ConsumptionPeriodType.Duration)
        {
            timeoutValue = TimeSpan.FromSeconds(request.ConsumptionDurationSeconds);
        }
        else
        {
            timeoutValue = timeout ?? TimeSpan.FromSeconds(5);
        }
        
        var endTime = DateTime.UtcNow.Add(timeoutValue);

        while (messages.Count < maxMessages && DateTime.UtcNow < endTime && !batchCts.Token.IsCancellationRequested)
        {
            var remainingTime = endTime - DateTime.UtcNow;
            if (remainingTime.TotalMilliseconds <= 0)
                break;

            var result = consumer.Consume(remainingTime);

            if (result == null)
                break;

            var consumedMessage = CreateConsumedMessage(result, request);
            messages.Add(consumedMessage);
        }

        _logger.LogInformation("Consumed {Count} messages from topic {Topic} with {KeyType}/{ValueType} deserialization (Period: {PeriodType})", 
            messages.Count, request.Topic, request.KeySerialization, request.ValueSerialization, request.ConsumptionPeriodType);

        return Task.FromResult(messages);
    }
    catch (OperationCanceledException)
    {
        _logger.LogInformation("Batch consumption cancelled for topic {Topic}", request.Topic);
        return Task.FromResult(messages);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error consuming messages from topic {Topic}", request.Topic);
        throw;
    }
    finally
    {
        consumer?.Close();
        consumer?.Dispose();
        _batchCancellationTokens.TryRemove(batchId, out _);
        batchCts.Dispose();
    }
}
```

#### New Method: StopBatchConsumption
```csharp
public void StopBatchConsumption()
{
    // Cancel all active batch consumptions
    foreach (var cts in _batchCancellationTokens.Values)
    {
        cts.Cancel();
    }
    _batchCancellationTokens.Clear();
}
```

#### Updated Method: DisposeAll
```csharp
public void DisposeAll()
{
    foreach (var cts in _cancellationTokens.Values)
    {
        cts.Cancel();
        cts.Dispose();
    }
    _cancellationTokens.Clear();

    foreach (var cts in _batchCancellationTokens.Values)
    {
        cts.Cancel();
        cts.Dispose();
    }
    _batchCancellationTokens.Clear();

    foreach (var consumer in _consumers.Values)
    {
        consumer.Close();
        consumer.Dispose();
    }
    _consumers.Clear();
}
```

---

## 3. Backend Controller Changes

### File: `KafkaBeast.Dashboard/Controllers/ConsumeController.cs`

#### Updated Endpoint: POST /api/consume/batch
```csharp
[HttpPost("batch")]
public async Task<ActionResult<List<ConsumedMessage>>> ConsumeBatch(
    [FromBody] ConsumeMessageRequest request,
    [FromQuery] int maxMessages = 10,
    [FromQuery] int timeoutSeconds = 5,
    CancellationToken cancellationToken = default)
{
    if (string.IsNullOrWhiteSpace(request.Topic))
    {
        return BadRequest("Topic is required");
    }

    try
    {
        var messages = await _consumerService.ConsumeMessagesAsync(
            request,
            maxMessages,
            TimeSpan.FromSeconds(timeoutSeconds),
            cancellationToken);

        return Ok(messages);
    }
    catch (OperationCanceledException)
    {
        _logger.LogInformation("Batch consumption cancelled for topic {Topic}", request.Topic);
        return Ok(new List<ConsumedMessage>());
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error consuming messages from topic {Topic}", request.Topic);
        return StatusCode(500, new { error = ex.Message });
    }
}
```

#### New Endpoint: POST /api/consume/stop-batch
```csharp
[HttpPost("stop-batch")]
public ActionResult StopBatchConsumption()
{
    try
    {
        _consumerService.StopBatchConsumption();
        _logger.LogInformation("Batch consumption stopped");
        return Ok(new { message = "Batch consumption stopped" });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error stopping batch consumption");
        return StatusCode(500, new { error = ex.Message });
    }
}
```

---

## 4. Frontend Model Changes

### File: `KafkaBeast.Frontend/src/app/models/kafka.models.ts`

#### Added Enum
```typescript
// Consumption Period Type
export enum ConsumptionPeriodType {
  Duration = 'Duration',
  Manual = 'Manual'
}
```

#### Updated Interface
```typescript
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
  consumptionPeriodType?: ConsumptionPeriodType;
  consumptionDurationSeconds?: number;
}
```

---

## 5. Frontend Service Changes

### File: `KafkaBeast.Frontend/src/app/services/kafka-api.service.ts`

#### Added Method
```typescript
stopBatchConsumption(): Observable<{ message: string }> {
  return this.http.post<{ message: string }>(`${this.apiUrl}/consume/stop-batch`, {});
}
```

---

## 6. Frontend Component Changes

### File: `KafkaBeast.Frontend/src/app/components/topic-detail/topic-detail.component.ts`

#### Imports
```typescript
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
  SerializationTypeInfo,
  ConsumptionPeriodType  // NEW
} from '../../models/kafka.models';

import { MatRadioModule } from '@angular/material/radio';  // NEW
```

#### Module Imports (in @Component)
```typescript
imports: [
  // ... existing imports ...
  MatRadioModule,  // NEW
  // ... rest of imports ...
]
```

#### Component Properties
```typescript
// ... existing code ...

// Consume
consumeRequest: ConsumeMessageRequest = {
  connectionId: '',
  topic: '',
  autoOffsetReset: true,
  valueSerialization: SerializationType.String,
  consumptionPeriodType: ConsumptionPeriodType.Manual,  // NEW
  consumptionDurationSeconds: 30                         // NEW
};
maxMessages = 100;
consumedMessages: ConsumedMessage[] = [];
useRealtime = false;
isConsuming = false;
isBatchConsuming = false;                               // NEW

// Consumption period options [NEW]
ConsumptionPeriodType = ConsumptionPeriodType;
durationPresets = [5, 10, 15, 30, 60];
batchConsumptionAbortController: AbortController | null = null;

// ... rest of component ...
```

#### Updated Methods
```typescript
// Consume methods
consumeMessages() {
  this.isConsuming = true;
  this.isBatchConsuming = true;  // NEW
  
  // Create abort controller for cancellation [NEW]
  this.batchConsumptionAbortController = new AbortController();
  
  this.apiService.consumeBatch(this.consumeRequest, this.maxMessages).subscribe({
    next: (messages: ConsumedMessage[]) => {
      this.consumedMessages = messages;
      this.isConsuming = false;
      this.isBatchConsuming = false;  // NEW
      this.showSuccess(`Consumed ${messages.length} messages`);
    },
    error: (err: any) => {
      this.showError('Failed to consume: ' + (err.error?.error || err.message));
      this.isConsuming = false;
      this.isBatchConsuming = false;  // NEW
    }
  });
}

startRealtimeConsume() {
  this.isConsuming = true;
  this.signalRService.startConsuming(this.consumeRequest);
}

stopConsuming() {
  if (this.useRealtime) {
    this.signalRService.stopConsuming(this.selectedConnectionId, this.topicName);
    this.isConsuming = false;
  } else if (this.isBatchConsuming) {  // NEW: Added batch stop support
    // Stop batch consumption [NEW]
    this.apiService.stopBatchConsumption().subscribe({
      next: () => {
        this.isConsuming = false;
        this.isBatchConsuming = false;
        this.showSuccess('Batch consumption stopped');
      },
      error: (err: any) => {
        this.showError('Failed to stop consumption: ' + (err.error?.error || err.message));
        this.isConsuming = false;
        this.isBatchConsuming = false;
      }
    });
  }
}
```

---

## 7. Frontend Template Changes

### File: `KafkaBeast.Frontend/src/app/components/topic-detail/topic-detail.component.html`

#### Added Consumption Period Section (after deserializer field)
```html
<!-- Consumption Period Configuration [NEW] -->
<div class="consumption-period-config">
  <div class="period-type-selector">
    <label class="period-label">Consumption Period</label>
    <mat-radio-group [(ngModel)]="consumeRequest.consumptionPeriodType" class="period-radio-group">
      <mat-radio-button [value]="ConsumptionPeriodType.Manual" color="primary">
        <mat-icon matTooltip="Consume until you manually stop">stop_circle</mat-icon>
        Manual Stop
      </mat-radio-button>
      <mat-radio-button [value]="ConsumptionPeriodType.Duration" color="primary">
        <mat-icon matTooltip="Consume for a fixed duration">schedule</mat-icon>
        Fixed Duration
      </mat-radio-button>
    </mat-radio-group>
  </div>

  <!-- Duration Input - visible only when Duration is selected [NEW] -->
  <div class="duration-selector" *ngIf="consumeRequest.consumptionPeriodType === ConsumptionPeriodType.Duration">
    <mat-form-field appearance="fill" subscriptSizing="dynamic" class="dense-field">
      <mat-label>Duration (seconds)</mat-label>
      <input matInput type="number" [(ngModel)]="consumeRequest.consumptionDurationSeconds" min="1" max="600">
    </mat-form-field>
    
    <div class="duration-presets">
      <button *ngFor="let preset of durationPresets" 
              mat-stroked-button 
              (click)="consumeRequest.consumptionDurationSeconds = preset"
              [class.active]="consumeRequest.consumptionDurationSeconds === preset"
              class="preset-button">
        {{ preset }}s
      </button>
    </div>
  </div>
</div>
```

#### Updated Control Actions (Stop button visibility)
```html
<!-- Changed from: *ngIf="isConsuming && useRealtime" -->
<!-- To: *ngIf="isConsuming" [NEW] -->
<button mat-stroked-button color="warn" 
        *ngIf="isConsuming"
        (click)="stopConsuming()">
  <mat-icon>stop</mat-icon>
  Stop
</button>
```

---

## 8. Frontend Styles

### File: `KafkaBeast.Frontend/src/app/components/topic-detail/topic-detail.component.css`

#### Added Styles
```css
/* Consumption Period Configuration [NEW] */
.consumption-period-config {
  margin-top: 24px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
}

.period-type-selector {
  margin-bottom: 20px;
}

.period-label {
  display: block;
  font-weight: 500;
  margin-bottom: 12px;
  color: var(--text-secondary);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.period-radio-group {
  display: flex;
  gap: 24px;
  align-items: center;
}

.period-radio-group mat-radio-button {
  display: flex;
  align-items: center;
  gap: 8px;
}

.period-radio-group mat-icon {
  font-size: 20px;
  width: 20px;
  height: 20px;
}

.duration-selector {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
}

.duration-presets {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.preset-button {
  font-size: 12px;
  padding: 4px 12px;
  min-width: 50px;
  transition: all 0.3s ease;
}

.preset-button.active {
  background-color: var(--primary-color, #3f51b5);
  color: white;
  border-color: var(--primary-color, #3f51b5);
}
```

---

## Summary of Changes

### Backend (3 files)
- ✅ Added `ConsumptionPeriodType` enum
- ✅ Updated `ConsumeMessageRequest` model
- ✅ Enhanced `KafkaConsumerService` with batch tracking
- ✅ Added `StopBatchConsumption()` method
- ✅ Updated `ConsumeMessagesAsync()` for cancellation support
- ✅ Added new `POST /api/consume/stop-batch` endpoint

### Frontend (4 files)
- ✅ Added `ConsumptionPeriodType` enum
- ✅ Updated `ConsumeMessageRequest` interface
- ✅ Added `stopBatchConsumption()` API method
- ✅ Enhanced component with period configuration
- ✅ Added UI for consumption period selection
- ✅ Implemented stop button for batch mode
- ✅ Added comprehensive styling

### Total: 7 files modified, 0 breaking changes

