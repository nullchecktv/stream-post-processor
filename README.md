# Encore - The Creator Studio

An agentic content engine for live streams. Automatically generates clips, quotes, and blog posts from livestream transcripts using AI.

## Using the Application

The application is fully deployed in AWS using CloudFormation and is currently running at:

**https://d2kieub2umb93s.cloudfront.net**

To get started:
1. Sign up using a valid email address (you'll receive a verification code)
2. Complete the profile setup wizard to configure your account and create a team
3. Once setup is complete, you can start creating episodes

For AI-powered content generation:
- **Clip proposals, blog posts, and quotes** require a valid transcript in SRT format
- **Clip video generation** requires video tracks to be uploaded to the episode

## Local Testing

### Prerequisites

- Node.js 22.x
- AWS CLI configured with appropriate credentials
- AWS SAM CLI
- An AWS account with permissions to deploy CloudFormation stacks

## Project Structure

```
├── functions/          # Lambda function source code
├── frontend/           # React frontend application
├── schemas/            # Shared Zod schemas
├── templates/          # Email templates
├── workflows/          # Step Functions definitions
├── template.yaml       # SAM CloudFormation template
└── openapi.yaml        # API specification
```

## Backend Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the SAM config template and fill in your values:

```bash
cp samconfig.yaml.template samconfig.yaml
```

Edit `samconfig.yaml` with your configuration:
- `STACK_NAME` - CloudFormation stack name
- `ENV_HASH` - Environment hash for resource naming
- `ENCRYPTION_KEY` - Secret key for token encryption
- `MOMENTO_API_KEY` - Momento API key for real-time notifications
- `CACHE_NAME` - Momento cache name
- `SERP_API_KEY` - SerpAPI key for web search functionality

### 3. Build and Deploy

```bash
# Install esbuild globally (required for SAM build)
npm install -g esbuild

# Build the SAM application
sam build --template-file template.yaml

# Deploy to AWS
sam deploy --config-file samconfig.yaml --config-env dev
```

### 4. Local Development (Optional)

Start the API locally:

```bash
sam local start-api
```

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment

Copy the environment example file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
VITE_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/api
VITE_USER_POOL_ID=us-east-1_xxxxx
VITE_USER_POOL_CLIENT_ID=xxxxx
VITE_REGION=us-east-1
VITE_CACHE_NAME=your-cache-name
```

### 3. Run Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
```

## Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run tests in watch mode
npm run test:watch
```

## Architecture

- **Backend**: AWS Lambda (Node.js 22.x), DynamoDB, S3, EventBridge, Step Functions
- **AI**: AWS Bedrock (Amazon Nova Pro) for content analysis and generation
- **Video Processing**: AWS MediaConvert for video chunking, FFmpeg for clip stitching
- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite
- **Authentication**: AWS Cognito
- **Real-time**: Momento Topics for notifications

## License

Open Software License v. 3.0 (OSL-3.0) - See [LICENSE](LICENSE) for details.
