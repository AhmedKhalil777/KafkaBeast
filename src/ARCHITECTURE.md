# Architecture Overview: Consumption Period Configuration

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Angular)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Topic Detail Component                                         │
│  ├─ Consumption Period UI (NEW)                               │
│  │  ├─ Radio buttons: Manual / Duration                       │
│  │  ├─ Duration input field                                   │
│  │  └─ Preset buttons: [5s] [10s] [15s] [30s] [60s]          │
│  │                                                             │
│  ├─ Consume Controls                                           │
│  │  ├─ Max Messages: 100                                       │
│  │  ├─ Start From: Beginning/Latest                           │
│  │  ├─ Partition selector                                     │
│  │  ├─ Deserializer type                                      │
│  │  └─ Real-time toggle                                       │
│  │                                                             │
│  └─ Action Buttons                                             │
│     ├─ Start                                                   │
│     ├─ Stop (shown when consuming) (UPDATED)                 │
│     ├─ Clear                                                   │
│     └─ Export                                                  │
│                                                                 │
│  Kafka API Service                                             │
│  ├─ consumeBatch() - sends ConsumeMessageRequest              │
│  └─ stopBatchConsumption() (NEW) - calls stop endpoint       │
│                                                                 │
└─────────────────┬───────────────────────────────────────────────┘
                  │ HTTP
                  │
┌─────────────────▼───────────────────────────────────────────────┐
│                      BACKEND (.NET)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Consume Controller                                             │
│  ├─ POST /api/consume/batch                                   │
│  │  ├─ Accepts: ConsumeMessageRequest                         │
│  │  ├─ Params: maxMessages, timeoutSeconds                    │
│  │  └─ Returns: List<ConsumedMessage>                         │
│  │                                                             │
│  └─ POST /api/consume/stop-batch (NEW)                       │
│     ├─ Accepts: (empty body)                                   │
│     └─ Returns: { message: "..." }                             │
│                                                                 │
│  Kafka Consumer Service                                        │
│  ├─ ConsumeMessagesAsync() (UPDATED)                          │
│  │  ├─ Accepts: ConsumeMessageRequest                         │
│  │  ├─ Accepts: CancellationToken                             │
│  │  ├─ Logic:                                                  │
│  │  │  ├─ If Duration mode:                                   │
│  │  │  │  └─ Set timeout = ConsumptionDurationSeconds        │
│  │  │  └─ If Manual mode:                                     │
│  │  │     └─ Use provided timeout (default 5s)               │
│  │  ├─ Creates batch CTS in _batchCancellationTokens          │
│  │  ├─ Polls Kafka while !IsCancellationRequested            │
│  │  └─ Returns: List<ConsumedMessage>                         │
│  │                                                             │
│  ├─ StopBatchConsumption() (NEW)                              │
│  │  ├─ Iterates all batch CTS                                 │
│  │  ├─ Calls .Cancel() on each                                │
│  │  └─ Clears dictionary                                      │
│  │                                                             │
│  └─ _batchCancellationTokens: ConcurrentDictionary (NEW)     │
│     └─ Tracks active batch consumption sessions              │
│                                                                 │
│  Models                                                        │
│  ├─ ConsumptionPeriodType enum (NEW)                         │
│  │  ├─ Duration                                               │
│  │  └─ Manual                                                 │
│  │                                                             │
│  └─ ConsumeMessageRequest (UPDATED)                           │
│     ├─ ConsumptionPeriodType                                  │
│     └─ ConsumptionDurationSeconds                             │
│                                                                 │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
         ┌─────────────────┐
         │  Kafka Cluster  │
         │  (broker msgs)  │
         └─────────────────┘
```

---

## Data Flow: Manual Stop Mode

```
1. User Action
   ├─ Select "Manual Stop"
   ├─ Set Max Messages: 100
   └─ Click "Start"
            │
            ▼
2. Frontend
   ├─ Create ConsumeMessageRequest
   │  ├─ consumptionPeriodType: "Manual"
   │  └─ consumptionDurationSeconds: 30 (unused)
   ├─ Call apiService.consumeBatch(request)
   └─ Set isConsuming = true, isBatchConsuming = true
            │
            ▼
3. Backend - Controller
   ├─ Receive POST /api/consume/batch
   ├─ Log request details
   └─ Call consumerService.ConsumeMessagesAsync(request, 100, 5s, cancellationToken)
            │
            ▼
4. Backend - Service
   ├─ Generate batchId
   ├─ Create linked CancellationTokenSource
   ├─ Store in _batchCancellationTokens[batchId]
   ├─ Calculate timeout = 5 seconds (Manual mode uses provided timeout)
   ├─ Set endTime = now + 5s
   ├─ While messages.Count < 100 && now < endTime && !cancelled:
   │  ├─ Poll Kafka for next message
   │  ├─ Add to messages list
   │  └─ Continue
   ├─ Return List<ConsumedMessage>
   └─ Cleanup: Remove from dictionary, dispose CTS
            │
            ▼
5. Frontend
   ├─ Receive messages list
   ├─ Update consumedMessages property
   ├─ Display messages in list
   ├─ Show: "Consumed X messages"
   └─ Set isConsuming = false, isBatchConsuming = false

6. During Consumption - User Clicks Stop
   ├─ Call stopConsuming()
   ├─ Call apiService.stopBatchConsumption()
   ├─ Backend receives POST /api/consume/stop-batch
   │  ├─ Call consumerService.StopBatchConsumption()
   │  ├─ For each CTS in _batchCancellationTokens:
   │  │  └─ cts.Cancel()
   │  └─ Clear dictionary
   ├─ Frontend shows: "Batch consumption stopped"
   └─ Set isConsuming = false
```

---

## Data Flow: Fixed Duration Mode

```
1. User Action
   ├─ Select "Fixed Duration"
   ├─ Click "15s" preset (or enter custom)
   ├─ Set Max Messages: 500
   └─ Click "Start"
            │
            ▼
2. Frontend
   ├─ Create ConsumeMessageRequest
   │  ├─ consumptionPeriodType: "Duration"
   │  └─ consumptionDurationSeconds: 15
   ├─ Call apiService.consumeBatch(request)
   └─ Set isConsuming = true, isBatchConsuming = true
            │
            ▼
3. Backend - Controller
   ├─ Receive POST /api/consume/batch
   └─ Call consumerService.ConsumeMessagesAsync(request, 500, 5s, cancellationToken)
            │
            ▼
4. Backend - Service
   ├─ Generate batchId
   ├─ Create linked CancellationTokenSource
   ├─ Store in _batchCancellationTokens[batchId]
   ├─ Check ConsumptionPeriodType == Duration
   ├─ Calculate timeout = 15 seconds (Duration mode)
   ├─ Set endTime = now + 15s
   ├─ While messages.Count < 500 && now < endTime && !cancelled:
   │  ├─ Poll Kafka for next message
   │  ├─ Add to messages list
   │  └─ Continue for 15 seconds
   ├─ Auto-stop after timeout expires
   ├─ Return List<ConsumedMessage>
   └─ Cleanup: Remove from dictionary, dispose CTS
            │
            ▼
5. Frontend
   ├─ Receive messages list (all from 15-second window)
   ├─ Update consumedMessages property
   ├─ Display messages in list
   ├─ Show: "Consumed X messages"
   └─ Set isConsuming = false, isBatchConsuming = false
```

---

## State Management

### Component State
```typescript
// Consumer State
isConsuming: boolean = false           // Any consumption active
isBatchConsuming: boolean = false      // Batch-specific flag
useRealtime: boolean = false           // Real-time toggle

// Configuration State
consumeRequest: ConsumeMessageRequest = {
  connectionId: '',
  topic: '',
  autoOffsetReset: true,
  valueSerialization: SerializationType.String,
  consumptionPeriodType: ConsumptionPeriodType.Manual,
  consumptionDurationSeconds: 30
}

maxMessages: number = 100

// Results State
consumedMessages: ConsumedMessage[] = []

// Duration Presets
durationPresets: number[] = [5, 10, 15, 30, 60]
```

### Backend State
```csharp
// Service Level
private ConcurrentDictionary<string, IConsumer<byte[], byte[]>> _consumers;
private ConcurrentDictionary<string, CancellationTokenSource> _cancellationTokens;
private ConcurrentDictionary<string, CancellationTokenSource> _batchCancellationTokens; // NEW

// Per Request
ConsumeMessageRequest request  // Contains period type and duration
CancellationToken cancellationToken  // For cancellation support
```

---

## Cancellation Flow

```
┌─────────────────────────────────────┐
│ User Clicks Stop Button             │
└────────────────┬────────────────────┘
                 │
                 ▼
        ┌──────────────────┐
        │ stopConsuming()  │
        └────────┬─────────┘
                 │
         ┌───────┴───────┐
         │               │
    Real-time?      Batch?
         │               │
         ▼               ▼
   Stop via        Call API:
   SignalR         POST /api/consume/
                   stop-batch
         │               │
         └───────┬───────┘
                 │
                 ▼
        Backend Service:
        StopBatchConsumption()
                 │
                 ▼
        For each CTS in
        _batchCancellationTokens
                 │
                 ▼
           cts.Cancel()
                 │
                 ▼
        Service throws
        OperationCanceledException
                 │
                 ▼
        Caught in finally block:
        ├─ Close consumer
        ├─ Dispose consumer
        ├─ Remove from dict
        └─ Return messages collected
                 │
                 ▼
        Frontend receives response
        Shows: "Batch consumption stopped"
```

---

## Key Design Decisions

### 1. Dual CancellationTokenSource Collections
- **Real-time**: Uses `_cancellationTokens` (per streaming session)
- **Batch**: Uses `_batchCancellationTokens` (NEW) (per batch session)
- **Reason**: Separate tracking for different consumption patterns

### 2. Period Type Determines Timeout
- **Duration**: Uses `ConsumptionDurationSeconds`
- **Manual**: Uses controller parameter (default 5s) or request override
- **Reason**: Clear separation of concerns, backward compatible

### 3. UI Updates Toggle Based on Mode
- **Manual**: Stop button always visible when consuming
- **Duration**: Stop button visible but may not be needed (auto-stops)
- **Real-time**: Existing behavior unchanged
- **Reason**: User clarity on what's happening

### 4. Preset Buttons for Quick Selection
- Common durations: [5s, 10s, 15s, 30s, 60s]
- Direct value assignment: `(click)="consumeRequest.consumptionDurationSeconds = preset"`
- Active state highlighting
- **Reason**: UX convenience

### 5. Backward Compatibility
- All new fields optional with sensible defaults
- Existing API calls work unchanged
- SignalR real-time unaffected
- **Reason**: Zero breaking changes

---

## Concurrency Considerations

### Thread Safety
- `ConcurrentDictionary` used for all shared state
- `CancellationTokenSource` is thread-safe
- No locks needed for standard operations

### Disposal Guarantees
- Try/finally ensures cleanup regardless of outcome
- Cancellation tokens properly disposed
- Consumers properly closed
- Dictionary entries cleaned up

---

## Performance Implications

### Memory
- Per-batch: One `CancellationTokenSource` + entry in dict
- Maximum: Number of concurrent batches × ~100 bytes
- Minimal impact (cleared immediately after batch)

### CPU
- Timeout calculation: O(1)
- Period type check: O(1)
- Cancellation check: O(1) per message poll

### Kafka
- Unchanged consumption pattern
- Same polling mechanism
- Only difference: timeout value changes based on mode

---

## Error Handling

```
Scenario: Cancellation
├─ Backend detects cancellation token set
├─ Service throws OperationCanceledException
├─ Controller catches and returns OK (empty list)
├─ Frontend shows "Batch consumption stopped"
└─ User unaware of internal exception

Scenario: Exception During Consumption
├─ Service logs error
├─ Finally block ensures cleanup
├─ Exception propagates to controller
├─ Controller catches and returns 500
├─ Frontend shows error notification
└─ User is informed of failure

Scenario: User Closes Browser/Tab
├─ HTTP connection drops
├─ CancellationToken triggered
├─ Backend cleanup still executes (gracefully)
└─ Resources freed
```

---

## Testing Strategy

### Unit Tests (Recommended)
```
✓ ConsumptionPeriodType enum values
✓ Default values in ConsumeMessageRequest
✓ StopBatchConsumption() behavior
✓ Timeout calculation logic
✓ CancellationToken propagation
```

### Integration Tests
```
✓ Manual mode: consume until stop
✓ Duration mode: auto-stop after X seconds
✓ Stop endpoint cancels active sessions
✓ Multiple concurrent batches
✓ Message collection accuracy
```

### E2E Tests
```
✓ UI mode selection works
✓ Preset buttons set duration
✓ Start/Stop buttons behave correctly
✓ Messages display correctly
✓ Notifications show at right time
```

