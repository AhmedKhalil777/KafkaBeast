using Aspire.Hosting;

var builder = DistributedApplication.CreateBuilder(args);

// ============================================================================
// Infrastructure Resources
// ============================================================================

// Add Kafka cluster with Kafka UI for management
// Kafka UI provides a web interface for managing Kafka topics, consumers, and producers
var kafka = builder.AddKafka("kafka", port: 9092)
    .WithKafkaUI();

// ============================================================================
// Application Projects
// ============================================================================

// Add the Dashboard web application
// This is the SignalR API server for managing Kafka connections and operations
var dashboard = builder.AddProject("dashboard", "../KafkaBeast.Dashboard/KafkaBeast.Dashboard.csproj")
    .WithReference(kafka);

// Add the Angular frontend
// This runs the Angular development server with proxy configuration
var frontend = builder.AddExecutable("frontend", "node", workingDirectory: "../KafkaBeast.Frontend")
    .WithArgs("start-with-proxy.js")
    .WithHttpEndpoint(port: 4200, name: "http")
    .WithEnvironment("NG_CLI_ANALYTICS", "false")
    .WithReference(dashboard);

// ============================================================================
// Build and Run
// ============================================================================

builder.Build().Run();
