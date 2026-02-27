# Implementation Summary: Consumption Period Configuration with Cancellation Support

## Overview
This implementation adds the ability for users to configure consumption behavior with two options:
1. **Manual Stop** - Consume messages until the user manually stops
2. **Fixed Duration** - Consume messages for a specified time period (with presets: 5s, 10s, 15s, 30s, 60s)

The frontend now provides cancellation tokens to stop batch consumption on demand.

---

## Backend Changes

### 1. Models - `KafkaBeast.Dashboard/Models/KafkaConnection.cs`
- **Added Enum**: `ConsumptionPeriodType`
  - `Duration` - Fixed time period consumption
  - `Manual` - Consume until manually stopped

- **Updated Class**: `ConsumeMessageRequest`
  - Added `ConsumptionPeriodType ConsumptionPeriodType` (default: Manual)
  - Added `int ConsumptionDurationSeconds` (default: 30 seconds)

### 2. Service - `KafkaBeast.Dashboard/Services/KafkaConsumerService.cs`
- **Added Field**: `ConcurrentDictionary<string, CancellationTokenSource> _batchCancellationTokens`
  - Tracks active batch consumption sessions for on-demand cancellation

- **Updated Method**: `ConsumeMessagesAsync()`
  - Now accepts `CancellationToken cancellationToken` parameter
  - Uses consumption period type to determine timeout behavior:
    - **Duration mode**: Sets timeout to `ConsumptionDurationSeconds`
    - **Manual mode**: Uses provided timeout parameter (default 5s)
  - Stores cancellation token in `_batchCancellationTokens` dictionary
  - Handles `OperationCanceledException` gracefully
  - Logs consumption period type in completion message

- **New Method**: `StopBatchConsumption()`
  - Cancels all active batch consumption sessions
  - Clears the batch cancellation token dictionary

- **Updated Method**: `DisposeAll()`
  - Now also disposes batch cancellation tokens

### 3. Controller - `KafkaBeast.Dashboard/Controllers/ConsumeController.cs`
- **Updated Endpoint**: `POST /api/consume/batch`
  - Now accepts `CancellationToken cancellationToken` parameter
  - Passes cancellation token to service method
  - Handles `OperationCanceledException` by returning empty message list with OK status

- **New Endpoint**: `POST /api/consume/stop-batch`
  - Stops all active batch consumption sessions
  - Returns: `{ message: "Batch consumption stopped" }`
  - Handles errors gracefully with 500 status code

---

## Frontend Changes

### 1. Models - `KafkaBeast.Frontend/src/app/models/kafka.models.ts`
- **Added Enum**: `ConsumptionPeriodType`
  ```typescript
  export enum ConsumptionPeriodType {
    Duration = 'Duration',
    Manual = 'Manual'
  }
  ```

- **Updated Interface**: `ConsumeMessageRequest`
  - Added `consumptionPeriodType?: ConsumptionPeriodType`
  - Added `consumptionDurationSeconds?: number`

### 2. Service - `KafkaBeast.Frontend/src/app/services/kafka-api.service.ts`
- **New Method**: `stopBatchConsumption()`
  ```typescript
  stopBatchConsumption(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/consume/stop-batch`, {});
  }
  ```

### 3. Component - `KafkaBeast.Frontend/src/app/components/topic-detail/topic-detail.component.ts`

#### Imports
- Added `ConsumptionPeriodType` import from models
- Added `MatRadioModule` for radio button selector

#### Properties
```typescript
// Consumption period options
ConsumptionPeriodType = ConsumptionPeriodType;
durationPresets = [5, 10, 15, 30, 60];
batchConsumptionAbortController: AbortController | null = null;
isBatchConsuming = false;
```

#### Updated consumeRequest Initialization
```typescript
consumeRequest: ConsumeMessageRequest = {
  connectionId: '',
  topic: '',
  autoOffsetReset: true,
  valueSerialization: SerializationType.String,
  consumptionPeriodType: ConsumptionPeriodType.Manual,
  consumptionDurationSeconds: 30
};
```

#### Updated Methods
- **`consumeMessages()`**
  - Sets `isBatchConsuming = true`
  - Creates `AbortController` for request cancellation
  - Tracks batch consumption state

- **`stopConsuming()`**
  - Checks `useRealtime` flag to determine stop method
  - For batch consumption: calls `apiService.stopBatchConsumption()`
  - For real-time: uses existing SignalR method
  - Updates both `isConsuming` and `isBatchConsuming` flags

### 4. Template - `KafkaBeast.Frontend/src/app/components/topic-detail/topic-detail.component.html`

#### New Consumption Period Configuration Section
Added after the Deserializer form field:

```html
<!-- Consumption Period Configuration -->
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

  <!-- Duration Input - visible only when Duration is selected -->
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

#### Updated Control Actions
Changed the Stop button condition from `*ngIf="isConsuming && useRealtime"` to `*ngIf="isConsuming"` to show stop button for both real-time and batch consumption.

### 5. Styles - `KafkaBeast.Frontend/src/app/components/topic-detail/topic-detail.component.css`

Added comprehensive styles for the new UI elements:

```css
/* Consumption Period Configuration */
.consumption-period-config {
  margin-top: 24px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
}

.period-type-selector { ... }
.period-label { ... }
.period-radio-group { ... }
.duration-selector { ... }
.duration-presets { ... }
.preset-button { ... }
.preset-button.active { ... }
```

---

## User Experience Flow

### Scenario 1: Manual Stop
1. User selects "Manual Stop" radio button
2. Clicks "Start" to begin consuming
3. Messages stream in as they arrive
4. User clicks "Stop" button to end consumption
5. Backend cancels the batch consumption task
6. Frontend shows success notification

### Scenario 2: Fixed Duration
1. User selects "Fixed Duration" radio button
2. Optionally clicks a preset button (5s, 10s, 15s, 30s, 60s) or enters custom seconds
3. Clicks "Start" to begin consuming
4. Backend automatically stops consumption after the specified duration
5. Remaining messages collected are returned
6. Frontend shows completion notification

---

## API Endpoints

### Batch Consumption
- **Endpoint**: `POST /api/consume/batch`
- **Parameters**:
  - `maxMessages` (query, default: 10)
  - `timeoutSeconds` (query, default: 5) - Used only in Manual mode
- **Body**: `ConsumeMessageRequest` with consumption period settings
- **Response**: `List<ConsumedMessage>`

### Stop Batch Consumption
- **Endpoint**: `POST /api/consume/stop-batch`
- **Method**: POST
- **Body**: Empty
- **Response**: `{ message: "Batch consumption stopped" }`

---

## Backward Compatibility

All changes are backward compatible:
- `ConsumptionPeriodType` defaults to `Manual`
- `ConsumptionDurationSeconds` defaults to 30 seconds
- Existing API calls without the new fields will work with defaults
- Real-time consumption via SignalR is unchanged

---

## Testing Recommendations

1. **Manual Mode**
   - Start consumption with Manual Stop
   - Verify messages arrive
   - Click Stop button
   - Verify consumption stops and frontend updates

2. **Duration Mode**
   - Select Fixed Duration
   - Click preset button (e.g., 5s)
   - Start consumption
   - Verify consumption stops after 5 seconds
   - Verify message count reflects duration

3. **Custom Duration**
   - Enter custom duration (e.g., 15 seconds)
   - Start consumption
   - Verify stops after specified time

4. **Real-time Mode**
   - Verify real-time consumption still works with existing functionality
   - Verify Stop button works for real-time mode

5. **Edge Cases**
   - Stop button while consuming
   - Switch modes mid-consumption
   - Network interruption handling

---

## Files Modified

1. ✅ `KafkaBeast.Dashboard/Models/KafkaConnection.cs` - Added enum and model properties
2. ✅ `KafkaBeast.Dashboard/Services/KafkaConsumerService.cs` - Added cancellation support
3. ✅ `KafkaBeast.Dashboard/Controllers/ConsumeController.cs` - Added stop endpoint
4. ✅ `KafkaBeast.Frontend/src/app/models/kafka.models.ts` - Added TypeScript types
5. ✅ `KafkaBeast.Frontend/src/app/services/kafka-api.service.ts` - Added stop method
6. ✅ `KafkaBeast.Frontend/src/app/components/topic-detail/topic-detail.component.ts` - Added component logic
7. ✅ `KafkaBeast.Frontend/src/app/components/topic-detail/topic-detail.component.html` - Added UI controls
8. ✅ `KafkaBeast.Frontend/src/app/components/topic-detail/topic-detail.component.css` - Added styles

---

## Implementation Notes

- The consumption period configuration is independent of real-time streaming
- Backend properly handles cancellation tokens at the service level
- Frontend tracks batch vs real-time consumption separately
- Duration presets provide quick selection for common timeframes
- All error handling is consistent with existing patterns
- Logging includes consumption period type for debugging

