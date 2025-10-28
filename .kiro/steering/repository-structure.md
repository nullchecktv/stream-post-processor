# Repository Structure and Architecture

## Project Overview

This is a **Post Production Agentic System** for live streams bu SAM (Serverless Application Model). The system processes livestream transcripts using AI agents to detect clips and manage episode content.

**Key Technologies:**
- AWS SAM Framework
- Node.js 22.x (ESM modules)
- AWS Lambda Functions
- DynamoDB for data storage
- S3 for file storage
- EventBridge for event-driven architecture
- AWS Bedrock for AI/ML capabilities
- AWS MediaConvert for video processing

## Directory Structure

```
├── .aws-sam/                    # SAM build artifacts (auto-generated)
├── .github/                     # GitHub workflows and templates
├── functions/                   # Lambda function source code
│   ├── agents/                  # AI agent functions
│   ├── episodes/                # Episode management functions
│   ├── events/                  # Event-driven functions
│   ├── tools/                   # Utility tools
│   └── utils/                   # Shared utility modules
├── tests/                       # Test files
├── node_modules/                # NPM dependencies (auto-generated)
├── openapi.yaml                 # API specification
├── package.json                 # Node.js dependencies and scripts
├── template.yaml                # SAM CloudFormation template
├── samconfig.toml               # SAM deployment configuration (default)
└── samconfig.yaml               # SAM deployment configuration (dev)
```

## Core Architecture Patterns

### 1. Function Organization
- **Domain-based grouping**: Functions are organized by business domain (agents, episodes, events, tools)
- **Shared utilities**: Common functionality is centralized in `functions/utils/`
- **Event-driven design**: Functions respond to S3, EventBridge, and API Gateway events

### 2. Build Configuration
- **ESM modules**: All functions use ES modules (.mjs extension)
- **esbuild**: Used for bundling with specific configuration for AWS Lambda
- **ARM64 architecture**: All functions run on ARM64 for cost optimization
- **External AWS SDK**: AWS SDK is excluded from bundles (provided by Lambda runtime)

### 3. Data Storage Strategy
- **Single DynamoDB table**: Uses single-table design with GSI for different access patterns
- **S3 bucket**: Stores transcripts and video files with lifecycle policies
- **TTL enabled**: Automatic cleanup of expired data

## Function Categories

### Agents (`functions/agents/`)
- **clip-detector.mjs**: AI agent that analyzes transcripts to detect potential clips
- Uses AWS Bedrock for AI inference
- Integrates with agent memory for context retention

### Episodes (`functions/episodes/`)
- **create-episode.mjs**: Creates new episode records
- **list-episodes.mjs**: Retrieves paginated episode lists
- **upload-transcript.mjs**: Generates presigned URLs for transcript uploads
- **create-track-upload.mjs**: Initiates multipart uploads for video tracks
- **sign-track-parts.mjs**: Signs individual parts for multipart uploads
- **complete-track-upload.mjs**: Completes multipart uploads and triggers processing

### Events (`functions/events/`)
- **transcript-added.mjs**: Processes S3 transcript upload events
- **start-preprocessing.mjs**: Initiates MediaConvert jobs for video processing
- **preprocessing-completed.mjs**: Handles successful MediaConvert completion
- **preprocessing-failed.mjs**: Handles MediaConvert failures

### Tools (`functions/tools/`)
- **create-clips.mjs**: Utility for clip creation operations

### Utils (`functions/utils/`)
- **agents.mjs**: Agent-related utilities
- **api.mjs**: API response helpers
- **encoding.mjs**: Data encoding/decoding utilities
- **statistics.mjs**: Analytics and metrics utilities
- **tools.mjs**: General-purpose tools
- **transcripts.mjs**: Transcript processing utilities

## Key Configuration Files

### template.yaml
- **Primary infrastructure definition**: Defines all AWS resources
- **Global settings**: Runtime, architecture, timeout, memory configuration
- **Environment variables**: Shared across all functions
- **IAM policies**: Least-privilege access for each function
- **Event triggers**: API Gateway, EventBridge, S3 event configurations

### openapi.yaml
- **API specification**: Complete REST API definition
- **CORS configuration**: Cross-origin resource sharing setup
- **Request validation**: Input validation schemas
- **Response schemas**: Standardized response formats
- **Error handling**: Consistent error response patterns

### samconfig.toml (Default Environment)
- **Stack name**: nullcheck-post
- **Region**: us-east-1
- **Profile**: sandbox
- **Parameters**: CORSOrigin=*, EncryptionKey=allen
- **Build optimization**: Cached and parallel builds enabled

### samconfig.yaml (Dev Environment)
- **Stack name**: stream-post-processor
- **Alternative configuration**: For development deployments
- **Same region**: us-east-1 for consistency

## Development Standards

### Code Organization
- Use **ESM modules** exclusively (.mjs extension)
- **Single responsibility**: Each function has one clear purpose
- **Shared utilities**: Common code goes in `functions/utils/`
- **Error handling**: Consistent error patterns across all functions

### Naming Conventions
- **Functions**: kebab-case for file names (e.g., `create-episode.mjs`)
- **Handlers**: Export `handler` function as default
- **Resources**: PascalCase in CloudFormation (e.g., `NullCheckTable`)
- **Environment variables**: UPPER_SNAKE_CASE

### Dependencies
- **AWS SDK v3**: Use modular imports for specific services
- **Zod**: For runtime type validation
- **Crypto**: For hashing and encoding operations
- **No unnecessary dependencies**: Keep bundle sizes minimal

## Deployment Patterns

### Environment Management
- **Default environment**: Uses samconfig.toml (nullcheck-post stack)
- **Dev environment**: Uses samconfig.yaml (stream-post-processor stack)
- **Parameter overrides**: Environment-specific configuration
- **Profile-based deployment**: Uses AWS CLI profiles for different accounts

### Build Process
- **Cached builds**: Enabled for faster development cycles
- **Parallel processing**: Multiple functions built simultaneously
- **Source maps**: Disabled for production builds
- **Minification**: Disabled for debugging capabilities

### Resource Tagging
- **Project identification**: All resources tagged with project name
- **Environment tracking**: Tags distinguish between environments
- **Cost allocation**: Tags enable cost tracking by project/environment
