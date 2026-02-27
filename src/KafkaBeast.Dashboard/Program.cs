using System;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using KafkaBeast.Dashboard.Data;
using KafkaBeast.Dashboard.Hubs;
using KafkaBeast.Dashboard.Services;
using KafkaBeast.ServiceDefaults;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

// Add Entity Framework Core with SQLite
var dbPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "KafkaBeast", "kafka-beast.db");
var dbDirectory = Path.GetDirectoryName(dbPath);
if (!Directory.Exists(dbDirectory))
{
    Directory.CreateDirectory(dbDirectory!);
}

builder.Services.AddDbContextFactory<KafkaBeastDbContext>(options =>
    options.UseSqlite($"Data Source={dbPath}"));

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });
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
builder.Services.AddScoped<KafkaConnectionService>();
builder.Services.AddSingleton<SerializationService>();
builder.Services.AddScoped<KafkaProducerService>();
builder.Services.AddScoped<KafkaConsumerService>();
builder.Services.AddScoped<KafkaAdminService>();

var app = builder.Build();

// Initialize database and seed default connection
await using (var scope = app.Services.CreateAsyncScope())
{
    var contextFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<KafkaBeastDbContext>>();
    await using var context = await contextFactory.CreateDbContextAsync();
    await context.Database.EnsureCreatedAsync();
    
    var connectionService = scope.ServiceProvider.GetRequiredService<KafkaConnectionService>();
    await connectionService.SeedDefaultConnectionIfNeededAsync();
}

app.MapDefaultEndpoints();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowAngular");

app.UseAuthorization();

// Serve static files from wwwroot (Angular app)
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();
app.MapHub<KafkaHub>("/hubs/kafka");

// SPA fallback - serve index.html for any unmatched routes (client-side routing)
app.MapFallbackToFile("index.html");

app.Run();
