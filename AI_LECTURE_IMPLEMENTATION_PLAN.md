# AI-Powered Video Lecture System - Implementation Plan

## Overview
Create an interactive AI-powered video lecture system for NCERT Class 10 Biology Chapter 1 with automatic attendance tracking every 5 minutes and teacher override capabilities.

---

## 📋 OPERATION SERIES

### **PHASE 1: Database & Backend Infrastructure**

#### Operation 1.1: Create Lecture Sessions Table
- Add `lecture_sessions` table to track:
  - Session ID, start time, end time, subject, chapter
  - Status (active/completed)
  - Attendance checkpoints (every 5 mins)

#### Operation 1.2: Create Lecture Attendance Table
- Add `lecture_attendance` table:
  - Links to lecture_sessions
  - Student ID, checkpoint time, status (Present/Absent)
  - Teacher override flag

#### Operation 1.3: Backend API Endpoints
- `POST /api/lectures/start` - Start a lecture session
- `POST /api/lectures/end` - End lecture session
- `GET /api/lectures/current` - Get current active lecture
- `POST /api/lectures/attendance/checkpoint` - Mark attendance at checkpoint
- `GET /api/lectures/attendance/:sessionId` - Get attendance for session
- `POST /api/lectures/attendance/override` - Teacher override attendance
- `GET /api/lectures/content/:chapter` - Get lecture content

---

### **PHASE 2: Content Generation & Management**

#### Operation 2.1: Generate NCERT Biology Chapter 1 Content
- Use Gemini AI to generate:
  - Chapter summary
  - Key concepts
  - Images/illustrations descriptions
  - Structured notes
- Store in database or JSON file

#### Operation 2.2: Create Content Structure
- Chapter: "Life Processes" (NCERT Class 10 Biology Chapter 1)
- Sections:
  1. Introduction to Life Processes
  2. Nutrition
  3. Respiration
  4. Transportation
  5. Excretion
- Each section: text, images, key points

#### Operation 2.3: Image Integration
- Generate or fetch relevant images for:
  - Digestive system
  - Respiratory system
  - Circulatory system
  - Excretory system
- Store image URLs/paths

---

### **PHASE 3: AI Teacher Avatar & Voice**

#### Operation 3.1: Teacher Avatar Setup
- Options:
  - **Option A**: Use pre-recorded avatar video (simpler)
  - **Option B**: AI-generated animated avatar (complex)
  - **Option C**: Static teacher image with text-to-speech overlay (recommended for MVP)

#### Operation 3.2: Text-to-Speech Integration
- Use Google Text-to-Speech API or Web Speech API
- Convert lecture content to audio
- Sync with content display

#### Operation 3.3: Teacher Animation/Display
- Create teacher component that:
  - Shows teacher image/avatar
  - Displays speaking animation
  - Shows current topic

---

### **PHASE 4: Frontend Video Lecture Interface**

#### Operation 4.1: Create LecturePlayer Component
- Video-like interface with:
  - Teacher avatar area (left/center)
  - Content display area (right/bottom)
  - Progress bar
  - Play/Pause controls
  - Speed controls

#### Operation 4.2: Content Display Component
- Show:
  - Current section title
  - Notes/text content
  - Images
  - Key points
- Auto-scroll with lecture progress

#### Operation 4.3: Lecture Controls
- Play/Pause
- Speed (0.5x, 1x, 1.5x, 2x)
- Progress slider
- Section navigation

---

### **PHASE 5: Automatic Attendance System**

#### Operation 5.1: Attendance Checkpoint Timer
- Set interval for 5 minutes (300 seconds)
- Trigger attendance modal/overlay
- Capture student response

#### Operation 5.2: Attendance Prompt Modal
- Display when checkpoint triggers:
  - "Attendance Check - Please confirm you're present"
  - Face recognition option
  - Manual confirmation button
  - Countdown timer (30 seconds)

#### Operation 5.3: Face Recognition Integration
- Use existing face recognition API
- Capture image at checkpoint
- Match with student database
- Auto-mark attendance if recognized

#### Operation 5.4: Attendance Backend Logic
- Record checkpoint attendance:
  - Timestamp
  - Student ID
  - Recognition method (face/manual)
  - Session ID
- Default to "Absent" if no response

---

### **PHASE 6: Teacher Override Panel**

#### Operation 6.1: Teacher Attendance Dashboard
- View all students in current lecture
- See attendance status for each checkpoint
- Override individual attendance
- Bulk operations

#### Operation 6.2: Override Functionality
- Mark Present/Absent manually
- Add notes/reason
- Timestamp override action
- Audit trail

---

### **PHASE 7: Session Management**

#### Operation 7.1: Session Lifecycle
- Start: Create session, initialize checkpoints
- Active: Track progress, handle checkpoints
- Pause: Suspend checkpoints
- Resume: Continue from pause point
- End: Finalize attendance, generate report

#### Operation 7.2: Progress Tracking
- Track current section
- Save progress (localStorage/backend)
- Resume capability

---

### **PHASE 8: Integration & Testing**

#### Operation 8.1: Route Integration
- Add route: `/lectures` or `/ai-lecture`
- Add navigation link
- Protect route (login required)

#### Operation 8.2: API Integration
- Connect frontend to backend APIs
- Error handling
- Loading states

#### Operation 8.3: Testing
- Test attendance checkpoints
- Test teacher override
- Test content display
- Test session management

---

## 🎯 TECHNICAL DECISIONS NEEDED

### 1. **Teacher Avatar Approach**
- **Recommendation**: Start with static image + TTS (fastest)
- Alternative: Animated avatar (more complex, better UX)

### 2. **Content Storage**
- **Option A**: Generate on-demand (slower, always fresh)
- **Option B**: Pre-generate and cache (faster, recommended)

### 3. **Attendance Checkpoint Behavior**
- **Option A**: Pause lecture during check (ensures attention)
- **Option B**: Continue playing, overlay prompt (less disruptive)
- **Recommendation**: Option A for first version

### 4. **Image Sources**
- **Option A**: Use NCERT official images (if available)
- **Option B**: Generate descriptions, use placeholder/stock images
- **Option C**: AI-generated images (Gemini/other)

---

## 📦 DEPENDENCIES TO ADD

### Backend:
- None (use existing Flask, Gemini AI)

### Frontend:
- `react-player` or custom video player (optional)
- Web Speech API (browser native)
- Timer/interval management

---

## 🔄 WORKFLOW EXAMPLE

1. **Teacher starts lecture:**
   - Selects "NCERT Class 10 Biology - Chapter 1"
   - Clicks "Start Lecture"
   - Session created, first checkpoint scheduled

2. **Lecture plays:**
   - Teacher avatar displays
   - Content scrolls automatically
   - Audio plays (TTS)

3. **At 5-minute mark:**
   - Lecture pauses
   - Attendance modal appears
   - Students confirm presence (face recognition or button)
   - Attendance recorded

4. **Lecture continues:**
   - Resumes after attendance check
   - Next checkpoint scheduled

5. **Teacher can:**
   - View attendance dashboard
   - Override any student's attendance
   - Pause/resume lecture

6. **End of lecture:**
   - Final attendance summary
   - Export report
   - Session closed

---

## ⚠️ CONSIDERATIONS

1. **Performance**: Large content may need pagination/lazy loading
2. **Network**: TTS generation may be slow - consider caching
3. **Browser Compatibility**: Web Speech API support varies
4. **Mobile**: Responsive design needed
5. **Accessibility**: Screen reader support, keyboard navigation

---

## 📝 NEXT STEPS

1. **Review this plan** - Discuss changes/priorities
2. **Confirm technical decisions** - Avatar approach, content storage, etc.
3. **Start with Phase 1** - Database setup
4. **Iterate** - Build incrementally, test each phase

---

## 🎨 UI MOCKUP CONCEPT

```
┌─────────────────────────────────────────────────────────┐
│  [← Back]  AI Lecture: Biology Chapter 1  [Teacher]    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌─────────────────────────────────┐ │
│  │              │  │  Section 2: Nutrition            │ │
│  │   Teacher    │  │  ─────────────────────────────  │ │
│  │   Avatar     │  │  Nutrition is the process...    │ │
│  │              │  │                                 │ │
│  │  [Speaking]  │  │  [Image: Digestive System]     │ │
│  │              │  │                                 │ │
│  │              │  │  Key Points:                    │ │
│  │              │  │  • Autotrophic nutrition        │ │
│  │              │  │  • Heterotrophic nutrition      │ │
│  └──────────────┘  └─────────────────────────────────┘ │
│                                                           │
│  [◄◄] [▶] [►►]  Progress: 12:34 / 45:00  [1x] [⚙]     │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ⏰ Attendance Check in 2:15                     │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

**Ready to proceed?** Let me know which phase to start with and any changes to this plan!

