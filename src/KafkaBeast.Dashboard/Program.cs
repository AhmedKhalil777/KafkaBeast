using KafkaBeast.Dashboard.Hubs;
using KafkaBeast.Dashboard.Services;
using KafkaBeast.ServiceDefaults;

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
builder.Services.AddSingleton<SerializationService>();
builder.Services.AddScoped<KafkaProducerService>();
builder.Services.AddScoped<KafkaConsumerService>();
builder.Services.AddScoped<KafkaAdminService>();

var app = builder.Build();

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
