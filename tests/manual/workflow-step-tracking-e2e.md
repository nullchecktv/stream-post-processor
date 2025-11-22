# Workflow Step Tracking - End-to-End Testing Guide

## Overview

This document provides comprehensive end-to-end testing procedures for the Workflow Step Tracking feature. This feature adds explicit state tracking for workflow steps (Generate Plan, Upload Transcript, Upload Tracks) with real-time UI updates.

**Feature:** Workflow Step State Tracking  
**Spec Location:** `.kiro/specs/workflow-step-tracking/`  
**Last Updated:** 2025-01-22

## Testing Objectives

Verify that:
1. Workflow steps display correct status indicators
2. Real-time status updates work without page refresh
3. Dependency enforcement prevents premature uploads
4. Skip plan functionality works correctly
5. Error states are handled gracefully
6. Multiple browser tabs stay synchronized

## Prerequisites

### Test Environment Setup
- [ ] Backend deployed with workflow step tracking enabled
- [ ] Frontend deployed with WorkflowProgress component updates
- [ ] Momento Topics configured for real-time notifications
- [ ] Test user account with team access
- [ ] At least 2 browser windows/tabs for multi-tab testing

### Test Data Requirements
- [ ] Test episode created
- [ ] Test transcript file (SRT format)
- [ ] Test video track files (MP4 format)

## Test Cases

### TC-1: Initial Workflow State Display

**Objective:** Verify workflow steps initialize correctly

**Steps:**
1. Log in to the application
2. Navigate to Dashboard
3. Click "Create Episode" button
4. Fill in episode details:
   - Title: "E2E Test Episode"
   - Episode Number: 999
   - Air Date: Today's date
5. Click "Create Episode"
6. Navigate to the episode overview page

**Expected Results:**
- [ ] Episode created successfully
- [ ] Workflow Progress section visible
- [ ] Generate Plan step shows "Not Started" status
- [ ] Upload Transcript step shows "Not Started" status
- [ ] Upload Tracks step shows "Not Started" status
- [ ] Upload Transcript button is disabled
- [ ] Upload Tracks button is disabled
- [ ] Tooltip explains why uploads are disabled

**Status:** ⬜ Pass / ⬜ Fail  
**Notes:**

---

### TC-2: Plan Generation with Spinner Display

**Objective:** Verify plan generation shows in-progress state

**Steps:**
1. From episode overview page (TC-1)
2. Click "Generate Plan" button
3. Observe workflow progress section

**Expected Results:**
- [ ] Generate Plan step immediately shows "In Progress" status
- [ ] Spinner icon appears next to Generate Plan
- [ ] Generate Plan button becomes disabled
- [ ] Upload buttons remain disabled
- [ ] No page refresh occurs
- [ ] After plan generation completes:
  - [ ] Generate Plan step shows "Completed" status
  - [ ] Checkmark icon appears
  - [ ] Upload Transcript button becomes enabled
  - [ ] Upload Tracks button becomes enabled
  - [ ] Real-time notification appears

**Status:** ⬜ Pass / ⬜ Fail  
**Notes:**

---

### TC-3: Skip Plan Functionality

**Objective:** Verify skip plan workflow

**Steps:**
1. Create a new test episode
2. Navigate to episode overview page
3. Click "Skip" button next to Generate Plan
4. Observe workflow progress section

**Expected Results:**
- [ ] Confirmation dialog appears (if implemented)
- [ ] After confirming:
  - [ ] Generate Plan step shows "Skipped" status
  - [ ] Skip icon appears
  - [ ] Upload Transcript button becomes enabled
  - [ ] Upload Tracks button becomes enabled
  - [ ] Generate Plan button remains available
  - [ ] Real-time notification appears

**Status:** ⬜ Pass / ⬜ Fail  
**Notes:**

---

### TC-4: Generate Plan After Skipping

**Objective:** Verify plan can be generated after skipping

**Steps:**
1. From episode with skipped plan (TC-3)
2. Click "Generate Plan" button
3. Observe workflow progress section

**Expected Results:**
- [ ] Generate Plan step changes to "In Progress"
- [ ] Spinner appears
- [ ] After completion:
  - [ ] Generate Plan step shows "Completed"
  - [ ] Checkmark icon appears
  - [ ] Upload buttons remain enabled

**Status:** ⬜ Pass / ⬜ Fail  
**Notes:**

---

### TC-5: Upload Dependency Enforcement

**Objective:** Verify uploads are blocked until plan is ready

**Steps:**
1. Create a new test episode
2. Navigate to episode overview page
3. Attempt to click Upload Transcript button
4. Attempt to click Upload Tracks button
5. Hover over disabled buttons

**Expected Results:**
- [ ] Upload Transcript button is disabled
- [ ] Upload Tracks button is disabled
- [ ] Tooltip appears on hover explaining:
  - "Complete or skip plan generation first"
- [ ] Buttons cannot be clicked
- [ ] No upload dialog appears

**Status:** ⬜ Pass / ⬜ Fail  
**Notes:**

---

### TC-6: Transcript Upload Progress

**Objective:** Verify transcript upload shows progress

**Steps:**
1. From episode with completed/skipped plan
2. Click "Upload Transcript" button
3. Select a test transcript file (SRT)
4. Confirm upload
5. Observe workflow progress section

**Expected Results:**
- [ ] Upload Transcript step shows "In Progress"
- [ ] Spinner appears
- [ ] After processing completes:
  - [ ] Upload Transcript step shows "Completed"
  - [ ] Checkmark icon appears
  - [ ] Real-time notification appears
  - [ ] Transcript content visible in episode

**Status:** ⬜ Pass / ⬜ Fail  
**Notes:**

---

### TC-7: Track Upload Progress

**Objective:** Verify track upload shows progress

**Steps:**
1. From episode with completed/skipped plan
2. Click "Upload Tracks" button
3. Select test video file(s)
4. Confirm upload
5. Observe workflow progress section

**Expected Results:**
- [ ] Upload Tracks step shows "In Progress"
- [ ] Spinner appears
- [ ] After all tracks processed:
  - [ ] Upload Tracks step shows "Completed"
  - [ ] Checkmark icon appears
  - [ ] Real-time notification appears
  - [ ] Tracks visible in episode

**Status:** ⬜ Pass / ⬜ Fail  
**Notes:**

---

### TC-8: Real-Time Status Updates (No Refresh)

**Objective:** Verify status updates without page refresh

**Steps:**
1. From episode overview page
2. Start plan generation
3. **Do not refresh the page**
4. Wait for plan generation to complete
5. Observe workflow progress section

**Expected Results:**
- [ ] Status changes from "In Progress" to "Completed"
- [ ] Icon changes from spinner to checkmark
- [ ] Upload buttons become enabled
- [ ] No page refresh occurs
- [ ] No manual refresh needed
- [ ] Notification appears automatically

**Status:** ⬜ Pass / ⬜ Fail  
**Notes:**

---

### TC-9: Error State Display

**Objective:** Verify error states are displayed correctly

**Steps:**
1. Trigger a plan generation failure (if possible in test environment)
2. Observe workflow progress section

**Expected Results:**
- [ ] Generate Plan step shows "Failed" status
- [ ] Error icon appears
- [ ] Error message displayed (if available)
- [ ] Upload buttons become enabled (allow proceeding despite failure)
- [ ] Generate Plan button remains available for retry
- [ ] Real-time notification appears with error

**Status:** ⬜ Pass / ⬜ Fail  
**Notes:**

---

### TC-10: Multiple Browser Tabs Synchronization

**Objective:** Verify status updates across multiple tabs

**Setup:**
1. Open episode overview page in Tab 1
2. Open same episode overview page in Tab 2

**Steps:**
1. In Tab 1: Start plan generation
2. Switch to Tab 2
3. Observe workflow progress section in Tab 2
4. Wait for plan generation to complete
5. Observe both tabs

**Expected Results:**
- [ ] Tab 2 shows "In Progress" status without refresh
- [ ] Both tabs show spinner simultaneously
- [ ] Both tabs update to "Completed" simultaneously
- [ ] Both tabs show checkmark icon
- [ ] Both tabs enable upload buttons
- [ ] Notifications appear in both tabs

**Status:** ⬜ Pass / ⬜ Fail  
**Notes:**

---

### TC-11: Complete Workflow End-to-End

**Objective:** Verify complete workflow from creation to completion

**Steps:**
1. Create new episode
2. Generate plan (or skip)
3. Upload transcript
4. Upload tracks
5. Observe all workflow steps

**Expected Results:**
- [ ] All steps complete successfully
- [ ] Each step shows correct status progression:
  - Not Started → In Progress → Completed
- [ ] Real-time updates work for all steps
- [ ] No page refreshes needed
- [ ] All notifications appear
- [ ] Final state shows all steps completed

**Status:** ⬜ Pass / ⬜ Fail  
**Notes:**

---

### TC-12: Workflow Progress Visual Indicators

**Objective:** Verify all visual indicators display correctly

**Steps:**
1. Navigate to episode overview page
2. Observe workflow progress section at each state

**Expected Results:**

**Not Started State:**
- [ ] Gray or neutral color
- [ ] Default icon (circle or dash)
- [ ] Clear "Not Started" label

**In Progress State:**
- [ ] Blue or active color
- [ ] Animated spinner icon
- [ ] Clear "In Progress" label
- [ ] Spinner animates smoothly

**Completed State:**
- [ ] Green or success color
- [ ] Checkmark icon
- [ ] Clear "Completed" label

**Failed State:**
- [ ] Red or error color
- [ ] Error/warning icon
- [ ] Clear "Failed" label
- [ ] Error message visible

**Skipped State:**
- [ ] Yellow or neutral color
- [ ] Skip icon
- [ ] Clear "Skipped" label

**Status:** ⬜ Pass / ⬜ Fail  
**Notes:**

---

### TC-13: Notification System Integration

**Objective:** Verify notifications work correctly

**Steps:**
1. From episode overview page
2. Trigger each workflow step
3. Observe notification area

**Expected Results:**

**For each workflow step update:**
- [ ] Notification appears automatically
- [ ] Notification shows correct step name
- [ ] Notification shows correct status
- [ ] Notification includes episode link
- [ ] Notification is non-persistent (dismissible)
- [ ] Clicking notification navigates to episode
- [ ] Multiple notifications stack correctly

**Status:** ⬜ Pass / ⬜ Fail  
**Notes:**

---

### TC-14: Concurrent Step Processing

**Objective:** Verify multiple steps can process simultaneously

**Steps:**
1. From episode with completed plan
2. Start transcript upload
3. Immediately start track upload
4. Observe both workflow steps

**Expected Results:**
- [ ] Both steps show "In Progress" simultaneously
- [ ] Both spinners animate
- [ ] Steps complete independently
- [ ] Each step updates when its process completes
- [ ] No interference between steps
- [ ] Notifications appear for each step

**Status:** ⬜ Pass / ⬜ Fail  
**Notes:**

---

### TC-15: Browser Refresh Persistence

**Objective:** Verify workflow state persists after refresh

**Steps:**
1. From episode with some completed steps
2. Note current workflow state
3. Refresh the page (F5 or Cmd+R)
4. Observe workflow progress section

**Expected Results:**
- [ ] All workflow step statuses persist
- [ ] Completed steps still show checkmarks
- [ ] In Progress steps still show spinners
- [ ] Failed steps still show error icons
- [ ] Skipped steps still show skip icons
- [ ] Upload button states correct
- [ ] No data loss

**Status:** ⬜ Pass / ⬜ Fail  
**Notes:**

---

### TC-16: Mobile Responsive Display

**Objective:** Verify workflow progress displays correctly on mobile

**Steps:**
1. Open episode overview on mobile device or resize browser to mobile width (<768px)
2. Observe workflow progress section
3. Interact with workflow buttons

**Expected Results:**
- [ ] Workflow progress section visible
- [ ] All step statuses readable
- [ ] Icons display correctly
- [ ] Buttons are tappable (adequate touch targets)
- [ ] Tooltips work on mobile
- [ ] No horizontal scrolling
- [ ] Layout adapts to narrow screen

**Status:** ⬜ Pass / ⬜ Fail  
**Notes:**

---

### TC-17: Accessibility Testing

**Objective:** Verify workflow progress is accessible

**Steps:**
1. Navigate to episode overview page
2. Use keyboard only (Tab, Enter, Space)
3. Use screen reader (if available)

**Expected Results:**

**Keyboard Navigation:**
- [ ] Can tab to all workflow buttons
- [ ] Can activate buttons with Enter/Space
- [ ] Focus indicators visible
- [ ] Disabled buttons skip in tab order

**Screen Reader:**
- [ ] Step names announced
- [ ] Status values announced
- [ ] Button states announced (enabled/disabled)
- [ ] Tooltips announced
- [ ] Status changes announced

**Status:** ⬜ Pass / ⬜ Fail  
**Notes:**

---

### TC-18: Performance Testing

**Objective:** Verify workflow updates perform well

**Steps:**
1. Open episode overview page
2. Trigger workflow step updates
3. Monitor browser performance

**Expected Results:**
- [ ] Status updates appear within 500ms
- [ ] No UI lag or freezing
- [ ] Smooth spinner animations
- [ ] No memory leaks over time
- [ ] Multiple tabs don't degrade performance
- [ ] Page remains responsive during updates

**Status:** ⬜ Pass / ⬜ Fail  
**Notes:**

---

## Cross-Browser Testing

Test all scenarios in:

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] iOS Safari
- [ ] Android Chrome

## Known Issues

Document any issues found during testing:

| Issue ID | Description | Severity | Status |
|----------|-------------|----------|--------|
|          |             |          |        |

## Test Summary

**Total Test Cases:** 18  
**Passed:** ___  
**Failed:** ___  
**Blocked:** ___  
**Not Tested:** ___

**Pass Rate:** ___%

## Sign-Off

**Tester Name:** ___________________  
**Date:** ___________________  
**Signature:** ___________________

**Approved for Production:** ⬜ Yes / ⬜ No

**Comments:**

---

## Troubleshooting Guide

### Issue: Status updates not appearing
**Solution:**
- Check browser console for errors
- Verify Momento token is valid
- Check network tab for notification events
- Verify backend is publishing notifications

### Issue: Upload buttons not enabling
**Solution:**
- Check plan step status in browser DevTools
- Verify canProceedToUploads logic
- Check for JavaScript errors
- Refresh page and retry

### Issue: Spinner not animating
**Solution:**
- Check CSS animations enabled
- Verify spinner component rendering
- Check for CSS conflicts
- Test in different browser

### Issue: Multiple tabs not syncing
**Solution:**
- Verify Momento subscription active
- Check notification context implementation
- Verify tenant ID matches
- Check browser console for errors

## Additional Resources

- **Requirements:** `.kiro/specs/workflow-step-tracking/requirements.md`
- **Design:** `.kiro/specs/workflow-step-tracking/design.md`
- **Tasks:** `.kiro/specs/workflow-step-tracking/tasks.md`
- **Integration Tests:** `tests/integration/workflow-steps.test.mjs`
- **Unit Tests:** `tests/unit/utils/workflow-steps.test.mjs`
