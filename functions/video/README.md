# Video Clip Processing Functions

This directory contains Lambda functions for the video clip processing workflow orchestrated by AWS Step Functions.

## Architecture Overview

The video clip processing system uses a Step Functions state machine to coordinate the following workflow:

1. **Initialize Processing**: Parse clip recommendations and prepare processing context
2. **Parallel Processing**: Process multiple clips concurrently (up to 5)
3. **Extract Segments**: Extract video segments from chunked video files
4. **Stitch Clips**: Combine segments into final clip files
5. **Update Records**: Update DynamoDB with processing results

## Functions

### segment-extractor.mjs
- **Purpose**: Extracts video segments from pre-chunked video files using FFmpeg
- **Memory**: 3008 MB (for FFmpeg processing)
- **Timeout**: 15 minutes
- **Status**: Placeholder implementation (to be completed in task 2)

### clip-stitcher.mjs
- **Purpose**: Combines video segments into final clip files using FFmpeg
- **Memory**: 3008 MB (for FFmpeg processing)
- **Timeout**: 10 minutes
- **Status**: Placeholder implementation (to be completed in task 3)

### update-clip-record.mjs
- **Purpose**: Updates DynamoDB clip records with processing results
- **Memory**: 512 MB (default)
- **Timeout**: 30 seconds
- **Status**: Fully implemented

## Step Functions State Machine

The `VideoClipProcessingStateMachine` orchestrates the entire workflow:

- **Concurrency**: Processes up to 5 clips in parallel
- **Retry Logic**: Automatic retry with exponential backoff for failed operations
- **Error Handling**: Continues processing other clips if one fails
- **Monitoring**: CloudWatch logs and X-Ray tracing enabled

## Shared Utilities

The `functions/utils/video-processing.mjs` module provides shared utilities:

- **Time Conversion**: Convert between time strings and seconds
- **HLS Manifest Parsing**: Parse M3U8 manifest files to extract segment information
- **Chunk Mapping**: Calculate which video chunks contain specific timestamps
- **Key Generation**: Generate S3 keys for segments and clips
- **Validation**: Validate segment timing and parameters

## Usage

The Step Functions workflow is triggered with input in this format:

```json
{
  "episodeId": "123e4567-e89b-12d3-a456-426614174000",
  "trackName": "main",
  "clips": [
    {
      "clipId": "clip-uuid",
      "segments": [
        {
          "startTime": "00:15:30",
          "endTime": "00:17:45"
        }
      ]
    }
  ]
}
```

## Next Steps

1. **Task 2**: Implement segment extraction with FFmpeg integration
2. **Task 3**: Implement clip stitching functionality
3. **Task 4**: Add comprehensive error handling and monitoring
4. **Task 5**: Create workflow trigger functions and API endpoints
