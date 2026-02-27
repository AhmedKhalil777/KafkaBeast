# Recent Changes - SQLite Database & Connection Enhancements

## Date: February 17, 2026

### Summary
Added SQLite database persistence for Kafka connections and enhanced connection configuration with Consumer Group ID support.

---

## Changes Made

### 1. **Added Consumer Group ID to Connection Model**
- **File**: `KafkaBeast.Dashboard/Models/KafkaConnection.cs`
- **Change**: Added `ConsumerGroupId` property to the `KafkaConnection` class
- **Purpose**: Allow users to specify a default consumer group ID for each connection
- **Frontend**: Already had the field in the UI (Advanced tab)

### 2. **SQLite Database Integration**
- **Package**: Added Entity Framework Core SQLite packages
  - `Microsoft.EntityFrameworkCore.Sqlite` (v9.0.0)
  - `Microsoft.EntityFrameworkCore.Design` (v9.0.0)

### 3. **Database Context**
- **File**: `KafkaBeast.Dashboard/Data/KafkaBeastDbContext.cs` (NEW)
- **Features**:
  - DbSet for Connections
  - Automatic JSON serialization for AdditionalConfig dictionary
  - Index on Name field for faster lookups
  - Proper entity configuration

### 4. **Updated Connection Service**
- **File**: `KafkaBeast.Dashboard/Services/KafkaConnectionService.cs`
- **Changes**:
  - Replaced in-memory `ConcurrentDictionary` with Entity Framework DbContext
  - All operations now persist to SQLite database
  - Changed from Singleton to Scoped service
  - Added `SeedDefaultConnectionIfNeededAsync()` method
  - Enhanced logging for all operations

### 5. **Updated Program.cs**
- **File**: `KafkaBeast.Dashboard/Program.cs`
- **Changes**:
  - Added DbContextFactory registration
  - Database path: `%LOCALAPPDATA%\KafkaBeast\kafka-beast.db`
  - Automatic database creation on startup
  - Seeds default connection if database is empty
  - Changed KafkaConnectionService from Singleton to Scoped

### 6. **Enhanced Consumer Configuration**
- **File**: `KafkaBeast.Dashboard/Services/KafkaConfigHelper.cs`
- **Change**: Updated `ApplyConsumerSettings()` to use connection's `ConsumerGroupId` as default
- **Hierarchy**: Request GroupId > Connection ConsumerGroupId > Random GUID

### 7. **Frontend XML Validation Fix**
- **File**: `KafkaBeast.Frontend/src/app/components/misc-tools/misc-tools.component.ts`
- **Change**: Removed strict XML validation in Base64 to XML converter
- **Purpose**: Allow formatting of non-standard XML content without validation errors

---

## Database Schema

### Connections Table
| Column | Type | Notes |
|--------|------|-------|
| Id | TEXT | Primary Key |
| Name | TEXT | Required, Indexed |
| BootstrapServers | TEXT | Required |
| SecurityProtocol | INTEGER | Enum |
| SaslMechanism | INTEGER | Nullable |
| SaslUsername | TEXT | Nullable |
| SaslPassword | TEXT | Nullable |
| ClientId | TEXT | Nullable |
| ConsumerGroupId | TEXT | Nullable (NEW) |
| SchemaRegistryUrl | TEXT | Nullable |
| AdditionalConfig | TEXT | JSON serialized |
| CreatedAt | TEXT | DateTime |
| IsActive | INTEGER | Boolean |
| ... (other SSL/SASL fields) | ... | ... |

---

## How It Works

### Connection Persistence
1. All connections are now stored in SQLite database at:
   ```
   Windows: %LOCALAPPDATA%\KafkaBeast\kafka-beast.db
   ```

2. On application startup:
   - Database is created if it doesn't exist
   - If no connections exist, a default connection is seeded
   - All subsequent operations persist to the database

### Consumer Group ID Usage
1. **Priority Order** (highest to lowest):
   - Consumer request's explicit GroupId
   - Connection's default ConsumerGroupId
   - Auto-generated: `kafka-beast-{GUID}`

2. **Configuration**:
   - Set in Connection UI (Advanced tab > Producer Settings > Consumer Group ID)
   - Stored in database
   - Applied automatically when creating consumers

### Client ID Usage
1. **Set in Connection UI** (Advanced tab > Producer Settings > Client ID)
2. **Applied to**:
   - Producer clients
   - Consumer clients
   - Admin clients
3. **Purpose**: Identifies the client application in Kafka broker logs and metrics

---

## Migration Notes

### From In-Memory to Database
- Existing in-memory connections will be lost on first run with this update
- Default connection will be automatically created
- Users should re-add their custom connections through the UI

### No Manual Migrations Needed
- Using `EnsureCreatedAsync()` for simplicity
- Database schema is created automatically
- No separate migration files required

---

## Testing

### Verify Database Creation
1. Start the application
2. Check that database file exists at: `%LOCALAPPDATA%\KafkaBeast\kafka-beast.db`
3. Verify default connection is present

### Verify Persistence
1. Add a new connection with ClientId and ConsumerGroupId
2. Restart the application
3. Verify the connection still exists with all properties

### Verify Consumer Group Usage
1. Create a connection with ConsumerGroupId = "my-test-group"
2. Consume messages without specifying a group ID
3. Check Kafka that the consumer used "my-test-group"

---

## Future Enhancements

- Add migration support for schema changes
- Add database backup/restore functionality
- Add connection import/export (JSON)
- Add connection cloning feature
- Add audit trail for connection changes

