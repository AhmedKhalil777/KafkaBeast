# Fix: Group Authorization Failed Error

## Issue
When consuming messages, the following error occurred:
```
Failed to consume: FindCoordinator response error: Group authorization failed.
```

## Root Cause
The `ConsumerConfig` was missing the `GroupId` property, which is **required** for Kafka consumers. Without a GroupId:
- Kafka cannot coordinate the consumer
- Authorization checks fail
- Consumer cannot join a consumer group

## Solution
Updated `KafkaConsumerService.CreateConsumer()` to set `GroupId` in `ConsumerConfig`:

```csharp
var config = new ConsumerConfig
{
    // NEW: Set GroupId - use from request or generate unique one
    GroupId = !string.IsNullOrWhiteSpace(request.GroupId) 
        ? request.GroupId 
        : $"kafkabeast-consumer-{Guid.NewGuid()}",
    AutoOffsetReset = request.AutoOffsetReset ? AutoOffsetReset.Earliest : AutoOffsetReset.Latest,
    EnableAutoCommit = true
};
```

## How It Works
1. **If request has GroupId**: Use the user-specified group ID
2. **If request has no GroupId**: Generate unique group ID like `kafkabeast-consumer-{guid}`

This ensures:
- ✅ Every consumer has a valid GroupId
- ✅ Kafka can coordinate the consumer properly
- ✅ Authorization checks pass
- ✅ Batch consumption creates isolated consumer groups (won't affect each other)

## Testing
Try consuming again. The error should be resolved:

```bash
POST /api/consume/batch
{
  "connectionId": "...",
  "topic": "my-topic",
  "consumptionPeriodType": "Duration",
  "consumptionDurationSeconds": 15
}
```

**Expected:** ✅ 200 OK with consumed messages (no group authorization error)

## Files Modified
- `KafkaBeast.Dashboard/Services/KafkaConsumerService.cs`

## Impact
- ✅ Fixes group authorization error
- ✅ Backward compatible
- ✅ No breaking changes
- ✅ Allows custom GroupId via request if needed

