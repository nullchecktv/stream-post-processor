# Manual Testing Setup

This directory contains tools for manual testing of the API endpoints using a web-based test harness.

## Quick Start

1. **Copy environment configuration**:
   ```bash
   cp .env.example .env
   ```

2. **Configure your environment variables** in `.env`:
   - `COGNITO_USER_POOL_ID`: Your Cognito User Pool ID
   - `COGNITO_CLIENT_ID`: Your Cognito App Client ID
   - `COGNITO_USERNAME`: Email address for admin user
   - `COGNITO_PASSWORD`: Password for admin user
   - `API_URL`: Your API Gateway URL (optional)

3. **Run the test setup**:
   ```bash
   npm run test:setup
   ```

This will:
- Create an admin user if one doesn't exist
- Login and obtain an access token
- Save the token to your `.env` file
- Open the test harness in your browser with pre-configured settings

## What the Script Does

### Admin User Management
- Checks if an admin user exists with your configured username
- Creates the user if it doesn't exist with:
  - Email verification enabled
  - Standard user attributes (given_name, family_name)
  - Temporary password (if creating new user)

### Authentication
- Attempts login with configured credentials
- Handles password change challenges automatically
- Stores the access token for API requests

### Test Harness Launch
- Creates a configured version of the test harness HTML
- Pre-fills the API URL if configured
- Automatically includes authorization headers in all API requests
- Opens the test harness in your default browser

## Environment Variables

### Required
- `COGNITO_USER_POOL_ID`: Your Cognito User Pool ID
- `COGNITO_CLIENT_ID`: Your Cognito App Client ID
- `COGNITO_USERNAME`: Admin user email address

### Authentication
- `COGNITO_PASSWORD`: Current password for the admin user
- `COGNITO_NEW_PASSWORD`: New password (required for first-time login)

### Optional
- `AWS_REGION`: AWS region (defaults to us-east-1)
- `AWS_PROFILE`: AWS CLI profile to use
- `API_URL`: API Gateway URL (will be pre-filled in test harness)
- `GIVEN_NAME`: Admin user first name (optional)
- `FAMILY_NAME`: Admin user last name (optional)
- `TEMP_PASSWORD`: Temporary password for new users (defaults to 'TempPass123!')

### Auto-Generated
- `ACCESS_TOKEN`: JWT access token (automatically set by test-setup script)

## Files

- `test-setup.mjs`: Main setup script that handles user creation, login, and test harness launch
- `test-harness.html`: Web-based test interface for API endpoints
- `test-harness-configured.html`: Temporary file with injected configuration (auto-generated)
- `create-admin-user.mjs`: Legacy script for creating admin users (replaced by test-setup.mjs)
- `login.mjs`: Legacy script for login (replaced by test-setup.mjs)

## Usage

After running `npm run test:setup`, you can:

1. **Test Episode Creation**: Create new episodes with metadata
2. **Upload Transcripts**: Upload .srt transcript files
3. **Upload Video Tracks**: Upload video files using multipart upload
4. **Monitor Processing**: Check upload status and processing results

All API requests will automatically include the authorization header with your access token.

## Troubleshooting

### Missing Environment Variables
If you see errors about missing environment variables, ensure your `.env` file contains all required values.

### Authentication Errors
- Check that your Cognito User Pool ID and Client ID are correct
- Verify your username and password are correct
- For first-time login, ensure `COGNITO_NEW_PASSWORD` is set

### Browser Issues
If the test harness doesn't open automatically, manually open the generated `test-harness-configured.html` file in your browser.

### API Errors
- Verify your API URL is correct and accessible
- Check that your Cognito configuration allows the admin user to access the API
- Ensure your Lambda authorizer is properly configured

## Security Notes

- The `.env` file contains sensitive information and is excluded from git
- Access tokens are temporary and will expire
- Re-run `npm run test:setup` if your token expires
- Never commit actual credentials to version control
