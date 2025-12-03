# Implementation Plan

- [x] 1. Create agent status coordination utility




  - [x] 1.1 Create `functions/utils/agent-status.mjs` with AGENT_TYPES and AGENT_STATUS constants

    - Define constants for agent types (clipDetector, quoteDetector, blogOutline)
    - Define constants for agent statuses (In Progress, Completed, Failed)
    - _Requirements: 1.3, 2.3, 3.3_

  - [x] 1.2 Implement `updateAgentStatus` function
    - Accept tenantId, episodeId, agentType, status, and optional error
    - Use conditional DynamoDB update to set only the specific agent's status
    - Include startedAt/completedAt timestamps
    - _Requirements: 1.3, 2.3, 3.3_
  - [x] 1.3 Implement `checkAllAgentsComplete` function
    - Query episode metadata for agentStatus field
    - Return true only if all three agents have status Completed
    - _Requirements: 4.3, 6.2_
  - [x] 1.4 Implement `isContentGenerationComplete` function

    - Check if GENERATE_CONTENT workflow step is already Completed
    - Return boolean for idempotency checks
    - _Requirements: 6.4_
  - [ ]* 1.5 Write property tests for agent status utility
    - **Property 1: Agent Status Isolation** - updating one agent's status does not modify others
    - **Validates: Requirements 1.3, 2.3, 3.3**
  - [ ]* 1.6 Write property tests for completion coordination
    - **Property 3: Completion Coordination** - workflow step is Completed iff all agents are Completed
    - **Validates: Requirements 4.3, 6.2**

- [x] 2. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Create Quote Detector Agent




  - [x] 3.1 Create `functions/agents/quote-detector.mjs`

    - Copy structure from clip-detector.mjs
    - Use only createQuoteTool
    - Write specialized system prompt for quote detection (3-7 quotes)
    - Include episode context enrichment
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Integrate agent status tracking in quote-detector
    - Call updateAgentStatus on start (In Progress)
    - Call updateAgentStatus on completion (Completed)
    - Call updateAgentStatus on error (Failed with message)
    - Check isContentGenerationComplete for idempotency

    - _Requirements: 2.3, 6.1, 6.4_
  - [x] 3.3 Add completion coordination logic

    - After updating own status, call checkAllAgentsComplete
    - If all complete, update workflow step to Completed and episode status to Ready
    - _Requirements: 4.3, 6.2_
  - [ ]* 3.4 Write unit tests for quote-detector agent
    - Test handler with mocked DynamoDB and Bedrock
    - Verify only createQuote tool is configured
    - Test idempotency check
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 4. Create Blog Outline Agent






  - [x] 4.1 Create `functions/agents/blog-outline-agent.mjs`

    - Copy structure from clip-detector.mjs
    - Use only buildBlogOutlineTool
    - Write specialized system prompt for blog outline generation
    - Include episode context enrichment
    - _Requirements: 3.1, 3.2_

  - [x] 4.2 Integrate agent status tracking in blog-outline-agent

    - Call updateAgentStatus on start (In Progress)
    - Call updateAgentStatus on completion (Completed)
    - Call updateAgentStatus on error (Failed with message)
    - Check isContentGenerationComplete for idempotency
    - _Requirements: 3.3, 6.1, 6.4_

  - [x] 4.3 Add completion coordination logic

    - After updating own status, call checkAllAgentsComplete
    - If all complete, update workflow step to Completed and episode status to Ready
    - _Requirements: 4.3, 6.2_
  - [ ]* 4.4 Write unit tests for blog-outline-agent
    - Test handler with mocked DynamoDB and Bedrock
    - Verify only buildBlogOutline tool is configured
    - Test idempotency check
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 5. Refactor Clip Detector Agent





  - [x] 5.1 Remove buildBlogOutline and createQuote tools from clip-detector


    - Keep only createClipTool
    - Update tools array to single tool
    - _Requirements: 1.2_
  - [x] 5.2 Simplify system prompt for clip detection only

    - Remove quote detection instructions
    - Remove blog outline instructions
    - Focus prompt on 5-10 clip recommendations
    - _Requirements: 1.1_
  - [x] 5.3 Integrate agent status tracking in clip-detector

    - Call updateAgentStatus on start (In Progress)
    - Call updateAgentStatus on completion (Completed)
    - Call updateAgentStatus on error (Failed with message)
    - Keep existing isContentGenerationComplete check
    - _Requirements: 1.3, 6.1, 6.4_
  - [x] 5.4 Add completion coordination logic

    - After updating own status, call checkAllAgentsComplete
    - If all complete, update workflow step to Completed and episode status to Ready
    - Remove direct episode status update (now coordinated)
    - _Requirements: 4.3, 6.2_
  - [ ]* 5.5 Update unit tests for clip-detector agent
    - Verify only createClip tool is configured
    - Test new status coordination logic
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 6. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Update SAM template for new agents








  - [x] 7.1 Add QuoteDetectorFunction to template.yaml


    - Configure Lambda function with same settings as ClipDetectorFunction
    - Add EventBridge rule for S3 transcript uploads (.srt suffix)
    - Add required IAM policies (DynamoDB, S3, Bedrock)
    - _Requirements: 4.1, 5.1_

  - [x] 7.2 Add BlogOutlineAgentFunction to template.yaml

    - Configure Lambda function with same settings as ClipDetectorFunction
    - Add EventBridge rule for S3 transcript uploads (.srt suffix)
    - Add required IAM policies (DynamoDB, S3, Bedrock, EventBridge for BlogOutlineCreated)
    - _Requirements: 4.1, 5.1_

  - [x] 7.3 Verify ClipDetectorFunction EventBridge rule remains unchanged

    - Ensure same trigger pattern for all three agents
    - _Requirements: 5.1_

- [ ] 8. Write property-based tests for fault isolation and failure handling
  - [ ]* 8.1 Write property test for fault isolation
    - **Property 2: Fault Isolation** - one agent's failure does not affect others
    - **Validates: Requirements 4.2**
  - [ ]* 8.2 Write property test for failure propagation
    - **Property 4: Failure Propagation** - if any agent fails, workflow step is Failed
    - **Validates: Requirements 6.3**
  - [ ]* 8.3 Write property test for idempotency
    - **Property 5: Idempotency** - agents skip processing if already completed
    - **Validates: Requirements 6.4**
  - [ ]* 8.4 Write property test for In Progress initialization
    - **Property 6: In Progress Initialization** - workflow step set to In Progress on first agent start
    - **Validates: Requirements 6.1**

- [ ] 9. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

