# Aesthetics Reference

## Contents
- Typography System
- Color Palette
- Visual Identity
- Spacing Scale
- Iconography

---

## Typography System

### Font Stack

```css
/* public/css/style.css - System font stack for performance */
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
               "Helvetica Neue", Arial, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  color: #212529;
}
```

**Why this stack:** Native system fonts provide instant rendering, better readability on each platform, and zero web font overhead. The application prioritizes form usability over brand-specific typography.

### Type Hierarchy

```css
/* Bootstrap 5 overrides for clearer hierarchy */
h1, .h1 { font-size: 2.5rem; font-weight: 700; margin-bottom: 1rem; }
h2, .h2 { font-size: 2rem; font-weight: 600; margin-bottom: 0.75rem; }
h3, .h3 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem; }

/* Form labels */
.form-label {
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: #212529;
}

/* Helper text */
.form-text {
  font-size: 0.875rem;
  color: #6c757d;
}
```

### DO: Maintain Hierarchy

```html
<!-- Good: Clear visual hierarchy -->
<h2 class="mb-4">Personal Information</h2>
<div class="mb-3">
  <label class="form-label">First Name</label>
  <input type="text" class="form-control">
  <div class="form-text">As it appears on official documents</div>
</div>
```

### DON'T: Mix Inconsistent Sizes

```html
<!-- Bad: Inconsistent hierarchy confuses users -->
<h3 class="mb-1" style="font-size: 1.2rem;">Personal Information</h3>
<div class="mb-2">
  <label style="font-size: 15px;">First Name</label>
  <input type="text" class="form-control" style="font-size: 14px;">
</div>
```

**Why this breaks:** Arbitrary font sizes break visual rhythm and make the form harder to scan. Bootstrap's default sizes are calibrated for readability.

---

## Color Palette

### Semantic Colors (Bootstrap 5)

```css
/* Matches BSA branding with Bootstrap semantics */
:root {
  --bs-primary: #0d6efd;    /* Primary actions */
  --bs-success: #198754;    /* Success states */
  --bs-danger: #dc3545;     /* Errors, required fields */
  --bs-warning: #ffc107;    /* Warnings */
  --bs-info: #0dcaf0;       /* Informational messages */
  --bs-secondary: #6c757d;  /* Secondary text */
}
```

### Text Colors

```css
/* Text hierarchy */
.text-primary { color: #212529; }     /* Body text */
.text-secondary { color: #6c757d; }   /* Helper text */
.text-muted { color: #adb5bd; }       /* Placeholder, disabled */
.text-danger { color: #dc3545; }      /* Required indicators */
```

### DO: Use Semantic Classes

```html
<!-- Good: Semantic color usage -->
<div class="alert alert-success">
  <strong>Success!</strong> Application submitted successfully.
</div>

<label class="form-label">
  Email <span class="text-danger">*</span>
</label>
```

### DON'T: Inline Color Styles

```html
<!-- Bad: Hardcoded colors -->
<div style="background: #d4edda; color: #155724; padding: 12px; border-radius: 4px;">
  Success! Application submitted.
</div>

<label style="color: #333;">
  Email <span style="color: red;">*</span>
</label>
```

**Why this breaks:** Inline styles bypass Bootstrap's theme system, break consistency, and make future color changes difficult. Use utility classes.

### Contrast Requirements

```css
/* WCAG AA compliant contrast ratios */
.form-control {
  color: #212529;           /* 16.8:1 on white */
  background-color: #fff;
  border: 1px solid #ced4da;
}

.form-control:focus {
  border-color: #86b7fe;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
}

.form-control:disabled {
  background-color: #e9ecef;
  opacity: 1;               /* Maintain readability */
}
```

---

## Visual Identity

### BSA-Appropriate Design

**Principles:**
- **Professional, not playful:** This is an official BSA form, not a consumer app
- **Accessible:** High contrast, clear labels, screen reader friendly
- **Conservative:** Avoid trendy gradients, animations, or bold colors
- **Form-focused:** Design supports data entry, not branding

### DO: Professional Form Design

```css
/* Clean, professional styling */
.card {
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
}

.form-control {
  border-radius: 0.375rem;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}
```

### DON'T: Consumer App Aesthetics

```css
/* Bad: Too playful for BSA context */
.card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 1rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.form-control {
  border-radius: 2rem;
  border: 2px solid transparent;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
}
```

**Why this breaks:** Flashy design undermines professional credibility. BSA forms should feel official and trustworthy, not like a startup landing page.

---

## Spacing Scale

### Bootstrap 5 Spacing Utilities

```
.m-0  { margin: 0; }
.m-1  { margin: 0.25rem; }  /* 4px */
.m-2  { margin: 0.5rem; }   /* 8px */
.m-3  { margin: 1rem; }     /* 16px - PRIMARY SPACING */
.m-4  { margin: 1.5rem; }   /* 24px */
.m-5  { margin: 3rem; }     /* 48px */
```

### DO: Consistent Spacing

```html
<!-- Good: Consistent rhythm with mb-3 -->
<div class="container mt-4">
  <h2 class="mb-4">Application Form</h2>
  
  <div class="mb-3">
    <label class="form-label">First Name</label>
    <input type="text" class="form-control">
  </div>
  
  <div class="mb-3">
    <label class="form-label">Last Name</label>
    <input type="text" class="form-control">
  </div>
</div>
```

### DON'T: Arbitrary Spacing

```html
<!-- Bad: Inconsistent spacing breaks rhythm -->
<div class="container" style="margin-top: 22px;">
  <h2 style="margin-bottom: 18px;">Application Form</h2>
  
  <div style="margin-bottom: 14px;">
    <label style="margin-bottom: 6px;">First Name</label>
    <input type="text" class="form-control">
  </div>
  
  <div style="margin-bottom: 20px;">
    <label style="margin-bottom: 8px;">Last Name</label>
    <input type="text" class="form-control">
  </div>
</div>
```

**Why this breaks:** Random spacing values create visual noise. Stick to Bootstrap's 4px/8px/16px scale for consistent vertical rhythm.

---

## Iconography

This project does NOT use an icon library. If icons are needed:

### DO: Use Bootstrap Icons (Lightweight)

```html
<!-- Add Bootstrap Icons CDN if needed -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">

<!-- Usage -->
<button class="btn btn-primary">
  <i class="bi bi-upload"></i> Upload Files
</button>
```

### DON'T: Add Heavy Icon Libraries

```html
<!-- Bad: FontAwesome adds 70KB+ for unused icons -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
```

**Why this breaks:** Icon libraries bloat page weight. If icons are needed, Bootstrap Icons matches the design system and weighs only 10KB.