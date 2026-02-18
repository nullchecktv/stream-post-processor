# Architecture Diagrams

## Simplified Architecture (Presentation View)

```mermaid
graph LR
    subgraph Client
        React[React App<br/>TypeScript + Vite]
    end

    subgraph Auth
        Cognito[Cognito<br/>User Pool]
    end

    subgraph API
        Gateway[API Gateway<br/>REST API]
        Auth[Lambda<br/>Authorizer]
    end

    subgraph Core
        Lambda[Lambda Functions<br/>Episodes, Clips, Teams]
    end

    subgraph AI
        Bedrock[AWS Bedrock<br/>Nova Pro Agent]
    end

    subgraph Processing
        MediaConvert[MediaConvert<br/>Video Chunks]
        StepFn[Step Functions<br/>Clip Workflow]
    end

    subgraph Storage
        DynamoDB[(DynamoDB<br/>Single Table)]
        S3[(S3<br/>Videos/Transcripts)]
    end

    subgraph Events
        EventBridge[EventBridge<br/>Event Bus]
        Momento[Momento<br/>Real-time]
    end

    React -->|HTTPS| Gateway
    React -.->|Auth| Cognito
    Gateway --> Auth
    Auth --> Lambda
    Lambda --> DynamoDB
    Lambda --> S3
    S3 --> EventBridge
    EventBridge --> Bedrock
    EventBridge --> MediaConvert
    EventBridge --> StepFn
    Bedrock --> DynamoDB
    StepFn --> S3
    EventBridge --> Momento
    Momento -.->|Subscribe| React

    style React fill:#61dafb,stroke:#333,stroke-width:2px
    style Cognito fill:#ff9900,stroke:#333,stroke-width:2px
    style Gateway fill:#ff9900,stroke:#333,stroke-width:2px
    style Lambda fill:#ff9900,stroke:#333,stroke-width:2px
    style Bedrock fill:#ff9900,stroke:#333,stroke-width:2px
    style DynamoDB fill:#4053d6,stroke:#333,stroke-width:2px
    style S3 fill:#569a31,stroke:#333,stroke-width:2px
    style EventBridge fill:#ff4081,stroke:#333,stroke-width:2px
    style Momento fill:#00d4ff,stroke:#333,stroke-width:2px
    style MediaConvert fill:#ff9900,stroke:#333,stroke-width:2px
    style StepFn fill:#ff9900,stroke:#333,stroke-width:2px
```

## 1. Backend Architecture Diagram

```mermaid
graph TB
    subgraph Frontend
        React[React App - Vite TypeScript]
    end

    subgraph Authentication
        Cognito[AWS Cognito User Pool]
        Authorizer[Lambda Authorizer JWT Validation]
    end

    subgraph APILayer[API Layer]
        APIGW[API Gateway REST API]
    end

    subgraph CoreServices[Core Services]
        Episodes[Episode Functions CRUD]
        Clips[Clip Functions Management]
        Quotes[Quote Functions Management]
        Teams[Team Functions Multi-tenant]
        Users[User Functions Profile]
        Notifications[Notification Functions]
    end

    subgraph AIAgents[AI Agents]
        ClipDetector[Clip Detector Agent Bedrock Nova Pro]
        QuoteDetector[Quote Detector Agent Bedrock Nova Pro]
        BlogOutline[Blog Outline Agent Bedrock Nova Pro]
        BlogGenerator[Blog Generator Agent Bedrock Nova Pro]
        PlanningAgent[Planning Agent Bedrock Nova Pro]
    end

    subgraph EventProcessing[Event Processing]
        TranscriptIngest[Transcript Ingest Speaker Analysis]
        StartPreprocess[Start Preprocessing MediaConvert]
        PreprocessComplete[Preprocessing Complete Chunks]
        PreprocessFailed[Preprocessing Failed Errors]
        ClipGenTrigger[Clip Generation Trigger Step Functions]
        NotificationHandler[Notification Handler Momento]
    end

    subgraph VideoProcessing[Video Processing]
        MediaConvert[AWS MediaConvert Video Chunking]
        StepFunctions[Step Functions Clip Workflow]
        SegmentExtractor[Segment Extractor FFmpeg]
        ClipStitcher[Clip Stitcher FFmpeg]
    end

    subgraph DataStorage[Data Storage]
        DynamoDB[(DynamoDB Single Table)]
        S3[(S3 Bucket Videos Transcripts)]
        BedrockMemory[Bedrock Agent Memory AI Context]
    end

    subgraph Realtime[Real-time]
        Momento[Momento Topics PubSub]
        EventBridge[EventBridge Event Bus]
    end

    React -->|HTTPS| APIGW
    React -->|Auth| Cognito
    APIGW -->|Authorize| Authorizer
    Authorizer -->|Validate| Cognito
    Authorizer -->|Check Team| DynamoDB

    APIGW --> Episodes
    APIGW --> Clips
    APIGW --> Quotes
    APIGW --> Teams
    APIGW --> Users
    APIGW --> Notifications

    Episodes --> DynamoDB
    Episodes --> S3
    Clips --> DynamoDB
    Clips --> S3
    Quotes --> DynamoDB
    Quotes --> S3
    Teams --> DynamoDB
    Users --> DynamoDB
    Notifications --> DynamoDB

    S3 -->|Object Created| EventBridge
    EventBridge -->|Transcript srt| ClipDetector
    EventBridge -->|Transcript md| QuoteDetector
    EventBridge -->|Transcript md| BlogOutline
    EventBridge -->|BlogOutlineCreated| BlogGenerator
    EventBridge -->|Transcript srt| TranscriptIngest

    ClipDetector --> BedrockMemory
    ClipDetector --> DynamoDB
    QuoteDetector --> BedrockMemory
    QuoteDetector --> DynamoDB
    BlogOutline --> BedrockMemory
    BlogOutline --> DynamoDB
    BlogGenerator --> DynamoDB
    PlanningAgent --> BedrockMemory
    PlanningAgent --> DynamoDB

    TranscriptIngest -->|Video Upload Complete| EventBridge
    EventBridge -->|Video Upload Complete| StartPreprocess
    StartPreprocess --> MediaConvert
    MediaConvert -->|Job Complete| EventBridge
    EventBridge -->|Job Complete| PreprocessComplete
    EventBridge -->|Job Failed| PreprocessFailed
    PreprocessComplete --> DynamoDB

    EventBridge -->|Begin Clip Generation| ClipGenTrigger
    ClipGenTrigger --> StepFunctions
    StepFunctions --> SegmentExtractor
    SegmentExtractor --> S3
    StepFunctions --> ClipStitcher
    ClipStitcher --> S3
    StepFunctions --> DynamoDB

    EventBridge -->|Notification| NotificationHandler
    NotificationHandler --> Momento
    Momento -->|Subscribe| React

    style React fill:#61dafb
    style Cognito fill:#ff9900
    style APIGW fill:#ff9900
    style DynamoDB fill:#4053d6
    style S3 fill:#569a31
    style EventBridge fill:#ff9900
    style Momento fill:#00d4ff
    style MediaConvert fill:#ff9900
    style StepFunctions fill:#ff9900
    style BedrockMemory fill:#ff9900
```

## 2. Frontend Page Map

```mermaid
graph TB
    Login[Login Page /login]
    Signup[Signup Page /signup]
    Verify[Email Verification /verify-email]
    ForgotPwd[Forgot Password /forgot-password]

    Onboard[Onboarding Page /onboarding]

    Dashboard[Dashboard /]

    EpisodesList[Episodes List /episodes]
    EpisodeOverview[Episode Overview /episodes/:id/overview]
    EpisodePlan[Episode Plan /episodes/:id/plan]
    EpisodeUploads[Episode Uploads /episodes/:id/uploads]
    EpisodeClips[Episode Clips /episodes/:id/clips]
    EpisodeBlog[Episode Blog /episodes/:id/blog]
    EpisodeQuotes[Episode Quotes /episodes/:id/quotes]
    ClipDetail[Clip Detail /episodes/:episodeId/clips/:clipId]
    QuoteDetail[Quote Detail /episodes/:episodeId/quotes/:quoteId]

    TeamsList[Teams List /teams]
    TeamDetail[Team Detail /teams/:teamId]
    TeamGeneral[Team General /teams/:teamId/settings/general]
    TeamBranding[Team Branding /teams/:teamId/settings/branding]
    TeamWriting[Team Writing /teams/:teamId/settings/writing]
    TeamMembers[Team Members /teams/:teamId/members]

    Activity[Activity Feed /activity]
    Profile[User Profile /profile]
    NotFound[404 Not Found]

    Login -.->|Sign Up| Signup
    Signup -.->|Login| Login
    Login -.->|Forgot| ForgotPwd
    Signup -->|After Signup| Verify
    Verify -->|Verified| Onboard
    Login -->|Authenticated| Onboard
    Onboard -->|Profile Complete| Dashboard

    Dashboard --> EpisodesList
    Dashboard --> TeamsList
    Dashboard --> Activity
    Dashboard --> Profile

    EpisodesList --> EpisodeOverview
    EpisodeOverview --> EpisodePlan
    EpisodeOverview --> EpisodeUploads
    EpisodeOverview --> EpisodeClips
    EpisodeOverview --> EpisodeBlog
    EpisodeOverview --> EpisodeQuotes
    EpisodeClips --> ClipDetail
    EpisodeQuotes --> QuoteDetail

    TeamsList --> TeamDetail
    TeamDetail --> TeamGeneral
    TeamDetail --> TeamBranding
    TeamDetail --> TeamWriting
    TeamDetail --> TeamMembers

    style Login fill:#e1f5ff
    style Signup fill:#e1f5ff
    style Verify fill:#e1f5ff
    style ForgotPwd fill:#e1f5ff
    style Onboard fill:#ffe0b2
    style Dashboard fill:#c8e6c9
    style EpisodesList fill:#fff9c4
    style EpisodeOverview fill:#fff9c4
    style TeamsList fill:#f8bbd0
    style TeamDetail fill:#f8bbd0
```

## 3. Event List

```mermaid
graph LR
    subgraph AWSEvents[AWS Events]
        S3Create[S3 Object Created Transcript Upload]
        MCComplete[MediaConvert Job State Change COMPLETE]
        MCFailed[MediaConvert Job State Change ERROR]
    end

    subgraph CustomEvents[Custom Application Events]
        VideoUpload[nullcheck Video Upload Completed]
        PlanUpdate[nullcheck Episode Plan Updated]
        BlogOutline[nullcheck BlogOutlineCreated]
        ClipGen[nullcheck Begin Clip Generation]
        TeamMember[nullcheck Team Member Added Removed]
        TeamDelete[nullcheck Team Deleted]
        Notification[nullcheck Notification]
        QuoteGraphic[nullcheck Generate Quote Graphic]
    end

    subgraph EventTriggers[Event Triggers]
        S3Create -->|srt suffix| ClipDetectorAgent[Clip Detector Agent]
        S3Create -->|srt suffix| TranscriptIngest[Transcript Ingest]
        S3Create -->|md suffix| QuoteDetectorAgent[Quote Detector Agent]
        S3Create -->|md suffix| BlogOutlineAgent[Blog Outline Agent]

        VideoUpload --> StartPreprocess[Start Preprocessing]
        PlanUpdate --> PlanningAgent[Planning Agent]
        BlogOutline --> BlogGeneratorAgent[Blog Generator Agent]
        ClipGen --> ClipGenTrigger[Clip Generation Trigger]

        MCComplete --> PreprocessComplete[Preprocessing Complete]
        MCFailed --> PreprocessFailed[Preprocessing Failed]

        TeamMember --> SendTeamEmail[Send Team Email]
        TeamDelete --> CleanupAssets[Cleanup Team Assets]
        Notification --> NotificationHandler[Notification Handler]
        QuoteGraphic --> GenerateGraphic[Generate Graphic]
    end

    style S3Create fill:#569a31
    style MCComplete fill:#ff9900
    style MCFailed fill:#ff4444
    style VideoUpload fill:#4053d6
    style BlogOutline fill:#4053d6
    style ClipGen fill:#4053d6
```

## 4. Frontend to Backend Trigger Map

```mermaid
graph TB
    subgraph FrontendActions[Frontend Actions]
        CreateEp[Create Episode]
        UpdateEp[Update Episode]
        UploadTranscript[Upload Transcript]
        UploadTrack[Upload Video Track]
        UpdateStatus[Update Episode Status]
        ApproveClip[Approve Clip]
        CreateQuote[Create Quote]
        GenQuoteGraphic[Generate Quote Graphic]
        CreateTeam[Create Team]
        InviteMember[Invite Team Member]
        UpdateProfile[Update User Profile]
        GenBlog[Generate Blog]
        CreatePlan[Create Episode Plan]
        SkipPlan[Skip Plan Generation]
    end

    subgraph APIEndpoints[API Endpoints]
        PostEpisode[POST /episodes]
        PutEpisode[PUT /episodes/:id]
        PostTranscript[POST /episodes/:id/transcripts]
        PostTrack[POST /episodes/:id/tracks]
        PostStatus[POST /episodes/:id/statuses]
        PostClipStatus[POST /episodes/:id/clips/:clipId/status]
        PostQuote[POST /episodes/:id/quotes]
        PostQuoteGraphic[POST /episodes/:id/quotes/:quoteId/graphic]
        PostTeam[POST /teams]
        PostInvite[POST /teams/:id/members]
        PutProfile[PUT /users/profile]
        PostBlog[POST /episodes/:id/blog/regenerate]
        PostPlan[POST /episodes/:id/plan]
        PostSkipPlan[POST /episodes/:id/plan/skip]
    end

    subgraph LambdaFunction
rofileFunction]
        RegenerateBlogFn[RegenerateBlogFunction]
        AddPlanFn[AddPlanFunction]
        SkipPlanFn[SkipPlanGenerationFunction]
    end

    subgraph EventDriven[Event-Driven Processing]
        S3Upload[S3 Upload Event]
        ClipDetection[Clip Detector Agent]
        QuoteDetection[Quote Detector Agent]
        VideoPreprocess[MediaConvert Job]
        ClipWorkflow[Step Functions Workflow]
        BlogGeneration[Blog Generator Agent]
        PlanGeneration[Planning Agent]
        EmailSend[Send Team Email]
        MomentoPublish[Momento Notification]
    end

    CreateEp --> PostEpisode --> CreateEpFn
    UpdateEp --> PutEpisode --> UpdateEpFn
    UploadTranscript --> PostTranscript --> CreateTranscriptFn
    CreateTranscriptFn --> S3Upload
    S3Upload --> ClipDetection
    S3Upload --> QuoteDetection

    UploadTrack --> PostTrack --> CreateTrackFn
    CreateTrackFn --> VideoPreprocess

    UpdateStatus --> PostStatus --> UpdateStatusFn
    UpdateStatusFn -.->|Status Ready| ClipWorkflow

    ApproveClip --> PostClipStatus --> UpdateClipStatusFn
    UpdateClipStatusFn --> ClipWorkflow

    CreateQuote --> PostQuote --> CreateQuoteFn
    GenQuoteGraphic --> PostQuoteGraphic --> GenGraphicFn

    CreateTeam --> PostTeam --> CreateTeamFn
    InviteMember --> PostInvite --> AddMemberFn
    AddMemberFn --> EmailSend
    AddMemberFn --> MomentoPublish

    UpdateProfile --> PutProfile --> UpdateProfileFn

    GenBlog --> PostBlog --> RegenerateBlogFn
    RegenerateBlogFn --> BlogGeneration

    CreatePlan --> PostPlan --> AddPlanFn
    AddPlanFn --> PlanGeneration

    SkipPlan --> PostSkipPlan --> SkipPlanFn

    style CreateEp fill:#e1f5ff
    style UploadTranscript fill:#e1f5ff
    style ApproveClip fill:#e1f5ff
    style PostEpisode fill:#fff9c4
    style CreateEpFn fill:#c8e6c9
    style ClipDetection fill:#f8bbd0
    style ClipWorkflow fill:#f8bbd0
```

## 5. Data Flow - Clip Generation Workflow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Lambda
    participant S3
    participant EventBridge
    participant ClipAgent
    participant StepFunctions
    participant DynamoDB
    participant Momento

    User->>Frontend: Upload Transcript
    Frontend->>API: POST /episodes/:id/transcripts
    API->>Lambda: CreateTranscriptUpload
    Lambda->>S3: Generate Presigned URL
    Lambda-->>Frontend: Return Upload URL
    Frontend->>S3: Upload srt File
    S3->>EventBridge: Object Created Event
    EventBridge->>ClipAgent: Trigger Clip Detection
    ClipAgent->>S3: Read Transcript
    ClipAgent->>ClipAgent: AI Analysis Bedrock
    ClipAgent->>DynamoDB: Store Detected Clips
    ClipAgent->>EventBridge: Publish Notification
    EventBridge->>Momento: Publish to Topic
    Momento->>Frontend: Real-time Update

    User->>Frontend: Approve Clip
    Frontend->>API: POST /clips/:id/status
    API->>Lambda: UpdateClipStatus
    Lambda->>DynamoDB: Update Status
    Lambda->>EventBridge: Begin Clip Generation
    EventBridge->>StepFunctions: Start Workflow
    StepFunctions->>Lambda: Extract Segments
    Lambda->>S3: Read Video Chunks
    Lambda->>S3: Write Segments
    StepFunctions->>Lambda: Stitch Clip
    Lambda->>S3: Read Segments
    Lambda->>S3: Write Final Clip
    StepFunctions->>DynamoDB: Update Status
    StepFunctions->>EventBridge: Publish Notification
    EventBridge->>Momento: Publish to Topic
    Momento->>Frontend: Clip Ready
```

## 6. Multi-Tenant Architecture

```mermaid
graph TB
    subgraph UserAuth[User Authentication]
        User[User Login]
        Cognito[Cognito User Pool]
        PreToken[Pre-Token Generation Lambda Trigger]
    end

    subgraph RequestAuth[Request Authorization]
        Request[API Request]
        Authorizer[Lambda Authorizer]
        JWT[JWT Token with tenantId and activeTeamId]
    end

    subgraph DataIsolation[Data Isolation]
        DynamoDB[(DynamoDB)]
        TeamData[Team Data pk team teamId]
        EpisodeData[Episode Data pk tenantId episodeId]
        UserData[User Data pk user userId]
        Membership[Team Membership pk team teamId sk member userId]
    end

    subgraph AccessControl[Access Control]
        CheckMembership[Check Team Membership]
        ValidateAccess[Validate Resource Access]
        FilterResults[Filter by tenantId]
    end

    User --> Cognito
    Cognito --> PreToken
    PreToken -->|Add Custom Claims| JWT
    JWT --> Request
    Request --> Authorizer
    Authorizer --> CheckMembership
    CheckMembership --> DynamoDB
    Authorizer -->|Inject Context| ValidateAccess
    ValidateAccess --> FilterResults
    FilterResults --> TeamData
    FilterResults --> EpisodeData
    FilterResults --> UserData
    FilterResults --> Membership

    style Cognito fill:#ff9900
    style DynamoDB fill:#4053d6
    style JWT fill:#4caf50
    style CheckMembership fill:#ff9800
```
