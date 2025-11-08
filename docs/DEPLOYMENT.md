# Frontend Deployment Guide

This guide covers deploying the React frontend application to AWS Amplify using AWS SAM and GitHub Actions.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [GitHub App Setup](#github-app-setup)
3. [Deployment Sequence](#deployment-sequence)
4. [Pull Request Preview Workflow](#pull-request-preview-workflow)
5. [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying the frontend, ensure you have:

- **Backend deployed**: The backend CloudFormation stack must be deployed first (exports API URL and Cognito configuration)
- **AWS credentials**: Configured with appropriate permissions for CloudFormation, S3, and Amplify
- **GitHub repository**: Code pushed to GitHub repository
- **GitHub secrets configured**:
  - `PIPELINE_EXECUTION_ROLE`: IAM role ARN for GitHub Actions
  - `CLOUDFORMATION_EXECUTION_ROLE`: IAM role ARN for CloudFormation
  - `ARTIFACTS_BUCKET_NAME`: S3 bucket name for SAM artifacts

## GitHub App Setup

AWS Amplify uses the GitHub App authentication method instead of Personal Access Tokens. This provides better security, automatic token rotation, and fine-grained repository access control.

### Step 1: Access the GitHub App Installation Page

1. Navigate to the AWS Amplify GitHub App installation page for your region:
   - **US East (N. Virginia)**: https://github.com/apps/aws-amplify-us-east-1
   - **US West (Oregon)**: https://github.com/apps/aws-amplify-us-west-2
   - **EU (Ireland)**: https://github.com/apps/aws-amplify-eu-west-1
   - **AP (Tokyo)**: https://github.com/apps/aws-amplify-ap-northeast-1

2. For other regions, search for "AWS Amplify" in the GitHub Apps marketplace or check the [AWS Amplify documentation](https://docs.aws.amazon.com/amplify/latest/userguide/setting-up-GitHub-access.html)

### Step 2: Install the GitHub App

1. Click the **"Install"** button on the GitHub App page

2. **Select account**: Choose whether to install on your personal account or an organization
   - For personal projects: Select your username
   - For team projects: Select your organization

3. **Repository access**: Choose repository access level
   - **Option 1 - All repositories**: Grant access to all current and future repositories
   - **Option 2 - Only select repositories** (recommended): Choose specific repositories
     - Search for and select your livestream post-production repository
     - You can add more repositories later if needed

4. Click **"Install"** or **"Install & Authorize"**

### Step 3: Authorize the GitHub App

1. **Review permissions**: The GitHub App will request the following permissions:
   - **Read access**: Repository contents, metadata
   - **Write access**: Commit statuses, deployments, pull requests (for status checks and comments)
   - **Webhooks**: Receive notifications for push events and pull requests

2. Click **"Authorize"** to grant permissions

3. You may be prompted to confirm your GitHub password or two-factor authentication

### Step 4: Verify Installation

1. Go to your GitHub account settings:
   - Personal account: https://github.com/settings/installations
   - Organization: https://github.com/organizations/[org-name]/settings/installations

2. Find **"AWS Amplify [region]"** in the installed apps list

3. Click **"Configure"** to verify:
   - Installation status shows as "Active"
   - Your repository is listed under "Repository access"
   - Permissions are correctly granted

4. **Important**: Note the installation ID from the URL (format: `https://github.com/settings/installations/[installation-id]`)
   - You don't need to save this, but it confirms successful installation

### Step 5: AWS Amplify Connection

Once the GitHub App is installed:

1. AWS Amplify will automatically detect the GitHub App when you deploy the SAM template
2. No additional configuration is needed in AWS Console
3. The connection is established when the Amplify App resource is created via CloudFormation

### Troubleshooting GitHub App Installation

**Issue**: Can't find the AWS Amplify GitHub App for your region
- **Solution**: Use the AWS Console to find the correct GitHub App URL:
  1. Go to AWS Amplify Console
  2. Click "New app" → "Host web app"
  3. Select "GitHub" as the source
  4. Click "Authorize AWS Amplify" - this will redirect to the correct GitHub App

**Issue**: GitHub App installation fails
- **Solution**: Ensure you have admin permissions on the repository or organization

**Issue**: Repository not showing in Amplify
- **Solution**: 
  1. Verify the GitHub App is installed and active
  2. Check that the repository is included in the app's access list
  3. Try reinstalling the GitHub App with explicit repository selection

## Deployment Sequence

Follow these steps in order to deploy the frontend infrastructure:

### 1. Deploy Backend Stack (If Not Already Deployed)

The frontend depends on backend outputs, so ensure the backend is deployed first:

```bash
# From repository root
sam build
sam deploy --config-env dev
```

Verify backend deployment:
```bash
aws cloudformation describe-stacks \
  --stack-name stream-post-processor-dev \
  --query 'Stacks[0].Outputs'
```

Expected outputs:
- `ApiUrl`: API Gateway endpoint URL
- `UserPoolId`: Cognito User Pool ID
- `UserPoolClientId`: Cognito User Pool Client ID
- `UserPoolDomain`: Cognito User Pool Domain

### 2. Install GitHub App (One-Time Setup)

If you haven't already, follow the [GitHub App Setup](#github-app-setup) instructions above.

**This is a one-time setup** - you only need to install the GitHub App once per repository.

### 3. Deploy Frontend Stack

The frontend stack can be deployed in two ways:

#### Option A: Automatic Deployment via GitHub Actions (Recommended)

1. Push changes to the `main` branch that modify:
   - `frontend/template.yaml`
   - `frontend/samconfig.yaml.template`
   - `.github/workflows/deploy-frontend-dev.yaml`

2. GitHub Actions will automatically:
   - Generate the SAM configuration
   - Build the frontend SAM template
   - Deploy the CloudFormation stack
   - Output the Amplify App URL

3. Monitor deployment:
   - Go to GitHub repository → Actions tab
   - Click on the running workflow
   - View deployment logs and status

#### Option B: Manual Deployment via SAM CLI

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Generate SAM configuration:
```bash
export STACK_NAME="stream-post-processor-frontend-dev"
export ENV_HASH=$(echo -n "env-$(whoami)" | sha1sum | cut -c1-6)
export BACKEND_STACK_NAME="stream-post-processor-dev"
export REPOSITORY="your-org/your-repo"
export BRANCH="main"

envsubst < samconfig.yaml.template > samconfig.yaml
```

3. Build and deploy:
```bash
sam build --template-file template.yaml

sam deploy \
  --config-file samconfig.yaml \
  --config-env dev \
  --s3-bucket your-artifacts-bucket \
  --role-arn arn:aws:iam::ACCOUNT:role/CloudFormationExecutionRole \
  --no-fail-on-empty-changeset
```

### 4. Verify Deployment

1. **Check CloudFormation stack**:
```bash
aws cloudformation describe-stacks \
  --stack-name stream-post-processor-frontend-dev \
  --query 'Stacks[0].Outputs'
```

2. **Get Amplify App URL**:
```bash
aws cloudformation describe-stacks \
  --stack-name stream-post-processor-frontend-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`AmplifyAppUrl`].OutputValue' \
  --output text
```

3. **Check Amplify Console**:
   - Go to AWS Amplify Console
   - Find your app (name: `content-engine-frontend-[env-hash]`)
   - Verify the app is connected to GitHub
   - Check that the first build is triggered automatically

4. **Wait for initial build**:
   - First build takes 3-5 minutes
   - Monitor build progress in Amplify Console
   - Build logs show npm install and Vite build steps

5. **Test the application**:
   - Open the Amplify App URL in a browser
   - Verify the application loads correctly
   - Test authentication flow (login/logout)
   - Test API connectivity (create episode, list episodes)
   - Check browser console for errors

### 5. Subsequent Deployments

After initial deployment:

- **Frontend code changes**: Amplify automatically builds and deploys (no GitHub Actions workflow)
- **Infrastructure changes**: Push changes to trigger GitHub Actions workflow
- **Backend changes**: May require frontend rebuild if API contract changes

## Pull Request Preview Workflow

AWS Amplify automatically creates preview environments for pull requests, allowing you to test changes before merging.

### How PR Previews Work

1. **Create a pull request** with frontend changes
2. **GitHub App notifies Amplify** automatically
3. **Amplify builds preview** environment (2-4 minutes)
4. **Preview URL posted** as a comment on the PR by AWS Amplify
5. **Test changes** in isolated preview environment
6. **Merge PR** → changes deploy to main branch
7. **Close PR** → preview environment automatically deleted

### Preview Environment Details

**Preview URL Format**:
```
https://pr-[number].[branch].[app-id].amplifyapp.com
```

Example:
```
https://pr-123.main.d1a2b3c4d5e6f7.amplifyapp.com
```

**Environment Configuration**:
- Same environment variables as main branch
- Same backend API endpoint
- Isolated build and deployment
- Automatic cleanup on PR close

**GitHub Integration**:
- Build status checks appear on PR
- Preview URL posted as PR comment
- Build logs accessible from PR checks
- Deployment notifications in PR timeline

### Testing PR Previews

1. **Create a test PR**:
```bash
git checkout -b feature/test-change
# Make changes to frontend code
git add .
git commit -m "Test change"
git push origin feature/test-change
```

2. **Open PR on GitHub**:
   - Go to repository → Pull requests → New pull request
   - Select your feature branch
   - Create pull request

3. **Wait for preview build**:
   - Check PR for AWS Amplify status check
   - Wait for "Deploy Preview" check to complete
   - Look for comment with preview URL

4. **Test preview environment**:
   - Click preview URL in PR comment
   - Test your changes thoroughly
   - Verify no regressions in existing functionality

5. **Merge or close**:
   - Merge PR to deploy to main branch
   - Close PR to delete preview environment

### Preview Environment Limitations

**Shared Backend**:
- Preview environments use the same backend API as main branch
- Database changes affect all environments
- Consider using separate backend stack for testing if needed

**Build Time**:
- Each PR preview requires full build (2-4 minutes)
- Multiple PRs build in parallel
- Build queue may delay previews during high activity

**Resource Limits**:
- AWS account limits apply to concurrent builds
- Maximum number of preview environments depends on Amplify limits

## Troubleshooting

### Common Deployment Errors

#### Error: "Export not found"

**Symptom**:
```
Export stream-post-processor-dev-ApiUrl not found
```

**Cause**: Backend stack not deployed or exports not configured

**Solution**:
1. Verify backend stack exists:
```bash
aws cloudformation describe-stacks --stack-name stream-post-processor-dev
```

2. Check backend outputs have Export names:
```bash
aws cloudformation describe-stacks \
  --stack-name stream-post-processor-dev \
  --query 'Stacks[0].Outputs[*].[OutputKey,ExportName]'
```

3. If exports are missing, update backend template.yaml and redeploy

#### Error: "Repository not found or access denied"

**Symptom**:
```
Failed to create Amplify App: Repository not found or access denied
```

**Cause**: GitHub App not installed or repository not accessible

**Solution**:
1. Verify GitHub App installation:
   - Go to https://github.com/settings/installations
   - Check AWS Amplify app is installed and active
   - Verify repository is in access list

2. Reinstall GitHub App if needed:
   - Follow [GitHub App Setup](#github-app-setup) instructions
   - Ensure repository is explicitly selected

3. Check repository URL format in template:
   - Should be: `https://github.com/owner/repo`
   - Not: `git@github.com:owner/repo.git`

#### Error: "Stack already exists"

**Symptom**:
```
Stack [stream-post-processor-frontend-dev] already exists
```

**Cause**: Attempting to create a stack that already exists

**Solution**:
1. Update existing stack instead of creating new one
2. Or delete existing stack first:
```bash
aws cloudformation delete-stack --stack-name stream-post-processor-frontend-dev
```

3. Wait for deletion to complete:
```bash
aws cloudformation wait stack-delete-complete \
  --stack-name stream-post-processor-frontend-dev
```

### GitHub App Authentication Issues

#### Issue: GitHub App not connecting to Amplify

**Symptoms**:
- Amplify App created but no builds triggered
- GitHub webhook not firing
- No status checks on commits

**Solutions**:

1. **Verify webhook configuration**:
   - Go to repository → Settings → Webhooks
   - Look for AWS Amplify webhook
   - Check recent deliveries for errors

2. **Reinstall GitHub App**:
   - Uninstall AWS Amplify app from GitHub
   - Reinstall following [GitHub App Setup](#github-app-setup)
   - Redeploy frontend stack

3. **Check Amplify App settings**:
   - Go to Amplify Console → Your app → App settings → General
   - Verify repository connection shows "Connected"
   - Click "Reconnect repository" if needed

#### Issue: Permission denied errors

**Symptoms**:
- GitHub App installed but Amplify can't access repository
- "403 Forbidden" errors in Amplify logs

**Solutions**:

1. **Check repository permissions**:
   - Ensure you have admin access to repository
   - For organization repos, check organization settings allow GitHub Apps

2. **Review GitHub App permissions**:
   - Go to https://github.com/settings/installations
   - Click "Configure" on AWS Amplify app
   - Verify all required permissions are granted

3. **Update repository access**:
   - In GitHub App configuration, update repository access
   - Add repository explicitly if using "Only select repositories"

### Amplify Build Failures

#### Error: "npm install failed"

**Symptoms**:
```
npm ERR! code ENOTFOUND
npm ERR! network request failed
```

**Solutions**:

1. **Check package.json**:
   - Verify all dependencies are valid
   - Test locally: `cd frontend && npm ci`

2. **Check npm registry**:
   - Verify npm registry is accessible
   - Check for any private packages requiring authentication

3. **Review build logs**:
   - Go to Amplify Console → Your app → Build history
   - Click failed build → View logs
   - Look for specific error messages

#### Error: "Vite build failed"

**Symptoms**:
```
ERROR: Build failed with exit code 1
```

**Solutions**:

1. **Test build locally**:
```bash
cd frontend
npm ci
npm run build
```

2. **Check environment variables**:
   - Verify all required VITE_* variables are set in Amplify App
   - Go to Amplify Console → Your app → Environment variables
   - Ensure values match backend outputs

3. **Review TypeScript errors**:
   - Check build logs for TypeScript compilation errors
   - Fix type errors in code
   - Ensure tsconfig.json is correct

#### Error: "Build timeout"

**Symptoms**:
```
Build exceeded maximum time limit
```

**Solutions**:

1. **Optimize build**:
   - Enable build caching in BuildSpec
   - Reduce bundle size
   - Check for slow dependencies

2. **Increase build timeout** (if needed):
   - Contact AWS Support to increase Amplify build timeout
   - Default is 30 minutes

### Rollback Procedures

#### Rollback Frontend Deployment

If a deployment causes issues, you can rollback:

**Option 1: Redeploy previous version via GitHub Actions**

1. Find last working commit:
```bash
git log --oneline
```

2. Trigger workflow for that commit:
   - Go to GitHub → Actions → Deploy Frontend (Dev)
   - Click "Run workflow"
   - Select branch and commit

**Option 2: Redeploy previous Amplify build**

1. Go to Amplify Console → Your app → Build history
2. Find last successful build
3. Click "Redeploy this version"

**Option 3: Rollback CloudFormation stack**

1. Go to CloudFormation Console
2. Select frontend stack
3. Click "Stack actions" → "Detect drift"
4. If needed, update stack with previous template version

#### Rollback Backend Changes

If backend changes break frontend:

1. Rollback backend stack:
```bash
# Redeploy previous backend version
git checkout [previous-commit]
sam build
sam deploy --config-env dev
```

2. Trigger frontend rebuild:
   - Go to Amplify Console
   - Click "Redeploy this version" on current build
   - Or push a commit to trigger new build

### Getting Help

**AWS Support**:
- AWS Support Console: https://console.aws.amazon.com/support
- AWS Amplify documentation: https://docs.aws.amazon.com/amplify

**GitHub Support**:
- GitHub Support: https://support.github.com
- GitHub Apps documentation: https://docs.github.com/en/apps

**Community Resources**:
- AWS Amplify Discord: https://discord.gg/amplify
- Stack Overflow: Tag questions with `aws-amplify`

## Additional Resources

- [AWS Amplify Documentation](https://docs.aws.amazon.com/amplify)
- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model)
- [GitHub Apps Documentation](https://docs.github.com/en/apps)
- [Vite Documentation](https://vitejs.dev)
- [React Documentation](https://react.dev)
