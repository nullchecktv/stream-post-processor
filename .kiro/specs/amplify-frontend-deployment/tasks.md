# Implementation Plan

- [x] 1. Update frontend SAM template for CloudFront + S3
  - [x] 1.1 Replace Amplify resources with S3 and CloudFront
    - Remove AmplifyApp, AmplifyBranch, and UpdateAmplifyAppFunction resources
    - Add FrontendBucket resource without explicit BucketName
    - Add CloudFrontOriginAccessControl resource without explicit Name
    - Add CloudFrontDistribution resource with S3 origin
    - Add BucketPolicy resource to allow CloudFront access only
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.2 Configure CloudFront distribution settings
    - Set DefaultRootObject to index.html
    - Configure CustomErrorResponses for SPA routing (403 and 404 to index.html)
    - Set ViewerProtocolPolicy to redirect-to-https
    - Enable compression
    - Configure caching behavior with appropriate TTLs
    - _Requirements: 1.5_

  - [x] 1.3 Update template parameters
    - Remove BackendStackName, AmplifyAppId, Repository, and Branch parameters
    - Keep only EnvironmentHash parameter
    - _Requirements: 1.1_

  - [x] 1.4 Update template outputs
    - Remove AmplifyAppId, AmplifyAppUrl, and AmplifyBranchName outputs
    - Add BucketName output with export
    - Add DistributionId output with export
    - Add DistributionDomainName output with export
    - Add CloudFrontUrl output with export
    - _Requirements: 1.1_

- [x] 2. Update frontend SAM configuration template
  - [x] 2.1 Simplify samconfig.yaml.template
    - Remove BackendStackName, AmplifyAppId, and Branch from parameter_overrides
    - Keep only EnvironmentHash in parameter_overrides
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 3. Update frontend deployment workflow
  - [x] 3.1 Update workflow triggers
    - Change paths to trigger on all frontend/** files
    - Keep trigger on workflow file itself
    - _Requirements: 2.1, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Add infrastructure change detection
    - Add step to detect if infrastructure files changed
    - Check for changes to frontend/template.yaml and frontend/samconfig.yaml.template
    - Output infra_changed flag for conditional job execution
    - _Requirements: 3.1, 3.5_

  - [x] 3.3 Update deploy-infrastructure job
    - Make job conditional on infra_changed flag
    - Remove Amplify App setup step
    - Update samconfig generation to use only STACK_NAME and ENV_HASH
    - Keep SAM build and deploy steps
    - _Requirements: 3.1, 3.5_

  - [x] 3.4 Create build-and-deploy job
    - Add job that runs after deploy-infrastructure (or independently if no infra changes)
    - Add step to retrieve backend stack outputs using AWS CLI
    - Query CloudFormation for ApiUrl, UserPoolId, UserPoolClientId, UserPoolDomain
    - Store outputs as environment variables
    - _Requirements: 2.2, 4.2, 5.1, 5.2, 5.3_

  - [x] 3.5 Add React build step
    - Setup Node.js environment (version 22)
    - Run npm ci in frontend directory for reproducible builds
    - Set VITE_* environment variables from backend outputs
    - Run npm run build to generate production artifacts
    - Verify dist directory exists after build
    - _Requirements: 2.3, 4.1, 4.3, 4.4, 5.3, 5.5_

  - [x] 3.6 Add S3 upload step
    - Get bucket name from CloudFormation stack outputs
    - Upload frontend/dist contents to S3 bucket
    - Use aws s3 sync command with --delete flag
    - Set appropriate cache-control headers for static assets
    - _Requirements: 2.3, 4.4, 6.4_

  - [x] 3.7 Add CloudFront invalidation step
    - Get distribution ID from CloudFormation stack outputs
    - Create CloudFront invalidation for /* path
    - Wait for invalidation to complete before finishing
    - _Requirements: 2.4, 6.5_

  - [x] 3.8 Update output step
    - Query CloudFormation for CloudFrontUrl output
    - Display CloudFront URL in GitHub step summary
    - _Requirements: 2.5_

- [x] 4. Update backend deployment workflow
  - [x] 4.1 Add path filters to backend workflow
    - Add paths configuration to push trigger
    - Include all files with '**'
    - Exclude frontend/** directory
    - Exclude .github/workflows/deploy-frontend-dev.yaml
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 5. Update deployment documentation
  - [x] 5.1 Remove GitHub App setup documentation
    - Remove all references to AWS Amplify GitHub App
    - Remove manual Amplify App creation steps
    - Update prerequisites section
    - _Requirements: 2.1_

  - [x] 5.2 Document CloudFront + S3 architecture
    - Explain S3 bucket for static hosting
    - Explain CloudFront distribution for CDN
    - Explain Origin Access Control for security
    - Document automatic cache invalidation
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 5.3 Update deployment sequence documentation
    - Remove Amplify-specific steps
    - Document infrastructure deployment (SAM template)
    - Document build and upload process (GitHub Actions)
    - Document CloudFront cache invalidation
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 5.4 Update troubleshooting guide
    - Remove Amplify-specific troubleshooting
    - Add CloudFront cache troubleshooting
    - Add S3 upload troubleshooting
    - Add build failure troubleshooting
    - _Requirements: 4.5, 6.2_

  - [x] 5.5 Remove PR preview workflow documentation
    - Remove all references to pull request previews
    - Note that PR previews are not supported with CloudFront + S3
    - Suggest alternative testing approaches
    - _Requirements: 2.1_

- [x] 6. Create PR preview workflow
  - [x] 6.1 Create .github/workflows/deploy-frontend-pr.yaml
    - Set workflow name to "Deploy Frontend PR Preview"
    - Configure pull_request trigger for opened, synchronize, reopened events
    - Add paths filter for frontend/** files
    - Add workflow_dispatch trigger with action input (deploy or cleanup)
    - _Requirements: 10.1_

  - [x] 6.2 Create prepare-deployment job for PR previews
    - Calculate environment hash from github.actor
    - Set backend stack name to babbling-brook-dev
    - Set frontend stack name to babbling-brook-frontend-pr-{env_hash}
    - Output all parameters for subsequent jobs
    - _Requirements: 10.2, 10.3_

  - [x] 6.3 Create deploy-infrastructure job for PR previews
    - Reuse logic from main workflow
    - Use PR-specific stack name
    - Deploy SAM template with unique resources
    - _Requirements: 10.3, 10.4_

  - [x] 6.4 Create build-and-deploy job for PR previews
    - Reuse logiuy uc from main workflow
    - Connect to dev backend stack
    - Build and upload to PR-specific S3 bucket
    - Invalidate PR-specific CloudFront distribution
    - _Requirements: 10.4_

  - [x] 6.5 Add PR comment with preview URL
    - Get CloudFront URL from stack outputs
    - Post comment on PR with preview URL
    - Include cleanup instructions in comment
    - Update comment if preview is redeployed
    - _Requirements: 10.1_

  - [x] 6.6 Create cleanup job for PR previews
    - Run only on workflow_dispatch with cleanup action
    - Get S3 bucket name from stack outputs
    - Empty S3 bucket contents
    - Delete CloudFormation stack
    - Post comment on PR confirming cleanup
    - _Requirements: 10.5_

- [x] 7. Update deployment documentation for PR previews
  - [x] 7.1 Document PR preview workflow
    - Explain how to create PR preview
    - Document preview URL location (PR comment)
    - Explain that previews connect to dev backend
    - Document manual cleanup process
    - _Requirements: 10.1, 10.5_

  - [x] 7.2 Add PR preview troubleshooting
    - Document common PR preview issues
    - Explain how to manually delete stacks
    - Document S3 bucket cleanup process
    - _Requirements: 10.5_

- [x] 8. Clean up obsolete files
  - [x] 8.1 Remove Amplify setup script
    - Delete frontend/scripts/setup-amplify-app.sh
    - _Requirements: 2.1_

  - [x] 8.2 Remove local deployment script if Amplify-specific
    - Review frontend/scripts/deploy-local.sh
    - Remove or update if it contains Amplify-specific logic
    - _Requirements: 2.1_
