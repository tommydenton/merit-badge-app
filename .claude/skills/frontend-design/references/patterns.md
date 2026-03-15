# Patterns Reference

## Contents
- Design Anti-Patterns
- Accessibility Patterns
- Mobile-First Patterns
- Form UX Patterns
- Professional BSA Design

---

## Design Anti-Patterns

### WARNING: Generic AI Aesthetics

**The Problem:**

```css
/* BAD - Cookie-cutter gradient backgrounds */
body {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
```

**Why This Breaks:**
1. **Unprofessional:** Flashy gradients undermine BSA credibility
2. **Accessibility:** Low contrast fails WCAG standards
3. **Performance:** Backdrop filters are slow on low-end devices
4. **Brand mismatch:** BSA forms should look official, not trendy

**The Fix:**

```css
/* GOOD - Professional, accessible design */
body {
  background-color: #f8f9fa; /* Subtle neutral background */
}

.card {
  background: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 0.375rem; /* Bootstrap default */
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
}
```

**When You Might Be Tempted:**
When looking at modern web design galleries. Remember: this is a merit badge counselor application form, not a consumer product landing page.

---

### WARNING: Overuse of Animations

**The Problem:**

```javascript
// BAD - Animations everywhere
$('.form-control').each(function(index) {
  $(this).delay(index * 50).fadeIn(800);
});

$('.btn').hover(
  function() { $(this).animate({width: '+=20px'}, 300); },
  function() { $(this).animate({width: '-=20px'}, 300); }
);
```

**Why This Breaks:**
1. **Slows form completion:** Users wait for animations to finish
2. **Vestibular disorders:** Motion can cause nausea
3. **Feels unprofessional:** BSA forms should be straightforward
4. **Performance:** Animating non-transform properties triggers reflows

**The Fix:**

```javascript
// GOOD - Minimal, purposeful animation
$('#volunteerStatus').on('change', function() {
  if ($(this).val() === 'yes') {
    $('#volunteerFields').slideDown(300); // Only when revealing content
  }
});

// Static hover states via CSS
.btn:hover {
  background-color: darken($primary, 10%);
  transition: background-color 0.15s ease; /* Fast, subtle */
}
```

**When You Might Be Tempted:**
When trying to make the form "feel modern." Animation should provide feedback about state changes, not decoration.

---

### WARNING: Inconsistent Spacing

**The Problem:**

```html
<!-- BAD - Random spacing values -->
<div style="margin-bottom: 18px;">
  <label style="margin-bottom: 7px;">Field 1</label>
  <input class="form-control">
</div>

<div style="margin-bottom: 22px;">
  <label style="margin-bottom: 5px;">Field 2</label>
  <input class="form-control">
</div>
```

**Why This Breaks:**
1. **Visual noise:** Irregular spacing feels messy
2. **Harder to maintain:** No predictable pattern
3. **Breaks vertical rhythm:** Inconsistent gaps distract the eye

**The Fix:**

```html
<!-- GOOD - Bootstrap spacing scale -->
<div class="mb-3">
  <label class="form-label">Field 1</label>
  <input class="form-control">
</div>

<div class="mb-3">
  <label class="form-label">Field 2</label>
  <input class="form-control">
</div>
```

**Bootstrap Spacing Scale:**
- `.m-1` = 0.25rem (4px)
- `.m-2` = 0.5rem (8px)
- `.m-3` = 1rem (16px) ← Use this for form fields
- `.m-4` = 1.5rem (24px) ← Use for section breaks
- `.m-5` = 3rem (48px)

**When You Might Be Tempted:**
When eyeballing spacing. Always use Bootstrap's scale for consistency.

---

### WARNING: Buried Submit Button

**The Problem:**

```html
<!-- BAD - Submit button doesn't stand out -->
<div class="d-flex gap-2">
  <button class="btn btn-secondary">Cancel</button>
  <button class="btn btn-secondary">Save Draft</button>
  <button class="btn btn-secondary">Preview</button>
  <button class="btn btn-secondary" type="submit">Submit</button>
</div>
```

**Why This Breaks:**
1. **Low discoverability:** Primary action blends with secondary actions
2. **User confusion:** "Which button do I press?"
3. **Accessibility:** Screen reader users can't identify primary action

**The Fix:**

```html
<!-- GOOD - Clear visual hierarchy -->
<div class="d-flex justify-content-between mt-4">
  <div class="d-flex gap-2">
    <button type="button" class="btn btn-outline-secondary">Cancel</button>
    <button type="button" class="btn btn-outline-secondary">Save Draft</button>
  </div>
  <button type="submit" class="btn btn-primary btn-lg">Submit Application</button>
</div>
```

**When You Might Be Tempted:**
When adding multiple actions. Always make the primary action visually dominant with `.btn-primary` and optional `.btn-lg`.

---

## Accessibility Patterns

### DO: Label Every Input

```html
<!-- Good: Explicit label association -->
<div class="mb-3">
  <label for="email" class="form-label">
    Email Address <span class="text-danger">*</span>
  </label>
  <input type="email" class="form-control" id="email" name="email" required>
  <div class="invalid-feedback">Please provide a valid email address</div>
</div>
```

### DON'T: Placeholder-Only Labels

```html
<!-- Bad: No label, inaccessible -->
<input type="email" class="form-control" placeholder="Email Address *">
```

**Why this breaks:** Placeholders disappear on focus, aren't announced by screen readers, and have poor contrast. Always use explicit `<label>` elements with `for` attributes.

---

### DO: Keyboard Navigation

```javascript
// Good: Ensure all interactions work with keyboard
$('#volunteerStatus').on('change keyup', function(e) {
  if (e.type === 'keyup' && e.key !== 'Enter') return;
  
  const isVolunteer = $(this).val() === 'yes';
  $('#volunteerFields').toggle(isVolunteer);
});
```

### DON'T: Mouse-Only Interactions

```javascript
// Bad: Only responds to clicks
$('.btn').click(function() {
  // No keyboard support
});
```

**Why this breaks:** Keyboard-only users (screen reader users, motor impairments) can't interact with click-only handlers. Use semantic elements (`<button>`, `<a>`) and handle both click and keyboard events.

---

### DO: ARIA Landmarks and Roles

```html
<!-- Good: Clear document structure -->
<main role="main">
  <form aria-label="Merit Badge Counselor Application">
    <section aria-labelledby="personalInfo">
      <h2 id="personalInfo">Personal Information</h2>
      <!-- Fields -->
    </section>
    
    <section aria-labelledby="volunteerStatus">
      <h2 id="volunteerStatus">BSA Volunteer Status</h2>
      <!-- Fields -->
    </section>
  </form>
</main>
```

### DON'T: Div Soup

```html
<!-- Bad: No semantic structure -->
<div>
  <div>
    <div>Personal Information</div>
    <div><input type="text"></div>
  </div>
</div>
```

**Why this breaks:** Screen readers navigate by landmarks. Use semantic HTML (`<main>`, `<section>`, `<form>`) and ARIA roles for clear structure.

---

## Mobile-First Patterns

### DO: Touch-Friendly Targets

```css
/* Good: Minimum 44x44px touch targets */
.btn {
  min-height: 44px;
  padding: 0.5rem 1rem;
}

.form-control {
  min-height: 44px;
  font-size: 16px; /* Prevents iOS zoom */
}
```

### DON'T: Tiny Touch Targets

```css
/* Bad: Too small for touch */
.btn-sm {
  padding: 0.25rem 0.5rem; /* 32px height */
}

.form-control {
  font-size: 14px; /* Triggers iOS zoom */
}
```

**Why this breaks:** Touch targets below 44x44px are hard to tap accurately. iOS zooms on inputs with font-size < 16px. Always use minimum 44px targets and 16px font.

---

### DO: Mobile-First Column Sizing

```html
<!-- Good: Stack on mobile, expand on tablet+ -->
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
```

### DON'T: Desktop-Only Sizing

```html
<!-- Bad: Forces two-column on mobile -->
<div class="row">
  <div class="col-6 mb-3"><!-- No .col-12 default -->
    <label class="form-label">First Name</label>
    <input type="text" class="form-control">
  </div>
</div>
```

**Why this breaks:** Omitting mobile sizing defaults to desktop layout, causing cramped inputs and horizontal scrolling. Always start with `.col-12`. See the **bootstrap** skill for grid patterns.

---

## Form UX Patterns

### DO: Validate on Blur

```javascript
// Good: Validate when user leaves field
$('.form-control').on('blur', function() {
  const input = $(this);
  
  if (input.prop('required') && !input.val()) {
    input.addClass('is-invalid');
  } else if (input.is('[type="email"]') && !isValidEmail(input.val())) {
    input.addClass('is-invalid');
  } else {
    input.removeClass('is-invalid');
  }
});
```

### DON'T: Validate While Typing

```javascript
// Bad: Errors appear mid-typing
$('.form-control').on('keyup', function() {
  if (!$(this).val()) {
    $(this).addClass('is-invalid'); // Shows error immediately
  }
});
```

**Why this breaks:** Showing errors while typing is frustrating. Validate on blur (field exit) or form submit, not on keyup.

---

### DO: Show Success State

```html
<!-- Good: Visual feedback on valid input -->
<input type="email" class="form-control is-valid" value="user@example.com">
<div class="valid-feedback">Looks good!</div>
```

```javascript
$('.form-control').on('blur', function() {
  const input = $(this);
  if (input.val() && input[0].checkValidity()) {
    input.addClass('is-valid').removeClass('is-invalid');
  }
});
```

### DON'T: Only Show Errors

```javascript
// Bad: No positive feedback
$('.form-control').on('blur', function() {
  if (!$(this).val()) {
    $(this).addClass('is-invalid');
  }
  // No success state
});
```

**Why this breaks:** Positive feedback reinforces correct input and reduces anxiety. Use `.is-valid` and `.valid-feedback` for successful validation.

---

## Professional BSA Design

### DO: Conservative, Official Styling

```css
/* Good: Professional government-style form */
body {
  background-color: #f8f9fa;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.card {
  background: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
}

h2 {
  color: #212529;
  font-weight: 600;
  border-bottom: 2px solid #dee2e6;
  padding-bottom: 0.5rem;
}
```

### DON'T: Consumer App Styling

```css
/* Bad: Too trendy for official forms */
body {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Poppins', sans-serif;
}

.card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

h2 {
  background: linear-gradient(90deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

**Why this breaks:** BSA forms need to convey trust and authority. Trendy styling looks unprofessional. Keep it clean, accessible, and conservative.

---

### DO: Clear Required Field Indicators

```html
<!-- Good: Consistent asterisk placement -->
<label for="firstName" class="form-label">
  First Name <span class="text-danger">*</span>
</label>

<p class="text-muted mb-4">
  <span class="text-danger">*</span> Required field
</p>
```

### DON'T: Inconsistent Required Indicators

```html
<!-- Bad: Mixed patterns -->
<label>First Name*</label>
<label>Last Name (required)</label>
<label><span style="color: red;">*</span>Email</label>
```

**Why this breaks:** Inconsistent required indicators confuse users. Always use `<span class="text-danger">*</span>` after the label text, and include a legend at the form top.

---

### Visual Hierarchy Checklist

Copy this checklist for new forms:

- [ ] Page title uses `<h1>` or `.h1`
- [ ] Section headings use `<h2>` with bottom border
- [ ] Field labels use `.form-label` with consistent weight
- [ ] Primary action uses `.btn-primary` and is visually dominant
- [ ] Secondary actions use `.btn-outline-secondary`
- [ ] Required indicators use `<span class="text-danger">*</span>`
- [ ] Validation errors use `.invalid-feedback` and `.is-invalid`
- [ ] Spacing uses Bootstrap scale (`.mb-3` for fields, `.mb-4` for sections)
- [ ] Touch targets are minimum 44x44px
- [ ] WCAG AA contrast ratios met (4.5:1 for text)