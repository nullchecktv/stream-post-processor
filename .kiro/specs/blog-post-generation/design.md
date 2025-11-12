# Design Document

## Overview

The blog post generation feature extends the existing AI-powered content processing pipeline to automatically create blog posts from episode transcripts. The system leverages AWS Bedrock agents with tool calling capabilities to generate structured outlines and full blog content in the configured brand voice.

The design follows the existing serverless architecture patterns using Lambda functions, DynamoDB for storage, EventBridge for event-driven workflows, and the established agent framework for AI interactions.

## Architecture

### High-Level Flow

```
Episode Transcript → Clip Detector Agent → buildBlogOutline Tool → DynamoDB (outline)
                                                                           ↓
                                                    EventBridge Event → Blog Generator Agent
                                                                           ↓
                                                    Web Search + Episode Context → Blog Content
                                                                           ↓
                                                    DynamoDB (content) ← Status Updates
                                                                           ↓
                                                    API Gateway ← User Interface
```

### Component Interaction

1. **Clip Detector Agent** analyzes transcript and calls `buildBlogOutline` tool
2. **buildBlogOutline Tool** stores outline and publishes `BlogOutlineCreated` event
3. **Blog Generator Agent** triggered by EventBridge, generates content with web search
4. **API Endpoints** provide CRUD operations for blog management
5. **React UI** displays blog content with markdown/preview toggle

## Components and Interfaces

### 1. Brand Voice Configuration

#### User Profile Extension
```javascript
{
  pk: "user#user-uuid",
  sk: "profile",
  email: "user@example.com",
  name: "John Doe",
  activeTeamId: "team-uuid",
  branding: {
    colors: {
      primary: "#3B82F6",
      secondary: "#8B5CF6",
      background: "#1F2937",
      text: "#F9FAFB"
    },
    fontFamily: "Inter",
    voice: {
      tone: "professional and conversational",
      writingStyle: "technical with practical examples",
      perspective: "first_person"
    }
  },
  preferences: { ... },
  createdAt: "2025-01-15T10:30:00Z",
  updatedAt: "2025-01-15T10:30:00Z"
}
```

#### Team Profile Extension
```javascript
{
  pk: "team#team-uuid",
  sk: "metadata",
  name: "My Content Team",
  description: "Team for podcast production",
  branding: {
    colors: {
      primary: "#3B82F6",
      secondary: "#8B5CF6",
      background: "#1F2937",
      text: "#F9FAFB"
    },
    fontFamily: "Inter",
    voice: {
      tone: "casual and humorous",
      writingStyle: "storytelling with code examples",
      perspective: "third_person"
    }
  },
  ownerId: "user-uuid",
  status: "active",
  createdAt: "2025-01-15T10:30:00Z",
  updatedAt: "2025-01-15T10:30:00Z"
}
```

#### Perspective Configuration
The `perspective` field controls the point of view used in blog content:

- **first_person**: Content written using "I", "we", "my", "our" - as if the author is speaking directly to the reader
  - Example: "In my experience, I've found that..."
  - Use case: Personal blogs, individual creator content, direct engagement

- **third_person**: Content written using "they", "the team", "the author" - from an outside perspective
  - Example: "The team discovered that..."
  - Use case: Company blogs, team content, professional/journalistic tone

Default value is `first_person` when not explicitly configured.

#### API Endpoints for Brand Voice
- `PUT /users/profile` - Update user brand voice settings
- `PUT /teams/{teamId}` - Update team brand voice settings
- `GET /users/profile` - Retrieve user profile with brand voice
- `GET /teams/{teamId}` - Retrieve team with brand voice

### 2. Blog Outline Tool

#### Tool Definition
```javascript
export const buildBlogOutlineTool = {
  name: 'buildBlogOutline',
  description: 'Creates and stores a structured markdown outline for a blog post based on episode content',
  isMultiTenant: true,
  schema: z.object({
    episodeId: z.string().uuid().describe('The episode ID for which to create the blog outline'),
    outline: z.string().min(50).describe('Markdown formatted outline with sections and key points')
  }),
  handler: async (tenantId, input) => {
    // Store outline in DynamoDB
    // Publish BlogOutlineCreated event
    // Return success confirmation
  }
};
```

#### Tool Handler Logic
1. Validate episodeId and outline parameters
2. Store outline with pk: `{tenantId}#{episodeId}`, sk: `data#blog#outline`
3. Set status to `outline_created`
4. Record timestamp
5. Publish EventBridge event: `BlogOutlineCreated`
6. Return confirmation with outline ID

### 3. Blog Generator Agent

#### Agent Function
- **Trigger**: EventBridge rule matching `BlogOutlineCreated` event
- **Model**: `amazon.nova-pro-v1:0`
- **Tools**: Web search utility for research
- **Memory**: Session-based memory for context retention

#### System Prompt
```
You are BlogForge, an autonomous blog writer for technical content creators.

Your job:
1. Read the provided blog outline and episode context
2. Research relevant topics using web search when needed
3. Write a comprehensive blog post in the specified brand voice
4. Include code examples, practical insights, and actionable takeaways
5. Format content in markdown with proper headings, lists, and code blocks

Brand Voice Guidelines:
- Tone: {tone from tenant settings}
- Writing Style: {writingStyle from tenant settings}
- Perspective: {perspective from tenant settings}

Writing Perspective:
{if perspective is first_person}
- Write using first-person pronouns: "I", "we", "my", "our"
- Speak directly as the author/creator
- Example: "In my experience, I've found that..."
{if perspective is third_person}
- Write using third-person pronouns: "they", "the team", "the author"
- Avoid first-person pronouns
- Write from an outside perspective
- Example: "The team discovered that..."

Content Requirements:
- Introduction that hooks the reader
- Clear section structure following the outline
- Technical accuracy with practical examples
- Conclusion with key takeaways
- 1500-2500 words total length
- Proper markdown formatting

Use web search to:
- Verify technical details
- Find relevant examples
- Research current best practices
- Gather supporting statistics
```

#### Agent Workflow
1. Load blog outline from DynamoDB
2. Load episode metadata and transcript excerpt
3. Load tenant brand voice settings
4. Update status to `content_generating`
5. Invoke Bedrock with system prompt and context
6. Allow agent to use web search tool as needed
7. Store generated content with pk: `{tenantId}#{episodeId}`, sk: `data#blog#content`
8. Update status to `content_generated`
9. Record completion timestamp

### 4. Web Search Tool

#### Tool Definition
```javascript
export const webSearchTool = {
  name: 'webSearch',
  description: 'Searches the web for information to support blog content',
  isMultiTenant: false,
  schema: z.object({
    query: z.string().min(3).max(200).describe('Search query'),
    maxResults: z.number().int().min(1).max(5).default(3).describe('Maximum number of results to return')
  }),
  handler: async (input) => {
    // Use AWS Bedrock Knowledge Base or external search API
    // Return formatted search results
  }
};
```

#### Search Integration Options
1. **AWS Bedrock Knowledge Base**: Pre-indexed technical documentation
2. **External API**: Integration with search provider (Google Custom Search, Bing)
3. **Hybrid**: Combine both for comprehensive results

### 5. Blog Data Model

#### Blog Outline Record
```javascript
{
  pk: "tenant123#episode-uuid",
  sk: "data#blog#outline",
  outline: "# Blog Post Title\n\n## Introduction\n...",
  status: "outline_created",
  createdAt: "2025-01-15T10:30:00Z",
  updatedAt: "2025-01-15T10:30:00Z",
  version: 1
}
```

#### Blog Content Record
```javascript
{
  pk: "tenant123#episode-uuid",
  sk: "data#blog#content",
  content: "# Full Blog Post\n\nIntroduction paragraph...",
  status: "content_generated",
  wordCount: 1847,
  generatedAt: "2025-01-15T10:35:00Z",
  updatedAt: "2025-01-15T10:35:00Z",
  version: 1
}
```

#### Status Values
- `outline_created`: Outline stored, content not yet generated
- `content_generating`: Agent is currently writing content
- `content_generated`: Content successfully generated
- `outline_edited`: User modified the outline
- `content_edited`: User modified the content
- `regenerating`: Content being regenerated from edited outline
- `failed`: Generation encountered an error

### 6. API Endpoints

#### GET /episodes/{episodeId}/blog
**Purpose**: Retrieve blog outline and content

**Request**:
```http
GET /episodes/{episodeId}/blog
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "episodeId": "episode-uuid",
  "outline": "# Blog Post Title\n\n## Introduction\n...",
  "content": "# Full Blog Post\n\nIntroduction paragraph...",
  "status": "content_generated",
  "wordCount": 1847,
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:35:00Z"
}
```

**Response** (404 Not Found):
```json
{
  "error": "NotFound",
  "message": "No blog found for episode"
}
```

#### PUT /episodes/{episodeId}/blog
**Purpose**: Update blog outline or content

**Request**:
```http
PUT /episodes/{episodeId}/blog
Authorization: Bearer {token}
Content-Type: application/json

{
  "outline": "# Updated Outline\n...",
  "content": "# Updated Content\n..."
}
```

**Response** (200 OK):
```json
{
  "episodeId": "episode-uuid",
  "outline": "# Updated Outline\n...",
  "content": "# Updated Content\n...",
  "status": "content_edited",
  "updatedAt": "2025-01-15T10:40:00Z"
}
```

#### DELETE /episodes/{episodeId}/blog
**Purpose**: Delete blog outline and content

**Request**:
```http
DELETE /episodes/{episodeId}/blog
Authorization: Bearer {token}
```

**Response** (204 No Content)

#### POST /episodes/{episodeId}/blog
**Purpose**: Regenerate blog content from outline

**Request**:
```http
POST /episodes/{episodeId}/blog
Authorization: Bearer {token}
Content-Type: application/json

{
  "outline": "# New Outline\n..."
}
```

**Response** (202 Accepted):
```json
{
  "episodeId": "episode-uuid",
  "status": "regenerating",
  "message": "Blog content regeneration started"
}
```

### 7. User Interface Components

#### Brand Voice Configuration UI
**Location**: User profile settings and team settings pages

**Components**:
- `BrandVoiceForm`: Form for configuring tone, writing style, and perspective
- `PerspectiveSelector`: Radio buttons or dropdown for first_person/third_person selection
- `PerspectiveExplanation`: Help text explaining the difference between perspectives

**Perspective UI Text**:
- **First Person**: "Write as if you're speaking directly (I, we, my, our). Best for personal blogs and direct engagement."
- **Third Person**: "Write from an outside perspective (they, the team, the author). Best for company blogs and professional content."

#### Blog Management Page
**Route**: `/episodes/{episodeId}/blog`

**Components**:
- `BlogOutlineView`: Displays markdown outline
- `BlogContentView`: Displays full blog content
- `MarkdownEditor`: Editable markdown with syntax highlighting
- `MarkdownPreview`: Rendered HTML preview (read-only)
- `ViewToggle`: Switch between outline/content
- `FormatToggle`: Switch between markdown/preview
- `RegenerateButton`: Trigger content regeneration
- `StatusIndicator`: Display current generation status

#### Component Structure
```typescript
interface BlogPageProps {
  episodeId: string;
}

interface BlogData {
  outline: string;
  content: string;
  status: BlogStatus;
  wordCount: number;
  updatedAt: string;
}

type BlogStatus =
  | 'outline_created'
  | 'content_generating'
  | 'content_generated'
  | 'outline_edited'
  | 'content_edited'
  | 'regenerating'
  | 'failed';

type ViewMode = 'outline' | 'content';
type FormatMode = 'markdown' | 'preview';
```

#### UI State Management
```typescript
const [blogData, setBlogData] = useState<BlogData | null>(null);
const [viewMode, setViewMode] = useState<ViewMode>('content');
const [formatMode, setFormatMode] = useState<FormatMode>('preview');
const [isRegenerating, setIsRegenerating] = useState(false);
const [isDirty, setIsDirty] = useState(false);
```

#### Regeneration Logic
1. User edits outline in markdown mode
2. `isDirty` flag set to true
3. Regenerate button becomes enabled
4. User clicks regenerate
5. POST request to `/episodes/{episodeId}/blog`
6. Status indicator shows "Regenerating..."
7. Poll for status updates every 5 seconds
8. When status changes to `content_generated`, refresh content
9. Reset `isDirty` flag

## Error Handling

### Agent Failures
- **Timeout**: Set Lambda timeout to 900 seconds for blog generation
- **Model Errors**: Catch Bedrock errors and set status to `failed`
- **Tool Errors**: Log tool failures and continue with available data
- **Retry Logic**: Implement exponential backoff for transient failures

### API Error Responses
- **400 Bad Request**: Invalid markdown format or missing required fields
- **404 Not Found**: Episode or blog not found
- **409 Conflict**: Concurrent modification detected
- **500 Internal Server Error**: Unexpected server errors
- **503 Service Unavailable**: Bedrock service temporarily unavailable

### UI Error Handling
- Display error messages in toast notifications
- Show retry button for failed operations
- Preserve user edits in local storage
- Graceful degradation when preview rendering fails

## Testing Strategy

### Unit Tests
- Brand voice configuration validation
- Blog outline tool handler
- Blog content storage and retrieval
- API endpoint request/response validation
- Markdown parsing and rendering

### Integration Tests
- End-to-end blog generation workflow
- EventBridge event triggering
- Agent tool calling with web search
- API CRUD operations
- UI component interactions

### Agent Testing
- Mock Bedrock responses for consistent testing
- Validate tool calling behavior
- Test brand voice adherence
- Verify markdown formatting quality
- Test web search integration

### Performance Testing
- Blog generation time (target: < 60 seconds)
- API response times (target: < 500ms)
- UI rendering performance with large markdown
- Concurrent blog generation handling

## Security Considerations

### Authentication & Authorization
- All API endpoints require valid JWT token
- Tenant isolation enforced at data layer
- User can only access blogs for their active team's episodes

### Data Validation
- Sanitize markdown input to prevent XSS
- Validate outline and content length limits
- Prevent injection attacks in search queries
- Rate limit API requests per user

### Agent Security
- Never allow agent to specify tenantId (inferred from context)
- Validate all tool inputs before execution
- Limit web search to approved domains
- Sanitize agent-generated content before storage

## Performance Optimization

### Caching Strategy
- Cache brand voice settings in Lambda environment
- Cache episode metadata during blog generation
- Client-side caching of blog data with SWR

### Database Optimization
- Single query to fetch both outline and content
- Conditional updates to avoid unnecessary writes
- Use DynamoDB TTL for temporary generation status

### Agent Optimization
- Limit web search to 3 results maximum
- Use streaming responses for real-time updates (future enhancement)
- Implement agent memory for context retention across episodes

## Monitoring and Observability

### CloudWatch Metrics
- Blog generation success rate
- Average generation time
- API endpoint latency
- Agent tool usage statistics
- Error rates by component

### Logging
- Agent conversation logs with tool calls
- API request/response logs
- Blog generation start/complete events
- Error logs with stack traces

### Alarms
- Blog generation failures > 5% in 5 minutes
- API error rate > 10% in 5 minutes
- Agent timeout rate > 20% in 10 minutes
- DynamoDB throttling events
