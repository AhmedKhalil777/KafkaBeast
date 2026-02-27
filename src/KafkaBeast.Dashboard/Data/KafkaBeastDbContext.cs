using Microsoft.EntityFrameworkCore;
using KafkaBeast.Dashboard.Models;

namespace KafkaBeast.Dashboard.Data;

public class KafkaBeastDbContext : DbContext
{
    public KafkaBeastDbContext(DbContextOptions<KafkaBeastDbContext> options)
        : base(options)
    {
    }

    public DbSet<KafkaConnection> Connections { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<KafkaConnection>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired();
            entity.Property(e => e.BootstrapServers).IsRequired();
            
            // Convert Dictionary to JSON string for storage
            entity.Property(e => e.AdditionalConfig)
                .HasConversion(
                    v => v == null ? null : System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                    v => v == null ? null : System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(v, (System.Text.Json.JsonSerializerOptions?)null)
                );

            // Add index on Name for faster lookups
            entity.HasIndex(e => e.Name);
        });
    }
}

