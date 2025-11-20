# Product Overview: Livestream Post-Production Platform

## Product Vision

**Transform livestream content into engaging social media assets through AI-powered post-production automation.**

Our platform empowers content creators, streamers, and media companies to maximize the value of their live content by automatically generating clips, quotes, and blog posts optimized for social media distribution across multiple platforms. Teams can collaborate on content creation with role-based access, shared workflows, and real-time notifications.

## Product Mission

To eliminate the manual, time-intensive process of post-production for livestream content, enabling creators to focus on content creation while our AI handles the heavy lifting of clip detection, quote extraction, blog generation, and visual asset creation.

## Target Users

### Primary Users
- **Content Creators**: Individual streamers on Twitch, YouTube, LinkedIn Live
- **Media Companies**: Organizations producing regular livestream content
- **Social Media Managers**: Teams responsible for cross-platform content distribution
- **Podcast Producers**: Converting live recordings into shareable clips

### User Personas

#### The Solo Creator
- Streams 3-5 times per week on multiple platforms
- Limited time for post-production work
- Wants to maintain active social media presence
- Needs automated clip generation and optimization

#### The Media Team
- Produces daily livestream content
- Has dedicated social media strategy
- Requires consistent branding and messaging
- Needs scalable content processing pipeline

#### The Podcast Network
- Records live podcast sessions
- Distributes across multiple audio/video platforms
- Creates promotional clips for social media
- Requires transcript-based content analysis

## Core Value Propositions

### 1. Automated Content Generation
- **AI-Powered Clip Detection**: Advanced transcript analysis to identify engaging moments using AWS Bedrock
- **Quote Extraction**: Automatically identifies shareable quotes with speaker attribution
- **Blog Post Generation**: Creates full blog posts from episode transcripts with brand voice
- **Visual Asset Creation**: Generates quote graphics with automatic contrast checking
- **Context Understanding**: Recognizes discussion topics, sentiment, and audience engagement cues
- **Multi-Speaker Support**: Tracks different speakers and conversation dynamics
- **Quality Scoring**: Ranks potential clips and quotes by engagement potential

### 2. Intelligent Planning & Recommendations
- **Episode Planning**: Create structured episode plans with objectives and concepts
- **AI Recommendations**: Get AI-generated episode outlines, titles, and descriptions
- **Flow Visualization**: Mermaid flowcharts showing proposed episode structure
- **Learning Moments**: Identify key takeaways and teaching opportunities
- **Speaker Management**: Track and validate speakers across episodes

### 3. Multi-Format Content Creation
- **Video Clips**: Automated video segment extraction and stitching from multi-track sources
- **Quote Graphics**: Landscape and portrait quote images with customizable styling
- **Blog Posts**: Long-form content generated from episode transcripts
- **Status Tracking**: Monitor content through proposed → processing → created states

### 4. Team Collaboration
- **Multi-Tenant Architecture**: Secure team workspaces with isolated data
- **Role-Based Access**: Owner, Administrator, and Member roles with appropriate permissions
- **Team Invitations**: Email-based invitation system with acceptance workflow
- **Shared Episodes**: Team members collaborate on episode content and assets
- **Real-Time Notifications**: Momento-powered instant notifications for team activities
- **Brand Voice**: Team-level brand voice settings for consistent content generation
- **Team Settings**: Customizable branding, writing style, and preferences

### 5. Streamlined Workflow
- **One-Click Processing**: Upload video tracks and transcripts to trigger automated content generation
- **Batch Operations**: Process multiple clips, quotes, and blog posts simultaneously
- **Review Interface**: Approve, edit, or reject AI-generated content
- **Status History**: Track detailed status changes and processing steps
- **Activity Feed**: Real-time updates on team activities and content processing

## Key Features

### Episode Management
- **Multi-Track Support**: Handle multiple video/audio tracks (main camera, guest camera, screen share)
- **Metadata Management**: Episode titles, descriptions, themes, and platform information
- **Series Organization**: Group episodes by series or show format
- **Air Date Tracking**: Maintain chronological organization of content
- **Status Management**: Track episodes through Draft → Planning → Ready → Processing → Published → Archived
- **Status History**: Detailed audit trail of all status changes with timestamps
- **Speaker Management**: Track speakers across episodes with discrepancy detection

### Episode Planning
- **Structured Planning**: Define episode objectives and key concepts
- **AI Recommendations**: Get AI-generated episode structure and flow
- **Mermaid Flowcharts**: Visual representation of episode progression
- **Detailed Outlines**: Section-by-section breakdown with timing and talking points
- **Learning Moments**: Identify key takeaways for audience
- **Demo Artifacts**: Track code examples and visual aids needed

### AI-Powered Clip Detection
- **Transcript Analysis**: Analyze spoken content using AWS Bedrock (Amazon Nova Pro)
- **Engagement Prediction**: Score clips based on likely audience engagement
- **Context Preservation**: Maintain narrative coherence across clip segments
- **Speaker Attribution**: Track who is speaking in multi-person content
- **Memory Retention**: Bedrock Agent Memory for context across episodes
- **Multi-Segment Clips**: Support clips spanning multiple time ranges

### Quote Generation
- **Automatic Extraction**: AI identifies shareable quotes from transcripts
- **Speaker Attribution**: Track who said each quote
- **Relevance Scoring**: Rank quotes by shareability and impact
- **Context Preservation**: Include surrounding context for clarity
- **Timestamp Tracking**: Link quotes to specific moments in episodes
- **Manual Creation**: Users can create custom quotes

### Quote Graphics
- **Automated Generation**: Create visual quote graphics using Canvas API
- **Dual Orientation**: Support landscape (1200x675) and portrait (1080x1920) formats
- **Contrast Checking**: Automatic WCAG AA contrast validation
- **Custom Styling**: Configurable fonts, colors, and layouts
- **Speaker Display**: Optional speaker attribution on graphics
- **Episode Branding**: Optional episode title display

### Blog Post Generation
- **AI-Powered Writing**: Generate full blog posts from episode transcripts
- **Brand Voice**: Consistent tone using team brand voice settings
- **Structured Content**: Proper headings, paragraphs, and formatting
- **Outline Generation**: Create detailed outlines before full content
- **Regeneration**: Regenerate content with updated outlines
- **Manual Editing**: Full editing capabilities for AI-generated content

### Video Processing Pipeline
- **Multi-Track Upload**: Support for multiple video tracks (main camera, guest camera, screen share)
- **Multipart Upload**: Efficient large file uploads with resumable capability
- **Automated Preprocessing**: Video chunking using AWS MediaConvert for efficient processing
- **Segment Extraction**: Extract specific time ranges from source videos via Step Functions
- **Clip Stitching**: Combine multiple segments into final clip videos using FFmpeg
- **S3 Storage**: Secure cloud storage for all video and graphic assets
- **Presigned URLs**: Secure, time-limited access to video content

## Technical Capabilities

### Simple, Scalable Architecture
- **Serverless Infrastructure**: AWS Lambda functions that do one thing well
- **Event-Driven Processing**: EventBridge events trigger specific functions
- **Step Functions Workflows**: Orchestrate complex clip generation with segment extraction and stitching
- **Proven AWS Services**: DynamoDB, S3, Lambda, Step Functions, MediaConvert, SES, Cognito
- **Auto-Scaling**: AWS handles scaling automatically
- **Real-Time Communication**: Momento Topics for instant notifications

### Workflow Orchestration
- **Clip Generation Workflow**: Step Functions state machine for video processing
  - Set clip status to Processing
  - Parallel segment extraction from video chunks
  - Segment deduplication and caching
  - FFmpeg-based clip stitching
  - Status updates with detailed history
  - Error handling and retry logic
  - Notification publishing on completion
- **Transcript Processing**: EventBridge-triggered Lambda for AI analysis
- **Quote Graphics**: EventBridge-triggered Lambda for Canvas rendering
- **Blog Generation**: Direct Lambda invocation with streaming response
- **MediaConvert Jobs**: Automatic video chunking for efficient processing

### AI/ML Integration
- **AWS Bedrock Integration**: Uses Amazon Nova Pro (v1:0) for content analysis
- **Agent Memory**: Bedrock Agent Memory for context retention across sessions
- **Transcript Analysis**: Deep understanding of spoken content for clip and quote detection
- **Blog Generation**: AI-powered long-form content creation with brand voice
- **Engagement Scoring**: AI-powered ranking of clip and quote potential
- **Planning Recommendations**: AI-generated episode structure and outlines

### Data Management
- **Multi-Tenant Isolation**: Secure data separation between teams with tenant ID coalescing
- **Single-Table Design**: Efficient DynamoDB access patterns with pk/sk and GSI1
- **Encrypted Storage**: S3 and DynamoDB encryption at rest
- **TTL Management**: Automatic cleanup of temporary data (invitations, upload sessions)
- **Efficient Queries**: Optimized GSI patterns for chronological and filtered access
- **Status History**: Detailed audit trails for all content state changes

### Real-Time Features
- **Momento Topics**: Pub/sub messaging for instant notifications
- **Token Management**: Automatic Momento token refresh with resilience
- **Activity Feed**: Real-time updates on team activities
- **Notification System**: Persistent and ephemeral notifications
- **WebSocket Alternative**: HTTP-based real-time updates without WebSocket complexity

### Visual Processing
- **Canvas API**: Server-side graphic generation for quotes
- **Contrast Validation**: WCAG AA compliance checking for text readability
- **Font Management**: Custom font loading and rendering
- **Image Optimization**: Efficient PNG generation and S3 storage
- **Dual Orientation**: Support for landscape and portrait formats

### Data Architecture
- **Single-Table Design**: All entities in one DynamoDB table (NullCheckTable)
- **Composite Keys**: pk (partition key) and sk (sort key) for flexible access patterns
- **GSI1**: Global secondary index for chronological queries and filtering
- **Entity Types**: Episodes, clips, quotes, blogs, plans, tracks, transcripts, teams, users, invitations, notifications
- **Status Tracking**: Consistent status enums across all content types
- **Status Transitions**: Validated state machine transitions for content lifecycle
- **Tenant Isolation**: Tenant ID prefix on all partition keys for data separation
- **TTL Management**: Automatic cleanup of temporary data (invitations, upload sessions)

### Content Lifecycle
- **Episodes**: Draft → Planning → Ready → Processing → Published → Archived
- **Clips**: Proposed → Processing → Created → Failed
- **Quotes**: Proposed → Processing → Created → Failed → Edited
- **Blogs**: Proposed → Processing → Created → Failed → Edited
- **Tracks**: Uploading → Uploaded → Processing → Processed → Failed
- **Invitations**: Pending → Accepted → Declined → Cancelled (with TTL expiry)

## Frontend Application

### Technology Stack
- **React 19**: Modern React with hooks and functional components
- **TypeScript**: Full type safety across the application
- **Vite**: Fast development and optimized production builds
- **Tailwind CSS v4**: Utility-first styling with custom design system
- **React Router v7**: Client-side routing with nested routes
- **AWS Amplify**: Cognito authentication integration

### User Interface Features
- **Dashboard**: Overview of recent episodes and team activity
- **Episode Management**: Create, edit, and manage episodes
- **Episode Overview**: Comprehensive view of episode details and content
- **Episode Planning**: Define objectives, concepts, and view AI recommendations
- **Clip Management**: View, approve, and download video clips
- **Quote Management**: Review quotes and generate graphics
- **Blog Editor**: Edit and regenerate AI-generated blog posts
- **Team Management**: Manage team members, roles, and invitations
- **Team Settings**: Configure branding, writing style, and preferences
- **Activity Feed**: Real-time updates on team activities
- **Notifications**: Persistent and ephemeral notification system
- **Profile Management**: User profile and preferences

### Design System
- **Consistent Components**: Reusable UI components across the application
- **Toast Notifications**: Non-intrusive feedback for user actions
- **Modal Dialogs**: Contextual dialogs for confirmations and forms
- **Loading States**: Clear feedback during async operations
- **Empty States**: Helpful guidance when no content exists
- **Error Boundaries**: Graceful error handling with recovery options
- **Responsive Design**: Mobile-first design that works on all devices

### Context Management
- **AuthContext**: User authentication state and Cognito integration
- **UserContext**: User profile and active team management
- **NotificationContext**: Notification state and Momento subscription
- **ActivityContext**: Real-time activity feed updates
- **SidebarContext**: Navigation state management
- **ToastContext**: Toast notification queue management

### Real-Time Features
- **Momento Integration**: Real-time notifications via Momento Topics
- **Activity Updates**: Live feed of team activities
- **Processing Status**: Real-time updates on content processing
- **Token Management**: Automatic token refresh with error handling
- **Graceful Degradation**: Fallback when real-time unavailable

## Platform Integrations

### Streaming Platforms
- **Twitch**: Supported platform for episode metadata
- **YouTube**: YouTube Live and uploaded content processing
- **LinkedIn Live**: Professional content optimization
- **X (Twitter)**: Social media platform support
- **Custom Platforms**: Flexible platform tracking

### Authentication & Security
- **AWS Cognito**: User authentication and authorization with email verification
- **JWT Tokens**: Secure API access with token-based auth
- **Custom Authorizers**: Lambda-based request authorization with team context
- **Pre-Token Generation**: Custom claims injection for tenant ID and active team
- **Password Reset**: Secure forgot password flow
- **Email Verification**: Required email verification for new accounts

### Email Integration
- **Amazon SES**: Transactional email delivery
- **Team Invitations**: Branded invitation emails with accept/decline links
- **Handlebars Templates**: Dynamic email content generation
- **Configuration Sets**: Email delivery tracking and analytics

### Real-Time Integration
- **Momento Cache**: Real-time pub/sub messaging infrastructure
- **Topic Subscriptions**: Team-specific notification channels
- **Token Refresh**: Automatic credential renewal
- **Fallback Handling**: Graceful degradation when real-time unavailable

## Security & Compliance

### Authentication & Authorization
- **Cognito User Pools**: Secure user authentication with email verification
- **JWT Tokens**: Stateless authentication with custom claims
- **Lambda Authorizers**: Request-level authorization with team context validation
- **Pre-Token Generation**: Custom claims for tenant ID and active team
- **Password Policies**: Configurable password requirements
- **MFA Support**: Optional multi-factor authentication

### Data Security
- **Encryption at Rest**: S3 and DynamoDB use AWS-managed encryption
- **Encryption in Transit**: All API communication over HTTPS
- **Tenant Isolation**: Strict data separation between teams
- **Presigned URLs**: Time-limited, secure access to S3 objects
- **IAM Policies**: Least-privilege access for all Lambda functions
- **Secrets Management**: Environment variables for sensitive configuration

### Access Control
- **Role-Based Access**: Owner, Administrator, and Member roles
- **Team Membership**: Validated on every API request
- **Invitation System**: Secure email-based team invitations with expiry
- **Resource Ownership**: Team-scoped access to all resources
- **API Authorization**: Custom authorizer validates team membership

### Compliance Considerations
- **WCAG AA**: Quote graphics validated for contrast compliance
- **Email Verification**: Required for account activation
- **Data Retention**: TTL-based automatic cleanup of temporary data
- **Audit Trails**: Status history tracking for all content
- **Error Logging**: Structured logging with AWS Lambda Powertools

## User Experience Flow

### Onboarding & Team Setup
1. **User Registration**: Sign up with email via AWS Cognito
2. **Email Verification**: Verify email address to activate account
3. **Onboarding**: Complete profile with name and brand voice preferences
4. **Team Creation**: Create a new team or accept invitation to existing team
5. **Team Settings**: Configure team branding, writing style, and preferences
6. **Team Selection**: Set active team for episode management

### Episode Planning
1. **Episode Creation**: Create new episode with metadata (title, number, air date, platforms)
2. **Plan Definition**: Define episode objectives and key concepts
3. **AI Recommendations**: Get AI-generated episode structure, title, and outline
4. **Flow Visualization**: Review Mermaid flowchart of proposed episode structure
5. **Plan Refinement**: Edit and finalize episode plan

### Content Upload
1. **Multi-Track Upload**: Upload video tracks using multipart upload (main, guest, screen share)
2. **Track Management**: View upload progress and track status
3. **Transcript Upload**: Upload SRT transcript file to S3
4. **Speaker Validation**: Review and resolve speaker discrepancies
5. **Preprocessing**: Automatic video chunking via MediaConvert

### AI Content Generation
1. **Transcript Analysis**: AI agent analyzes transcript for engaging moments
2. **Clip Detection**: System generates clip suggestions with segments and scores
3. **Quote Extraction**: AI identifies shareable quotes with speaker attribution
4. **Blog Generation**: AI creates blog post outline and full content
5. **Status Tracking**: Content moves through Proposed → Processing → Created states

### Clip Processing
1. **Clip Approval**: User approves clips for video processing
2. **Step Functions Workflow**: Orchestrates segment extraction and stitching
3. **Segment Extraction**: Lambda function extracts video segments from chunks
4. **Clip Stitching**: FFmpeg combines segments into final clip video
5. **Storage**: Completed clips stored in S3 with metadata in DynamoDB
6. **Notification**: Real-time notification when clip is ready

### Quote Graphics
1. **Quote Selection**: Review AI-detected quotes or create custom quotes
2. **Graphic Generation**: Trigger quote graphic creation
3. **Canvas Rendering**: Server-side graphic generation with contrast checking
4. **Orientation Options**: Choose landscape or portrait format
5. **Download**: Access generated quote graphics

### Blog Post Creation
1. **Outline Review**: Review AI-generated blog post outline
2. **Content Generation**: Generate full blog post from outline
3. **Manual Editing**: Edit AI-generated content as needed
4. **Regeneration**: Regenerate content with updated outline
5. **Publication**: Export or publish blog content

### Team Collaboration
1. **Member Invitations**: Invite team members via email
2. **Role Assignment**: Set member roles (Owner, Administrator, Member)
3. **Activity Feed**: Monitor team activities in real-time
4. **Notifications**: Receive instant updates on content processing
5. **Shared Access**: All team members access shared episodes and content

### Review & Distribution
1. **Content Review**: View all generated clips, quotes, and blog posts
2. **Status Management**: Track content through processing stages
3. **Download Assets**: Retrieve video clips and quote graphics
4. **Delete Content**: Remove unwanted content
5. **Status History**: Review detailed processing history

## Competitive Advantages

### AI-First Approach
- **Advanced NLP**: Superior transcript analysis using AWS Bedrock (Amazon Nova Pro)
- **Context Understanding**: Recognizes conversation flow and narrative structure
- **Multi-Format Generation**: Clips, quotes, and blog posts from single transcript
- **Brand Voice Integration**: Consistent tone across all AI-generated content
- **Memory Retention**: AI remembers context across episodes for better recommendations
- **Multi-Modal Analysis**: Combines audio, video, and text analysis

### Comprehensive Content Suite
- **Beyond Clips**: Generate clips, quotes, graphics, and blog posts
- **Visual Assets**: Automated quote graphic generation with contrast validation
- **Long-Form Content**: Full blog posts from episode transcripts
- **Planning Tools**: AI-powered episode planning and recommendations
- **Unified Platform**: All content types in one integrated system

### Developer-Friendly Architecture
- **Simple REST API**: Standard HTTP endpoints, no custom protocols
- **Direct AWS Integration**: Use AWS SDKs and services directly
- **Clear Documentation**: Straightforward examples without complex frameworks
- **No Magic**: Explicit code that does what it says it does
- **Event-Driven**: Clean separation of concerns with EventBridge

### Real-Time Collaboration
- **Instant Notifications**: Momento-powered real-time updates
- **Activity Feed**: Live view of team activities
- **No WebSockets**: Simple HTTP-based real-time without connection management
- **Team Context**: Automatic tenant isolation and team switching

### Cost-Effective Scaling
- **Serverless Architecture**: Pay only for actual usage, no idle costs
- **Efficient Processing**: Optimized algorithms minimize processing time and costs
- **ARM64 Lambda**: Lower compute costs with ARM architecture
- **On-Demand DynamoDB**: Scale automatically with usage
- **Transparent Pricing**: Clear, predictable pricing structure

## Success Metrics

### User Engagement
- **Content Generation Rate**: Number of clips, quotes, and blog posts per episode
- **Approval Rate**: Percentage of AI-suggested content approved by users
- **Team Adoption**: Number of active teams and team members
- **Time Savings**: Reduction in manual content creation time
- **User Retention**: Monthly and annual user retention rates
- **Feature Adoption**: Usage of clips, quotes, blog posts, and planning features

### Content Performance
- **Detection Accuracy**: Quality of AI-detected clips and quotes
- **Processing Success Rate**: Percentage of content successfully processed
- **Average Content Per Episode**: Typical number of clips, quotes, and blog posts
- **User Satisfaction**: Feedback on content quality and relevance
- **Graphic Quality**: Quote graphic contrast validation pass rate
- **Blog Post Quality**: User edits and regeneration rates

### Technical Performance
- **Processing Speed**: Time from approval to completed content
- **Workflow Success Rate**: Step Functions execution success rate
- **System Uptime**: Platform availability and reliability
- **API Response Times**: Performance of API endpoints
- **Error Rates**: Frequency of processing failures
- **Real-Time Delivery**: Momento notification delivery latency
- **Token Refresh Success**: Momento token renewal reliability

## Roadmap Priorities

### Phase 1: Core Platform (Completed)
- ✅ Episode management and upload system
- ✅ AI-powered clip detection with AWS Bedrock (Amazon Nova Pro)
- ✅ Multi-track video processing with MediaConvert
- ✅ Transcript analysis and speaker extraction
- ✅ Multi-tenant team architecture with tenant ID coalescing
- ✅ User authentication with AWS Cognito
- ✅ Team invitations and role management
- ✅ Real-time notifications with Momento Topics
- ✅ Step Functions clip generation workflow
- ✅ React frontend with TypeScript and Tailwind CSS
- ✅ Segment extraction and clip stitching with FFmpeg
- ✅ Clip status management and approval workflow
- ✅ Quote extraction and graphic generation
- ✅ Blog post generation with brand voice
- ✅ Episode planning with AI recommendations
- ✅ Status history tracking
- ✅ Speaker management and discrepancy detection
- ✅ Activity feed and notification system
- ✅ Team settings (branding, writing style)
- ✅ Momento token refresh resilience
- ✅ Email verification and password reset

### Phase 2: Enhanced Features (Q1-Q2 2025)
- Advanced sentiment analysis in transcripts
- Improved speaker recognition and attribution
- Topic modeling and automatic tagging
- Enhanced engagement prediction algorithms
- Clip editing capabilities in UI
- Batch clip processing
- Team analytics dashboard
- Quote graphic customization (fonts, colors, layouts)
- Blog post templates and formatting options
- Episode series management
- Content scheduling and publishing queue

### Phase 3: Social Integration (Q2-Q3 2025)
- Direct social media publishing (X, LinkedIn, YouTube)
- Platform-specific video format optimization
- Automated caption and hashtag generation
- Performance analytics for published content
- A/B testing for clip and quote variations
- Scheduling and publishing calendar
- Social media preview and optimization
- Cross-platform content distribution

### Phase 4: Advanced Features (Q3-Q4 2025)
- Real-time clip detection during live streams
- Custom branding and watermarking on videos
- Advanced video editing tools in browser
- Multi-language transcript support
- Custom AI model fine-tuning per team
- Advanced quote graphic templates
- Blog post SEO optimization
- Content recommendation engine

### Phase 5: Enterprise Features (2026)
- White-label solutions
- Advanced analytics and reporting
- Custom workflow automation
- Enterprise SSO integration
- Compliance and audit logging
- Public API access for custom integrations
- Webhook support for external systems
- Advanced team permissions and workflows
- Content approval workflows
- Multi-region deployment

## Business Model

### Subscription Tiers
- **Creator**: Individual creators with basic content generation (clips, quotes, blog posts)
- **Professional**: Enhanced features with higher limits and advanced AI
- **Team**: Collaboration features for content teams with multiple members
- **Enterprise**: Custom solutions for large organizations with white-label options

### Usage-Based Pricing
- **Processing Minutes**: Charge based on video processing time
- **AI Generation**: Credits for clip detection, quote extraction, blog generation
- **Storage**: Tiered storage pricing for content retention
- **Graphic Generation**: Quote graphic creation credits
- **API Calls**: Developer-friendly API usage pricing
- **Premium Features**: Advanced AI features and customization as add-ons

### Feature Gating
- **Free Tier**: Limited episodes, clips, and quotes per month
- **Creator Tier**: Unlimited episodes, standard AI features
- **Professional Tier**: Advanced AI, custom branding, priority processing
- **Team Tier**: Collaboration features, team settings, role management
- **Enterprise Tier**: White-label, SSO, custom integrations, SLA

### Value-Added Services
- **Custom Integration**: Professional services for custom integrations
- **Content Strategy**: Consulting services for content optimization
- **Training & Support**: Premium support and training programs
- **White-Label**: Custom branding and deployment options
- **Managed Services**: Full-service content production support

