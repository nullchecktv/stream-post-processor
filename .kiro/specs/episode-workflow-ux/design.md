# Design Document

## Overview

This design transforms the episode management experience from a scattered interface into a guided, intuitive workflow. The redesign centers around a visual progress indicator that shows users exactly where they are in the episode lifecycle and what to do next.

The core principle is **progressive disclosure**: show users only what they need at each stage, with clear calls-to-action that guide them forward.

## Architecture

### Component Structure

```
EpisodeOverviewPage (Redesigned)
├── WorkflowProgress (New)
│   ├── WorkflowStep (New)
│   └── WorkflowConnector (New)
├── NextActionCard (New)
├── ContentCardsGrid (New)
│   ├── BlogPostCard (New)
│   ├── ClipsCard (New)
│   ├── QuotesCard (New)
│   └── PlanCard (New)
└── EpisodeHeader (Refactored)

EpisodeCreationWizard (New)
├── WizardProgress (New)
├── BasicInfoStep (New)
├── PlatformsStep (New)
├── ThemesStep (New)
└── ReviewStep (New)
```

### State Management

The workflow state is derived from existing episode data:
- Episode exists → Step 1 complete
- Plan exists → Step 2 complete  
- Transcript uploaded → Step 3 complete
- Tracks uploaded → Step 4 complete

No new database fields required - we compute workflow state from existing data.

## Components and Interfaces

### WorkflowProgress Component

Visual stepper showing the four main stages of episode creation.

**Props:**
```typescript
interface WorkflowProgressProps {
  currentStep: 1 | 2 | 3 | 4
  completedSteps: number[]
  onStepClick?: (step: number) => void
}
```

**Behavior:**
- Displays 4 steps horizontally (mobile: vertical)
- Completed steps show checkmark icon
- Current step highlighted with primary color
- Future steps shown in muted gray
- Optional click navigation to completed steps


### NextActionCard Component

Prominent card displaying the most relevant next action based on workflow state.

**Props:**
```typescript
interface NextActionCardProps {
  action: {
    title: string
    description: string
    buttonText: string
    buttonAction: () => void
    icon: ReactNode
  }
}
```

**States:**
- **After creation**: "Generate Plan" - Analyze episode and create content plan
- **After plan**: "Upload Transcript" - Upload SRT file for AI analysis
- **After transcript**: "Upload Tracks" - Upload video tracks for clip generation
- **All complete**: "View Generated Content" - Access blogs, clips, quotes

### ContentCardsGrid Component

Grid of cards showing generated content with quick access.

**Card Types:**

1. **PlanCard**
   - Shows plan status (generating/ready)
   - Preview of objectives
   - Link to full plan view

2. **BlogPostCard**
   - Blog title and excerpt
   - Status badge (draft/published)
   - Edit and view actions

3. **ClipsCard**
   - Count of proposed/processed clips
   - Status breakdown
   - Link to clips page

4. **QuotesCard**
   - Count of extracted quotes
   - Sample quote preview
   - Link to quotes page


### EpisodeCreationWizard Component

Multi-step modal for creating new episodes.

**Steps:**

1. **Basic Information**
   - Title (required)
   - Episode number (required)
   - Air date (optional)
   - Series name (optional)

2. **Platforms**
   - Multi-select checkboxes
   - Common platforms: Twitch, YouTube, LinkedIn Live, X

3. **Themes**
   - Tag input for themes
   - Suggestions based on team history

4. **Review**
   - Summary of all entered information
   - Edit buttons for each section
   - Create button

**Props:**
```typescript
interface EpisodeCreationWizardProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (episodeId: string) => void
}
```

## Data Models

### Workflow State Computation

```typescript
interface WorkflowState {
  currentStep: 1 | 2 | 3 | 4
  completedSteps: number[]
  nextAction: NextAction
}

function computeWorkflowState(episode: Episode): WorkflowState {
  const completedSteps: number[] = [1] // Episode exists
  
  if (episode.plan) completedSteps.push(2)
  if (episode.transcript) completedSteps.push(3)
  if (episode.tracks?.length > 0) completedSteps.push(4)
  
  const currentStep = Math.max(...completedSteps) as 1 | 2 | 3 | 4
  
  return {
    currentStep,
    completedSteps,
    nextAction: determineNextAction(completedSteps)
  }
}
```


### Next Action Determination

```typescript
interface NextAction {
  title: string
  description: string
  buttonText: string
  route: string
  icon: string
}

function determineNextAction(completedSteps: number[]): NextAction {
  if (!completedSteps.includes(2)) {
    return {
      title: 'Generate Content Plan',
      description: 'Create a structured plan with objectives and concepts for this episode',
      buttonText: 'Generate Plan',
      route: '/episodes/:id/plan',
      icon: 'lightbulb'
    }
  }
  
  if (!completedSteps.includes(3)) {
    return {
      title: 'Upload Transcript',
      description: 'Upload the SRT transcript file to enable AI-powered clip detection',
      buttonText: 'Upload Transcript',
      route: '/episodes/:id/uploads',
      icon: 'document'
    }
  }
  
  if (!completedSteps.includes(4)) {
    return {
      title: 'Upload Video Tracks',
      description: 'Upload video tracks to generate clips from detected moments',
      buttonText: 'Upload Tracks',
      route: '/episodes/:id/uploads',
      icon: 'video'
    }
  }
  
  return {
    title: 'All Set!',
    description: 'Your episode is ready. View generated content below.',
    buttonText: 'View Content',
    route: '/episodes/:id/content',
    icon: 'check-circle'
  }
}
```

## Wireframes

### Wireframe 1: Episode Creation Wizard

```
┌─────────────────────────────────────────────────────────┐
│  Create New Episode                              [X]     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ●━━━━━━━━━○━━━━━━━━━○━━━━━━━━━○                        │
│  Basic Info  Platforms  Themes   Review                  │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Episode Title *                                  │    │
│  │ ┌─────────────────────────────────────────────┐ │    │
│  │ │ Tech Talk: Building Scalable APIs          │ │    │
│  │ └─────────────────────────────────────────────┘ │    │
│  │                                                  │    │
│  │ Episode Number *                                 │    │
│  │ ┌──────┐                                         │    │
│  │ │  42  │                                         │    │
│  │ └──────┘                                         │    │
│  │                                                  │    │
│  │ Air Date                                         │    │
│  │ ┌─────────────────┐                             │    │
│  │ │ 2025-01-15      │ 📅                          │    │
│  │ └─────────────────┘                             │    │
│  │                                                  │    │
│  │ Series Name                                      │    │
│  │ ┌─────────────────────────────────────────────┐ │    │
│  │ │ Tech Talk Series                            │ │    │
│  │ └─────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│                          [Back]  [Next: Platforms →]     │
└─────────────────────────────────────────────────────────┘
```


### Wireframe 2: Overview Page - Step 1 Complete (Need Plan)

```
┌──────────────────────────────────────────────────────────────────┐
│  Episodes / Episode #42: Tech Talk                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Episode #42: Tech Talk: Building Scalable APIs    [Draft] │  │
│  │  Series: Tech Talk Series                                   │  │
│  │  Aired: January 15, 2025                                    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Workflow Progress                                          │  │
│  │                                                              │  │
│  │  ✓━━━━━━━━━●━━━━━━━━━○━━━━━━━━━○━━━━━━━━━○                │  │
│  │  Create     Generate   Upload     Upload                    │  │
│  │  Episode    Plan       Transcript Tracks                    │  │
│  │  ✓ Done     → Next     Locked     Locked                    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  💡 Next Step                                               │  │
│  │                                                              │  │
│  │  Generate Content Plan                                      │  │
│  │  Create a structured plan with objectives and concepts      │  │
│  │  for this episode to guide content generation.              │  │
│  │                                                              │  │
│  │                          [Generate Plan →]                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Generated Content                                          │  │
│  │                                                              │  │
│  │  ┌──────────────────┐  ┌──────────────────┐               │  │
│  │  │ 📝 Plan          │  │ 📄 Blog Post     │               │  │
│  │  │                  │  │                  │               │  │
│  │  │ Not generated    │  │ Not generated    │               │  │
│  │  │ yet              │  │ yet              │               │  │
│  │  └──────────────────┘  └──────────────────┘               │  │
│  │                                                              │  │
│  │  ┌──────────────────┐  ┌──────────────────┐               │  │
│  │  │ 🎬 Clips         │  │ 💬 Quotes        │               │  │
│  │  │                  │  │                  │               │  │
│  │  │ 0 clips          │  │ 0 quotes         │               │  │
│  │  │                  │  │                  │               │  │
│  │  └──────────────────┘  └──────────────────┘               │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```


### Wireframe 3: Overview Page - Step 2 Complete (Need Transcript)

```
┌──────────────────────────────────────────────────────────────────┐
│  Episodes / Episode #42: Tech Talk                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Episode #42: Tech Talk: Building Scalable APIs    [Draft] │  │
│  │  Series: Tech Talk Series                                   │  │
│  │  Aired: January 15, 2025                                    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Workflow Progress                                          │  │
│  │                                                              │  │
│  │  ✓━━━━━━━━━✓━━━━━━━━━●━━━━━━━━━○━━━━━━━━━○                │  │
│  │  Create     Generate   Upload     Upload                    │  │
│  │  Episode    Plan       Transcript Tracks                    │  │
│  │  ✓ Done     ✓ Done     → Next     Locked                    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  📄 Next Step                                               │  │
│  │                                                              │  │
│  │  Upload Transcript                                          │  │
│  │  Upload the SRT transcript file to enable AI-powered        │  │
│  │  clip detection and content analysis.                       │  │
│  │                                                              │  │
│  │                          [Upload Transcript →]              │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Generated Content                                          │  │
│  │                                                              │  │
│  │  ┌──────────────────┐  ┌──────────────────┐               │  │
│  │  │ 📝 Plan          │  │ 📄 Blog Post     │               │  │
│  │  │ ✓ Ready          │  │                  │               │  │
│  │  │                  │  │ Not generated    │               │  │
│  │  │ "Build scalable  │  │ yet              │               │  │
│  │  │  APIs with..."   │  │                  │               │  │
│  │  │                  │  │                  │               │  │
│  │  │ [View Plan →]    │  │                  │               │  │
│  │  └──────────────────┘  └──────────────────┘               │  │
│  │                                                              │  │
│  │  ┌──────────────────┐  ┌──────────────────┐               │  │
│  │  │ 🎬 Clips         │  │ 💬 Quotes        │               │  │
│  │  │                  │  │                  │               │  │
│  │  │ 0 clips          │  │ 0 quotes         │               │  │
│  │  │                  │  │                  │               │  │
│  │  └──────────────────┘  └──────────────────┘               │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```


### Wireframe 4: Overview Page - All Steps Complete

```
┌──────────────────────────────────────────────────────────────────┐
│  Episodes / Episode #42: Tech Talk                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Episode #42: Tech Talk: Building Scalable APIs [Processing]│  │
│  │  Series: Tech Talk Series                                   │  │
│  │  Aired: January 15, 2025                                    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Workflow Progress                                          │  │
│  │                                                              │  │
│  │  ✓━━━━━━━━━✓━━━━━━━━━✓━━━━━━━━━✓━━━━━━━━━✓                │  │
│  │  Create     Generate   Upload     Upload     All Set!       │  │
│  │  Episode    Plan       Transcript Tracks                    │  │
│  │  ✓ Done     ✓ Done     ✓ Done     ✓ Done                    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  ✓ All Set!                                                 │  │
│  │                                                              │  │
│  │  Your episode is fully set up and content is being          │  │
│  │  generated. View your generated content below.              │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Generated Content                                          │  │
│  │                                                              │  │
│  │  ┌──────────────────┐  ┌──────────────────┐               │  │
│  │  │ 📝 Plan          │  │ 📄 Blog Post     │               │  │
│  │  │ ✓ Ready          │  │ ✓ Published      │               │  │
│  │  │                  │  │                  │               │  │
│  │  │ "Build scalable  │  │ "How to Build    │               │  │
│  │  │  APIs with..."   │  │  Scalable APIs"  │               │  │
│  │  │                  │  │                  │               │  │
│  │  │ [View Plan →]    │  │ [View Post →]    │               │  │
│  │  └──────────────────┘  └──────────────────┘               │  │
│  │                                                              │  │
│  │  ┌──────────────────┐  ┌──────────────────┐               │  │
│  │  │ 🎬 Clips         │  │ 💬 Quotes        │               │  │
│  │  │ ✓ 8 clips ready  │  │ ✓ 12 quotes      │               │  │
│  │  │                  │  │                  │               │  │
│  │  │ 5 Proposed       │  │ "APIs should be  │               │  │
│  │  │ 3 Processed      │  │  designed for... │               │  │
│  │  │                  │  │                  │               │  │
│  │  │ [View Clips →]   │  │ [View Quotes →]  │               │  │
│  │  └──────────────────┘  └──────────────────┘               │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```


### Wireframe 5: Mobile View - Overview Page

```
┌─────────────────────────┐
│ ☰  Episode #42      ⋮   │
├─────────────────────────┤
│                         │
│ Episode #42             │
│ Tech Talk: Building     │
│ Scalable APIs  [Draft]  │
│                         │
│ Series: Tech Talk       │
│ Aired: Jan 15, 2025     │
│                         │
├─────────────────────────┤
│ Workflow Progress       │
│                         │
│     ✓                   │
│  Create                 │
│  Episode                │
│     │                   │
│     ●                   │
│  Generate               │
│  Plan                   │
│     │                   │
│     ○                   │
│  Upload                 │
│  Transcript             │
│     │                   │
│     ○                   │
│  Upload                 │
│  Tracks                 │
│                         │
├─────────────────────────┤
│ 💡 Next Step            │
│                         │
│ Generate Content Plan   │
│                         │
│ Create a structured     │
│ plan with objectives    │
│ and concepts.           │
│                         │
│ [Generate Plan →]       │
│                         │
├─────────────────────────┤
│ Generated Content       │
│                         │
│ ┌─────────────────────┐ │
│ │ 📝 Plan             │ │
│ │ Not generated yet   │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ 📄 Blog Post        │ │
│ │ Not generated yet   │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ 🎬 Clips            │ │
│ │ 0 clips             │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ 💬 Quotes           │ │
│ │ 0 quotes            │ │
│ └─────────────────────┘ │
│                         │
└─────────────────────────┘
```


## Error Handling

### Loading States

**Skeleton Screens:**
- WorkflowProgress: Show 4 gray circles with connecting lines
- ContentCards: Show 4 card skeletons with pulsing animation
- NextActionCard: Show card outline with pulsing content

**Progressive Loading:**
1. Load episode metadata first (show header)
2. Load workflow state (show progress indicator)
3. Load content counts (populate cards)

### Error States

**Network Errors:**
```
┌────────────────────────────────────────┐
│  ⚠️ Unable to Load Episode             │
│                                        │
│  We couldn't load this episode.        │
│  Please check your connection and      │
│  try again.                            │
│                                        │
│  [Retry]  [Back to Episodes]          │
└────────────────────────────────────────┘
```

**Missing Data:**
- If episode not found: Show 404 message with navigation
- If plan generation fails: Show error in PlanCard with retry option
- If upload fails: Show error in upload component with retry

### Empty States

**No Content Generated:**
```
┌────────────────────────────────────────┐
│  📝 Plan                               │
│                                        │
│  No plan generated yet                 │
│                                        │
│  Generate a plan to get started with   │
│  content creation for this episode.    │
│                                        │
│  [Generate Plan]                       │
└────────────────────────────────────────┘
```


## Testing Strategy

### Unit Tests

**WorkflowProgress Component:**
- Renders correct number of steps
- Highlights current step correctly
- Shows checkmarks for completed steps
- Handles click events on clickable steps
- Responsive layout changes

**computeWorkflowState Function:**
- Returns step 1 for new episode
- Returns step 2 when plan exists
- Returns step 3 when transcript uploaded
- Returns step 4 when tracks uploaded
- Correctly identifies completed steps array

**determineNextAction Function:**
- Returns plan action when no plan
- Returns transcript action when plan exists but no transcript
- Returns tracks action when transcript exists but no tracks
- Returns completion action when all steps done

### Integration Tests

**Episode Creation Flow:**
1. Open wizard
2. Fill basic info
3. Select platforms
4. Add themes
5. Review and create
6. Verify redirect to overview
7. Verify workflow shows step 1 complete

**Workflow Progression:**
1. Create episode
2. Verify "Generate Plan" next action
3. Generate plan
4. Verify "Upload Transcript" next action
5. Upload transcript
6. Verify "Upload Tracks" next action
7. Upload track
8. Verify "All Set" message

### Visual Regression Tests

- Wizard at each step
- Overview page at each workflow state
- Mobile responsive layouts
- Content cards with different states
- Error states and empty states


## Performance Considerations

### Optimization Strategies

**Code Splitting:**
- Lazy load EpisodeCreationWizard modal
- Lazy load content card components
- Separate bundle for workflow logic

**Data Fetching:**
- Fetch episode metadata and workflow state in parallel
- Cache workflow state computation
- Debounce wizard form validation

**Rendering:**
- Memoize WorkflowProgress component
- Memoize content cards
- Use React.memo for static components

### Performance Targets

- Initial page load: < 1.5s
- Wizard open: < 200ms
- Step transition: < 100ms
- Content card render: < 50ms

## Accessibility

### Keyboard Navigation

- Tab through workflow steps
- Enter/Space to activate step navigation
- Tab through wizard form fields
- Escape to close wizard
- Arrow keys for step navigation

### Screen Reader Support

**ARIA Labels:**
```typescript
<div role="progressbar" 
     aria-valuenow={currentStep} 
     aria-valuemin={1} 
     aria-valuemax={4}
     aria-label="Episode workflow progress">
```

**Announcements:**
- Announce step completion
- Announce next action changes
- Announce content generation status

### Visual Accessibility

- Color contrast ratio > 4.5:1
- Focus indicators on all interactive elements
- Icons paired with text labels
- Status conveyed through multiple visual cues (not just color)


## Design Decisions and Rationale

### Why a Stepper/Progress Indicator?

**Problem:** Users don't know what to do after creating an episode.

**Solution:** Visual progress indicator shows exactly where they are and what comes next.

**Rationale:** 
- Reduces cognitive load by showing the complete journey
- Creates a sense of progress and accomplishment
- Makes the workflow feel structured and professional
- Common pattern users understand from e-commerce checkouts

### Why Prominent Next Action Card?

**Problem:** Multiple possible actions create decision paralysis.

**Solution:** Single, prominent call-to-action based on current state.

**Rationale:**
- Eliminates choice overload
- Guides users through optimal workflow
- Creates clear momentum forward
- Reduces support questions about "what to do next"

### Why Content Cards Instead of Lists?

**Problem:** Generated content feels disconnected from the episode.

**Solution:** Visual cards with previews and quick actions.

**Rationale:**
- More engaging than plain lists
- Provides context at a glance
- Encourages exploration of generated content
- Better use of available screen space

### Why Wizard for Episode Creation?

**Problem:** Long form with many fields is overwhelming.

**Solution:** Multi-step wizard breaks creation into digestible chunks.

**Rationale:**
- Reduces perceived complexity
- Allows progressive disclosure of fields
- Provides clear progress through creation
- Matches user mental model of "setting up" something

### Why Compute Workflow State vs Store It?

**Decision:** Derive workflow state from existing data rather than storing it.

**Rationale:**
- No database schema changes required
- Always accurate (no sync issues)
- Simpler implementation
- Easier to modify workflow logic later


## Migration Strategy

### Phase 1: New Components (No Breaking Changes)

1. Create new components without modifying existing pages
2. Build WorkflowProgress, NextActionCard, ContentCardsGrid
3. Build EpisodeCreationWizard
4. Add unit tests for all new components

### Phase 2: Integrate into Overview Page

1. Add workflow state computation hook
2. Replace existing overview layout with new design
3. Keep existing functionality (all links still work)
4. Add integration tests

### Phase 3: Update Episode List Page

1. Replace "Create Episode" button with wizard trigger
2. Update episode cards to show workflow progress indicator
3. Add quick actions to episode cards

### Phase 4: Polish and Optimize

1. Add loading states and skeletons
2. Optimize performance
3. Add analytics tracking
4. Gather user feedback

### Rollback Plan

If issues arise, we can:
1. Feature flag the new UI
2. Keep old overview page as fallback
3. Gradually roll out to percentage of users
4. Monitor error rates and user feedback

## Future Enhancements

### Phase 2 Features (Post-MVP)

**Smart Recommendations:**
- Suggest optimal upload order based on team history
- Recommend themes based on transcript analysis
- Suggest clip titles based on content

**Workflow Customization:**
- Allow teams to reorder workflow steps
- Add custom steps for team-specific processes
- Configure which steps are required vs optional

**Progress Persistence:**
- Save wizard progress to resume later
- Show "Resume" option for incomplete episodes
- Auto-save form data as user types

**Enhanced Analytics:**
- Track time spent in each workflow stage
- Identify bottlenecks in the process
- Show team-wide workflow completion rates

**Collaborative Features:**
- Show who's working on each episode
- Real-time updates when content is generated
- Notifications for workflow milestones

