# FLAGSHIP APP OPTIMIZATION - COMPLETE AUDIT

## STEP 0: FULL APP COVERAGE AUDIT

### USER-FACING ROUTES / SCREENS

#### Primary Experience Routes
1. **`/experiences/[experienceId]`** (redirects to `/home`)
   - Entry point, redirects immediately
   - Status: ✅ Functional, needs onboarding integration

2. **`/experiences/[experienceId]/home`** (Home Page)
   - Hero: "Choose your focus"
   - Continue practice button (if last session exists)
   - Niche cards grid (Trading, Sports Betting, etc.)
   - Empty state: None (always shows cards)
   - Loading state: None (server-rendered)
   - Error state: None
   - Pro touchpoint: Upgrade button in header
   - Status: ⚠️ NEEDS ONBOARDING FLOW + UI POLISH

3. **`/experiences/[experienceId]/n/[nicheKey]`** (Practice Page)
   - Practice area component with drills
   - Custom niche setup (if needed)
   - Session management
   - Drill generation and evaluation
   - Completion card
   - Empty state: "Start practicing" prompt
   - Loading state: Loading drills, checking answers
   - Error state: API errors, validation errors
   - Pro touchpoint: ⚠️ NEEDS AUDIT - likely drill generation limits
   - Status: ⚠️ NEEDS PRO GATING + UI POLISH

4. **`/experiences/[experienceId]/coach`** (Coach Chat)
   - Thread list sidebar
   - Chat interface
   - Message input and quick actions
   - Empty state: "Start a conversation"
   - Loading state: Sending messages, loading threads
   - Error state: API errors
   - Pro touchpoint: None visible
   - Status: ✅ Functional, needs UI polish

5. **`/experiences/[experienceId]/upgrade`** (Upgrade Page)
   - Free vs Pro comparison
   - Pricing: $9/month
   - Features list
   - Checkout button
   - Empty state: None
   - Loading state: Checking Pro status
   - Error state: None
   - Pro touchpoint: ⚠️ CRITICAL - Needs redesign as continuation
   - Status: ⚠️ NEEDS COMPLETE REDESIGN (Step 3)

6. **`/experiences/[experienceId]/support`** (Support Page)
   - Help center / docs
   - Status: ⚠️ Needs review

#### Admin Routes
7. **`/experiences/[experienceId]/admin`** (Admin Panel)
   - Creator controls
   - Global context editor
   - Niche presets management
   - Status: ✅ Functional (not user-facing, skip for now)

8. **`/experiences/[experienceId]/admin/coach`** (Coach Admin)
   - Coach settings
   - System prompt editor
   - Community context
   - Status: ✅ Functional (not user-facing, skip for now)

#### Other Routes
9. **`/dashboard/[companyId]`** (Developer dashboard)
   - Template page, not user-facing
   - Status: Skip

10. **`/discover`** (App discovery)
    - Template page
    - Status: Skip

### MODALS & OVERLAYS

1. **ResetSessionModal** (`reset-session-modal.tsx`)
   - Confirmation dialog for resetting practice session
   - Status: ✅ Functional, needs UI polish

2. **CustomNicheSetup** (`custom-niche-setup.tsx`)
   - Form for setting up custom niche name
   - Empty state: Input field
   - Error state: Validation errors
   - Status: ✅ Functional, needs UI polish

3. **DeleteConfirmModal** (in coach chat)
   - Confirmation for deleting chat threads
   - Status: ✅ Functional

### FORMS & INPUTS

1. **Niche Selection** (Home page)
   - Grid of niche cards
   - Status: ✅ Functional, needs onboarding integration

2. **Custom Niche Input** (CustomNicheSetup)
   - Text input for custom niche name
   - Status: ✅ Functional

3. **Practice Objective Input** (Practice area)
   - Textarea: "What do you want to practice..."
   - Status: ✅ Functional

4. **Answer Input** (Practice area)
   - Textarea for user answers
   - Status: ✅ Functional

5. **Coach Chat Input** (Coach chat)
   - Textarea + send button
   - Quick action buttons
   - Status: ✅ Functional

### SUBSCRIPTION / PRO GATING TOUCHPOINTS

#### Current Pro Gates (NEED VERIFICATION):
1. **Header "Upgrade" button** - Always visible, routes to `/upgrade`
   - Location: HomeHeader, PageHeader components
   - Status: ✅ Working

2. **Upgrade page** - Full comparison page
   - Location: `/experiences/[experienceId]/upgrade`
   - Status: ⚠️ Needs redesign as continuation (Step 3)

3. **Drill generation limits** - NEEDS AUDIT
   - Likely: 2 drill sets/day for free users
   - Location: Practice area / generate-drills API
   - Status: ⚠️ NEEDS VERIFICATION & POLISH

4. **Pro status check** - API endpoint
   - Location: `/api/pro/status`
   - Status: ✅ Working

### EMPTY STATES

1. **Home page** - No empty state (always shows niche cards)
2. **Practice page (no session)** - "Start practicing" prompt
3. **Practice page (no drills)** - Loading drills state
4. **Coach chat (no threads)** - "No chats yet. Click 'New' to start."
5. **Coach chat (no messages)** - "Start a conversation with your coach..."
6. **Completion card** - None (component returns null if no summary)

### LOADING STATES

1. **Pro status** - Header button shows loading
2. **Drill generation** - Practice area shows loading
3. **Answer evaluation** - Practice area shows "checking..."
4. **Thread loading** - Coach chat sidebar
5. **Message sending** - Coach chat shows "sending..."
6. **Niche saving** - Niche selector shows saving state

### ERROR STATES

1. **API errors** - Usually console errors, some alert() calls
2. **Validation errors** - Form validation messages
3. **Network errors** - Not explicitly handled everywhere

### DESKTOP VS MOBILE LAYOUTS

#### Desktop:
- ✅ Max-width containers (max-w-5xl, max-w-4xl)
- ✅ Grid layouts (grid-cols-2, grid-cols-3)
- ✅ Sidebar navigation (hamburger drawer)
- ⚠️ Some components may not be fully responsive

#### Mobile:
- ⚠️ Needs comprehensive audit
- ⚠️ Tap targets need verification
- ⚠️ Modal sizing needs verification
- ⚠️ Form inputs need mobile keyboard handling

---

## PRIORITIZED OPTIMIZATION CHECKLIST

### CRITICAL (Step 2 - Onboarding → Pro Conversion)
- [ ] **Home page onboarding flow** - Multi-step value ramp
- [ ] **First practice session flow** - Show value before asking for Pro
- [ ] **Practice completion flow** - Progress confirmation before Pro ask
- [ ] **Upgrade page redesign** - Frame as continuation, not fork

### HIGH (Step 1 - UI Polish)
- [ ] **Shared component library** - Card, SectionHeader, EmptyState, Skeleton
- [ ] **Home page polish** - Typography, spacing, visual hierarchy
- [ ] **Practice page polish** - Cards, inputs, feedback sections
- [ ] **Coach chat polish** - Message bubbles, input area
- [ ] **Upgrade page polish** - Premium feel, clear CTA

### MEDIUM (Step 4 - Responsive)
- [ ] **Mobile navigation** - Hamburger drawer works well
- [ ] **Mobile forms** - Inputs, textareas, buttons
- [ ] **Mobile modals** - Sizing, scrolling
- [ ] **Mobile cards** - Grid to single column

### LOW (Step 5 - Performance)
- [ ] **Loading states** - Skeleton loaders
- [ ] **Error handling** - User-friendly messages
- [ ] **State transitions** - Smooth animations
- [ ] **Code cleanup** - Remove redundant logic

---

## ONBOARDING → PRO CONVERSION STRATEGY

### Current Flow (NEEDS REDESIGN):
1. User lands on home → sees niche cards
2. User selects niche → goes to practice page
3. User starts practice → (potentially hits Pro limit)
4. User sees upgrade page → comparison, payment

### Target Flow (Step 2):
1. **ORIENTATION** - Welcome, show outcome
2. **VALUE PREVIEW** - First practice, show what's possible
3. **PROGRESS CONFIRMATION** - "You're on track", show results
4. **SOFT PRO TRANSITION** - "Continue", "Unlock", "Finish"

---

## NEXT STEPS

1. ✅ Complete audit (this document)
2. ⏭️ Create shared component library (Step 1)
3. ⏭️ Redesign onboarding flow (Step 2) - CRITICAL
4. ⏭️ Redesign upgrade page (Step 3)
5. ⏭️ Mobile optimization (Step 4)
6. ⏭️ Performance polish (Step 5)


