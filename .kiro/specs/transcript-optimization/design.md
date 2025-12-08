# Design Document

## Overview

This feature introduces a transcript optimization pipeline that creates token-efficient versions of SRT transcripts for AI agents. When an SRT file is uploaded, a new Lambda function processes it to create a cleaned transcript.md file that removes timestamps, filler words, and unnecessary whitespace. The quote detectornerator agents are updated to consume this optimized format, while the clip detector continues using the original SRT file for precise timing information.

The design follows the existing event-driven architecture using EventBridge for coordination and S3 for storage. The solution maintains backward compatibility by implementing fallback logic when cleaned transcripts are unavailable.

## Architecture

### System Components

```
┌─────────────────┐
│  SRT Upload     │
│  (S3 Event)     │
└────────┬────────┘
         │
         ├──────────────────┬──────────────────┐
         │                  │                  │
         v                  v                  v
┌────────────────┐  ┌──────────────┐  ┌──────────────┐
│ Transcript     │  │ Clip         │  │ Clip         │
│ Added          │  │ Detector     │  │ Detector     │
│ (Enhanced)     │  │ (Existing)   │  │ (Existing)   │
└────────┬───────┘  └──────────────┘  └──────────────┘
         │
         ├─────────────────────────────┐
         │                             │
         v                             v
┌────────────────────┐      ┌──────────────────────┐
│ Update Episode     │      │ Create transcript.md │
│ Metadata           │      │ and Save to S3       │
│ (Existing)         │      │ (New)                │
└────────────────────┘      └──────────┬───────────┘
                                       │
                                       v
                            ┌────────────────────┐
                            │ S3 Event           │
                            │ (transcript.md)    │
                            └────────┬───────────┘
                                     │
                                     ├──────────────────┐
                                     v                  v
                            ┌────────────────┐  ┌──────────────┐
                            │ Quote Detector │  │ Blog         │
                            │ (Uses .md)     │  │ Generator    │
                            │                │  │ (Uses .md)   │
                            └────────────────┘  └──────────────┘
```

### Event Flow

1. **SRT Upload**: User uploads SRT file to S3
2. **S3 Event**: EventBridge receives object creation event for .srt file
3. **Parallel Processing**:
   - Transcript Added handler (enhanced):
     - Updates episode metadata (existing)
     - Creates cleaned transcript.md and saves to S3 (new)
   - Clip Detector processes .srt file (existing behavior)
4. **Cleaned Transcript Upload**: S3 event for transcript.md creation
5. **Agent Triggering**: Quote and Blog agents triggered by transcript.md event
6. **Content Generation**: Agents process transcripts and create content

## Components and Interfaces

### Enhanced Transcript Added Handler

**Purpose**: Update episode metadata AND create optimized transcript.md files

**Input**: EventBridge S3 object creation event (unchanged)
```javascript
{
  "detail": {
    "object": {
      "key": "team#abc/episode-id/transcript.srt"
    }
  }
}
```

**Output**:
- Updated episode metadata in DynamoDB (existing)
- Cleaned transcript.md file in S3 (new - triggers S3 event for agents)

**New Processing Steps**:
1. Load SRT file from S3 (existing)
2. Parse SRT and extract speakers (existing)
3. **NEW**: Create cleaned transcript
4. **NEW**: Save transcript.md to S3
5. Update episode metadata (existing)
6. Publish notification (existing)

**New Helper Functions**:
- `createCleanedTranscript(srtContent)`: Parse SRT and create cleaned version
- `detectSpeaker(text)`: Identify speaker attribution in text
- `removeFillerWords(text)`: Strip common filler words
- `normalizeWhitespace(text)`: Optimize spacing
- `formatCleanedTranscript(entries)`: Create final markdown output

### Updated Agent Functions

**Quote Detector**:
- Triggered by transcript.md S3 event
- Load transcript.md from event key
- Process dialogue without timestamps
- No fallback needed (choreography ensures .md exists)

**Blog Generator**:
- Triggered by transcript.md S3 event
- Load transcript.md from event key
- Generate content from cleaned dialogue
- No fallback needed (choreography ensures .md exists)

**Clip Detector**:
- Continue being triggered by .srt S3 event
- Continue loading .srt file
- No changes to existing logic

### Transcript Utility Updates

**No Changes Required**:
- Agents load transcript directly from S3 key in event
- No new utility functions needed
- Existing `loadTranscript(key)` works for both .srt and .md files

## Data Models

### SRT Entry Structure

An SRT entry consists of four parts separated by newlines:
```
1
00:00:00,000 --> 00:00:02,500
Welcome to the Example Subtitle File!

2
00:00:03,000 --> 00:00:06,000
This is a demonstration of SRT subtitles.
```

Parsed structure:
```javascript
{
  sequenceNumber: 1,
  startTime: "00:00:00,000",
  endTime: "00:00:02,500",
  text: "Welcome to the Example Subtitle File!"
}
```

With speaker attribution (optional):
```
1
00:00:20,925 --> 00:00:27,104
Allen: Sometimes it's a breakthrough
```

Parsed with speaker:
```javascript
{
  sequenceNumber: 1,
  startTime: "00:00:20,925",
  endTime: "00:00:27,104",
  text: "Allen: Sometimes it's a breakthrough",
  speaker: "Allen",  // extracted if present
  dialogue: "Sometimes it's a breakthrough"  // text without speaker prefix
}
```

### Cleaned Transcript Entry
```javascript
{
  speaker: "Allen",  // null if no attribution
  text: "Sometimes it's a breakthrough",
  hasFillerWords: false
}
```

### Cleaned Transcript Format (with speakers)
```markdown
Allen: Sometimes it's a breakthrough, sometimes a regret.

Andres: We try it out live.

Allen: That's what makes it interesting.
```

### Cleaned Transcript Format (without speakers)
```markdown
Sometimes it's a breakthrough, sometimes a regret.

We try it out live.

That's what makes it interesting.
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: SRT parsing preserves all dialogue

*For any* valid SRT file, parsing and extracting dialogue should preserve all non-timestamp text content from the original file.
**Validates: Requirements 1.2**

### Property 2: Speaker detection and extraction

*For any* SRT entry with speaker attribution in the format "Name: text", the parser should correctly identify the speaker name and separate it from the dialogue text.
**Validates: Requirements 1.3, 8.1, 8.2**

### Property 3: Non-attributed content handling

*For any* SRT entry without speaker attribution, the parser should treat the entire text as dialogue and format it as plain text with paragraph breaks.
**Validates: Requirements 1.4, 8.3, 8.5**

### Property 4: Timestamp removal is complete

*For any* cleaned transcript, the output should contain no SRT timestamp notation in the format "HH:MM:SS,mmm --> HH:MM:SS,mmm".
**Validates: Requirements 1.5**

### Property 5: Filler word removal preserves sentence structure

*For any* dialogue text, removing filler words should result in grammatically valid sentences with proper capitalization and punctuation.
**Validates: Requirements 1.6, 7.2, 7.3, 7.4**

### Property 6: Whitespace normalization reduces size

*For any* transcript text, normalizing whitespace should result in a smaller or equal character count while maintaining readability.
**Validates: Requirements 1.7**

### Property 7: S3 path structure is preserved

*For any* SRT file at path "tenant/episode/transcript.srt", the cleaned transcript should be saved at "tenant/episode/transcript.md" maintaining the same directory structure.
**Validates: Requirements 2.2**

### Property 8: Event-driven choreography ensures correct triggering

*For any* transcript.md file created in S3, the system should trigger the quote detector and blog generator agents via S3 events, ensuring they receive the cleaned transcript.
**Validates: Requirements 3.1, 4.1**

### Property 9: Output format consistency across agents

*For any* agent (quote detector, blog generator), the output format should be identical regardless of whether the input was transcript.md or transcript.srt.
**Validates: Requirements 3.4, 4.4**

### Property 10: Clip detector timestamp accuracy

*For any* SRT file processed by the clip detector, the extracted timestamps should exactly match the timestamps in the original SRT entries.
**Validates: Requirements 5.2, 5.3**

### Property 11: Speaker-attributed output formatting

*For any* cleaned transcript with speaker attribution, each dialogue entry should be formatted as "Speaker: dialogue text" with proper line breaks between speakers.
**Validates: Requirements 8.4**

## Error Handling

### Parsing Errors

**Malformed SRT Entries**:
- Skip invalid entries
- Log warning with entry details
- Continue processing remaining entries
- If no valid entries found, exit without creating .md file

**Missing Required Fields**:
- Validate sequence number, timestamps, and text
- Skip entries missing any required field
- Log specific validation failures

### S3 Errors

**Upload Failures**:
- Log error with full context
- Do not block original transcript-added processing
- Agents will fall back to .srt file

**Read Failures**:
- Return empty string
- Log error details
- Allow agents to handle gracefully

### Agent Event Handling

**Quote and Blog Agents**:
- Triggered by transcript.md S3 event
- Load transcript from event key
- Process cleaned content
- No fallback needed (choreography ensures .md exists before trigger)

**Clip Detector**:
- Triggered by .srt S3 event
- Load transcript from event key
- Process SRT content with timestamps
- Unchanged from existing behavior

## Testing Strategy

### Unit Testing

**Transcript Added Handler Tests**:
- Test SRT parsing with valid entries
- Test speaker detection with various formats
- Test filler word removal
- Test whitespace normalization
- Test handling of malformed entries
- Test speaker-attributed and non-attributed formats
- Test S3 upload of transcript.md
- Test existing metadata update still works
- Test error handling when .md upload fails

**Agent Update Tests**:
- Test quote detector triggered by .md event
- Test blog generator triggered by .md event
- Test clip detector still triggered by .srt event
- Verify output consistency across formats

### Integration Testing

**End-to-End Flow**:
- Upload SRT file to S3
- Verify transcript.md creation
- Verify agents receive correct format
- Verify content generation succeeds

**Error Scenarios**:
- Test with malformed SRT files
- Test with S3 upload failures for .md
- Test processor failure doesn't block .srt agents
- Verify graceful degradation

### Property-Based Testing

The testing framework will use **fast-check** for JavaScript property-based testing. Each property test should run a minimum of 100 iterations to ensure comprehensive coverage.

**Property Test 1: SRT parsing round trip**
- Generate random valid SRT content
- Parse into entries
- Verify all dialogue text is preserved
- **Validates: Property 1**

**Property Test 2: Speaker detection accuracy**
- Generate random speaker-attributed text
- Parse and extract speaker
- Verify speaker name and text separation
- **Validates: Property 2**

**Property Test 3: Filler word removal safety**
- Generate random dialogue with filler words
- Remove filler words
- Verify no semantic content is lost
- **Validates: Property 3**

**Property Test 4: Whitespace normalization efficiency**
- Generate random text with excessive whitespace
- Normalize whitespace
- Verify character count reduction
- **Validates: Property 4**

**Property Test 5: Timestamp removal completeness**
- Generate random SRT content
- Create cleaned transcript
- Verify no timestamp patterns remain
- **Validates: Property 6**

## Configuration

### Filler Words List

Predefined list of common filler words to remove:
```javascript
const FILLER_WORDS = [
  'um', 'uh', 'ah', 'er', 'hmm',
  'like', 'you know', 'i mean',
  'sort of', 'kind of', 'basically',
  'actually', 'literally', 'right',
  'okay', 'so', 'well', 'yeah'
];
```

### Environment Variables

**Transcript Processor**:
- `BUCKET_NAME`: S3 bucket for transcripts
- `TABLE_NAME`: DynamoDB table for episode metadata
- `LOG_LEVEL`: Logging level (ERROR in production)

**Updated Agents**:
- Existing environment variables remain unchanged
- No new configuration required

## Deployment Considerations

### EventBridge Rules

**Transcript Added Handler** (unchanged - continues to trigger on .srt):
```yaml
TranscriptAddedHandler:
  Events:
    TranscriptAdded:
      Type: EventBridgeRule
      Properties:
        Pattern:
          source:
            - aws.s3
          detail-type:
            - Object Created
          detail:
            object:
              key:
                - suffix: .srt
```

**Quote Detector** (update to trigger on .md upload):
```yaml
QuoteDetector:
  Events:
    TranscriptCleaned:
      Type: EventBridgeRule
      Properties:
        Pattern:
          source:
            - aws.s3
          detail-type:
            - Object Created
          detail:
            object:
              key:
                - suffix: transcript.md
```

**Blog Outline Agent** (update to trigger on .md upload):
```yaml
BlogOutlineAgent:
  Events:
    TranscriptCleaned:
      Type: EventBridgeRule
      Properties:
        Pattern:
          source:
            - aws.s3
          detail-type:
            - Object Created
          detail:
            object:
              key:
                - suffix: transcript.md
```

**Clip Detector** (unchanged - continues to trigger on .srt):
```yaml
ClipDetector:
  Events:
    TranscriptAdded:
      Type: EventBridgeRule
      Properties:
        Pattern:
          source:
            - aws.s3
          detail-type:
            - Object Created
          detail:
            object:
              key:
                - suffix: .srt
```

### IAM Permissions

**Transcript Added Handler** (add new permission):
- Existing: `s3:GetObject`, `dynamodb:GetItem`, `dynamodb:UpdateItem`, `dynamodb:DeleteItem`, `events:PutEvents`
- **New**: `s3:PutObject` on transcript bucket (for saving transcript.md)

**No Changes Required**:
- Quote detector existing S3 permissions sufficient
- Blog generator existing S3 permissions sufficient
- Clip detector unchanged

### Backward Compatibility

- Existing episodes with only .srt files continue working (clip detector unchanged)
- Quote and blog agents will only trigger on new episodes with .md files
- Existing episodes can be reprocessed by re-uploading .srt files
- No breaking changes to existing functionality
- Can be deployed incrementally

## Performance Optimization

### Token Reduction

**Expected Savings**:
- Timestamp removal: ~30% reduction
- Filler word removal: ~5-10% reduction
- Whitespace optimization: ~2-5% reduction
- **Total**: ~35-45% token reduction for quote and blog agents

### Processing Efficiency

**Transcript Processor**:
- Single-pass parsing
- In-memory processing (no intermediate files)
- Minimal regex operations
- Fast string operations

**Agent Loading**:
- Cached transcript loading (existing)
- Single S3 read per agent invocation
- No fallback overhead (choreography ensures correct file exists)

## Monitoring and Observability

### CloudWatch Metrics

**Custom Metrics**:
- Transcript.md creation success rate
- Cleaned transcript file size vs original
- Token reduction percentage
- Transcript-added handler processing duration

### Logging

**Transcript Added Handler**:
- Log SRT file key and size (existing)
- Log parsing statistics (entries processed, skipped) (new)
- Log cleaned transcript size (new)
- Log S3 upload success/failure for .md (new)
- Maintain existing metadata update logging

**Agent Updates**:
- Log transcript file loaded from event
- Maintain existing agent logging
- No additional logging needed

### Alarms

**Recommended Alarms**:
- High transcript-added handler error rate
- Transcript processing duration exceeds threshold
- Quote/blog agents triggered without .md file (indicates choreography failure)
- .md file creation failures

