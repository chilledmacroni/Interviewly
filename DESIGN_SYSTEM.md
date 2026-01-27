# 🎨 Design System & UI Components

## Color Palette

### Primary Colors (Purple Gradient)
```css
--primary-50:  #f5f3ff  /* Lightest purple */
--primary-100: #ede9fe
--primary-200: #ddd6fe
--primary-300: #c4b5fd
--primary-400: #a78bfa
--primary-500: #8b5cf6  /* Main purple */
--primary-600: #7c3aed  /* Button primary */
--primary-700: #6d28d9
--primary-800: #5b21b6
--primary-900: #4c1d95  /* Darkest purple */
```

### Accent Colors (Cyan)
```css
--accent-400: #22d3ee  /* Light cyan */
--accent-500: #06b6d4  /* Main cyan */
--accent-600: #0891b2  /* Dark cyan */
```

### Semantic Colors
```css
/* Success (Green) */
--success-400: #4ade80
--success-500: #22c55e

/* Warning (Yellow) */
--warning-400: #facc15
--warning-500: #eab308

/* Error (Red) */
--error-400: #f87171
--error-500: #ef4444
```

### Background Colors (Dark Theme)
```css
--bg-primary:   #0f0f23  /* Darkest navy */
--bg-secondary: #1a1a2e  /* Dark navy */
--bg-tertiary:  #16213e  /* Medium navy */
--bg-elevated:  #1e1e3f  /* Elevated surfaces */
```

### Text Colors
```css
--text-primary:   #f8fafc  /* White text */
--text-secondary: #94a3b8  /* Gray text */
--text-muted:     #64748b  /* Muted text */
```

---

## Typography

### Font Family
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Font Sizes
- **Headings**:
  - H1: 3rem (48px) - Page titles
  - H2: 2rem (32px) - Section headers
  - H3: 1.5rem (24px) - Card titles
  - H4: 1.25rem (20px) - Subsections

- **Body**:
  - Large: 1.125rem (18px) - Important text
  - Normal: 1rem (16px) - Default
  - Small: 0.875rem (14px) - Labels
  - Tiny: 0.75rem (12px) - Captions

### Font Weights
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

---

## Components

### 1. Glass Card
```css
.glass-card {
  background: rgba(30, 30, 63, 0.6);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}
```

**Usage**: Main container for content sections

### 2. Primary Button
```css
.btn-primary {
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  color: white;
  font-weight: 600;
  padding: 12px 24px;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(139, 92, 246, 0.4);
}
```

**States**:
- Default: Purple gradient
- Hover: Lifts up with glow
- Active: Returns to normal position
- Disabled: 50% opacity, no hover effects

### 3. Input Field (Glass)
```css
.input-glass {
  background: rgba(30, 30, 63, 0.8);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 12px;
  padding: 14px 18px;
  color: #f8fafc;
  font-size: 1rem;
}

.input-glass:focus {
  border-color: #8b5cf6;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
}
```

**Variants**:
- Text input
- Textarea (resizable)
- URL input

### 4. Score Badge
```css
.score-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  height: 48px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 1.25rem;
}

/* Score-based colors */
.score-high {    /* 7-10 */
  background: linear-gradient(135deg, #4ade80, #22c55e);
  color: white;
}

.score-medium {  /* 4-6 */
  background: linear-gradient(135deg, #facc15, #eab308);
  color: #1a1a2e;
}

.score-low {     /* 0-3 */
  background: linear-gradient(135deg, #f87171, #ef4444);
  color: white;
}
```

**Sizes**:
- Small: 36px × 36px
- Medium: 48px × 48px (default)
- Large: 64px × 64px

### 5. Progress Bar
```css
.progress-bar {
  height: 6px;
  background: #16213e;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #8b5cf6, #06b6d4);
  border-radius: 3px;
  transition: width 0.5s ease;
}
```

### 6. Chat Message Bubble
```css
/* Interviewer (Left-aligned) */
.message-interviewer {
  background: rgba(30, 30, 63, 0.6);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 4px 20px 20px 20px;
  padding: 16px;
}

/* Candidate (Right-aligned) */
.message-candidate {
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  border-radius: 20px 4px 20px 20px;
  padding: 16px;
  color: white;
}
```

---

## Animations

### 1. Float Animation
```css
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.floating {
  animation: float 3s ease-in-out infinite;
}
```

**Usage**: Logo, decorative elements

### 2. Slide In Animation
```css
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-enter {
  animation: slideIn 0.4s ease-out forwards;
}
```

**Usage**: New messages, cards appearing

### 3. Typing Indicator
```css
@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-4px); }
}

.typing-dot {
  width: 8px;
  height: 8px;
  background: #8b5cf6;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out;
}

.typing-dot:nth-child(1) { animation-delay: 0s; }
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }
```

**Usage**: Loading states, AI thinking

### 4. Pulse Glow
```css
@keyframes pulse-glow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}
```

**Usage**: Active indicators, notifications

### 5. Gradient Shift (Background)
```css
@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.animated-bg {
  background: linear-gradient(-45deg, #0f0f23, #1a1a2e, #16213e, #1e1e3f);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
}
```

**Usage**: Page background

---

## Effects

### 1. Glassmorphism
- **Backdrop blur**: 20px
- **Background opacity**: 60%
- **Border**: 1px solid with 20% opacity
- **Shadow**: Large, dark shadow for depth

### 2. Glow Effects
```css
/* Purple Glow */
.glow-purple {
  box-shadow: 
    0 0 20px rgba(139, 92, 246, 0.3),
    0 0 40px rgba(139, 92, 246, 0.2),
    0 0 60px rgba(139, 92, 246, 0.1);
}

/* Cyan Glow */
.glow-cyan {
  box-shadow: 
    0 0 20px rgba(6, 182, 212, 0.3),
    0 0 40px rgba(6, 182, 212, 0.2);
}
```

### 3. Gradient Text
```css
.gradient-text {
  background: linear-gradient(135deg, #a78bfa 0%, #22d3ee 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

---

## Spacing System

Based on 4px increments:

```css
/* Padding/Margin Scale */
0:   0px
1:   4px
2:   8px
3:   12px
4:   16px
5:   20px
6:   24px
8:   32px
10:  40px
12:  48px
16:  64px
20:  80px
24:  96px
```

---

## Border Radius

```css
/* Rounded Corners */
sm:   4px   /* Small elements */
md:   8px   /* Default */
lg:   12px  /* Buttons, inputs */
xl:   16px  /* Cards */
2xl:  20px  /* Large cards */
full: 9999px /* Pills, badges */
```

---

## Shadows

```css
/* Elevation Levels */
sm:   0 1px 2px rgba(0, 0, 0, 0.05)
md:   0 4px 6px rgba(0, 0, 0, 0.1)
lg:   0 10px 15px rgba(0, 0, 0, 0.1)
xl:   0 20px 25px rgba(0, 0, 0, 0.1)
2xl:  0 25px 50px rgba(0, 0, 0, 0.25)

/* Glass Shadow */
glass: 0 8px 32px rgba(0, 0, 0, 0.4)
```

---

## Responsive Breakpoints

```css
/* Mobile First Approach */
sm:  640px   /* Small tablets */
md:  768px   /* Tablets */
lg:  1024px  /* Small laptops */
xl:  1280px  /* Desktops */
2xl: 1536px  /* Large screens */
```

---

## Accessibility

### Focus States
```css
*:focus-visible {
  outline: 2px solid #8b5cf6;
  outline-offset: 2px;
}
```

### Selection
```css
::selection {
  background: #7c3aed;
  color: white;
}
```

### Contrast Ratios
- **Text on dark background**: 15:1 (AAA)
- **Interactive elements**: 4.5:1 minimum (AA)
- **Large text**: 3:1 minimum (AA)

---

## Custom Scrollbar

```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #1a1a2e;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #7c3aed;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #8b5cf6;
}
```

---

## Component Hierarchy

```
App (animated-bg)
├── InterviewSetup
│   ├── Header (floating)
│   │   ├── Emoji Icon
│   │   ├── Title (gradient-text)
│   │   └── Subtitle
│   └── Form (glass-card)
│       ├── Tech Stack Input (input-glass)
│       ├── Difficulty Selector
│       ├── Input Type Toggle
│       ├── Resume/URL Input
│       └── Submit Button (btn-primary)
│
└── InterviewSession
    ├── Header
    │   ├── Logo
    │   ├── Progress Header (glass-card)
    │   │   ├── Question Counter
    │   │   ├── Tech Stack Badge
    │   │   ├── Difficulty Badge
    │   │   └── Progress Bar
    │   └── Exit Button
    ├── Chat Area
    │   └── Messages (message-enter)
    │       ├── Interviewer Message (glass-card)
    │       ├── Candidate Message (gradient bg)
    │       └── Score Card (glass-card)
    │           ├── Score Badge
    │           ├── Feedback Text
    │           ├── Strengths List
    │           └── Improvements List
    └── Input Area (glass-card)
        ├── Textarea (input-glass)
        ├── Send Button (btn-primary)
        └── Helper Text
```

---

**This design system ensures consistency, accessibility, and a premium user experience throughout the application! 🎨**
