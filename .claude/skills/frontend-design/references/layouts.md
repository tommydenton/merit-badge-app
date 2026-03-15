# Layouts Reference

## Contents
- Bootstrap Grid System
- Mobile-First Breakpoints
- Container Patterns
- Responsive Form Layouts
- Spacing and Alignment

---

## Bootstrap Grid System

### Grid Basics

```html
<!-- 12-column grid system -->
<div class="container">
  <div class="row">
    <div class="col-12 col-md-6 col-lg-4">Column 1</div>
    <div class="col-12 col-md-6 col-lg-4">Column 2</div>
    <div class="col-12 col-md-6 col-lg-4">Column 3</div>
  </div>
</div>
```

**Breakdown:**
- `.col-12` = Full width on mobile (<768px)
- `.col-md-6` = Half width on tablet (≥768px)
- `.col-lg-4` = One-third width on desktop (≥992px)

### Form Layout Grid

```html
<!-- Two-column form layout -->
<div class="container mt-4">
  <h2 class="mb-4">Personal Information</h2>
  <div class="row">
    <div class="col-12 col-md-6 mb-3">
      <label for="firstName" class="form-label">First Name</label>
      <input type="text" class="form-control" id="firstName" required>
    </div>
    <div class="col-12 col-md-6 mb-3">
      <label for="lastName" class="form-label">Last Name</label>
      <input type="text" class="form-control" id="lastName" required>
    </div>
  </div>
</div>
```

### DO: Mobile-First Column Sizing

```html
<!-- Good: Starts narrow, expands on larger screens -->
<div class="row">
  <div class="col-12 col-sm-6 col-md-4 col-lg-3">
    <!-- Full on mobile, half on small, 1/3 on medium, 1/4 on large -->
  </div>
</div>
```

### DON'T: Desktop-First Sizing

```html
<!-- Bad: Requires width: 100% overrides on mobile -->
<div class="row">
  <div class="col-lg-3">
    <!-- Default is 1/4 width even on mobile, causing horizontal scroll -->
  </div>
</div>
```

**Why this breaks:** Omitting mobile sizing defaults to desktop layout, causing usability issues on small screens. Always start with `.col-12` or `.col-*` for smallest breakpoint.

---

## Mobile-First Breakpoints

### Bootstrap 5 Breakpoints

```
xs: <576px    (default, no prefix)
sm: ≥576px    (.col-sm-*)
md: ≥768px    (.col-md-*)
lg: ≥992px    (.col-lg-*)
xl: ≥1200px   (.col-xl-*)
xxl: ≥1400px  (.col-xxl-*)
```

### Responsive Visibility

```html
<!-- Show/hide elements at different breakpoints -->
<div class="d-block d-md-none">
  <!-- Visible only on mobile -->
  <button class="btn btn-primary w-100">Mobile Menu</button>
</div>

<div class="d-none d-md-block">
  <!-- Visible only on tablet and larger -->
  <nav class="nav">
    <a class="nav-link">Home</a>
    <a class="nav-link">About</a>
  </nav>
</div>
```

### Responsive Typography

```html
<!-- Smaller headings on mobile -->
<h1 class="fs-3 fs-md-2 fs-lg-1 mb-3">Merit Badge Counselor Application</h1>
<!-- Mobile: fs-3 (1.75rem), Tablet: fs-2 (2rem), Desktop: fs-1 (2.5rem) -->
```

### DO: Test on Real Devices

```javascript
// Good: Responsive testing checklist
// ✓ iPhone SE (375px width)
// ✓ iPad (768px width)
// ✓ Desktop (1920px width)
// ✓ Form usability at each breakpoint
// ✓ No horizontal scrolling
// ✓ Touch targets ≥44px
```

### DON'T: Assume Desktop Layout

```css
/* Bad: Fixed widths break mobile */
.form-container {
  width: 800px;
  margin: 0 auto;
}
```

**Why this breaks:** Fixed widths cause horizontal scrolling on mobile. Use `.container` (responsive) or `.container-fluid` (full-width) instead.

---

## Container Patterns

### Standard Container

```html
<!-- Responsive container with max-width constraints -->
<div class="container">
  <!-- Content -->
</div>
```

**Max-widths:**
- sm: 540px
- md: 720px
- lg: 960px
- xl: 1140px
- xxl: 1320px

### Full-Width Container

```html
<!-- Full-width, useful for headers/footers -->
<div class="container-fluid">
  <!-- Content spans full viewport width -->
</div>
```

### Nested Containers

```html
<!-- Outer container for page layout -->
<div class="container mt-5">
  <!-- Inner containers for cards/sections -->
  <div class="card">
    <div class="card-body">
      <h3 class="card-title">Section Title</h3>
      <div class="row">
        <!-- Grid inside card -->
      </div>
    </div>
  </div>
</div>
```

### DO: Use Semantic Container Structure

```html
<!-- Good: Container > Row > Column -->
<div class="container">
  <div class="row">
    <div class="col-12 col-md-6">Content</div>
  </div>
</div>
```

### DON'T: Skip Row Wrapper

```html
<!-- Bad: Columns without row -->
<div class="container">
  <div class="col-12 col-md-6">Content</div>
</div>
```

**Why this breaks:** `.row` applies negative margins to offset column padding. Without it, columns won't align properly and padding will be incorrect.

---

## Responsive Form Layouts

### Single-Column Mobile, Two-Column Desktop

```html
<div class="container">
  <h2 class="mb-4">Application Form</h2>
  
  <div class="row">
    <!-- Personal Info: Two columns on tablet+ -->
    <div class="col-12 col-md-6 mb-3">
      <label class="form-label">First Name</label>
      <input type="text" class="form-control">
    </div>
    <div class="col-12 col-md-6 mb-3">
      <label class="form-label">Last Name</label>
      <input type="text" class="form-control">
    </div>
    
    <!-- Full-width fields remain full width -->
    <div class="col-12 mb-3">
      <label class="form-label">Email Address</label>
      <input type="email" class="form-control">
    </div>
    
    <!-- Three columns on large screens -->
    <div class="col-12 col-md-6 col-lg-4 mb-3">
      <label class="form-label">Age</label>
      <input type="number" class="form-control">
    </div>
    <div class="col-12 col-md-6 col-lg-4 mb-3">
      <label class="form-label">Phone</label>
      <input type="tel" class="form-control">
    </div>
    <div class="col-12 col-lg-4 mb-3">
      <label class="form-label">District</label>
      <select class="form-select">
        <option>Select District</option>
      </select>
    </div>
  </div>
</div>
```

### Conditional Section Layouts

```javascript
// Show/hide sections based on form state
$('#purpose').on('change', function() {
  const purpose = $(this).val();
  
  $('.conditional-section').hide();
  
  if (purpose === 'become_counselor' || purpose === 'change_add') {
    $('#badgeSelectionSection').show();
    $('#qualificationsSection').show();
  } else if (purpose === 'drop_badges') {
    $('#dropBadgesSection').show();
  }
});
```

### DO: Logical Field Grouping

```html
<!-- Good: Related fields grouped visually -->
<div class="card mb-4">
  <div class="card-body">
    <h3 class="card-title mb-3">Personal Information</h3>
    <div class="row">
      <div class="col-12 col-md-6 mb-3">
        <label class="form-label">First Name</label>
        <input type="text" class="form-control">
      </div>
      <div class="col-12 col-md-6 mb-3">
        <label class="form-label">Last Name</label>
        <input type="text" class="form-control">
      </div>
    </div>
  </div>
</div>

<div class="card mb-4">
  <div class="card-body">
    <h3 class="card-title mb-3">BSA Volunteer Status</h3>
    <!-- Volunteer fields -->
  </div>
</div>
```

### DON'T: Flat Form Without Structure

```html
<!-- Bad: All fields in one long column -->
<div class="container">
  <input type="text" class="form-control mb-3" placeholder="First Name">
  <input type="text" class="form-control mb-3" placeholder="Last Name">
  <input type="email" class="form-control mb-3" placeholder="Email">
  <input type="text" class="form-control mb-3" placeholder="BSA Member ID">
  <!-- 20 more fields... -->
</div>
```

**Why this breaks:** Long flat forms are overwhelming. Group related fields into cards or sections with clear headings to create visual hierarchy and improve scannability.

---

## Spacing and Alignment

### Vertical Spacing

```html
<!-- Consistent vertical rhythm with mb-3 (1rem/16px) -->
<div class="container">
  <h2 class="mb-4">Section Title</h2>        <!-- Larger gap after headings -->
  
  <div class="mb-3">                          <!-- Standard field spacing -->
    <label class="form-label">Field 1</label>
    <input type="text" class="form-control">
  </div>
  
  <div class="mb-3">
    <label class="form-label">Field 2</label>
    <input type="text" class="form-control">
  </div>
  
  <div class="mb-4">                          <!-- Larger gap before button -->
    <button class="btn btn-primary">Submit</button>
  </div>
</div>
```

### Horizontal Alignment

```html
<!-- Flexbox utilities for alignment -->
<div class="d-flex justify-content-between align-items-center mb-3">
  <h3 class="mb-0">Form Section</h3>
  <button class="btn btn-sm btn-outline-secondary">Skip</button>
</div>

<!-- Center content -->
<div class="d-flex justify-content-center">
  <button class="btn btn-primary">Centered Button</button>
</div>

<!-- Right-align actions -->
<div class="d-flex justify-content-end gap-2">
  <button class="btn btn-secondary">Cancel</button>
  <button class="btn btn-primary">Submit</button>
</div>
```

### DO: Use Bootstrap Spacing Utilities

```html
<!-- Good: Consistent spacing with utility classes -->
<div class="mt-4 mb-5">            <!-- Top: 1.5rem, Bottom: 3rem -->
  <div class="px-3 py-2">          <!-- Padding X: 1rem, Y: 0.5rem -->
    Content
  </div>
</div>
```

### DON'T: Inline Spacing Styles

```html
<!-- Bad: Arbitrary inline spacing -->
<div style="margin-top: 22px; margin-bottom: 34px;">
  <div style="padding: 13px 18px;">
    Content
  </div>
</div>
```

**Why this breaks:** Random spacing values break visual rhythm and are hard to maintain. Use Bootstrap's spacing scale (0.25rem increments) for consistency.

### Gap Utility (Bootstrap 5.1+)

```html
<!-- Modern gap utility for flex/grid spacing -->
<div class="d-flex gap-2">
  <button class="btn btn-secondary">Cancel</button>
  <button class="btn btn-primary">Submit</button>
</div>

<div class="d-grid gap-3">
  <div class="card">Card 1</div>
  <div class="card">Card 2</div>
</div>
```

**Why gap is better:** Replaces margin-based spacing between flex/grid children with cleaner, more predictable gaps. Use `.gap-{0-5}` for consistent spacing.