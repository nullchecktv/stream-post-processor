# Manual API Testing

This directory contains comprehensive manual testing tools for all API endpoints in the post-production system.

## Quick Start

1. **Setup your environment** (one-time setup):
   ```bash
   npm run test:setup
   ```

2. **Open the test harness**:
   ```bash
   open tests/manual/test-harness-configured.html
   ```

## What Gets Tested

The test harness provides comprehensive coverage of all API endpoints:

### 📺 Episode Management
- **GET /episodes** - List all episodes with pagination
- **POST /episodes** - Create new episodes with metadata
- **GET /episodes/{episodeId}** - Get detailed episode information
- **POST /episodes/{episodeId}/statuses** - Update episode status (Ready for Clip Gen)

### 📤 Upload Management
- **POST /episodes/{episodeId}/transcripts** - Upload transcript files (.srt)
- **POST /episodes/{episodeId}/tracks** - Initiate multipart video track uploads
- **POST /episodes/{episodeId}/tracks/{trackName}/parts** - Get signed URLs for upload parts
- **POST /episodes/{episodeId}/tracks/{trackName}/complete** - Complete multipart uploads

### ✂️ Clip Management
- **GET /episodes/{episodeId}/clips** - List clips for an episode (with pagination)
- **GET /episodes/{episodeId}/clips/{clipId}** - Get detailed clip information
- **PATCH /episodes/{episodeId}/clips/{clipId}** - Update clip status (reviewed, approved, rejected, published)
- **DELETE /episodes/{episodeId}/clips/{clipId}** - Delete clips and associated files

### 🎵 Track Management
- **PUT /episodes/{episodeId}/tracks/{trackName}** - Update track metadata (speakers)

## Test Setup Script

The `test-setup.mjs` script handles:

1. **AWS Cognito Authentication**:
   - Creates admin user if needed
   - Handles password challenges
   - Generates access tokens

2. **Environment Configuration**:
   - Reads from `.env` file
   - Updates tokens automatically
   - Pre-configures test harness

3. **Test Harness Preparation**:
   - Creates `test-harness-configured.html` with pre-filled credentials
   - Sets up API base URL
   - Includes authorization headers

## Required Environment Variables

Create a `.env` file with:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_PROFILE=your-profile

# Cognito Configuration
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_USERNAME=admin@example.com
COGNITO_PASSWORD=YourPassword123!
COGNITO_NEW_PASSWORD=YourNewPassword123!

# Optional User Attributes
GIVEN_NAME=Admin
FAMILY_NAME=User
TENANT_ID=your-tenant-id

# API Configuration
API_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/api
```

## Test Harness Features

### 🎯 Comprehensive Coverage
- **All HTTP methods**: GET, POST, PUT, PATCH, DELETE
- **All endpoints**: Every API endpoint is testable
- **Real data**: Uses actual AWS services and data
- **Error handling**: Shows detailed error messages

### 🎨 User-Friendly Interface
- **Tabbed interface**: Organized by functionality
- **Visual feedback**: Success/error indicators with colors
- **Clickable IDs**: Click episode/clip IDs to use them in other operations
- **Progress tracking**: Upload progress bars for large files
- **Status badges**: Visual status indicators

### 🔧 Advanced Features
- **Connection testing**: Verify API connectivity
- **Multipart uploads**: Full support for large video files
- **Pagination**: Handle paginated responses
- **File uploads**: Direct S3 uploads with presigned URLs
- **Authentication**: Automatic JWT token handling

## Testing Workflows

### Basic Episode Workflow
1. **Create Episode** → Get episode ID
2. **Upload Transcript** → Upload .srt file
3. **Upload Video Track** → Upload video file with multipart
4. **Update Episode Status** → Mark "Ready for Clip Gen"
5. **List Clips** → See generated clips
6. **Review Clips** → Update clip statuses

### Advanced Testing
1. **Test Error Conditions**:
   - Invalid episode IDs
   - Missing required fields
   - Prerequisite failures

2. **Test Edge Cases**:
   - Large file uploads
   - Empty responses
   - Pagination boundaries

3. **Test Status Transitions**:
   - Episode status prerequisites
   - Clip status workflows
   - Track metadata updates

## File Structure

```
tests/manual/
├── README.md                     # This file
├── test-setup.mjs               # Setup script
├── test-harness.html            # Template test harness
└── test-harness-configured.html # Generated configured harness
```

## Troubleshooting

### Authentication Issues
- Run `aws sso login --profile your-profile` if SSO expired
- Check Cognito User Pool and Client ID configuration
- Verify user exists and has correct permissions

### API Connection Issues
- Verify API URL is correct and includes stage (e.g., `/api`)
- Check CORS configuration allows your origin
- Ensure Lambda functions are deployed and working

### Upload Issues
- Verify S3 bucket CORS exposes ETag header for multipart uploads
- Check file size limits and chunk size configuration
- Ensure presigned URL hasn't expired

### Missing Clips
- Verify episode has "Ready for Clip Gen" status
- Check that transcript and tracks are uploaded
- Ensure clip generation workflow has been triggered

## Development Notes

### Adding New Endpoints
1. Add endpoint to OpenAPI specification
2. Add corresponding Lambda function
3. Update test harness HTML with new UI elements
4. Add JavaScript handlers for the new endpoint

### Modifying Test Data
- Use realistic episode titles and metadata
- Test with various file sizes and formats
- Include edge cases in test scenarios

### Performance Testing
- Test with large video files (>100MB)
- Verify multipart upload performance
- Check API response times under load

## Security Considerations

- Access tokens are stored in browser memory only
- Test harness uses HTTPS for all API calls
- Sensitive data is not logged or displayed
- File uploads go directly to S3 (not through API)

## Integration with CI/CD

While this is manual testing, the patterns can be automated:

```javascript
// Example automated test
const response = await fetch(`${API_BASE}/episodes`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: 'Test Episode',
    episodeNumber: 1
  })
});

expect(response.status).toBe(201);
```

## Support

For issues with the test harness:
1. Check the browser console for JavaScript errors
2. Verify all environment variables are set correctly
3. Ensure AWS credentials and permissions are valid
4. Check API Gateway and Lambda function logs in CloudWatch
