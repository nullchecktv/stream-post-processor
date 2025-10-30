# AWS Infrastructure Documentation

## Infrastructure Overview

This system uses AWS SAM to define and deploy a servers architecture for processing livestream content. The infrastructure is designed for scalability, cost-effectiveness, and event-driven processing.

## Core AWS Services

### AWS Lambda
- **Runtime**: Node.js 22.x
- **Architecture**: ARM64 (cost-optimized)
- **Memory**: 1024 MB (default)
- **Timeout**: 25 seconds (default)
- **Tracing**: AWS X-Ray enabled globally
- **Environment**: Connection reuse enabled

### Amazon DynamoDB
- **Table**: `NullCheckTable` (single table design)
- **Billing**: Pay-per-request (on-demand)
- **Keys**: Composite primary key (pk, sk)
- **GSI**: GSI1 with GSI1PK and GSI1SK
- **TTL**: Enabled on `ttl` attribute for automatic cleanup
- **Deletion Policy**: Delete (for development environments)

### Amazon S3
- **Bucket**: `TranscriptBucket`
- **CORS**: Configured for cross-origin uploads
- **Lifecycle**: 7-day expiration for automatic cleanup
- **Versioning**: Enabled
- **Events**: EventBridge integration for object events

### Amazon EventBridge
- **Default bus**: Used for custom events
- **S3 integration**: Automatic events for object creation
- **MediaConvert integration**: Job status change events
- **Custom events**: Application-specific events (e.g., "Video Upload Completed")

### AWS Bedrock
- **Agent Memory**: `clipAgentMemory` for AI context retention
- **Memory Strategies**: Summary and semantic memory
- **Event Expiry**: 90 days
- **Namespaces**: Session-based and actor-based organization

### AWS MediaConvert
- **Role**: `MediaConvertRole` with S3 access
- **Processing**: Video chunking and preprocessing
- **Integration**: EventBridge for job status notifications
- **Configuration**: 120-second chunk duration (configurable)

### Amazon API Gateway
- **Type**: REST API
- **Stage**: `api`
- **CORS**: Global CORS configuration
- **Validation**: Request and response validation enabled
- **Metrics**: CloudWatch metrics enabled
- **Logging**: Error-level logging with data tracing

## Resource Relationships

### Data Flow Architecture
```
Client → API Gateway → Lambda Functions → DynamoDB/S3
                                      ↓
S3 Events → EventBridge → Lambda Functions → MediaConvert
                                          ↓
MediaConvert Events → EventBridge → Lambda Functions → DynamoDB
```

### Function Triggers
- **API Gateway**: HTTP requests trigger episode management functions
- **EventBridge**: S3 and MediaConvert events trigger processing functions
- **S3 Events**: Transcript uploads trigger analysis workflows

## Environment Configuration

### Global Environment Variables
All Lambda functions inherit these environment variables:
- `AWS_NODEJS_CONNECTION_REUSE_ENABLED=1`: Optimize connection reuse
- `ORIGIN`: CORS origin configuration (from parameter)

### Function-Specific Variables
Each function receives additional environment variables based on its needs:
- `TABLE_NAME`: DynamoDB table name
- `BUCKET_NAME`: S3 bucket name
- `MEMORY_ID`: Bedrock agent memory ID
- `MODEL_ID`: AI model identifier
- `ENCRYPTION_KEY`: For cursor hashing
- `MEDIACONVERT_ROLE_ARN`: IAM role for MediaConvert
- `CHUNK_SECONDS`: Video processing chunk duration

## IAM Security Model

### Function Permissions
Each Lambda function has minimal required permissions:

#### Episode Management Functions
- `dynamodb:GetItem`, `dynamodb:PutItem`, `dynamodb:UpdateItem`
- `dynamodb:Query` (for list operations with GSI)
- `s3:PutObject` (for presigned URL generation)

#### Event Processing Functions
- `dynamodb:GetItem`, `dynamodb:UpdateItem`, `dynamodb:DeleteItem`
- `s3:GetObject`, `s3:ListBucket`
- `events:PutEvents` (for custom event publishing)

#### AI Agent Functions
- `bedrock-agentcore:CreateEvent`, `bedrock-agentcore:ListEvents`
- `bedrock:InvokeModel`
- `bedrock:ListInferenceProfiles`
- `s3:GetObject` (for transcript access)

#### MediaConvert Functions
- `mediaconvert:CreateJob`
- `iam:PassRole` (for MediaConvert role)

### MediaConvert Role
Separate IAM role for MediaConvert service:
- `s3:GetObject`, `s3:GetObjectVersion`, `s3:PutObject`
- Scoped to the transcript bucket only

## Deployment Configuration

### Parameters
- `EncryptionKey`: Sensitive parameter for cursor hashing (NoEcho)
- `CORSOrigin`: CORS configuration (default: '*')

### Stack Outputs
- `ApiUrl`: Complete API Gateway URL for client integration

### Resource Naming
- **Logical names**: PascalCase in CloudFormation template
- **Physical names**: AWS-generated for most resources
- **Tagging**: All resources tagged with project identifier

## Monitoring and Observability

### CloudWatch Integration
- **Metrics**: Automatic Lambda and API Gateway metrics
- **Logs**: Function logs with configurable retention
- **Alarms**: Can be configured for critical thresholds
- **X-Ray**: Distributed tracing enabled globally

### EventBridge Monitoring
- **Event patterns**: Specific patterns for different event types
- **Dead letter queues**: Can be configured for failed event processing
- **Replay capability**: EventBridge supports event replay for debugging

## Cost Optimization

### Serverless Architecture
- **Pay-per-use**: No idle costs for compute resources
- **ARM64**: Lower cost Lambda architecture
- **On-demand DynamoDB**: Pay only for actual usage
- **S3 lifecycle**: Automatic cleanup reduces storage costs

### Resource Sizing
- **Lambda memory**: Right-sized at 1024 MB for balance of performance and cost
- **Timeout**: 25 seconds prevents runaway functions
- **DynamoDB**: On-demand billing scales with usage

## Security Considerations

### Network Security
- **VPC**: Functions run in AWS-managed VPC (no custom VPC required)
- **HTTPS**: All API communication over HTTPS
- **CORS**: Configurable cross-origin policies

### Data Security
- **Encryption**: S3 and DynamoDB use AWS-managed encryption
- **IAM**: Least-privilege access patterns
- **Secrets**: Sensitive parameters use NoEcho flag

### Access Control
- **API Gateway**: Can be extended with authorizers
- **Resource policies**: S3 bucket policies can restrict access
- **Function permissions**: Each function has minimal required permissions

## Scalability Design

### Automatic Scaling
- **Lambda**: Automatic scaling up to account limits
- **DynamoDB**: On-demand scaling handles traffic spikes
- **API Gateway**: Handles high request volumes automatically

### Performance Patterns
- **Connection reuse**: Optimized for Lambda container reuse
- **Single table design**: Efficient DynamoDB access patterns
- **Event-driven**: Asynchronous processing reduces latency

## Disaster Recovery

### Data Durability
- **S3**: 99.999999999% (11 9's) durability
- **DynamoDB**: Multi-AZ replication
- **Lambda**: Stateless functions with automatic failover

### Backup Strategy
- **DynamoDB**: Point-in-time recovery can be enabled
- **S3**: Versioning enabled for data protection
- **Infrastructure**: SAM template serves as infrastructure backup
