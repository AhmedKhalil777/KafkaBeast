# Quick Start Guide: Testing Consumption Period Configuration

## Feature Overview
The consume functionality now supports two consumption modes:
1. **Manual Stop** - Consume until user manually stops
2. **Fixed Duration** - Automatically stop after X seconds (with presets)

---

## UI Location
Navigate to any topic → **Consume Tab**

You'll see a new section below the deserializer field:

```
┌─ Consumption Period ─────────────────────────┐
│                                              │
│ ⊙ Manual Stop      ⊙ Fixed Duration         │
│                                              │
│  (If Fixed Duration selected:)               │
│                                              │
│  Duration (seconds): [30______]             │
│                                              │
│  Quick presets: [5s] [10s] [15s] [30s] [60s]│
│                                              │
└──────────────────────────────────────────────┘
```

---

## How to Use

### Option 1: Manual Stop (Default)
```
1. Select "Manual Stop" radio button
2. Set other options (Max Messages, Start From, etc.)
3. Click "Start" button
4. Messages appear in the list
5. Click "Stop" button to end consumption
   → Consumption stops, results are displayed
   → Shows: "Batch consumption stopped"
```

### Option 2: Fixed Duration
```
1. Select "Fixed Duration" radio button
2. Choose duration:
   a) Click preset button (e.g., "10s"), OR
   b) Enter custom value in input field
3. Set other options (Max Messages, Start From, etc.)
4. Click "Start" button
5. Messages stream in
6. Automatically stops after the duration expires
   → Shows: "Consumed X messages"
```

---

## API Requests

### Start Batch Consumption with Manual Stop
```json
POST /api/consume/batch?maxMessages=100&timeoutSeconds=5

{
  "connectionId": "conn-123",
  "topic": "my-topic",
  "autoOffsetReset": true,
  "valueSerialization": "String",
  "consumptionPeriodType": "Manual",
  "consumptionDurationSeconds": 30
}
```

### Start Batch Consumption with Duration (15 seconds)
```json
POST /api/consume/batch?maxMessages=100&timeoutSeconds=5

{
  "connectionId": "conn-123",
  "topic": "my-topic",
  "autoOffsetReset": true,
  "valueSerialization": "String",
  "consumptionPeriodType": "Duration",
  "consumptionDurationSeconds": 15
}
```

### Stop Batch Consumption
```
POST /api/consume/stop-batch

(no body required)

Response: { "message": "Batch consumption stopped" }
```

---

## Expected Behavior

| Mode | Start | During | Stop | Duration |
|------|-------|--------|------|----------|
| Manual | Messages start arriving | User controls | User clicks Stop | Until stopped |
| 5s Duration | Messages start arriving | Auto-counts | Auto-stops | 5 seconds |
| 10s Duration | Messages start arriving | Auto-counts | Auto-stops | 10 seconds |
| 15s Duration | Messages start arriving | Auto-counts | Auto-stops | 15 seconds |
| 30s Duration | Messages start arriving | Auto-counts | Auto-stops | 30 seconds |
| 60s Duration | Messages start arriving | Auto-counts | Auto-stops | 60 seconds |

---

## Buttons Visibility

| State | Start Button | Stop Button | Clear Button |
|-------|--------------|-------------|--------------|
| Idle | Enabled | Hidden | Visible if messages exist |
| Consuming (Manual) | Disabled | Visible | Hidden |
| Consuming (Duration) | Disabled | Visible | Hidden |
| Complete | Enabled | Hidden | Visible if messages exist |

---

## Real-Time Mode (Unchanged)

The "Real-time streaming" toggle works as before:
- When enabled, uses SignalR for continuous streaming
- Stop button appears while consuming
- Independent of consumption period settings

---

## Common Scenarios

### Scenario A: Check first 50 messages (quick)
```
1. Set Max Messages: 50
2. Select "Fixed Duration"
3. Click "5s" preset
4. Click "Start"
5. Auto-stops after 5 seconds
6. Result: Up to 50 messages in ~5 seconds
```

### Scenario B: Stream messages indefinitely
```
1. Set Max Messages: 1000 (high number)
2. Select "Manual Stop"
3. Click "Start"
4. Watch messages arrive in real-time
5. Click "Stop" when done
```

### Scenario C: Consume for exactly 30 seconds
```
1. Set Max Messages: 10000 (very high)
2. Select "Fixed Duration"
3. Click "30s" preset
4. Click "Start"
5. Auto-stops after 30 seconds
6. Result: All messages from 30-second window
```

### Scenario D: Custom duration
```
1. Set Max Messages: 500
2. Select "Fixed Duration"
3. Clear duration field and type: 45
4. Click "Start"
5. Auto-stops after 45 seconds
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Stop button doesn't appear | Ensure you clicked "Start" and consumption is active |
| Duration doesn't seem right | Check duration field is populated with correct value |
| No messages appear | Verify topic has messages and correct offset settings |
| Consumption stops too soon | Check duration setting or topic availability |
| Can't switch modes | Stop current consumption before switching |

---

## Notes

- **Duration range**: 1-600 seconds (1 second to 10 minutes)
- **Max Messages**: 1-1000 messages per batch
- **Real-time mode**: Unchanged from previous behavior
- **Backward compatible**: Old requests still work with defaults
- **Default values**:
  - Consumption Period Type: Manual
  - Duration: 30 seconds
  - Timeout: 5 seconds

