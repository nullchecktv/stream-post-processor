# Design Document

## Overview

This design implements automated deployment of the React frontend application to AWS Amplify using AWS SAM infrastructure as code. The solution creates a separate CloudFormation stack for the frontend with its own GitHub Actions workflow, enabling independent deployment cycles for frontend and backend infrastructure while maintaining proper integration between them.

The design follows the existing project patterns: SAM for infrastructure definition, GitHub Actions for CI/CD, and environment-specific configuration using template substitution. The Amplify App will automatically build and deploy the React application whenever code is pushed to the repository, with proper environment variable injection for backend API connectivity.

## Architecture

### High-Level Architecture

```
GitHub Repository
    ├── frontend/                    # React application code
    │   ├── template.yaml           # Frontend SAM template (NEW)
    │   ├── samconfig.yaml.template # Frontend SAM config template (NEW)
    │   └── src/                    # React source code
    │
    ├── .github/workflows/
    │   ├── deploy-dev.yaml         # Backend deployment (existing)
    │   └── deploy-frontend-dev.yaml # Frontend infrastructure deployment (NEW)
    │
    └── template.yaml               # Backend SAM template (existing)

Deployment Flow (Infrastructure Changes):
1. Developer modifies frontend/template.yaml or samconfig.yaml.template
2. GitHub Actions workflow triggers
3. Workflow deploys frontend SAM template
4. SAM creates/updates Amplify App configuration
5. Amplify App continues with existing builds

Deployment Flow (Frontend Code Changes):
1. Developer pushes frontend code changes (src/**)
2. GitHub App notifies Amplify automatically
3. Amplify builds and deploys React app
4. No GitHub Actions workflow triggered
5. Frontend connects to backend API via environment variables
```

### Separation of Concerns

**GitHub Actions Workflow** (Infrastructure):
- Deploys CloudFormation stack for Amplify App
- Updates Amplify App configuration (environment variables, build settings)
- Manages infrastructure changes only
- Triggers: Changes to `template.yaml`, `samconfig.yaml.template`, workflow file

**Amplify Automatic Builds** (Application):
- Builds and deploys React application code
- Handles all frontend code changes automatically
- Creates PR preview environments
- Triggers: Any push to connected branch or PR creation via GitHub App

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
│  │ - Manual dispatch    │  │ - .github/workflows/         ││
│  │                      │  │   deploy-frontend-dev.yaml   ││
│  └──────────┬───────────┘  └──────────┬───────────────────┘│
└─────────────┼──────────────────────────┼────────────────────┘
              │                          │
              ▼                          ▼
    ┌─────────────────┐        ┌─────────────────────┐
    │ Backend Stack   │        │ Frontend Stack      │
    │ (SAM)           │        │ (SAM)               │
    │                 │        │                     │
    │ - API Gateway   │◄───────┤ - Amplify App       │
    │ - Lambda        │  API   │ - Branch Config     │
    │ - DynamoDB      │  URL   │ - Build Settings    │
    │ - Cognito       │◄───────┤ - Environment Vars  │
    └─────────────────┘  Auth  └─────────────────────┘
                          Config
```

## Components and Interfaces

### 1. Frontend SAM Template (`frontend/template.yaml`)

**Purpose**: Define AWS Amplify App infrastructure using CloudFormation

**Key Resources**:
- `AmplifyApp`: Main Amplify application resource
- `AmplifyBranch`: Branch configuration for automatic deployments and PR previews
- `AmplifyDomain` (optional): Custom domain configuration

**Pull Request Preview Features**:
- Automatic preview deployments for every pull request
- Unique URL for each PR (e.g., `https://pr-123.branch.amplifyapp.com`)
- Preview environments automatically deleted when PR is closed
- Isolated environment variables for preview deployments

**Parameters**:
- `BackendStackName`: Name of the backend stack to import outputs from
- `Repository`: GitHub repository URL (format: owner/repo)
- `Branch`: Git branch to deploy (default: main)
- `EnvironmentHash`: Environment identifier for unique naming

**Note on Authentication**: AWS Amplify uses the **GitHub App** authentication method instead of Personal Access Tokens. The GitHub App must be installed and authorized manually through the AWS Console or GitHub before CloudFormation deployment. This provides:
- Fine-grained repository access control
- No token expiration issues
- Better security with OAuth-based authentication
- Automatic token rotation by AWS

**Outputs**:
- `AmplifyAppId`: Amplify App ID
- `AmplifyAppUrl`: Default Amplify hosting URL
- `AmplifyBranchName`: Deployed branch name

**Template Structure**:
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: Frontend Amplify App deployment

Parameters:
  BackendStackName:
    Type: String
    Description: Name of the backend CloudFormation stack
  Repository:
    Type: String
    Description: GitHub repository (owner/repo)
  Branch:
    Type: String
    Default: main
  EnvironmentHash:
    Type: String

Resources:
  AmplifyApp:
    Type: AWS::Amplify::App
    Properties:
      Name: !Sub 'content-engine-frontend-${EnvironmentHash}'
      Repository: !Sub 'https://github.com/${Repository}'
      # Note: AccessToken is omitted - GitHub App authentication is configured
      # separately through AWS Console or GitHub. This provides better security
      # and avoids token expiration issues.
      BuildSpec: |
        version: 1
        frontend:
          phases:
            preBuild:
              commands:
                - cd frontend
                - npm ci
            build:
              commands:
                - npm run build
          artifacts:
            baseDirectory: frontend/dist
            files:
              - '**/*'
          cache:
            paths:
              - frontend/node_modules/**/*
      EnvironmentVariables:
        - Name: VITE_API_URL
          Value:
            Fn::ImportValue: !Sub '${BackendStackName}-ApiUrl'
        - Name: VITE_USER_POOL_ID
          Value:
            Fn::ImportValue: !Sub '${BackendStackName}-UserPoolId'
        - Name: VITE_USER_POOL_CLIENT_ID
          Value:
            Fn::ImportValue: !Sub '${BackendStackName}-UserPoolClientId'
        - Name: VITE_USER_POOL_DOMAIN
          Value:
            Fn::ImportValue: !Sub '${BackendStackName}-UserPoolDomain'
        - Name: VITE_AWS_REGION
          Value: !Ref AWS::Region

  AmplifyBranch:
    Type: AWS::Amplify::Branch
    Properties:
      AppId: !GetAtt AmplifyApp.AppId
      BranchName: !Ref Branch
      EnableAutoBuild: true
      EnablePullRequestPreview: true
      PullRequestEnvironmentName: preview

Outputs:
  AmplifyAppId:
    Description: Amplify App ID
    Value: !GetAtt AmplifyApp.AppId
    Export:
      Name: !Sub '${AWS::StackName}-AmplifyAppId'
  
  AmplifyAppUrl:
    Description: Amplify App URL
    Value: !Sub 'https://${Branch}.${AmplifyApp.DefaultDomain}'
    Export:
      Name: !Sub '${AWS::StackName}-AmplifyAppUrl'
```

### 2. Frontend SAM Configuration Template (`frontend/samconfig.yaml.template`)

**Purpose**: Environment-specific configuration for SAM deployment

**Template Variables**:
- `${STACK_NAME}`: Frontend stack name
- `${ENV_HASH}`: Environment hash for unique naming
- `${BACKEND_STACK_NAME}`: Backend stack name for cross-stack references
- `${REPOSITORY}`: GitHub repository
- `${BRANCH}`: Git branch

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
        BackendStackName=${BACKEND_STACK_NAME}
        Repository=${REPOSITORY}
        Branch=${BRANCH}
        EnvironmentHash=${ENV_HASH}
      confirm_changeset: false
      resolve_s3: true
```

### 3. Frontend Deployment Workflow (`.github/workflows/deploy-frontend-dev.yaml`)

**Purpose**: Automate frontend deployment on code changes

**Trigger Conditions**:
- Push to main branch with changes to infrastructure files:
  - `frontend/template.yaml`
  - `frontend/samconfig.yaml.template`
- Changes to the workflow file itself
- Manual workflow dispatch

**Important**: The workflow only deploys infrastructure changes (SAM template). Amplify automatically handles all frontend code deployments via GitHub App integration. This means:
- Frontend code changes (`frontend/src/**`) trigger Amplify builds automatically
- Infrastructure changes trigger GitHub Actions to update the Amplify App configuration
- No redundant deployments or CI/CD conflicts

**Workflow Steps**:
1. Prepare deployment parameters (environment hash, stack names)
2. Checkout repository
3. Configure AWS credentials
4. Generate samconfig.yaml from template
5. Deploy frontend SAM template
6. Output Amplify App URL

**Workflow Structure**:
```yaml
name: Deploy Frontend (Dev)
run-name: Deploy Frontend - ${{ github.actor }}

on:
  workflow_dispatch:
  push:
    branches:
      - main
    paths:
      - 'frontend/template.yaml'
      - 'frontend/samconfig.yaml.template'
      - '.github/workflows/deploy-frontend-dev.yaml'

permissions:
  id-token: write
  contents: read

jobs:
  prepare-deployment:
    name: Prepare Deployment
    runs-on: ubuntu-latest
    outputs:
      env_hash: ${{ steps.prepare-parameters.outputs.env_hash }}
      backend_stack_name: ${{ steps.prepare-parameters.outputs.backend_stack_name }}
      frontend_stack_name: ${{ steps.prepare-parameters.outputs.frontend_stack_name }}
    steps:
      - name: Prepare parameters
        id: prepare-parameters
        run: |
          ENV_DESCRIPTOR="env-${{ github.actor }}"
          ENV_HASH=$(echo -n "$ENV_DESCRIPTOR" | sha1sum | cut -c1-6)
          BACKEND_STACK_NAME="stream-post-processor-dev"
          FRONTEND_STACK_NAME="stream-post-processor-frontend-dev"
          
          echo "env_hash=$ENV_HASH" >> $GITHUB_OUTPUT
          echo "backend_stack_name=$BACKEND_STACK_NAME" >> $GITHUB_OUTPUT
          echo "frontend_stack_name=$FRONTEND_STACK_NAME" >> $GITHUB_OUTPUT

  deploy:
    name: Deploy Frontend
    needs: [prepare-deployment]
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v5
        with:
          aws-region: us-east-1
          role-to-assume: ${{ secrets.PIPELINE_EXECUTION_ROLE }}

      - name: Generate samconfig
        working-directory: frontend
        env:
          STACK_NAME: ${{ needs.prepare-deployment.outputs.frontend_stack_name }}
          ENV_HASH: ${{ needs.prepare-deployment.outputs.env_hash }}
          BACKEND_STACK_NAME: ${{ needs.prepare-deployment.outputs.backend_stack_name }}
          REPOSITORY: ${{ github.repository }}
          BRANCH: main
        run: |
          envsubst < samconfig.yaml.template > samconfig.yaml
          echo "Generated samconfig.yaml:"
          cat samconfig.yaml

      - name: Deploy frontend stack
        working-directory: frontend
        run: |
          sam build --template-file template.yaml
          
          sam deploy \
            --config-file samconfig.yaml \
            --config-env dev \
            --s3-bucket "${{ secrets.ARTIFACTS_BUCKET_NAME }}" \
            --role-arn "${{ secrets.CLOUDFORMATION_EXECUTION_ROLE }}" \
            --no-fail-on-empty-changeset

      - name: Get Amplify URL
        run: |
          AMPLIFY_URL=$(aws cloudformation describe-stacks \
            --stack-name ${{ needs.prepare-deployment.outputs.frontend_stack_name }} \
            --query 'Stacks[0].Outputs[?OutputKey==`AmplifyAppUrl`].OutputValue' \
            --output text)
          
          echo "# Deployment Complete" >> $GITHUB_STEP_SUMMARY
          echo "* Frontend URL: $AMPLIFY_URL" >> $GITHUB_STEP_SUMMARY
```

### 4. Backend Template Updates

**Purpose**: Export outputs for frontend stack consumption

**Required Changes to `template.yaml`**:
```yaml
Outputs:
  ApiUrl:
    Description: API Gateway URL
    Value: !Sub "https://${Api}.execute-api.${AWS::Region}.amazonaws.com/api"
    Export:
      Name: !Sub '${AWS::StackName}-ApiUrl'  # ADD Export

  UserPoolId:
    Description: Cognito User Pool ID
    Value: !Ref CognitoUserPool
    Export:
      Name: !Sub '${AWS::StackName}-UserPoolId'  # ADD Export

  UserPoolClientId:
    Description: Cognito User Pool Client ID
    Value: !Ref UserPoolClient
    Export:
      Name: !Sub '${AWS::StackName}-UserPoolClientId'  # ADD Export

  UserPoolDomain:
    Description: Cognito User Pool Domain
    Value: !Sub "https://${UserPoolDomain}.auth.${AWS::Region}.amazoncognito.com"
    Export:
      Name: !Sub '${AWS::StackName}-UserPoolDomain'  # ADD Export
```

### 5. Frontend Environment Configuration

**Purpose**: Configure React app to use environment variables

**Updates to `frontend/src/aws-exports.ts`**:
```typescript
const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_USER_POOL_ID || '',
      userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || '',
      loginWith: {
        oauth: {
          domain: import.meta.env.VITE_USER_POOL_DOMAIN?.replace('https://', '') || '',
          scopes: ['email', 'openid', 'profile'],
          redirectSignIn: [window.location.origin],
          redirectSignOut: [window.location.origin],
          responseType: 'code',
        },
      },
    },
  },
  API: {
    REST: {
      endpoint: import.meta.env.VITE_API_URL || '',
      region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
    },
  },
};

export default awsConfig;
```

**Updates to `frontend/src/api/client.ts`**:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
```

## Data Models

### GitHub Secrets Required

**No New Secrets Required**: The solution uses GitHub App authentication instead of Personal Access Tokens, eliminating the need for token management in GitHub Secrets.

**Existing Secrets** (reused):
- `PIPELINE_EXECUTION_ROLE`: IAM role for GitHub Actions
- `CLOUDFORMATION_EXECUTION_ROLE`: IAM role for CloudFormation
- `ARTIFACTS_BUCKET_NAME`: S3 bucket for SAM artifacts

**GitHub App Setup** (one-time manual step):
1. Install AWS Amplify GitHub App from: `https://github.com/apps/aws-amplify-us-east-1`
2. Grant access to the repository
3. AWS Amplify will automatically use the GitHub App for authentication
4. GitHub App enables automatic PR preview deployments and status checks

### CloudFormation Stack Relationships

```
Backend Stack (stream-post-processor-dev)
    ├── Exports:
    │   ├── stream-post-processor-dev-ApiUrl
    │   ├── stream-post-processor-dev-UserPoolId
    │   ├── stream-post-processor-dev-UserPoolClientId
    │   └── stream-post-processor-dev-UserPoolDomain
    │
    └── Resources:
        ├── API Gateway
        ├── Lambda Functions
        ├── DynamoDB Table
        └── Cognito User Pool

Frontend Stack (stream-post-processor-frontend-dev)
    ├── Imports:
    │   ├── stream-post-processor-dev-ApiUrl
    │   ├── stream-post-processor-dev-UserPoolId
    │   ├── stream-post-processor-dev-UserPoolClientId
    │   └── stream-post-processor-dev-UserPoolDomain
    │
    ├── Exports:
    │   ├── stream-post-processor-frontend-dev-AmplifyAppId
    │   └── stream-post-processor-frontend-dev-AmplifyAppUrl
    │
    └── Resources:
        ├── Amplify App
        └── Amplify Branch
```

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
