# Migration Notes: Blazor to SignalR + Angular 19

## Overview
The Dashboard has been converted from a Blazor Server application to a SignalR-based API server with an Angular 20 frontend.

## Changes Made

### Backend (KafkaBeast.Dashboard)
1. **Removed Blazor dependencies**
   - Removed MudBlazor package
   - Removed Blazor components and Razor pages
   - Removed Blazor-specific configuration

2. **Added SignalR and API support**
   - Added `Microsoft.AspNetCore.SignalR` package
   - Added `Swashbuckle.AspNetCore` for Swagger documentation
   - Created `KafkaHub` for real-time message streaming
   - Created REST API controllers:
     - `ConnectionsController` - Manage Kafka connections
     - `ProduceController` - Produce messages to topics
     - `ConsumeController` - Consume messages from topics

3. **Updated Program.cs**
   - Configured SignalR hub at `/hubs/kafka`
   - Added CORS policy for Angular frontend (localhost:4200)
   - Configured Swagger for API documentation
   - Set up static file serving for Angular build output

### Frontend (KafkaBeast.Frontend)
1. **Created Angular 19 project structure**
   - Standalone components architecture
   - Routing configuration
   - Environment configuration

2. **Services**
   - `KafkaApiService` - HTTP client for REST API calls
   - `KafkaSignalRService` - SignalR client for real-time messaging

3. **Components**
   - `HomeComponent` - Welcome page
   - `ConnectionsComponent` - Manage Kafka connections
   - `ProduceComponent` - Produce messages to topics
   - `ConsumeComponent` - Consume messages (batch and real-time via SignalR)
   - `NavbarComponent` - Navigation bar

## API Endpoints

### Connections
- `GET /api/connections` - Get all connections
- `GET /api/connections/{id}` - Get connection by ID
- `POST /api/connections` - Create new connection
- `PUT /api/connections/{id}` - Update connection
- `DELETE /api/connections/{id}` - Delete connection
- `PATCH /api/connections/{id}/active` - Set connection active status

### Produce
- `POST /api/produce` - Produce a message to a topic

### Consume
- `POST /api/consume/batch?maxMessages={n}&timeoutSeconds={s}` - Consume messages in batch

### SignalR Hub
- Hub URL: `/hubs/kafka`
- Methods:
  - `StartConsuming(ConsumeMessageRequest)` - Start real-time consumption
  - `StopConsuming(connectionId, topic)` - Stop consumption
- Events:
  - `MessageReceived` - Fired when a message is consumed
  - `Error` - Fired when an error occurs

## Running the Application

### Backend
The backend runs as part of the Aspire host:
```bash
dotnet run --project src/KafkaBeast.AppHost
```

The API will be available at the URL shown in the Aspire dashboard (typically `https://localhost:7000`).

### Frontend
1. Install dependencies:
```bash
cd src/KafkaBeast.Frontend
npm install
```

2. Update API URL in `src/app/environments/environment.ts` to match your backend URL

3. Run development server:
```bash
ng serve
```

The frontend will be available at `http://localhost:4200`.

**Note:** This project uses Angular 19 (compatible with Node.js v22.9.0). If you want to use Angular 20, you'll need to upgrade Node.js to v22.12+ or v24+.

## Configuration

### Backend CORS
The backend is configured to allow requests from `http://localhost:4200` and `https://localhost:4200`. Update the CORS policy in `Program.cs` if you need different origins.

### Frontend API URL
Update the `apiUrl` and `signalRUrl` in:
- `src/KafkaBeast.Frontend/src/app/environments/environment.ts` (development)
- `src/KafkaBeast.Frontend/src/app/environments/environment.prod.ts` (production)

## Building for Production

### Frontend
```bash
cd src/KafkaBeast.Frontend
ng build --configuration production
```

The built files will be in `dist/kafka-beast-frontend/`. Copy these to the backend's `wwwroot` folder to serve them from the same origin.

### Backend
The backend can be built and deployed normally. Ensure the Angular build output is copied to `wwwroot` if you want to serve the frontend from the same server.

## Notes
- The Angular frontend runs separately in development mode
- For production, you may want to build Angular and serve it from the backend's `wwwroot` folder
- SignalR requires CORS to be properly configured for cross-origin requests
- The API uses Swagger for documentation (available at `/swagger` in development)

