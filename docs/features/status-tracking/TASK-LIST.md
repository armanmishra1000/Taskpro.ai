# Status Tracking Task List

## Backend Tasks:
- [x] B1: Enhance Database Models - Add proper statusHistory schema and validation
- [x] B2: Create Status Tracking Service - Business logic for status transitions  
- [x] B3: Enhance Callback Query Handlers - Add status change logic and notifications
- [x] B4: Create Status Notification System - Notify stakeholders of status changes
- [ ] B5: Enhance Message Formatters - Add status history and progress indicators
- [ ] B6: Integration Tests - Test status flows and notifications

## Task Details:

### B1: Enhance Database Models ✅ (Complete)
**Status**: Task model enhanced with proper statusHistory schema and validation
**Files modified**:
- `backend/src/models/task.model.js` - Enhanced with structured statusHistory schema
- `backend/src/services/task-cards/task-cards.service.js` - Updated to use new schema

**Completed Requirements**:
- ✅ Structured statusHistory array with fromStatus, toStatus, changedBy, changedAt, reason, duration
- ✅ Added isValidStatusTransition() static method for status flow validation
- ✅ Added pre-save middleware for automatic timestamp management (startedAt, completedAt)
- ✅ Updated service layer to use new statusHistory structure

### B2: Create Status Tracking Service ✅ (Complete)
**Status**: Status tracking service implemented with comprehensive functionality
**Files created**:
- `backend/src/services/status-tracking/status-tracking.service.js`
- `backend/tests/services/status-tracking.service.test.js`

**Completed Requirements**:
- ✅ Handle status transition logic with validation
- ✅ Validate status flow (Ready → In Progress → Review → Done)
- ✅ Update timestamps (startedAt, completedAt) via middleware
- ✅ Log status changes to history with proper structure
- ✅ Business logic validation (permissions, transitions)
- ✅ Progress calculation for all statuses including blocked
- ✅ Status history retrieval and statistics
- ✅ Comprehensive test coverage (20 tests passing)

### B3: Enhance Callback Query Handlers ✅ (Complete)
**Status**: Enhanced callbacks with comprehensive status tracking functionality
**Files modified**:
- `backend/src/bot/callbacks/task-cards.callbacks.js` - Enhanced with status tracking handlers
- `backend/src/bot/formatters/task-cards.formatter.js` - Added status history button
- `backend/tests/bot/task-cards.callbacks.test.js` - Comprehensive test coverage

**Completed Requirements**:
- ✅ Proper status change handling with validation and error handling
- ✅ Integration with status tracking service for all status transitions
- ✅ Status history view callbacks with detailed timeline display
- ✅ Blocker details handling with user prompts
- ✅ Dynamic callback routing for all status-related actions
- ✅ Short ID to ObjectId resolution for task lookups
- ✅ Comprehensive error handling with user-friendly messages
- ✅ Full test coverage (9 tests passing)

### B4: Create Status Notification System ✅ (Complete)
**Status**: Status notification service implemented with stakeholder communication
**Files created**:
- `backend/src/services/notifications/status-notifications.service.js`

**Completed Requirements**:
- ✅ Notify task assignee on status changes (if different from changer)
- ✅ Notify task creator on review/completion status changes
- ✅ Notify team managers on blocked status with urgent priority
- ✅ Context-aware notification messages based on status and stakeholder type
- ✅ Formatted notifications with action buttons (View Task, View History)
- ✅ Integration with status tracking service (commented for bot instance)
- ✅ Comprehensive error handling (non-critical failures)
- ✅ Stakeholder identification logic with proper filtering

### B5: Enhance Message Formatters ✅ (Partially Complete)
**Status**: Basic formatters exist, need enhancement
**Files to modify**:
- `backend/src/bot/formatters/task-cards.formatter.js`

**Add Functions**:
- `formatStatusHistory()` - Show status change timeline
- `formatStatusChangeNotification()` - Status change messages
- `formatProgressIndicator()` - Visual progress tracking

### B6: Integration Tests
**Status**: Missing - needs implementation
**Files to create**:
- `backend/tests/services/status-tracking.service.test.js`
- `backend/tests/bot/status-tracking.test.js`

**Test Coverage**:
- Status transition validation
- Timestamp management
- Notification system
- Status history logging

## Dependencies:
- B2 depends on B1 (database models)
- B3 depends on B2 (service layer)
- B4 can be developed in parallel with B2/B3
- B5 depends on B2 (service responses)
- B6 depends on B1-B5 (all components)

## Current Task: B5 (Enhance Message Formatters)

## Estimated Completion:
- B1: 1-2 hours (enhancement of existing model)
- B2: 3-4 hours (new service with business logic)
- B3: 2-3 hours (enhance existing callbacks)
- B4: 3-4 hours (new notification system)
- B5: 2-3 hours (enhance existing formatters)
- B6: 4-5 hours (comprehensive testing)

**Total: 15-21 hours**