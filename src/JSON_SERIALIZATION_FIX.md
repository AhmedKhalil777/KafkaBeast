# JSON Serialization Fix for ConsumptionPeriodType

## Issue
When sending `ConsumeMessageRequest` from frontend to backend, the `ConsumptionPeriodType` enum was not deserializing correctly. Error received:

```
"The JSON value could not be converted to KafkaBeast.Dashboard.Models.ConsumptionPeriodType"
```

## Root Cause
The enum was being sent as a string from Angular (e.g., `"Duration"` or `"Manual"`), but the ASP.NET backend's default JSON serializer wasn't configured to handle string-to-enum conversion.

## Solution Applied

### 1. Updated `KafkaConnection.cs`
- Added `using System.Text.Json.Serialization;`
- Added `[JsonConverter(typeof(JsonStringEnumConverter))]` attribute to `ConsumptionPeriodType` enum

```csharp
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ConsumptionPeriodType
{
    Duration,
    Manual
}
```

### 2. Updated `Program.cs`
- Added `using System.Text.Json.Serialization;`
- Configured `AddJsonOptions` in `AddControllers()` call
- Set `PropertyNamingPolicy = JsonNamingPolicy.CamelCase` for consistent naming
- Added `JsonStringEnumConverter` with camelCase to handle all enums
- Set `DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull` for clean JSON

```csharp
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });
```

## Result
✅ Enum values now properly deserialize from JSON strings
✅ Both frontend-to-backend and backend-to-frontend serialization work correctly
✅ Backward compatible with existing code
✅ Works with both "Duration" and "Manual" values

## Testing

### Before Fix
```
POST /api/consume/batch
{
  "connectionId": "...",
  "topic": "...",
  "consumptionPeriodType": "Duration"
}
ERROR: JsonReaderException - could not convert to ConsumptionPeriodType
```

### After Fix
```
POST /api/consume/batch
{
  "connectionId": "...",
  "topic": "...",
  "consumptionPeriodType": "Duration"
}
SUCCESS: 200 OK - Properly deserialized
```

## Files Modified
- ✅ `KafkaBeast.Dashboard/Models/KafkaConnection.cs`
- ✅ `KafkaBeast.Dashboard/Program.cs`

## Impact
- ✅ No breaking changes
- ✅ Backward compatible
- ✅ Enables proper enum serialization globally
- ✅ Benefits all future enum types

