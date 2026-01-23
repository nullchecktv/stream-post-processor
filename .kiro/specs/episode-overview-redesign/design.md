# Design Document

## Overview

The Episode Overview page redesign transforms the current multi-tab dashboard into a focused "conveyor belt" experience that guides users through episode completion with a single, clear primary action at each state. The design implements a state machine that determines the episode's current phase and maps it to exactly one primary action, eliminating decision paralysis and providing clear guidance.

The page structure consists of four sections in a fixed hierarchy:
1. **Episode Identity** - Compact, scannable episode metadata
2. **Primary Action Zone** - Dominant section with exactly one CTA
3. **Workflow Progress** - Visual reassurance of progress
4. **Created Artifacts** - Proof of momentum and access to outputs

This design prioritizes certainty over choice, guiding users confidently through the episode workflow from planning to publication.

## Architecture

### Component Structure

```
EpisodeOverviewPage
├── EpisodeIdentitySection
│   ├── EpisodeTitle
│   ├── PlatformBadges
│   ├── StatusBadge
│   └── LastUpdatedTimestamp
├── PrimaryActionZone
│   ├── ActionHeadline
│   ├── ActionSubtext
│   ├── PrimaryActionButton
│   └── SecondaryEscapeHatch (optional)
├── WorkflowProgressSection
│   ├── ProgressSteps
│   └── CurrentStateIndicator
└── CreatedArtifactsSection
    ├── ClipsGrid (conditional)
    ├── QuotesGrid (conditional)
    └── BlogPostCard (conditional)
```

### State Machine Architecture

The state machine determines the episode's current phase based on existing data:

```typescript
type EpisodeState = 'idle' | 'planned' | 'recorded' | 'processed' | 'published';

interface StateConfig {
  state: EpisodeState;
  headline: string;
  subtext: string;
  primaryAction: {
ngth > 0) && episode.status !== 'Published'`)
- **published**: Episode status is Published (`episode.status === 'Published'`)

### Data Flow

```
Episode Data → State Determination → State Config Lookup → UI Rendering
     ↓
  Tracks Data
     ↓
  Clips Data
     ↓
  Quotes Data
     ↓
  Blog Data
```

## Components and Interfaces

### EpisodeOverviewPage Component

Main page component that orchestrates the state machine and renders all sections.

```typescript
interface EpisodeOverviewPageProps {
  // No props - uses route params for episodeId
}

interface EpisodeOverviewState {
  episode: Episode | null;
  plan: EpisodePlan | null;
  tracks: Track[];
  clips: Clip[];
  quotes: Quote[];
  blog: Blog | null;
  loading: boolean;
  error: string | null;
}
```

**Responsibilities:**
- Fetch episode data and related entities
- Determine current episode state
- Lookup state configuration
- Render all page sections
- Handle primary action clicks
- Subscribe to real-time updates

### EpisodeIdentitySection Component

Displays compact, scannable episode metadata.

```typescript
interface EpisodeIdentitySectionProps {
  episode: Episode;
}
```

**Responsibilities:**
- Display episode title
- Render platform badges
- Show current status badge
- Display last updated timestamp
- Maintain compact, scannable layout

### PrimaryActionZone Component

Dominant section containing exactly one primary action.

```typescript
interface PrimaryActionZoneProps {
  config: StateConfig;
  loading?: boolean;
}
```

**Responsibilities:**
- Display action headline
- Display action subtext
- Render primary action button
- Render optional secondary escape hatch
- Handle button click events
- Show loading state during actions

### WorkflowProgressSection Component

Visual representation of workflow progress.

```typescript
interface WorkflowProgressSectionProps {
  currentState: EpisodeState;
  completedSteps: string[];
}
```

**Responsibilities:**
- Display workflow steps
- Highlight current step
- Show completed steps
- Provide visual reassurance
- Remain visually subordinate to Primary Action Zone

### CreatedArtifactsSection Component

Displays usable artifacts generated during the workflow.

```typescript
interface CreatedArtifactsSectionProps {
  clips: Clip[];
  quotes: Quote[];
  blog: Blog | null;
}
```

**Responsibilities:**
- Conditionally render based on artifact existence
- Display clips grid when clips exist
- Display quotes grid when quotes exist
- Display blog post card when blog exists
- Provide access to view/download artifacts
- Hide section when no artifacts exist

## Data Models

### StateConfig Model

Configuration for each episode state.

```typescript
interface StateConfig {
  state: EpisodeState;
  headline: string;
  subtext: string;
  primaryAction: {
    label: string;
    handler: () => void;
  };
  secondaryAction?: {
    label: string;
    handler: () => void;
  };
}

const STATE_CONFIGS: Record<EpisodeState, StateConfig> = {
  idle: {
    state: 'idle',
    headline: 'Create your episode plan',
    subtext: 'Define objectives and structure before recording',
    primaryAction: {
      label: 'Generate plan',
      handler: () => navigate(`/episodes/${episodeId}/plan`)
    }
  },
  planned: {
    state: 'planned',
    headline: 'Upload your recording',
    subtext: 'Add video tracks and transcript to start processing',
    primaryAction: {
      label: 'Upload recording',
      handler: () => navigate(`/episodes/${episodeId}/content`)
    }
  },
  recorded: {
    state: 'recorded',
    headline: 'Generate clips and quotes',
    subtext: 'AI will analyze your content and create shareable assets',
    primaryAction: {
      label: 'Generate clips & quotes',
      handler: async () => await triggerContentGeneration()
    },
    secondaryAction: {
      label: 'View content',
      handler: () => navigate(`/episodes/${episodeId}/content`)
    }
  },
  processed: {
    state: 'processed',
    headline: 'Review and publish',
    subtext: 'Review generated content and mark episode as published',
    primaryAction: {
      label: 'Review & publish',
      handler: () => navigate(`/episodes/${episodeId}/content`)
    }
  },
  published: {
    state: 'published',
    headline: 'Episode complete!',
    subtext: 'Start your next episode to continue creating',
    primaryAction: {
      label: 'Start next episode',
      handler: () => navigate('/episodes/new')
    }
  }
};
```

### Episode State Determination

Logic for determining the current episode state.

```typescript
function determineEpisodeState(
  episode: Episode,
  plan: EpisodePlan | null,
  tracks: Track[],
  clips: Clip[],
  quotes: Quote[]
): EpisodeState {
  // Published state takes precedence
  if (episode.status === 'Published') {
    return 'published';
  }

  // Check for processed content
  if (clips.length > 0 || quotes.length > 0) {
    return 'processed';
  }

  // Check for uploaded tracks
  if (tracks.length > 0) {
    return 'recorded';
  }

  // Check for plan
  if (plan) {
    return 'planned';
  }

  // Default to idle
  return 'idle';
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, I identified the following redundancies:
- Properties 3.5-3.8 are redundant with 3.1 (section ordering)
- Property 7.1 is redundant with 2.1 (single primary button)
- Properties 10.1-10.5 are redundant with 6.1-6.5 (navigation behavior)

The consolidated properties below eliminate these redundancies while maintaining complete validation coverage.

### Property 1: State Determination from Episode Data

*For any* episode with no plan, the state determi

*For any* episode with clips or quotes but not published status, the state determination function should return "processed"

**Validates: Requirements 1.4**

### Property 5: State Determination from Published Status

*For any* episode with published status, the state determination function should return "published" regardless of other data

**Validates: Requirements 1.5**

### Property 6: State Config Completeness

*For all* episode states in the state machine, the state config should define exactly one primary action with label and handler

**Validates: Requirements 1.6, 2.1**

### Property 7: State-to-Action Mapping Correctness

*For all* episode states, the state config should map to the correct primary action label: idle→"Generate plan", planned→"Upload recording", recorded→"Generate clips & quotes", processed→"Review & publish", published→"Start next episode"

**Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6**

### Property 8: Action Zone Content Completeness

*For all* episode states, the state config should include a non-empty headline and non-empty subtext

**Validates: Requirements 2.7, 2.8**

### Property 9: Page Structure Ordering

*For any* rendered episode overview page, the component tree should contain exactly four sections in this order: EpisodeIdentitySection, PrimaryActionZone, WorkflowProgressSection, CreatedArtifactsSection

**Validates: Requirements 3.1**

### Property 10: Episode Identity Content

*For any* rendered episode identity section, the section should display episode title, platform badges, status badge, and last updated timestamp

**Validates: Requirements 3.2, 9.1, 9.2, 9.3, 9.4**

### Property 11: Episode Identity Exclusions

*For any* rendered episode identity section, the section should not display created date, episode number, or themes as primary elements

**Validates: Requirements 3.4**

### Property 12: Episode Identity Non-Interactive

*For any* rendered episode identity section, the section should not contain button or input elements

**Validates: Requirements 9.5**

### Property 13: Workflow Progress Current State Display

*For any* rendered workflow progress section with a current state, the section should highlight the current state in the progress display

**Validates: Requirements 4.1**

### Property 14: Workflow Progress Completeness

*For any* rendered workflow progress section, the section should display all workflow steps with appropriate status indicators (completed, current, remaining)

**Validates: Requirements 4.2**

### Property 15: Workflow Progress No Primary Actions

*For any* rendered workflow progress section, the section should not contain primary button elements

**Validates: Requirements 4.3**

### Property 16: Artifacts Display Only Existing

*For any* rendered created artifacts section, the section should only display artifacts that exist in the provided data (clips, quotes, blog)

**Validates: Requirements 5.1, 5.4**

### Property 17: Artifacts Section Conditional Rendering

*For any* episode with no clips, no quotes, and no blog, the created artifacts section should not be rendered

**Validates: Requirements 5.2**

### Property 18: Artifacts No Generate Buttons

*For any* rendered created artifacts section, the section should not contain buttons with "Generate" labels

**Validates: Requirements 5.3**

### Property 19: Artifacts Access Links

*For any* artifact displayed in the created artifacts section, the artifact should have a clickable link or button for viewing or downloading

**Validates: Requirements 5.5**

### Property 20: Primary Action Navigation Behavior

*For all* primary action handlers, clicking the action should trigger the correct behavior: idle→navigate to plan page, planned→navigate to content page, recorded→trigger content generation, processed→navigate to content page, published→navigate to new episode page

**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

### Property 21: Secondary Action Availability

*For all* states that require escape hatches (recorded state), the state config should define a secondary action with label and handler

**Validates: Requirements 6.6**

### Property 22: State Recalculation on Data Change

*For any* episode data change (plan, tracks, clips, quotes, status), the system should recalculate the episode state and update the UI

**Validates: Requirements 8.1, 8.2**

### Property 23: Artifacts Section Update on Creation

*For any* new artifact creation (clip, quote, blog), the created artifacts section should update to display the new artifact

**Validates: Requirements 8.3**

### Property 24: Progress Section Update on State Change

*For any* episode state change, the workflow progress section should update to reflect the new current state

**Validates: Requirements 8.4**

### Property 25: Real-Time Notification Integration

*For any* episode overview page instance, the component should subscribe to real-time notifications and update when relevant notifications are received

**Validates: Requirements 8.5**

### Property 26: Episode Context Preservation

*For any* primary action navigation, the episode ID should be correctly passed to the navigation target to preserve episode context

**Validates: Requirements 10.6**

## Error Handling

### State Determination Errors

**Missing Episode Data:**
- If episode data fails to load, display error state with retry option
- Show user-friendly message: "Unable to load episode details"
- Provide "Retry" button to refetch data
- Log error details for debugging

**Invalid State Transitions:**
- If state determination produces unexpected result, default to "idle" state
- Log warning with episode data for investigation
- Allow user to proceed with default state

### Primary Action Errors

**Navigation Failures:**
- If navigation fails, show toast notification with error message
- Keep user on current page
- Log navigation error details
- Provide fallback action if available

**Content Generation Failures:**
- If AI content generation fails, show error toast
- Update episode state to reflect failure
- Provide "Retry" option in toast
- Log generation error with episode context

**API Request Failures:**
- If API request fails, show error toast with retry option
- Maintain current UI state
- Log API error details
- Implement exponential backoff for retries

### Real-Time Update Errors

**Notification Subscription Failures:**
- If Momento subscription fails, fall back to polling
- Log subscription error
- Continue with degraded experience
- Show warning toast if real-time updates unavailable

**Token Refresh Failures:**
- If Momento token refresh fails, attempt resubscription
- Log refresh error
- Fall back to polling if resubscription fails
- Maintain core functionality without real-time updates

### Data Consistency Errors

**Stale Data Detection:**
- If local data is stale compared to server, refetch automatically
- Show loading indicator during refetch
- Update UI with fresh data
- Log stale data occurrence

**Concurrent Modification:**
- If episode modified by another user, show notification
- Offer to reload page with latest data
- Preserve user's current view until they choose to reload
- Log concurrent modification event

## Testing Strategy

### Unit Testing

**State Determination Logic:**
- Test `determineEpisodeState` function with various data combinations
- Verify correct state returned for each scenario
- Test edge cases (empty arrays, null values, missing fields)
- Test state precedence (published overrides other states)

**State Config Lookup:**
- Test that all states have valid configs
- Verify config structure (headline, subtext, primaryAction)
- Test that handlers are defined for all actions
- Verify secondary actions exist where needed

**Component Rendering:**
- Test that each section renders with correct props
- Verify conditional rendering logic
- Test that correct number of sections render
- Verify section order in component tree

### Property-Based Testing

All correctness properties defined above should be implemented as property-based tests with minimum 100 iterations each. Each test should be tagged with the format:

**Feature: episode-overview-redesign, Property {number}: {property_text}**

**Property Test Examples:**

```typescript
// Property 1: State Determination from Episode Data
test('Property 1: For any episode with no plan, state should be idle', () => {
  fc.assert(
    fc.property(
      fc.record({
        id: fc.uuid(),
        title: fc.string(),
        status: fc.constantFrom('Draft', 'Planning', 'Ready'),
        // ... other episode fields
      }),
      (episode) => {
        const state = determineEpisodeState(episode, null, [], [], []);
        expect(state).toBe('idle');
      }
    ),
    { numRuns: 100 }
  );
});

// Property 6: State Config Completeness
test('Property 6: All states have exactly one primary action', () => {
  const states: EpisodeState[] = ['idle', 'planned', 'recorded', 'processed', 'published'];

  states.forEach(state => {
    const config = STATE_CONFIGS[state];
    expect(config.primaryAction).toBeDefined();
    expect(config.primaryAction.label).toBeTruthy();
    expect(config.primaryAction.handler).toBeInstanceOf(Function);
  });
});

// Property 9: Page Structure Ordering
test('Property 9: Page contains four sections in correct order', () => {
  const { container } = render(<EpisodeOverviewPage />);
  const sections = container.querySelectorAll('[data-section]');

  expect(sections).toHaveLength(4);
  expect(sections[0]).toHaveAttribute('data-section', 'identity');
  expect(sections[1]).toHaveAttribute('data-section', 'primary-action');
  expect(sections[2]).toHaveAttribute('data-section', 'workflow-progress');
  expect(sections[3]).toHaveAttribute('data-section', 'created-artifacts');
});
```

### Integration Testing

**Full Page Workflow:**
- Test complete user journey through all states
- Verify state transitions trigger correct UI updates
- Test primary action clicks navigate correctly
- Verify artifacts appear after generation

**Real-Time Updates:**
- Test that Momento notifications trigger UI updates
- Verify state recalculation on notification receipt
- Test fallback to polling if real-time unavailable
- Verify token refresh maintains subscription

**API Integration:**
- Test data fetching on page load
- Verify error handling for failed requests
- Test retry logic for transient failures
- Verify loading states during requests

### Manual Testing

**Visual Hierarchy:**
- Verify Primary Action Zone is visually dominant
- Confirm Episode Identity is compact and scannable
- Check that Workflow Progress is subordinate
- Verify Created Artifacts provides delight

**User Experience:**
- Confirm user can identify next action in <2 seconds
- Verify only one primary button is visible
- Check that page guides through complete workflow
- Confirm user feels certainty about next step

**Responsive Design:**
- Test on mobile, tablet, and desktop viewports
- Verify Primary Action Zone remains above fold
- Check that sections stack appropriately on mobile
- Verify touch targets are appropriately sized

### Performance Testing

**Page Load Performance:**
- Measure time to first contentful paint
- Verify page interactive within 2 seconds
- Test with slow network conditions
- Measure bundle size impact

**State Calculation Performance:**
- Measure state determination execution time
- Verify calculation completes in <10ms
- Test with large datasets (many clips/quotes)
- Profile for performance bottlenecks

**Real-Time Update Performance:**
- Measure notification processing time
- Verify UI updates complete in <100ms
- Test with high notification frequency
- Monitor memory usage over time
