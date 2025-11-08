# Implementation Plan

- [x] 1. Update backend template to export required outputs
  - Add Export names to existing Outputs section in template.yaml
  - Export ApiUrl with name pattern: ${AWS::StackName}-ApiUrl
  - Export UserPoolId with name pattern: ${AWS::StackName}-UserPoolId
  - Export UserPoolClientId with name pattern: ${AWS::StackName}-UserPoolClientId
  - Export UserPoolDomain with name pattern: ${AWS::StackName}-UserPoolDomain
  - _Requirements: 7.2, 7.3_

- [x] 2. Create frontend SAM template
  - [x] 2.1 Create frontend/template.yaml with basic structure
    - Define AWSTemplateFormatVersion and Transform
    - Add description for frontend Amplify deployment
    - _Requirements: 1.1, 1.2_

  - [x] 2.2 Add parameters section
    - Add BackendStackName parameter for cross-stack references
    - Add Repository parameter for GitHub repository (owner/repo format)
    - Add Branch parameter with default value 'main'
    - Add EnvironmentHash parameter for unique naming
    - _Requirements: 1.1, 5.4_

  - [x] 2.3 Define AmplifyApp resource
    - Create AWS::Amplify::App resource
    - Set Name using EnvironmentHash for uniqueness
    - Configure Repository URL using Repository parameter
    - Omit AccessToken (GitHub App authentication)
    - Add inline BuildSpec for Vite build process
    - Configure EnvironmentVariables using Fn::ImportValue for backend outputs
    - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2, 5.5_

  - [x] 2.4 Define AmplifyBranch resource
    - Create AWS::Amplify::Branch resource
    - Link to AmplifyApp using AppId
    - Set BranchName from Branch parameter
    - Enable EnableAutoBuild for automatic deployments
    - Enable EnablePullRequestPreview for PR previews
    - Set PullRequestEnvironmentName to 'preview'
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 2.5 Add outputs section
    - Output AmplifyAppId with export
    - Output AmplifyAppUrl with export
    - Output AmplifyBranchName
    - _Requirements: 1.2_

- [x] 3. Create frontend SAM configuration template
  - [x] 3.1 Create frontend/samconfig.yaml.template
    - Define version 0.1
    - Create dev environment configuration
    - _Requirements: 1.2, 5.4_

  - [x] 3.2 Configure deployment parameters
    - Set stack_name using ${STACK_NAME} variable
    - Set region to us-east-1
    - Set capabilities to CAPABILITY_IAM
    - Configure parameter_overrides with template variables
    - Set confirm_changeset to false
    - Set resolve_s3 to true
    - _Requirements: 1.2, 5.4, 6.1, 6.2_

- [x] 4. Create frontend deployment workflow
  - [x] 4.1 Create .github/workflows/deploy-frontend-dev.yaml
    - Set workflow name and run-name
    - Configure workflow_dispatch trigger for manual runs
    - _Requirements: 2.1, 2.5_

  - [x] 4.2 Configure workflow triggers
    - Add push trigger for main branch
    - Limit paths to frontend/template.yaml
    - Limit paths to frontend/samconfig.yaml.template
    - Limit paths to workflow file itself
    - Set permissions for id-token and contents
    - _Requirements: 2.1, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 4.3 Create prepare-deployment job
    - Calculate environment hash from actor name
    - Set backend stack name (stream-post-processor-dev)
    - Set frontend stack name (stream-post-processor-frontend-dev)
    - Output all parameters for deploy job
    - _Requirements: 5.4, 7.5_

  - [x] 4.4 Create deploy job
    - Checkout repository
    - Configure AWS credentials using PIPELINE_EXECUTION_ROLE
    - _Requirements: 2.2, 2.5_

  - [x] 4.5 Add samconfig generation step
    - Set working-directory to frontend
    - Use envsubst to generate samconfig.yaml from template
    - Set environment variables for all template placeholders
    - Echo generated config for verification
    - _Requirements: 5.3, 6.1_

  - [x] 4.6 Add deployment step
    - Run sam build with frontend template
    - Run sam deploy with generated samconfig
    - Use ARTIFACTS_BUCKET_NAME and CLOUDFORMATION_EXECUTION_ROLE secrets
    - Set no-fail-on-empty-changeset flag
    - _Requirements: 1.2, 2.2, 2.3, 6.1, 6.2, 6.3_

  - [x] 4.7 Add output step
    - Query CloudFormation stack for AmplifyAppUrl output
    - Add deployment summary to GitHub step summary
    - Display Amplify URL for easy access
    - _Requirements: 2.3_

- [x] 5. Update frontend environment configuration
  - [x] 5.1 Update frontend/src/aws-exports.ts
    - Use import.meta.env.VITE_USER_POOL_ID for userPoolId
    - Use import.meta.env.VITE_USER_POOL_CLIENT_ID for userPoolClientId
    - Use import.meta.env.VITE_USER_POOL_DOMAIN for OAuth domain
    - Provide fallback empty strings for local development
    - _Requirements: 5.1, 5.2, 5.5_

  - [x] 5.2 Update frontend/src/api/client.ts
    - Use import.meta.env.VITE_API_URL for API base URL
    - Provide fallback to localhost for local development
    - _Requirements: 5.1, 5.5_

- [x] 6. Create deployment documentation
  - [x] 6.1 Create GitHub App setup documentation
    - Document how to access AWS Amplify GitHub App installation page
    - Provide step-by-step installation instructions with screenshots
    - Explain repository selection and permissions
    - Document authorization process
    - Add verification steps to confirm successful installation
    - _Requirements: 1.1, 4.1_

  - [x] 6.2 Document GitHub App installation process
    - Add instructions for installing AWS Amplify GitHub App
    - Document repository access configuration
    - Explain one-time setup requirement
    - Link to detailed setup documentation
    - _Requirements: 1.1, 4.1_

  - [x] 6.3 Document deployment sequence
    - Explain backend deployment prerequisite
    - Document GitHub App installation step
    - Explain frontend stack deployment
    - Document verification steps
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 6.4 Document PR preview workflow
    - Explain automatic preview creation
    - Document preview URL format
    - Explain automatic cleanup on PR close
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 6.5 Add troubleshooting guide
    - Document common deployment errors
    - Explain GitHub App authentication issues
    - Document Amplify build failures
    - Provide rollback procedures
    - _Requirements: 6.1, 6.2_
