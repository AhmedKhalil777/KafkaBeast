using KafkaBeast.Dashboard.Hubs;
using KafkaBeast.Dashboard.Models;
using KafkaBeast.Dashboard.Services;
using KafkaBeast.ServiceDefaults;
using Microsoft.AspNetCore.Cors;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using System;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add SignalR
builder.Services.AddSignalR();

// Add CORS for Angular frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
              {
                  // Allow any origin on port 4200 (for network access)
                  if (string.IsNullOrEmpty(origin)) return false;
                  try
                  {
                      var uri = new Uri(origin);
                      return uri.Port == 4200;
                  }
                  catch
                  {
                      return false;
                  }
              })
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Add Kafka services
builder.Services.AddSingleton<KafkaConnectionService>();
builder.Services.AddScoped<KafkaProducerService>();
builder.Services.AddScoped<KafkaConsumerService>();

var app = builder.Build();

app.MapDefaultEndpoints();

// Auto-configure default Kafka connection if running under Aspire
var connectionService = app.Services.GetRequiredService<KafkaConnectionService>();
await ConfigureDefaultKafkaConnection(connectionService, app.Configuration, app.Logger);

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowAngular");

app.UseAuthorization();

app.MapControllers();
app.MapHub<KafkaHub>("/hubs/kafka");

// Serve static files for Angular (will be built and copied to wwwroot)
app.UseDefaultFiles();
app.UseStaticFiles();

app.Run();

static async Task ConfigureDefaultKafkaConnection(
    KafkaConnectionService connectionService,
    IConfiguration configuration,
    ILogger logger)
{
    try
    {
        // Check if we already have connections
        var existingConnections = await connectionService.GetAllConnectionsAsync();
        
        // Try multiple ways to get Kafka connection string from Aspire
        // Aspire injects connection strings when using WithReference
        var kafkaConnectionString = 
            configuration.GetConnectionString("kafka") ??
            configuration["ConnectionStrings:kafka"] ??
            configuration["ConnectionStrings__kafka"];
        
        // If still not found, check environment variables (Aspire also sets these)
        if (string.IsNullOrEmpty(kafkaConnectionString))
        {
            kafkaConnectionString = Environment.GetEnvironmentVariable("ConnectionStrings__kafka") ??
                                   Environment.GetEnvironmentVariable("ConnectionStrings:kafka");
        }
        
        // Check if default Aspire connection already exists
        var aspireConnection = existingConnections.FirstOrDefault(c => c.Name == "Aspire Kafka (Docker)");
        
        if (!string.IsNullOrEmpty(kafkaConnectionString) && kafkaConnectionString != "localhost:9092")
        {
            if (aspireConnection == null)
            {
                var defaultConnection = new KafkaConnection
                {
                    Name = "Aspire Kafka (Docker)",
                    BootstrapServers = kafkaConnectionString,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };
                
                await connectionService.AddConnectionAsync(defaultConnection);
                logger.LogInformation("Auto-configured default Kafka connection from Aspire: {BootstrapServers}", kafkaConnectionString);
            }
            else if (aspireConnection.BootstrapServers != kafkaConnectionString)
            {
                // Update if connection string changed
                aspireConnection.BootstrapServers = kafkaConnectionString;
                await connectionService.UpdateConnectionAsync(aspireConnection);
                logger.LogInformation("Updated Aspire Kafka connection: {BootstrapServers}", kafkaConnectionString);
            }
        }
        else if (existingConnections.Count == 0)
        {
            // If no Aspire connection and no connections exist, add a default localhost connection
            var defaultConnection = new KafkaConnection
            {
                Name = "Local Kafka",
                BootstrapServers = "localhost:9092",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            
            await connectionService.AddConnectionAsync(defaultConnection);
            logger.LogInformation("Added default localhost Kafka connection");
        }
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Failed to auto-configure default Kafka connection");
    }
}
