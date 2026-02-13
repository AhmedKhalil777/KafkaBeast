using Confluent.Kafka;
using Confluent.Kafka.Admin;
using KafkaBeast.Dashboard.Models;

namespace KafkaBeast.Dashboard.Services;

public class KafkaAdminService
{
    private readonly KafkaConnectionService _connectionService;
    private readonly ILogger<KafkaAdminService> _logger;

    public KafkaAdminService(
        KafkaConnectionService connectionService,
        ILogger<KafkaAdminService> logger)
    {
        _connectionService = connectionService;
        _logger = logger;
    }

    private IAdminClient CreateAdminClient(KafkaConnection connection)
    {
        var config = new AdminClientConfig
        {
            BootstrapServers = connection.BootstrapServers
        };

        if (connection.AdditionalConfig != null)
        {
            foreach (var kvp in connection.AdditionalConfig)
            {
                config.Set(kvp.Key, kvp.Value);
            }
        }

        return new AdminClientBuilder(config).Build();
    }

    public async Task<ConnectionTestResult> TestConnectionAsync(string connectionId)
    {
        var connection = await _connectionService.GetConnectionAsync(connectionId);
        if (connection == null)
        {
            return new ConnectionTestResult { Success = false, Message = "Connection not found" };
        }

        try
        {
            using var adminClient = CreateAdminClient(connection);
            var metadata = adminClient.GetMetadata(TimeSpan.FromSeconds(10));
            
            return new ConnectionTestResult
            {
                Success = true,
                Message = "Connection successful",
                BrokerCount = metadata.Brokers.Count,
                TopicCount = metadata.Topics.Count,
                ClusterId = metadata.OriginatingBrokerId.ToString()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing connection {ConnectionId}", connectionId);
            return new ConnectionTestResult { Success = false, Message = ex.Message };
        }
    }

    public async Task<ClusterInfo> GetClusterInfoAsync(string connectionId)
    {
        var connection = await _connectionService.GetConnectionAsync(connectionId);
        if (connection == null)
        {
            throw new InvalidOperationException($"Connection {connectionId} not found");
        }

        using var adminClient = CreateAdminClient(connection);
        var metadata = adminClient.GetMetadata(TimeSpan.FromSeconds(30));

        return new ClusterInfo
        {
            ControllerId = metadata.OriginatingBrokerId,
            Brokers = metadata.Brokers.Select(b => new BrokerInfo
            {
                BrokerId = b.BrokerId,
                Host = b.Host,
                Port = b.Port
            }).ToList(),
            TopicCount = metadata.Topics.Count
        };
    }

    public async Task<List<KafkaTopic>> GetTopicsAsync(string connectionId)
    {
        var connection = await _connectionService.GetConnectionAsync(connectionId);
        if (connection == null)
        {
            throw new InvalidOperationException($"Connection {connectionId} not found");
        }

        using var adminClient = CreateAdminClient(connection);
        var metadata = adminClient.GetMetadata(TimeSpan.FromSeconds(30));

        return metadata.Topics
            .Where(t => !t.Topic.StartsWith("__")) // Exclude internal topics
            .Select(t => new KafkaTopic
            {
                Name = t.Topic,
                PartitionCount = t.Partitions.Count,
                ReplicationFactor = t.Partitions.FirstOrDefault()?.Replicas?.Length ?? 0,
                ConnectionId = connectionId,
                IsInternal = t.Topic.StartsWith("_")
            }).ToList();
    }

    public async Task<TopicDetails> GetTopicDetailsAsync(string connectionId, string topicName)
    {
        var connection = await _connectionService.GetConnectionAsync(connectionId);
        if (connection == null)
        {
            throw new InvalidOperationException($"Connection {connectionId} not found");
        }

        using var adminClient = CreateAdminClient(connection);
        var metadata = adminClient.GetMetadata(topicName, TimeSpan.FromSeconds(30));
        var topicMetadata = metadata.Topics.FirstOrDefault(t => t.Topic == topicName);

        if (topicMetadata == null)
        {
            throw new InvalidOperationException($"Topic {topicName} not found");
        }

        // Get topic configuration
        var configResource = new ConfigResource { Name = topicName, Type = ResourceType.Topic };
        var configs = await adminClient.DescribeConfigsAsync(new[] { configResource });
        var topicConfig = configs.FirstOrDefault();

        var details = new TopicDetails
        {
            Name = topicName,
            ConnectionId = connectionId,
            PartitionCount = topicMetadata.Partitions.Count,
            ReplicationFactor = topicMetadata.Partitions.FirstOrDefault()?.Replicas?.Length ?? 0,
            Partitions = topicMetadata.Partitions.Select(p => new PartitionInfo
            {
                PartitionId = p.PartitionId,
                Leader = p.Leader,
                Replicas = p.Replicas?.ToList() ?? new List<int>(),
                Isrs = p.InSyncReplicas?.ToList() ?? new List<int>()
            }).ToList()
        };

        if (topicConfig != null)
        {
            details.Configurations = topicConfig.Entries.ToDictionary(e => e.Key, e => e.Value.Value ?? "");
        }

        return details;
    }

    public async Task<TopicWatermarks> GetTopicWatermarksAsync(string connectionId, string topicName)
    {
        var connection = await _connectionService.GetConnectionAsync(connectionId);
        if (connection == null)
        {
            throw new InvalidOperationException($"Connection {connectionId} not found");
        }

        var config = new ConsumerConfig
        {
            BootstrapServers = connection.BootstrapServers,
            GroupId = $"kafka-beast-watermarks-{Guid.NewGuid()}"
        };

        if (connection.AdditionalConfig != null)
        {
            foreach (var kvp in connection.AdditionalConfig)
            {
                config.Set(kvp.Key, kvp.Value);
            }
        }

        using var consumer = new ConsumerBuilder<string, string>(config).Build();
        using var adminClient = CreateAdminClient(connection);
        
        var metadata = adminClient.GetMetadata(topicName, TimeSpan.FromSeconds(30));
        var topicMetadata = metadata.Topics.FirstOrDefault(t => t.Topic == topicName);

        if (topicMetadata == null)
        {
            throw new InvalidOperationException($"Topic {topicName} not found");
        }

        var watermarks = new TopicWatermarks
        {
            TopicName = topicName,
            PartitionWatermarks = new List<PartitionWatermark>()
        };

        foreach (var partition in topicMetadata.Partitions)
        {
            var tp = new TopicPartition(topicName, new Partition(partition.PartitionId));
            var wm = consumer.QueryWatermarkOffsets(tp, TimeSpan.FromSeconds(10));

            watermarks.PartitionWatermarks.Add(new PartitionWatermark
            {
                Partition = partition.PartitionId,
                LowOffset = wm.Low.Value,
                HighOffset = wm.High.Value,
                MessageCount = wm.High.Value - wm.Low.Value
            });
        }

        watermarks.TotalMessages = watermarks.PartitionWatermarks.Sum(p => p.MessageCount);
        return watermarks;
    }

    public async Task CreateTopicAsync(string connectionId, CreateTopicRequest request)
    {
        var connection = await _connectionService.GetConnectionAsync(connectionId);
        if (connection == null)
        {
            throw new InvalidOperationException($"Connection {connectionId} not found");
        }

        using var adminClient = CreateAdminClient(connection);

        var topicSpec = new TopicSpecification
        {
            Name = request.TopicName,
            NumPartitions = request.NumPartitions,
            ReplicationFactor = request.ReplicationFactor
        };

        if (request.Configurations != null && request.Configurations.Any())
        {
            topicSpec.Configs = request.Configurations;
        }

        await adminClient.CreateTopicsAsync(new[] { topicSpec });
        _logger.LogInformation("Created topic {TopicName}", request.TopicName);
    }

    public async Task DeleteTopicAsync(string connectionId, string topicName)
    {
        var connection = await _connectionService.GetConnectionAsync(connectionId);
        if (connection == null)
        {
            throw new InvalidOperationException($"Connection {connectionId} not found");
        }

        using var adminClient = CreateAdminClient(connection);
        await adminClient.DeleteTopicsAsync(new[] { topicName });
        _logger.LogInformation("Deleted topic {TopicName}", topicName);
    }

    public async Task<List<ConsumerGroupInfo>> GetConsumerGroupsAsync(string connectionId)
    {
        var connection = await _connectionService.GetConnectionAsync(connectionId);
        if (connection == null)
        {
            throw new InvalidOperationException($"Connection {connectionId} not found");
        }

        using var adminClient = CreateAdminClient(connection);
        var groups = adminClient.ListGroups(TimeSpan.FromSeconds(30));

        return groups
            .Where(g => !g.Group.StartsWith("__"))
            .Select(g => new ConsumerGroupInfo
            {
                GroupId = g.Group,
                State = g.State.ToString(),
                ProtocolType = g.ProtocolType,
                ConnectionId = connectionId
            }).ToList();
    }

    public async Task<ConsumerGroupDetails> GetConsumerGroupDetailsAsync(string connectionId, string groupId)
    {
        var connection = await _connectionService.GetConnectionAsync(connectionId);
        if (connection == null)
        {
            throw new InvalidOperationException($"Connection {connectionId} not found");
        }

        using var adminClient = CreateAdminClient(connection);
        var groups = await adminClient.DescribeConsumerGroupsAsync(new[] { groupId });
        var group = groups.ConsumerGroupDescriptions.FirstOrDefault();

        if (group == null)
        {
            throw new InvalidOperationException($"Consumer group {groupId} not found");
        }

        var details = new ConsumerGroupDetails
        {
            GroupId = group.GroupId,
            State = group.State.ToString(),
            Coordinator = new BrokerInfo
            {
                BrokerId = group.Coordinator.Id,
                Host = group.Coordinator.Host,
                Port = group.Coordinator.Port
            },
            Members = group.Members.Select(m => new ConsumerGroupMember
            {
                GroupInstanceId = m.GroupInstanceId,
                ClientId = m.ClientId,
                Host = m.Host,
                Assignment = m.Assignment?.TopicPartitions?.Select(tp => new TopicPartitionAssignment
                {
                    Topic = tp.Topic,
                    Partition = tp.Partition.Value
                }).ToList() ?? new List<TopicPartitionAssignment>()
            }).ToList()
        };

        return details;
    }

    public async Task<List<ConsumerGroupLag>> GetConsumerGroupLagAsync(string connectionId, string groupId)
    {
        var connection = await _connectionService.GetConnectionAsync(connectionId);
        if (connection == null)
        {
            throw new InvalidOperationException($"Connection {connectionId} not found");
        }

        using var adminClient = CreateAdminClient(connection);
        
        // Get committed offsets
        var offsets = await adminClient.ListConsumerGroupOffsetsAsync(new List<ConsumerGroupTopicPartitions> { new(groupId, []) });
        var groupOffsets = offsets.FirstOrDefault();

        if (groupOffsets == null)
        {
            return new List<ConsumerGroupLag>();
        }

        var lagList = new List<ConsumerGroupLag>();

        // Create a consumer to query watermarks
        var config = new ConsumerConfig
        {
            BootstrapServers = connection.BootstrapServers,
            GroupId = $"kafka-beast-lag-{Guid.NewGuid()}"
        };

        if (connection.AdditionalConfig != null)
        {
            foreach (var kvp in connection.AdditionalConfig)
            {
                config.Set(kvp.Key, kvp.Value);
            }
        }

        using var consumer = new ConsumerBuilder<string, string>(config).Build();

        foreach (var tpo in groupOffsets.Partitions)
        {
            if (tpo.Offset.Value >= 0)
            {
                var wm = consumer.QueryWatermarkOffsets(tpo.TopicPartition, TimeSpan.FromSeconds(10));
                var lag = wm.High.Value - tpo.Offset.Value;

                lagList.Add(new ConsumerGroupLag
                {
                    Topic = tpo.Topic,
                    Partition = tpo.Partition.Value,
                    CurrentOffset = tpo.Offset.Value,
                    EndOffset = wm.High.Value,
                    Lag = lag
                });
            }
        }

        return lagList;
    }

    public async Task DeleteConsumerGroupAsync(string connectionId, string groupId)
    {
        var connection = await _connectionService.GetConnectionAsync(connectionId);
        if (connection == null)
        {
            throw new InvalidOperationException($"Connection {connectionId} not found");
        }

        using var adminClient = CreateAdminClient(connection);
        await adminClient.DeleteGroupsAsync(new[] { groupId });
        _logger.LogInformation("Deleted consumer group {GroupId}", groupId);
    }

    public async Task ResetConsumerGroupOffsetsAsync(string connectionId, ResetOffsetsRequest request)
    {
        var connection = await _connectionService.GetConnectionAsync(connectionId);
        if (connection == null)
        {
            throw new InvalidOperationException($"Connection {connectionId} not found");
        }

        using var adminClient = CreateAdminClient(connection);

        var offsetsToAlter = new List<ConsumerGroupTopicPartitionOffsets>();
        var partitionOffsets = new List<TopicPartitionOffset>();

        if (request.ResetType == OffsetResetType.Earliest || request.ResetType == OffsetResetType.Latest)
        {
            // Get watermarks to determine offsets
            var config = new ConsumerConfig
            {
                BootstrapServers = connection.BootstrapServers,
                GroupId = $"kafka-beast-reset-temp-{Guid.NewGuid()}"
            };

            if (connection.AdditionalConfig != null)
            {
                foreach (var kvp in connection.AdditionalConfig)
                {
                    config.Set(kvp.Key, kvp.Value);
                }
            }

            using var consumer = new ConsumerBuilder<string, string>(config).Build();

            foreach (var topicPartition in request.TopicPartitions)
            {
                var tp = new TopicPartition(topicPartition.Topic, new Partition(topicPartition.Partition));
                var wm = consumer.QueryWatermarkOffsets(tp, TimeSpan.FromSeconds(10));
                var targetOffset = request.ResetType == OffsetResetType.Earliest ? wm.Low : wm.High;
                partitionOffsets.Add(new TopicPartitionOffset(tp, new Offset(targetOffset.Value)));
            }
        }
        else if (request.ResetType == OffsetResetType.Specific)
        {
            foreach (var topicPartition in request.TopicPartitions)
            {
                var tp = new TopicPartition(topicPartition.Topic, new Partition(topicPartition.Partition));
                partitionOffsets.Add(new TopicPartitionOffset(tp, new Offset(topicPartition.TargetOffset ?? 0)));
            }
        }
        else if (request.ResetType == OffsetResetType.Timestamp)
        {
            var config = new ConsumerConfig
            {
                BootstrapServers = connection.BootstrapServers,
                GroupId = $"kafka-beast-reset-temp-{Guid.NewGuid()}"
            };

            if (connection.AdditionalConfig != null)
            {
                foreach (var kvp in connection.AdditionalConfig)
                {
                    config.Set(kvp.Key, kvp.Value);
                }
            }

            using var consumer = new ConsumerBuilder<string, string>(config).Build();
            var timestampToSearch = new List<TopicPartitionTimestamp>();

            foreach (var topicPartition in request.TopicPartitions)
            {
                var tp = new TopicPartition(topicPartition.Topic, new Partition(topicPartition.Partition));
                timestampToSearch.Add(new TopicPartitionTimestamp(tp, new Timestamp(request.Timestamp!.Value)));
            }

            var offsetsForTimes = consumer.OffsetsForTimes(timestampToSearch, TimeSpan.FromSeconds(30));
            partitionOffsets.AddRange(offsetsForTimes);
        }

        if (partitionOffsets.Any())
        {
            var groupOffsets = new ConsumerGroupTopicPartitionOffsets(request.GroupId, partitionOffsets);
            await adminClient.AlterConsumerGroupOffsetsAsync(new[] { groupOffsets });
            _logger.LogInformation("Reset offsets for consumer group {GroupId}", request.GroupId);
        }
    }
}
