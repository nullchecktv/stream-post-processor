# Design Document

## Overview

This design implements automated deployment of the React frontend application to AWS using CloudFront and S3 with AWS SAM infrastructure as code. The solution creates a separate CloudFormation stack for the frontend with its own GitHub Actions workflow, enabling independent deployment cycles for frontend and backend infrastructure while maintaining proper integration between them.

The design follows the existing project patterns: SAM for infrastructure definition, GitHub Actions for CI/CD, and environment-specific configuration. The GitHub Actions workflow builds the React application with environment variables injected at build time, uploads artifacts to S3, and invalidates the CloudFront cache to serve updated content immediately. This approach provides a fully automated, zero-manual-step deployment pipeline without the limitations of Amplify's GitHub App authentication.

## Architecture

### High-Level Architecture

```
GitHub Repository
    ├── frontend/                    # React application code
    │   ├── template.yaml           # Frontend SAM template (UPDATED)
    │   ├── samconfig.yaml.template # Frontend SAM config template (UPDATED)
    │   └── src/                    # React source code
    │
    ├── .github/workflows/
    │   ├── deploy-dev.yaml         # Backend deployment (UPDATED with path filters)
    │   └── deploy-frontend-dev.yaml # Frontend deployment (UPDATED)
    │
    └── template.yaml               # Backend SAM template (existing)

Deployment Flow (Infrastructure Changes):
1. Developer modifies frontend/template.yaml or samconfig.yaml.template
2. GitHub Actions workflow triggers
3. Workflow deploys frontend SAM template
4. SAM creates/updates CloudFront distribution and S3 bucket
5. Workflow skips build step (no code changes)

Deployment Flow (Frontend Code Changes):
1. Developer pushes frontend code changes (src/**)
2. GitHub Actions workflow triggers
3. Workflow retrieves backend outputs (API URL, Cognito config)
4. Workflow builds React app with environment variables injected
5. Workflow uploads build artifacts to S3
6. Workflow invalidates CloudFront cache
7. Updated frontend is immediately available

Deployment Flow (Both Changes):
1. Developer pushes both infrastructure and code changes
2. GitHub Actions workflow triggers
3. Workflow deploys SAM template first
4. Workflow builds React app with environment variables
5. Workflow uploads artifacts and invalidates cache

Deployment Flow (Pull Request Preview):
1. Developer creates or updates pull request with frontend changes
2. GitHub Actions workflow triggers on pull_request event
3. Workflow generates unique environment hash from GitHub actor name
4. Workflow deploys temporary CloudFormation stack with unique resources
5. Workflow builds React app connecting to dev backend
6. Workflow uploads artifacts to temporary S3 bucket
7. Workflow outputs temporary CloudFront URL for testing
8. Developer tests changes in isolated preview environment
9. After PR is closed/merged, developer manually deletes temporary stack
```

### Separation of Concerns

**Frontend GitHub Actions Workflow**:
- Deploys CloudFormation stack for CloudFront and S3
- Builds React application with environment variables
- Uploads build artifacts to S3
- Invalidates CloudFront cache
- Triggers: Changes to `frontend/**` files

**Backend GitHub Actions Workflow**:
- Deploys CloudFormation stack for API, Lambda, DynamoDB, etc.
- Manages backend infrastructure only
- Triggers: Changes to backend files (excludes `frontend/**` and `.github/workflows/deploy-frontend-dev.yaml`)

### Component Interaction

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Actions                           │
│  ┌──────────────────────┐  ┌──────────────────────────────┐│
│  │ Backend Workflow     │  │ Frontend Workflow            ││
│  │ (deploy-dev.yaml)    │  │ (deploy-frontend-dev.yaml)   ││
│  │                      │  │                              ││
│  │ Triggers on:         │  │ Triggers on:                 ││
│  │ - Backend changes    │  │ - frontend/** changes        ││
│  │ - Manual dispatch    │  │ - Manual dispatch            ││
│  │ Excludes:            │  │                              ││
│  │ - frontend/**        │  │ Steps:                       ││
│  │ - deploy-frontend-   │  │ 1. Deploy SAM (if infra)     ││
│  │   dev.yaml           │  │ 2. Build React app           ││
│  │                      │  │ 3. Upload to S3              ││
│  │                      │  │ 4. Invalidate CloudFront     ││
│  └──────────┬───────────┘  └──────────┬───────────────────┘│
└─────────────┼──────────────────────────┼────────────────────┘
              │                          │
              ▼                          ▼
    ┌─────────────────┐        ┌─────────────────────┐
    │ Backend Stack   │        │ Frontend Stack      │
    │ (SAM)           │        │ (SAM)               │
    │                 │        │                     │
    │ - API Gateway   │◄───────┤ - S3 Bucket         │
    │ - Lambda        │  API   │ - CloudFront        │
    │ - DynamoDB      │  URL   │ - OAC               │
    │ - Cognito       │◄───────┤ - Bucket Policy     │
    └─────────────────┘  Auth  └─────────────────────┘
                          Config        │
                                        ▼
                                ┌───────────────┐
                                │ Build Process │
                                │ (GitHub)      │
                                │               │
                                │ - npm ci      │
                                │ - Vite build  │
                                │ - S3 upload   │
                                │ - CF invalidate│
                                └───────────────┘
```

## Components and Interfaces

### 1. Frontend SAM Template (`frontend/template.yaml`)

**Purpose**: Define CloudFront and S3 infrastructure for static website hosting

**Key Resources**:
- `FrontendBucket`: S3 bucket for storing build artifacts
- `CloudFrontOriginAccessControl`: OAC for secure S3 access
- `CloudFrontDistribution`: CDN distribution for global content delivery
- `BucketPolicy`: S3 bucket policy allowing CloudFront access only

**Parameters**:
- `EnvironmentHash`: Environment identifier for unique naming

**Outputs**:
- `BucketName`: S3 bucket name for artifact uploads
- `DistributionId`: CloudFront distribution ID for cache invalidation
- `DistributionDomainName`: CloudFront domain name (URL)
- `CloudFrontUrl`: Complete HTTPS URL for the frontend

**Template Structure**:
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: Frontend CloudFront and S3 deployment

Parameters:
  EnvironmentHash:
    Type: String
    Description: Environment identifier for unique naming

Resources:
  FrontendBucket:
    Type: AWS::S3::Bucket
    Properties:
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true
      VersioningConfiguration:
        Status: Enabled
      LifecycleConfiguration:
        Rules:
          - Id: DeleteOldVersions
            Status: Enabled
            NoncurrentVersionExpirationInDays: 30

  CloudFrontOriginAccessControl:
    Type: AWS::CloudFront::OriginAccessControl
    Properties:
      OriginAccessControlConfig:
        OriginAccessControlOriginType: s3
        SigningBehavior: always
        SigningProtocol: sigv4

  CloudFrontDistribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Enabled: true
        DefaultRootObject: index.html
        Origins:
          - Id: S3Origin
            DomainName: !GetAtt FrontendBucket.RegionalDomainName
            S3OriginConfig: {}
            OriginAccessControlId: !Ref CloudFrontOriginAccessControl
        DefaultCacheBehavior:
          TargetOriginId: S3Origin
          ViewerProtocolPolicy: redirect-to-https
          AllowedMethods: [GET, HEAD, OPTIONS]
          CachedMethods: [GET, HEAD, OPTIONS]
          ForwardedValues:
            QueryString: false
            Cookies:
              Forward: none
          Compress: true
          DefaultTTL: 86400
          MaxTTL: 31536000
          MinTTL: 0
        CustomErrorResponses:
          - ErrorCode: 403
            ResponseCode: 200
            ResponsePagePath: /index.html
          - ErrorCode: 404
            ResponseCode: 200
            ResponsePagePath: /index.html
        PriceClass: PriceClass_100
        ViewerCertificate:
          CloudFrontDefaultCertificate: true

  BucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref FrontendBucket
      PolicyDocument:
        Statement:
          - Sid: AllowCloudFrontServicePrincipal
            Effect: Allow
            Principal:
              Service: cloudfront.amazonaws.com
            Action: s3:GetObject
            Resource: !Sub '${FrontendBucket.Arn}/*'
            Condition:
              StringEquals:
                AWS:SourceArn: !Sub 'arn:aws:cloudfront::${AWS::AccountId}:distribution/${CloudFrontDistribution}'

Outputs:
  BucketName:
    Description: S3 bucket name for frontend artifacts
    Value: !Ref FrontendBucket
    Export:
      Name: !Sub '${AWS::StackName}-BucketName'

  DistributionId:
    Description: CloudFront distribution ID
    Value: !Ref CloudFrontDistribution
    Export:
      Name: !Sub '${AWS::StackName}-DistributionId'

  DistributionDomainName:
    Description: CloudFront distribution domain name
    Value: !GetAtt CloudFrontDistribution.DomainName
    Export:
      Name: !Sub '${AWS::StackName}-DistributionDomainName'

  CloudFrontUrl:
    Description: CloudFront URL for the frontend
    Value: !Sub 'https://${CloudFrontDistribution.DomainName}'
    Export:
      Name: !Sub '${AWS::StackName}-CloudFrontUrl'
```

### 2. Frontend SAM Configuration Template (`frontend/samconfig.yaml.template`)

**Purpose**: Environment-specific configuration for SAM deployment

**Template Variables**:
- `${STACK_NAME}`: Frontend stack name
- `${ENV_HASH}`: Environment hash for unique naming

**Structure**:
```yaml
version: 0.1

dev:
  deploy:
    parameters:
      stack_name: ${STACK_NAME}
      region: us-east-1
      capabilities: CAPABILITY_IAM
      parameter_overrides:
        EnvironmentHash=${ENV_HASH}
      confirm_changeset: false
      resolve_s3: true
```

### 3. Frontend Deployment Workflow (`.github/workflows/deploy-frontend-dev.yaml`)

**Purpose**: Automate frontend infrastructure deployment and application build/upload

**Trigger Conditions**:
- Push to main branch with changes to any frontend files:
  - `frontend/**` (all frontend files)
- Changes to the workflow file itself
- Manual workflow dispatch

**Workflow Jobs**:

1. **prepare-deployment**: Calculate environment parameters
   - Generate environment hash from actor name
   - Set backend stack name for environment variable retrieval
   - Set frontend stack name
   - Output parameters for subsequent jobs

2. **deploy-infrastructure**: Deploy SAM template (conditional)
   - Only runs if infrastructure files changed
   - Generates samconfig.yaml from template
   - Deploys CloudFormation stack
   - Creates/updates S3 bucket and CloudFront distribution

3. **build-and-deploy**: Build React app and upload to S3
   - Retrieves backend stack outputs (API URL, Cognito config)
   - Installs Node.js dependencies
   - Builds React app with environment variables injected
   - Uploads build artifacts to S3 bucket
   - Invalidates CloudFront cache
   - Waits for invalidation to complete

**Workflow Steps**:
1. Prepare deployment parameters (environment hash, stack names)
2. Checkout repository
3. Configure AWS credentials
4. [Conditional] Deploy SAM template if infrastructure changed
5. Retrieve backend stack outputs
6. Setup Node.js environment
7. Install dependencies with npm ci
8. Build React app with environment variables
9. Upload build artifacts to S3
10. Create CloudFront invalidation
11. Wait for invalidation to complete
12. Output CloudFront URL

**Workflow Structure** (simplified):
```yaml
name: Deploy Frontend (Dev)

on:
  workflow_dispatch:
  push:
    branches: [main]
    paths: ['frontend/**', '.github/workflows/deploy-frontend-dev.yaml']

jobs:
  prepare-deployment:
    # Calculate environment hash and stack names
    outputs:
      env_hash, backend_stack_name, frontend_stack_name, infra_changed

  deploy-infrastructure:
    needs: [prepare-deployment]
    if: needs.prepare-deployment.outputs.infra_changed == 'true'
    steps:
      - Generate samconfig.yaml
      - Deploy SAM template (CloudFront + S3)

  build-and-deploy:
    needs: [prepare-deployment, deploy-infrastructure]
    if: always() && needs.prepare-deployment.result == 'success'
    steps:
      - Retrieve backend outputs (API URL, Cognito)
      - Setup Node.js
      - Install dependencies (npm ci)
      - Build React app with env vars
      - Upload to S3
      - Invalidate CloudFront cache
      - Output CloudFront URL
```

### 4. Pull Request Preview Workflow (`.github/workflows/deploy-frontend-pr.yaml`)

**Purpose**: Deploy temporary preview environments for pull requests

**Trigger Conditions**:
- Pull request opened, synchronized, or reopened
- Changes to frontend files only
- Manual workflow dispatch for cleanup

**Key Differences from Main Workflow**:
- Uses `github.actor` for environment hash (unique per developer)
- Stack name includes PR number or actor name for uniqueness
- Connects to dev backend stack (no separate backend needed)
- No automatic cleanup (manual stack deletion required)

**Workflow Structure**:
```yaml
name: Deploy Frontend PR Preview

on:
  pull_request:
    types: [opened, synchronize, reopened]
    paths: ['frontend/**']
  workflow_dispatch:
    inputs:
      action:
        description: 'Action to perform'
        required: true
        type: choice
        options:
          - deploy
          - cleanup

jobs:
  prepare-deployment:
    outputs:
      env_hash: # From github.actor
      backend_stack_name: babbling-brook-dev
      frontend_stack_name: babbling-brook-frontend-pr-${env_hash}
      
  deploy-infrastructure:
    # Same as main workflow but with PR-specific stack name
    
  build-and-deploy:
    # Same as main workflow
    # Outputs PR preview URL in comment on PR
    
  cleanup:
    if: github.event.inputs.action == 'cleanup'
    steps:
      - Empty S3 bucket
      - Delete CloudFormation stack
```

**PR Comment Integration**:
- Workflow posts comment on PR with preview URL
- Comment includes instructions for cleanup
- Updates comment if preview is redeployed

**Cleanup Process**:
- Manual workflow dispatch with cleanup action
- Empties S3 bucket before stack deletion
- Deletes CloudFormation stack and all resources

### 5. Backend Workflow Updates (`.github/workflows/deploy-dev.yaml`)

**Purpose**: Prevent backend deployments when only frontend changes

**Required Changes**:
```yaml
on:
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - '**'
      - '!frontend/**'
      - '!.github/workflows/deploy-frontend-dev.yaml'
```

**Explanation**:
- `'**'`: Include all files by default
- `'!frontend/**'`: Exclude all frontend directory files
- `'!.github/workflows/deploy-frontend-dev.yaml'`: Exclude frontend workflow file

This ensures the backend workflow only triggers when backend files change, avoiding unnecessary deployments.

### 5. Backend Template Updates

**Purpose**: Export outputs for frontend to retrieve at build time

**Note**: Backend outputs are already exported in the current template. The frontend workflow will retrieve these using AWS CLI commands rather than CloudFormation imports, allowing the frontend to be built and deployed independently without tight coupling.

**Existing Exports** (no changes needed):
```yaml
Outputs:
  ApiUrl:
    Description: API Gateway URL
    Value: !Sub "https://${Api}.execute-api.${AWS::Region}.amazonaws.com/api"
    Export:
      Name: !Sub '${AWS::StackName}-ApiUrl'

  UserPoolId:
    Description: Cognito User Pool ID
    Value: !Ref CognitoUserPool
    Export:
      Name: !Sub '${AWS::StackName}-UserPoolId'

  UserPoolClientId:
    Description: Cognito User Pool Client ID
    Value: !Ref UserPoolClient
    Export:
      Name: !Sub '${AWS::StackName}-UserPoolClientId'

  UserPoolDomain:
    Description: Cognito User Pool Domain
    Value: !Sub "https://${UserPoolDomain}.auth.${AWS::Region}.amazoncognito.com"
    Export:
      Name: !Sub '${AWS::StackName}-UserPoolDomain'
```

### 6. Frontend Environment Configuration

**Purpose**: Configure React app to use environment variables

**No Changes Required**: The frontend already uses `import.meta.env.VITE_*` environment variables. The workflow will inject these at build time.

**Existing Configuration** (`frontend/src/aws-exports.ts`):
```typescript
const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_USER_POOL_ID || '',
      userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || '',
      // ... rest of config
    },
  },
  API: {
    REST: {
      endpoint: import.meta.env.VITE_API_URL || '',
      region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
    },
  },
};
```

**Existing Configuration** (`frontend/src/api/client.ts`):
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
```

**Environment Variable Injection** (in workflow):
```bash
# Retrieve from backend stack
VITE_API_URL=$(aws cloudformation describe-stacks ...)
VITE_USER_POOL_ID=$(aws cloudformation describe-stacks ...)
# ... etc

# Build with env vars
npm run build
```

## Data Models

### GitHub Secrets Required

**No New Secrets Required**: The solution uses existing GitHub secrets for AWS authentication.

**Existing Secrets** (reused):
- `PIPELINE_EXECUTION_ROLE`: IAM role for GitHub Actions
- `CLOUDFORMATION_EXECUTION_ROLE`: IAM role for CloudFormation
- `ARTIFACTS_BUCKET_NAME`: S3 bucket for SAM artifacts

**No Manual Setup Required**: Unlike Amplify, this solution requires zero manual steps. Everything is automated through GitHub Actions and CloudFormation.

### CloudFormation Stack Relationships

```
Backend Stack (babbling-brook-dev)
    ├── Exports:
    │   ├── babbling-brook-dev-ApiUrl
    │   ├── babbling-brook-dev-UserPoolId
    │   ├── babbling-brook-dev-UserPoolClientId
    │   └── babbling-brook-dev-UserPoolDomain
    │
    └── Resources:
        ├── API Gateway
        ├── Lambda Functions
        ├── DynamoDB Table
        └── Cognito User Pool

Frontend Stack (babbling-brook-dev-frontend-dev)
    ├── No CloudFormation Imports (loose coupling)
    │   (Workflow retrieves backend outputs at build time)
    │
    ├── Exports:
    │   ├── babbling-brook-dev-frontend-dev-BucketName
    │   ├── babbling-brook-dev-frontend-dev-DistributionId
    │   ├── babbling-brook-dev-frontend-dev-DistributionDomainName
    │   └── babbling-brook-dev-frontend-dev-CloudFrontUrl
    │
    └── Resources:
        ├── S3 Bucket (FrontendBucket)
        ├── CloudFront Distribution
        ├── Origin Access Control
        └── Bucket Policy

GitHub Actions Workflow
    ├── Retrieves backend outputs at runtime:
    │   ├── Query CloudFormation for ApiUrl
    │   ├── Query CloudFormation for UserPoolId
    │   ├── Query CloudFormation for UserPoolClientId
    │   └── Query CloudFormation for UserPoolDomain
    │
    └── Injects as build-time environment variables:
        ├── VITE_API_URL
        ├── VITE_USER_POOL_ID
        ├── VITE_USER_POOL_CLIENT_ID
        ├── VITE_USER_POOL_DOMAIN
        └── VITE_AWS_REGION
```

**Key Design Decision**: The frontend stack does NOT use CloudFormation `Fn::ImportValue` to import backend outputs. Instead, the GitHub Actions workflow retrieves backend outputs at build time using AWS CLI. This provides:
- **Loose coupling**: Frontend and backend stacks can be deployed independently
- **Flexibility**: Can point frontend to different backend stacks (dev, staging, prod)
- **No circular dependencies**: Backend can be updated without affecting frontend infrastructure
- **Temporary environments**: Easy to create temporary frontend deployments pointing to any backend

## Error Handling

### Deployment Failures

**Scenario**: SAM deployment fails due to missing backend stack
- **Detection**: CloudFormation will fail with "Export not found" error
- **Resolution**: Ensure backend stack is deployed first
- **Prevention**: Document deployment order in README

**Scenario**: GitHub App is not installed or authorized
- **Detection**: Amplify App creation fails with authentication error
- **Resolution**: Install and authorize AWS Amplify GitHub App for the repository
- **Prevention**: Verify GitHub App installation before first deployment

**Scenario**: Build fails in Amplify
- **Detection**: Amplify build logs show npm or Vite errors
- **Resolution**: Check build logs in Amplify console, fix code issues
- **Prevention**: Test builds locally before pushing

### Runtime Errors

**Scenario**: Frontend cannot connect to backend API
- **Detection**: API calls fail with CORS or network errors
- **Resolution**: Verify environment variables are correctly injected
- **Prevention**: Add health check endpoint and test during deployment

**Scenario**: Cognito authentication fails
- **Detection**: Login redirects fail or token validation errors
- **Resolution**: Verify Cognito configuration matches environment variables
- **Prevention**: Validate Cognito outputs during backend deployment

### Rollback Strategy

**Automatic Rollback**:
- CloudFormation automatically rolls back on deployment failure
- Previous Amplify deployment remains active if new build fails

**Manual Rollback**:
1. Identify last successful deployment in CloudFormation console
2. Redeploy previous version using workflow dispatch
3. Or manually trigger Amplify rebuild of previous commit

## Testing Strategy

### Pre-Deployment Testing

**Local Build Verification**:
```bash
cd frontend
npm ci
npm run build
```

**Environment Variable Validation**:
```bash
# Test with sample environment variables
export VITE_API_URL=https://test-api.example.com/api
export VITE_USER_POOL_ID=us-east-1_XXXXXXXXX
npm run build
```

### Post-Deployment Testing

**Automated Checks** (in workflow):
1. Verify CloudFormation stack creation/update succeeded
2. Query stack outputs to confirm Amplify URL
3. Perform HTTP GET request to Amplify URL (health check)

**Manual Verification**:
1. Open Amplify URL in browser
2. Verify application loads correctly
3. Test authentication flow
4. Test API connectivity (create episode, list episodes)
5. Check browser console for errors

**Pull Request Preview Testing**:
1. Create a pull request with frontend changes
2. Wait for Amplify to build preview (check PR comments for URL)
3. Open preview URL (format: `https://pr-{number}.{branch}.{app-id}.amplifyapp.com`)
4. Test changes in isolated preview environment
5. Verify preview uses same backend API as main branch
6. Close PR to automatically delete preview environment

### Integration Testing

**Backend Integration**:
- Test API calls from deployed frontend to backend
- Verify CORS headers allow frontend domain
- Test authentication token flow

**Cognito Integration**:
- Test login flow
- Test token refresh
- Test logout flow

## Pull Request Preview Workflow

### How PR Previews Work

1. **Developer creates PR** with frontend changes
2. **GitHub App notifies Amplify** of new PR
3. **Amplify automatically builds** preview environment
4. **GitHub status check** shows build progress
5. **Preview URL posted** as PR comment by Amplify
6. **Reviewers test** changes in preview environment
7. **PR merged** → main branch deploys to production
8. **PR closed** → preview environment automatically deleted

### Preview Environment Configuration

**Automatic Features**:
- Unique subdomain per PR: `https://pr-{number}.{branch}.{app-id}.amplifyapp.com`
- Same environment variables as main branch
- Isolated build and deployment
- Automatic cleanup on PR close

**GitHub Integration**:
- Build status checks on PR
- Preview URL in PR comments
- Build logs accessible from PR checks
- Deployment notifications

### Preview Environment Limitations

**Shared Backend**:
- Preview environments use the same backend API as main branch
- Database changes affect all environments
- Consider using separate backend stack for testing if needed

**Build Time**:
- Each PR preview requires full build (2-4 minutes)
- Multiple PRs build in parallel
- Build queue may delay previews during high activity

## Deployment Sequence

### Initial Deployment

1. **Deploy Backend Stack** (if not already deployed)
   ```bash
   # Triggers: .github/workflows/deploy-dev.yaml
   # Creates: stream-post-processor-dev stack
   # Exports: API URL, Cognito configuration
   ```

2. **Install GitHub App** (one-time setup)
   ```bash
   # Navigate to: https://github.com/apps/aws-amplify-us-east-1
   # Click "Install" and select your repository
   # Grant necessary permissions
   ```

3. **Deploy Frontend Stack**
   ```bash
   # Triggers: .github/workflows/deploy-frontend-dev.yaml
   # Creates: stream-post-processor-frontend-dev stack
   # Creates: Amplify App with automatic builds
   ```

4. **Verify Deployment**
   ```bash
   # Check Amplify console for build status
   # Access Amplify URL to test application
   ```

### Update Deployment

**Backend Changes Only**:
- Backend workflow deploys backend stack
- Frontend continues using existing deployment
- No frontend rebuild required unless API contract changes

**Frontend Code Changes Only**:
- Amplify automatically builds and deploys (no workflow trigger)
- GitHub Actions workflow does NOT run
- Backend remains unchanged
- Fastest deployment path (2-4 minutes)

**Frontend Infrastructure Changes Only**:
- GitHub Actions workflow deploys SAM template
- Updates Amplify App configuration
- Amplify continues with existing builds
- Backend remains unchanged

**Both Backend and Frontend Changes**:
1. Deploy backend first (updates exports)
2. Deploy frontend second (picks up new exports)
3. Amplify rebuilds with updated environment variables

## Performance Considerations

### Build Optimization

**Amplify Build Cache**:
- Cache `node_modules` between builds
- Reduces build time from ~5 minutes to ~2 minutes

**Vite Build Configuration**:
- Code splitting for vendor chunks
- Tree shaking to remove unused code
- Minification for production builds

### Deployment Speed

**Expected Timings**:
- SAM deployment: 2-3 minutes
- Amplify build: 2-4 minutes
- Total deployment: 4-7 minutes

**Optimization Strategies**:
- Use cached builds in Amplify
- Minimize dependencies
- Parallel deployment of independent stacks

## Security Considerations

### GitHub App Security

**Authentication Method**:
- Uses OAuth-based GitHub App instead of Personal Access Tokens
- No tokens to manage, rotate, or expire
- Fine-grained repository access control
- AWS manages authentication automatically

**Access Control**:
- Install GitHub App only for required repositories
- Review and revoke access through GitHub settings
- Audit access through GitHub App installation logs

### Environment Variable Security

**Sensitive Data**:
- API URLs and Cognito IDs are not sensitive (public information)
- No secrets or API keys in frontend environment variables
- All authentication handled via Cognito tokens

### CORS Configuration

**Backend CORS Settings**:
- Update `CORSOrigin` parameter to include Amplify domain
- Use specific origins in production (not wildcard)
- Verify CORS headers in API Gateway responses

## Monitoring and Observability

### CloudWatch Integration

**Amplify Logs**:
- Build logs available in Amplify console
- Access logs for application requests
- Error logs for failed builds

**CloudFormation Events**:
- Stack creation/update events
- Resource creation status
- Deployment failures and rollbacks

### Amplify Console

**Build History**:
- View all builds and their status
- Access build logs for debugging
- Redeploy previous successful builds

**Metrics**:
- Request count
- Data transfer
- Build duration

## Cost Optimization

### Amplify Pricing

**Build Minutes**:
- First 1,000 build minutes free per month
- $0.01 per build minute after free tier
- Estimated: 2-4 minutes per build

**Hosting**:
- First 15 GB served free per month
- $0.15 per GB after free tier
- Estimated: <1 GB per month for typical usage

**Storage**:
- First 5 GB stored free per month
- $0.023 per GB-month after free tier
- Estimated: <100 MB for build artifacts

### Cost Reduction Strategies

**Minimize Builds**:
- Only trigger builds on frontend changes
- Use branch protection to prevent unnecessary builds
- Disable pull request previews

**Optimize Bundle Size**:
- Code splitting reduces initial load
- Tree shaking removes unused code
- Compression reduces transfer costs

## Alternative Approaches Considered

### Alternative 1: S3 + CloudFront

**Pros**:
- More control over caching and distribution
- Potentially lower cost for high traffic
- Familiar infrastructure pattern

**Cons**:
- More complex setup (S3, CloudFront, Route53, ACM)
- Manual build and upload process
- No automatic builds on git push
- More infrastructure to maintain

**Decision**: Rejected due to complexity and lack of automatic builds

### Alternative 2: Amplify CLI

**Pros**:
- Official Amplify tooling
- Integrated with Amplify ecosystem
- Simpler initial setup

**Cons**:
- Not infrastructure as code (harder to version control)
- Less integration with existing SAM workflow
- Requires separate CLI tool
- Harder to customize for CI/CD

**Decision**: Rejected to maintain consistency with SAM-based infrastructure

### Alternative 3: Manual Amplify Console Setup

**Pros**:
- No code required
- Quick initial setup
- Visual interface

**Cons**:
- Not reproducible
- No version control
- Manual configuration prone to errors
- Doesn't fit infrastructure as code philosophy

**Decision**: Rejected to maintain infrastructure as code approach

## Future Enhancements

### Phase 1 (Current Scope)
- Basic Amplify App deployment
- Automatic builds on git push
- Pull request preview deployments
- Environment variable injection
- Single environment (dev)

### Phase 2 (Future)
- Multiple environments (dev, staging, prod)
- Custom domain configuration
- Enhanced monitoring and alerting
- Automated E2E tests on PR previews

### Phase 3 (Future)
- A/B testing with Amplify
- Performance monitoring integration
- Automated E2E testing in deployment pipeline
- Blue/green deployments

### Phase 4 (Future)
- Multi-region deployment
- CDN optimization
- Advanced caching strategies
- Cost optimization automation
