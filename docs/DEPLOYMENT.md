# Frontend Deployment Guide

This guide covers deploying the React frontend application to AWS using CloudFront and S3 with AWS SAM and GitHub Actions.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Deployment Sequence](#deployment-sequence)
4. [Pull Request Preview Environments](#pull-request-preview-environments)
5. [Troubleshooting](#troubleshooting)

## Architecture Overview

The frontend uses a modern CloudFront + S3 architecture for static website hosting:

### S3 Bucket for Static Hosting
- Stores compiled React application build artifacts (HTML, CSS, JavaScript)
- Configured with versioning for rollback capability
- Lifecycle policies automatically clean up old versions after 30 days
- Public access blocked - only CloudFront can access the bucket

### CloudFront Distribution for CDN
- Global content delivery network for low-latency access worldwide
- Caches static assets at edge locations close to users
- Automatic HTTPS with CloudFront default certificate
- Compression enabled for faster downloads
- Custom error responses for single-page application routing (404/403 → index.html)

### Origin Access Control for Security
- Restricts S3 bucket access to only CloudFront requests
- Prevents direct S3 bucket access from the internet
- Uses AWS Signature Version 4 for secure authentication
- Bucket policy explicitly allows only CloudFront distribution

### Automatic Cache Invalidation
- GitHub Actions workflow invalidates CloudFront cache after deployment
- Ensures users immediately see updated content
- Invalidates all paths (/*) for complete cache refresh
- Waits for invalidation to complete before marking deployment successful

### Deployment Flow
```
GitHub Push → GitHub Actions → Build React App → Upload to S3 → Invalidate CloudFront → Users See Updates
```

## Prerequisites

Before deploying the frontend, ensure you have:

- **Backend deployed**: The backend CloudFormation stack must be deployed first (provides API URL and Cognito configuration)
- **AWS credentials**: Configured with appropriate permissions for CloudFormation, S3, and CloudFront
- **GitHub repository**: Code pushed to GitHub repository
- **GitHub secrets configured**:
  - `PIPELINE_EXECUTION_ROLE`: IAM role ARN for GitHub Actions
  - `CLOUDFORMATION_EXECUTION_ROLE`: IAM role ARN for CloudFormation
  - `ARTIFACTS_BUCKET_NAME`: S3 bucket name for SAM artifacts



## Deployment Sequence

The deployment process is fully automated through GitHub Actions. Follow these steps:

### 1. Deploy Backend Stack (If Not Already Deployed)

The frontend depends on backend outputs for API URL and Cognito configuration:

```bash
# From repository root
sam build
sam deploy --config-env dev
```

Verify backend deployment:
```bash
aws cloudformation describe-stacks \
  --stack-name babbling-brook-dev \
  --query 'Stacks[0].Outputs'
```

Expected outputs:
- `ApiUrl`: API Gateway endpoint URL
- `UserPoolId`: Cognito User Pool ID
- `UserPoolClientId`: Cognito User Pool Client ID
- `UserPoolDomain`: Cognito User Pool Domain

### 2. Deploy Frontend Infrastructure (SAM Template)

The frontend infrastructure is deployed automatically via GitHub Actions when you push changes to infrastructure files.

#### Automatic Deployment (Recommended)

Push changes to the `main` branch that modify:
- `frontend/template.yaml` (CloudFront and S3 configuration)
- `frontend/samconfig.yaml.template` (SAM configuration)
- `.github/workflows/deploy-frontend-dev.yaml` (workflow configuration)

GitHub Actions will automatically:
1. Detect infrastructure changes
2. Generate SAM configuration with environment hash
3. Deploy CloudFormation stack (creates S3 bucket and CloudFront distribution)
4. Build React application with environment variables
5. Upload build artifacts to S3
6. Invalidate CloudFront cache
7. Output CloudFront URL

Monitor deployment:
- Go to GitHub repository → Actions tab
- Click on the running "Deploy Frontend (Dev)" workflow
- View deployment logs and status

#### Manual Deployment (Alternative)

If you need to deploy manually:

```bash
cd frontend

# Generate SAM configuration
export STACK_NAME="babbling-brook-frontend-dev"
export ENV_HASH=$(echo -n "env-$(whoami)" | sha1sum | cut -c1-6)

envsubst < samconfig.yaml.template > samconfig.yaml

# Build and deploy infrastructure
sam build --template-file template.yaml
sam deploy --config-file samconfig.yaml --config-env dev

# Build and upload React application
npm ci
npm run build

# Get bucket name from stack outputs
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text)

# Upload to S3
aws s3 sync dist/ s3://$BUCKET_NAME/ --delete

# Get distribution ID and invalidate cache
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
  --output text)

aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

### 3. Verify Deployment

1. **Check CloudFormation stack**:
```bash
aws cloudformation describe-stacks \
  --stack-name babbling-brook-frontend-dev \
  --query 'Stacks[0].Outputs'
```

Expected outputs:
- `BucketName`: S3 bucket name for artifacts
- `DistributionId`: CloudFront distribution ID
- `DistributionDomainName`: CloudFront domain name
- `CloudFrontUrl`: Complete HTTPS URL

2. **Get CloudFront URL**:
```bash
aws cloudformation describe-stacks \
  --stack-name babbling-brook-frontend-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontUrl`].OutputValue' \
  --output text
```

3. **Test the application**:
   - Open the CloudFront URL in a browser
   - Verify the application loads correctly
   - Test authentication flow (login/logout)
   - Test API connectivity (create episode, list episodes)
   - Check browser console for errors
   - Verify HTTPS is working

4. **Check CloudFront distribution**:
   - Go to CloudFront Console
   - Find your distribution (check Description for stack name)
   - Verify status is "Deployed"
   - Check origin points to S3 bucket
   - Verify Origin Access Control is configured

5. **Check S3 bucket**:
   - Go to S3 Console
   - Find your bucket (name from stack outputs)
   - Verify build artifacts are present (index.html, assets/)
   - Confirm public access is blocked
   - Check bucket policy allows only CloudFront

### 4. Subsequent Deployments

After initial deployment, the workflow intelligently handles different types of changes:

#### Frontend Code Changes Only
When you modify files in `frontend/src/**`:
1. GitHub Actions workflow triggers
2. Workflow skips infrastructure deployment (no changes detected)
3. Workflow builds React application with environment variables
4. Workflow uploads new build artifacts to S3
5. Workflow invalidates CloudFront cache
6. Users see updates within 1-2 minutes

#### Infrastructure Changes Only
When you modify `frontend/template.yaml` or `frontend/samconfig.yaml.template`:
1. GitHub Actions workflow triggers
2. Workflow deploys SAM template (updates CloudFront/S3 configuration)
3. Workflow skips build step (no code changes)
4. Infrastructure updates complete

#### Both Code and Infrastructure Changes
When you modify both infrastructure and code:
1. GitHub Actions workflow triggers
2. Workflow deploys infrastructure first
3. Workflow builds and uploads code second
4. Workflow invalidates cache
5. Complete deployment with all updates

#### Backend Changes
When backend API or Cognito configuration changes:
1. Deploy backend stack first
2. Frontend workflow automatically retrieves new backend outputs
3. Next frontend deployment uses updated configuration
4. No manual intervention required



## Troubleshooting

### Common Deployment Errors

#### Error: CloudFormation stack creation failed

**Symptom**:
```
CREATE_FAILED: Resource creation failed
```

**Cause**: CloudFormation unable to create S3 bucket or CloudFront distribution

**Solution**:
1. Check CloudFormation console for specific error message
2. Verify IAM permissions for CloudFormation execution role
3. Ensure no resource name conflicts (though template uses auto-generated names)
4. Check CloudFormation events for detailed error information

#### Error: Backend stack outputs not found

**Symptom**:
```
Error retrieving backend outputs
```

**Cause**: Backend stack not deployed or outputs not available

**Solution**:
1. Verify backend stack exists:
```bash
aws cloudformation describe-stacks --stack-name babbling-brook-dev
```

2. Check backend outputs are available:
```bash
aws cloudformation describe-stacks \
  --stack-name babbling-brook-dev \
  --query 'Stacks[0].Outputs'
```

3. Deploy backend stack if missing:
```bash
sam build
sam deploy --config-env dev
```

#### Error: GitHub Actions workflow fails

**Symptom**:
Workflow fails during build or deployment steps

**Cause**: Various issues with build process, AWS credentials, or configuration

**Solution**:
1. Check GitHub Actions logs for specific error
2. Verify GitHub secrets are configured correctly
3. Test build locally:
```bash
cd frontend
npm ci
npm run build
```
4. Verify AWS credentials have necessary permissions

### CloudFront Cache Issues

#### Issue: Updates not visible after deployment

**Symptom**:
- Deployment succeeds but users see old content
- Changes visible in S3 but not through CloudFront URL

**Cause**: CloudFront cache not invalidated or invalidation still in progress

**Solution**:
1. Check invalidation status:
```bash
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name babbling-brook-frontend-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
  --output text)

aws cloudfront list-invalidations --distribution-id $DISTRIBUTION_ID
```

2. Create manual invalidation if needed:
```bash
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

3. Wait for invalidation to complete (usually 1-2 minutes)

4. Clear browser cache and test again

#### Issue: Slow content delivery

**Symptom**:
- Application loads slowly for users
- High latency on asset requests

**Cause**: CloudFront cache not warmed up or inefficient caching

**Solution**:
1. Check CloudFront cache hit ratio in CloudWatch metrics
2. Verify cache behavior settings in CloudFront distribution
3. Consider adjusting TTL values in template.yaml
4. Use CloudFront cache warming for critical assets

### S3 Upload Issues

#### Error: S3 sync fails

**Symptom**:
```
Error uploading files to S3
```

**Cause**: Insufficient permissions or bucket not accessible

**Solution**:
1. Verify bucket exists:
```bash
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name babbling-brook-frontend-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text)

aws s3 ls s3://$BUCKET_NAME/
```

2. Check IAM permissions for S3 access
3. Verify bucket policy allows uploads from GitHub Actions role

#### Issue: Files uploaded but not accessible

**Symptom**:
- Files visible in S3 console
- CloudFront returns 403 errors

**Cause**: Bucket policy or Origin Access Control misconfigured

**Solution**:
1. Verify bucket policy allows CloudFront access
2. Check Origin Access Control is properly configured
3. Ensure public access is blocked on bucket
4. Review CloudFront origin settings

### Build Failures

#### Error: npm ci fails

**Symptom**:
```
npm ERR! code ENOTFOUND
npm ERR! network request failed
```

**Cause**: Network issues or invalid dependencies

**Solution**:
1. Test locally:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm ci
```

2. Check package.json for invalid dependencies
3. Verify npm registry is accessible
4. Check for private packages requiring authentication

#### Error: Vite build fails

**Symptom**:
```
ERROR: Build failed with exit code 1
```

**Cause**: TypeScript errors, missing environment variables, or build configuration issues

**Solution**:
1. Test build locally with environment variables:
```bash
cd frontend
export VITE_API_URL=https://your-api-url.com/api
export VITE_USER_POOL_ID=us-east-1_XXXXXXXXX
export VITE_USER_POOL_CLIENT_ID=your-client-id
export VITE_USER_POOL_DOMAIN=https://your-domain.auth.us-east-1.amazoncognito.com
export VITE_AWS_REGION=us-east-1
npm run build
```

2. Check build logs for TypeScript errors
3. Verify all required environment variables are set
4. Ensure tsconfig.json is correct

#### Error: Environment variables not injected

**Symptom**:
- Build succeeds but application can't connect to backend
- Console shows undefined environment variables

**Cause**: Environment variables not set during build

**Solution**:
1. Verify GitHub Actions workflow retrieves backend outputs
2. Check workflow logs for environment variable values
3. Ensure VITE_ prefix is used for all frontend environment variables
4. Verify backend stack outputs are exported correctly

### Rollback Procedures

#### Rollback Frontend Deployment

If a deployment causes issues:

**Option 1: Redeploy previous version via GitHub**

1. Find last working commit:
```bash
git log --oneline frontend/
```

2. Revert to previous commit:
```bash
git revert [commit-hash]
git push origin main
```

3. GitHub Actions will automatically deploy the reverted version

**Option 2: Manual rollback with S3 versioning**

1. List previous versions:
```bash
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name babbling-brook-frontend-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text)

aws s3api list-object-versions --bucket $BUCKET_NAME --prefix index.html
```

2. Restore previous version (requires manual process)

**Option 3: Rollback CloudFormation stack**

1. Go to CloudFormation Console
2. Select frontend stack
3. Click "Stack actions" → "Update stack"
4. Use previous template version
5. Complete stack update

#### Rollback Backend Changes

If backend changes break frontend:

1. Rollback backend stack:
```bash
git checkout [previous-commit]
sam build
sam deploy --config-env dev
```

2. Redeploy frontend to pick up old backend outputs:
```bash
git commit --allow-empty -m "Trigger frontend redeploy"
git push origin main
```

### Performance Troubleshooting

#### Issue: Slow initial page load

**Cause**: Large bundle size or unoptimized assets

**Solution**:
1. Analyze bundle size:
```bash
cd frontend
npm run build -- --mode production
```

2. Check for large dependencies
3. Implement code splitting for routes
4. Optimize images and assets
5. Enable compression in CloudFront (already configured)

#### Issue: API requests failing

**Cause**: CORS issues or incorrect API URL

**Solution**:
1. Check browser console for CORS errors
2. Verify API URL in environment variables
3. Check backend CORS configuration
4. Test API endpoint directly:
```bash
curl -X GET https://your-api-url.com/api/episodes
```

### PR Preview Troubleshooting

#### Issue: Preview deployment fails

**Symptom**:
- GitHub Actions workflow fails during PR preview deployment
- No preview URL posted to PR

**Cause**: Various issues with stack creation, permissions, or configuration

**Solution**:
1. Check GitHub Actions logs for specific error:
   - Go to PR → "Checks" tab
   - Click on failed workflow
   - Review error messages in logs

2. Common causes and fixes:
   - **Stack already exists**: Previous preview wasn't cleaned up
     ```bash
     # Delete existing stack
     export ENV_HASH=$(echo -n "$(git config user.name)" | sha1sum | cut -c1-6)
     aws cloudformation delete-stack --stack-name "babbling-brook-frontend-pr-${ENV_HASH}"
     ```
   
   - **Insufficient permissions**: GitHub Actions role lacks permissions
     - Verify `PIPELINE_EXECUTION_ROLE` has CloudFormation, S3, and CloudFront permissions
     - Check IAM policy allows creating stacks with `babbling-brook-frontend-pr-*` naming pattern
   
   - **Resource limits**: AWS account limits reached
     - Check CloudFormation stack limit (default 200 per region)
     - Check CloudFront distribution limit (default 200 per account)
     - Request limit increase if needed

3. Retry deployment:
   - Push a new commit to PR branch
   - Or manually trigger workflow from Actions tab

#### Issue: Preview URL returns 403 Forbidden

**Symptom**:
- Preview deploys successfully
- CloudFront URL returns 403 error
- S3 bucket contains files

**Cause**: Origin Access Control or bucket policy misconfigured

**Solution**:
1. Verify bucket policy allows CloudFront:
```bash
export ENV_HASH=$(echo -n "$(git config user.name)" | sha1sum | cut -c1-6)
export STACK_NAME="babbling-brook-frontend-pr-${ENV_HASH}"

BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text)

aws s3api get-bucket-policy --bucket $BUCKET_NAME
```

2. Check CloudFront distribution origin settings:
```bash
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
  --output text)

aws cloudfront get-distribution --id $DISTRIBUTION_ID
```

3. If policy is missing or incorrect, update the stack:
   - Ensure `frontend/template.yaml` has correct BucketPolicy resource
   - Redeploy by pushing a commit to PR

#### Issue: Preview shows old content after update

**Symptom**:
- New commits pushed to PR
- Preview URL still shows old version
- GitHub Actions shows successful deployment

**Cause**: CloudFront cache not invalidated or invalidation in progress

**Solution**:
1. Check invalidation status:
```bash
export ENV_HASH=$(echo -n "$(git config user.name)" | sha1sum | cut -c1-6)
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name "babbling-brook-frontend-pr-${ENV_HASH}" \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
  --output text)

aws cloudfront list-invalidations --distribution-id $DISTRIBUTION_ID
```

2. Create manual invalidation if needed:
```bash
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

3. Wait 1-2 minutes for invalidation to complete

4. Clear browser cache and test again

#### Issue: Cannot delete preview stack

**Symptom**:
- Stack deletion fails with error
- CloudFormation shows DELETE_FAILED status

**Cause**: S3 bucket not empty or resources in use

**Solution**:
1. **Most common cause - S3 bucket not empty**:
```bash
export ENV_HASH=$(echo -n "$(git config user.name)" | sha1sum | cut -c1-6)
export STACK_NAME="babbling-brook-frontend-pr-${ENV_HASH}"

BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text)

# Empty bucket completely
aws s3 rm s3://$BUCKET_NAME/ --recursive

# Delete all versions if versioning is enabled
aws s3api list-object-versions \
  --bucket $BUCKET_NAME \
  --query 'Versions[].{Key:Key,VersionId:VersionId}' \
  --output json | \
  jq -r '.[] | "--key \(.Key) --version-id \(.VersionId)"' | \
  xargs -I {} aws s3api delete-object --bucket $BUCKET_NAME {}

# Retry stack deletion
aws cloudformation delete-stack --stack-name $STACK_NAME
```

2. **CloudFront distribution still deploying**:
   - Wait for distribution to finish deploying
   - Check distribution status in CloudFront console
   - Retry deletion after status is "Deployed"

3. **Manual resource cleanup**:
   If automated deletion continues to fail:
   
   a. Delete CloudFront distribution manually:
   ```bash
   DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
     --stack-name $STACK_NAME \
     --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
     --output text)
   
   # Get distribution config
   aws cloudfront get-distribution-config --id $DISTRIBUTION_ID > dist-config.json
   
   # Disable distribution first
   ETAG=$(jq -r '.ETag' dist-config.json)
   jq '.DistributionConfig.Enabled = false' dist-config.json > dist-config-disabled.json
   
   aws cloudfront update-distribution \
     --id $DISTRIBUTION_ID \
     --if-match $ETAG \
     --distribution-config file://dist-config-disabled.json
   
   # Wait for distribution to be disabled (can take 15-20 minutes)
   aws cloudfront wait distribution-deployed --id $DISTRIBUTION_ID
   
   # Delete distribution
   aws cloudfront delete-distribution --id $DISTRIBUTION_ID --if-match [new-etag]
   ```
   
   b. Delete S3 bucket manually:
   ```bash
   aws s3 rb s3://$BUCKET_NAME --force
   ```
   
   c. Delete stack (should succeed now):
   ```bash
   aws cloudformation delete-stack --stack-name $STACK_NAME
   ```

#### Issue: Multiple preview stacks for same user

**Symptom**:
- Multiple stacks with similar names exist
- Unsure which stack belongs to which PR

**Cause**: Previews not cleaned up properly or multiple PRs from same user

**Solution**:
1. List all your preview stacks with creation time:
```bash
export ENV_HASH=$(echo -n "$(git config user.name)" | sha1sum | cut -c1-6)

aws cloudformation describe-stacks \
  --query "Stacks[?contains(StackName, 'babbling-brook-frontend-pr-${ENV_HASH}')].{Name:StackName,Status:StackStatus,Created:CreationTime}" \
  --output table
```

2. Check stack outputs to identify CloudFront URL:
```bash
aws cloudformation describe-stacks \
  --stack-name "babbling-brook-frontend-pr-${ENV_HASH}" \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontUrl`].OutputValue' \
  --output text
```

3. Delete old/unused stacks:
```bash
# For each old stack
aws cloudformation delete-stack --stack-name [stack-name]
```

4. **Prevention**: Only one preview per GitHub user is supported. Close/merge old PRs and clean up their previews before creating new ones.

#### Issue: Preview environment costs too much

**Symptom**:
- AWS bill shows unexpected CloudFront or S3 charges
- Multiple preview environments running

**Cause**: Preview environments not cleaned up after testing

**Solution**:
1. List all preview stacks:
```bash
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query 'StackSummaries[?contains(StackName, `babbling-brook-frontend-pr`)].{Name:StackName,Created:CreationTime,Status:StackStatus}' \
  --output table
```

2. Delete all preview stacks:
```bash
# Get list of preview stacks
PREVIEW_STACKS=$(aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query 'StackSummaries[?contains(StackName, `babbling-brook-frontend-pr`)].StackName' \
  --output text)

# Delete each stack
for stack in $PREVIEW_STACKS; do
  echo "Deleting $stack..."
  
  # Get bucket name
  BUCKET_NAME=$(aws cloudformation describe-stacks \
    --stack-name $stack \
    --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
    --output text)
  
  # Empty bucket
  aws s3 rm s3://$BUCKET_NAME/ --recursive
  
  # Delete stack
  aws cloudformation delete-stack --stack-name $stack
done
```

3. **Prevention**:
   - Set up AWS Budget alerts for CloudFront and S3
   - Create a cleanup schedule (weekly review of preview stacks)
   - Document cleanup process in team guidelines
   - Consider automated cleanup after PR merge (requires custom workflow)

#### Issue: Preview connects to wrong backend

**Symptom**:
- Preview environment shows errors
- API calls fail or return unexpected data
- Authentication doesn't work

**Cause**: Preview is hardcoded to use dev backend, but dev backend is not available or misconfigured

**Solution**:
1. Verify dev backend stack exists and is healthy:
```bash
aws cloudformation describe-stacks \
  --stack-name babbling-brook-dev \
  --query 'Stacks[0].{Status:StackStatus,Outputs:Outputs}'
```

2. Check dev backend outputs are available:
```bash
aws cloudformation describe-stacks \
  --stack-name babbling-brook-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl` || OutputKey==`UserPoolId`]'
```

3. Test dev backend API directly:
```bash
API_URL=$(aws cloudformation describe-stacks \
  --stack-name babbling-brook-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

curl -X GET $API_URL/episodes
```

4. If dev backend is down or misconfigured:
   - Deploy/fix dev backend first
   - Then redeploy preview by pushing new commit to PR

5. **Note**: PR previews always use dev backend. If you need a different backend, you must modify the workflow file.

### Getting Help

**AWS Support**:
- AWS Support Console: https://console.aws.amazon.com/support
- CloudFront documentation: https://docs.aws.amazon.com/cloudfront
- S3 documentation: https://docs.aws.amazon.com/s3

**Community Resources**:
- AWS Forums: https://forums.aws.amazon.com
- Stack Overflow: Tag questions with `aws-cloudfront`, `aws-s3`, `aws-sam`

## Pull Request Preview Environments

The frontend supports automatic preview environments for pull requests, allowing you to test changes in isolation before merging to main.

### How PR Previews Work

When you create or update a pull request with frontend changes, GitHub Actions automatically:

1. **Detects PR event**: Workflow triggers on pull request opened, synchronized, or reopened
2. **Generates unique environment**: Uses your GitHub username to create a unique environment hash
3. **Deploys temporary infrastructure**: Creates a separate CloudFormation stack with unique S3 bucket and CloudFront distribution
4. **Connects to dev backend**: Preview environment uses the existing dev backend (API and Cognito)
5. **Builds and uploads**: Builds React app with dev backend configuration and uploads to preview S3 bucket
6. **Posts preview URL**: Adds a comment to your PR with the CloudFront preview URL
7. **Updates on changes**: Redeploys preview when you push new commits to the PR

### Creating a PR Preview

1. **Create a pull request** with frontend changes:
```bash
git checkout -b feature/my-frontend-change
# Make your changes to frontend code
git add frontend/
git commit -m "Add new feature"
git push origin feature/my-frontend-change
```

2. **Open pull request** on GitHub:
   - Go to your repository on GitHub
   - Click "Pull requests" → "New pull request"
   - Select your feature branch
   - Create the pull request

3. **Wait for deployment**:
   - GitHub Actions workflow "Deploy Frontend PR Preview" will start automatically
   - Monitor progress in the "Checks" tab of your PR
   - Deployment typically takes 4-7 minutes

4. **Find preview URL**:
   - Look for a comment on your PR from GitHub Actions
   - Comment will contain the CloudFront preview URL
   - Click the URL to test your changes

Example PR comment:
```
🚀 Frontend preview deployed!

Preview URL: https://d1234567890abc.cloudfront.net

This preview connects to the dev backend environment.

To clean up this preview environment, run the cleanup workflow manually.
```

### Testing in Preview Environment

The preview environment is a fully functional deployment:

- **Isolated frontend**: Separate S3 bucket and CloudFront distribution
- **Shared backend**: Uses the same dev backend as main deployment
- **Full functionality**: All features work as in production
- **Independent updates**: Pushing new commits redeploys the preview

**Important considerations**:

- **Shared database**: Preview uses dev backend, so database changes affect all environments
- **Authentication**: Uses dev Cognito User Pool (same users as dev environment)
- **API calls**: All API requests go to dev backend
- **No data isolation**: Be careful with test data that might affect other developers

### Updating a Preview

When you push new commits to your PR branch:

1. GitHub Actions automatically detects the changes
2. Workflow rebuilds and redeploys the preview
3. CloudFront cache is invalidated
4. PR comment is updated with deployment status
5. Preview URL remains the same

No manual action required - just push your changes.

### Manual Cleanup Process

Preview environments are NOT automatically deleted when PRs are closed or merged. You must manually clean them up.

#### Option 1: GitHub Actions Workflow (Recommended)

1. Go to your repository on GitHub
2. Click "Actions" tab
3. Select "Deploy Frontend PR Preview" workflow
4. Click "Run workflow" dropdown
5. Select your PR branch
6. Choose "cleanup" action
7. Click "Run workflow"

The workflow will:
- Empty the S3 bucket
- Delete the CloudFormation stack
- Remove all preview resources
- Post confirmation comment on PR

#### Option 2: AWS CLI

If the workflow fails or you prefer manual cleanup:

```bash
# Set your environment hash (same as used for deployment)
export ENV_HASH=$(echo -n "$(git config user.name)" | sha1sum | cut -c1-6)
export STACK_NAME="babbling-brook-frontend-pr-${ENV_HASH}"

# Get bucket name
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text)

# Empty bucket (required before stack deletion)
aws s3 rm s3://$BUCKET_NAME/ --recursive

# Delete CloudFormation stack
aws cloudformation delete-stack --stack-name $STACK_NAME

# Wait for deletion to complete
aws cloudformation wait stack-delete-complete --stack-name $STACK_NAME
```

#### Option 3: AWS Console

1. **Empty S3 bucket**:
   - Go to S3 Console
   - Find bucket named like `babbling-brook-frontend-pr-[hash]-frontendbu-[random]`
   - Select all objects
   - Click "Delete"
   - Confirm deletion

2. **Delete CloudFormation stack**:
   - Go to CloudFormation Console
   - Find stack named `babbling-brook-frontend-pr-[hash]`
   - Click "Delete"
   - Confirm deletion
   - Wait for deletion to complete (2-3 minutes)

### Finding Your Preview Stacks

List all preview stacks:
```bash
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query 'StackSummaries[?contains(StackName, `babbling-brook-frontend-pr`)].{Name:StackName,Created:CreationTime}' \
  --output table
```

Find your specific preview stack:
```bash
export ENV_HASH=$(echo -n "$(git config user.name)" | sha1sum | cut -c1-6)
aws cloudformation describe-stacks \
  --stack-name "babbling-brook-frontend-pr-${ENV_HASH}"
```

### Best Practices for PR Previews

**Do**:
- Create previews for significant frontend changes
- Test thoroughly in preview before merging
- Clean up previews after PR is merged or closed
- Use preview URLs in PR descriptions for reviewers
- Test authentication and API integration in preview

**Don't**:
- Leave preview environments running indefinitely (costs money)
- Use preview for load testing (shared dev backend)
- Expect data isolation (shares dev database)
- Create multiple previews per developer (one per GitHub user)
- Modify production data through preview environment

### Cost Considerations

Each preview environment creates:
- S3 bucket (minimal cost for storage)
- CloudFront distribution (minimal cost for low traffic)
- No additional Lambda or backend costs (uses existing dev backend)

Estimated cost per preview: $0.50-$2.00 per month if left running

**To minimize costs**:
- Delete previews promptly after testing
- Limit number of active previews
- Use previews only for significant changes
- Consider local testing for minor changes

### Alternative Testing Approaches

If PR previews don't fit your workflow, consider:

#### Local Testing
Test changes locally before pushing:
```bash
cd frontend
npm ci
npm run dev
```

#### Feature Branch Deployments
Create temporary stacks for feature branches:
1. Modify workflow to deploy on feature branch push
2. Use branch name in stack name for uniqueness
3. Manually delete stack when done testing

#### Staging Environment
Deploy a separate staging environment:
1. Create staging backend stack
2. Create staging frontend stack
3. Test changes in staging before production

## Additional Resources

- [AWS CloudFront Documentation](https://docs.aws.amazon.com/cloudfront)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3)
- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model)
- [Vite Documentation](https://vitejs.dev)
- [React Documentation](https://react.dev)
