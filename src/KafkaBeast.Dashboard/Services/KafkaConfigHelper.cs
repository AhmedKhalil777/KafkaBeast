using Confluent.Kafka;
using KafkaBeast.Dashboard.Models;

namespace KafkaBeast.Dashboard.Services;

/// <summary>
/// Helper class to apply KafkaConnection security settings to Kafka client configs
/// </summary>
public static class KafkaConfigHelper
{
    /// <summary>
    /// Apply all security and advanced settings from KafkaConnection to a ClientConfig
    /// </summary>
    public static void ApplyConnectionSettings(ClientConfig config, KafkaConnection connection)
    {
        config.BootstrapServers = connection.BootstrapServers;
        
        // Security Protocol
        config.SecurityProtocol = connection.SecurityProtocol switch
        {
            Models.SecurityProtocol.Plaintext => Confluent.Kafka.SecurityProtocol.Plaintext,
            Models.SecurityProtocol.Ssl => Confluent.Kafka.SecurityProtocol.Ssl,
            Models.SecurityProtocol.SaslPlaintext => Confluent.Kafka.SecurityProtocol.SaslPlaintext,
            Models.SecurityProtocol.SaslSsl => Confluent.Kafka.SecurityProtocol.SaslSsl,
            _ => Confluent.Kafka.SecurityProtocol.Plaintext
        };

        // SASL Settings
        if (connection.SecurityProtocol == Models.SecurityProtocol.SaslPlaintext ||
            connection.SecurityProtocol == Models.SecurityProtocol.SaslSsl)
        {
            if (connection.SaslMechanism.HasValue)
            {
                config.SaslMechanism = connection.SaslMechanism.Value switch
                {
                    Models.SaslMechanism.Plain => Confluent.Kafka.SaslMechanism.Plain,
                    Models.SaslMechanism.ScramSha256 => Confluent.Kafka.SaslMechanism.ScramSha256,
                    Models.SaslMechanism.ScramSha512 => Confluent.Kafka.SaslMechanism.ScramSha512,
                    Models.SaslMechanism.Gssapi => Confluent.Kafka.SaslMechanism.Gssapi,
                    Models.SaslMechanism.OauthBearer => Confluent.Kafka.SaslMechanism.OAuthBearer,
                    _ => Confluent.Kafka.SaslMechanism.Plain
                };
            }

            // SASL Username/Password (PLAIN, SCRAM)
            if (!string.IsNullOrEmpty(connection.SaslUsername))
            {
                config.SaslUsername = connection.SaslUsername;
            }
            if (!string.IsNullOrEmpty(connection.SaslPassword))
            {
                config.SaslPassword = connection.SaslPassword;
            }

            // OAuth Bearer
            if (!string.IsNullOrEmpty(connection.SaslOauthBearerTokenEndpointUrl))
            {
                config.SaslOauthbearerTokenEndpointUrl = connection.SaslOauthBearerTokenEndpointUrl;
            }

            // Kerberos (GSSAPI)
            if (!string.IsNullOrEmpty(connection.SaslKerberosServiceName))
            {
                config.SaslKerberosServiceName = connection.SaslKerberosServiceName;
            }
            if (!string.IsNullOrEmpty(connection.SaslKerberosPrincipal))
            {
                config.SaslKerberosPrincipal = connection.SaslKerberosPrincipal;
            }
            if (!string.IsNullOrEmpty(connection.SaslKerberosKeytab))
            {
                config.SaslKerberosKeytab = connection.SaslKerberosKeytab;
            }
        }

        // SSL Settings
        if (connection.SecurityProtocol == Models.SecurityProtocol.Ssl ||
            connection.SecurityProtocol == Models.SecurityProtocol.SaslSsl)
        {
            if (!string.IsNullOrEmpty(connection.SslCaLocation))
            {
                config.SslCaLocation = connection.SslCaLocation;
            }
            if (!string.IsNullOrEmpty(connection.SslCertificateLocation))
            {
                config.SslCertificateLocation = connection.SslCertificateLocation;
            }
            if (!string.IsNullOrEmpty(connection.SslKeyLocation))
            {
                config.SslKeyLocation = connection.SslKeyLocation;
            }
            if (!string.IsNullOrEmpty(connection.SslKeyPassword))
            {
                config.SslKeyPassword = connection.SslKeyPassword;
            }
            if (!string.IsNullOrEmpty(connection.SslCaPem))
            {
                config.SslCaPem = connection.SslCaPem;
            }
            if (!string.IsNullOrEmpty(connection.SslCertificatePem))
            {
                config.SslCertificatePem = connection.SslCertificatePem;
            }
            if (!string.IsNullOrEmpty(connection.SslKeyPem))
            {
                config.SslKeyPem = connection.SslKeyPem;
            }
            
            // SSL Endpoint Identification
            config.SslEndpointIdentificationAlgorithm = connection.SslEndpointIdentificationAlgorithm 
                ? SslEndpointIdentificationAlgorithm.Https 
                : SslEndpointIdentificationAlgorithm.None;
        }

        // Client ID
        if (!string.IsNullOrEmpty(connection.ClientId))
        {
            config.ClientId = connection.ClientId;
        }

        // Timeouts
        if (connection.SocketTimeoutMs.HasValue)
        {
            config.SocketTimeoutMs = connection.SocketTimeoutMs.Value;
        }
        if (connection.ConnectionsMaxIdleMs.HasValue)
        {
            config.ConnectionsMaxIdleMs = connection.ConnectionsMaxIdleMs.Value;
        }
        if (connection.MetadataMaxAgeMs.HasValue)
        {
            config.MetadataMaxAgeMs = connection.MetadataMaxAgeMs.Value;
        }

        // Additional custom config (for any settings not covered)
        if (connection.AdditionalConfig != null)
        {
            foreach (var kvp in connection.AdditionalConfig)
            {
                try
                {
                    config.Set(kvp.Key, kvp.Value);
                }
                catch
                {
                    // Ignore invalid config keys
                }
            }
        }
    }

    /// <summary>
    /// Apply producer-specific settings from KafkaConnection
    /// </summary>
    public static void ApplyProducerSettings(ProducerConfig config, KafkaConnection connection)
    {
        ApplyConnectionSettings(config, connection);

        // Producer-specific settings
        if (connection.MessageTimeoutMs.HasValue)
        {
            config.MessageTimeoutMs = connection.MessageTimeoutMs.Value;
        }
        if (connection.RequestTimeoutMs.HasValue)
        {
            config.RequestTimeoutMs = connection.RequestTimeoutMs.Value;
        }
        if (connection.MaxInFlight.HasValue)
        {
            config.MaxInFlight = connection.MaxInFlight.Value;
        }
        if (connection.EnableIdempotence.HasValue)
        {
            config.EnableIdempotence = connection.EnableIdempotence.Value;
        }
        if (connection.Acks.HasValue)
        {
            config.Acks = connection.Acks.Value switch
            {
                Models.Acks.None => Confluent.Kafka.Acks.None,
                Models.Acks.Leader => Confluent.Kafka.Acks.Leader,
                Models.Acks.All => Confluent.Kafka.Acks.All,
                _ => Confluent.Kafka.Acks.All
            };
        }
        if (connection.CompressionType.HasValue)
        {
            config.CompressionType = connection.CompressionType.Value switch
            {
                Models.CompressionType.None => Confluent.Kafka.CompressionType.None,
                Models.CompressionType.Gzip => Confluent.Kafka.CompressionType.Gzip,
                Models.CompressionType.Snappy => Confluent.Kafka.CompressionType.Snappy,
                Models.CompressionType.Lz4 => Confluent.Kafka.CompressionType.Lz4,
                Models.CompressionType.Zstd => Confluent.Kafka.CompressionType.Zstd,
                _ => Confluent.Kafka.CompressionType.None
            };
        }
    }

    /// <summary>
    /// Apply consumer-specific settings from KafkaConnection
    /// </summary>
    public static void ApplyConsumerSettings(ConsumerConfig config, KafkaConnection connection)
    {
        ApplyConnectionSettings(config, connection);

        // Consumer-specific settings
        if (connection.SessionTimeoutMs.HasValue)
        {
            config.SessionTimeoutMs = connection.SessionTimeoutMs.Value;
        }
        if (connection.MaxInFlight.HasValue)
        {
            config.MaxPartitionFetchBytes = connection.MaxInFlight.Value * 1024 * 1024; // Convert to bytes
        }
    }
}
