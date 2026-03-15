---
name: frontend-design
description: |
  Designs responsive Bootstrap 5 UI with form validation and mobile-first layouts.
  Use when: creating new forms, styling components, implementing responsive layouts, adding validation feedback, or ensuring mobile-first design principles
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

# Frontend-design Skill

Guides Bootstrap 5 UI design for the Merit Badge Counselor application. This project uses a mobile-first approach with custom CSS overrides, Select2 for multi-select dropdowns, and Bootstrap's validation framework. The design prioritizes accessibility, form usability, and professional BSA branding.

## Quick Start

### Responsive Form Layout

```html
<!-- Bootstrap 5 grid with mobile-first responsive columns -->
<div class="container">
  <div class="row">
    <div class="col-12 col-md-6 mb-3">
      <label for="firstName" class="form-label">First Name</label>
      <input type="text" class="form-control" id="firstName" required>
      <div class="invalid-feedback">First name is required</div>
    </div>
  </div>
</div>
```

### Conditional Form Sections

```javascript
// Show/hide sections based on user selection
$('#volunteerStatus').on('change', function() {
  const isVolunteer = $(this).val() === 'yes';
  $('#volunteerFields').toggle(isVolunteer);
  $('#volunteerFields input').prop('required', isVolunteer);
});
```

### Bootstrap Validation States

```javascript
// Bootstrap 5 validation feedback
const form = document.querySelector('.needs-validation');
form.addEventListener('submit', (event) => {
  if (!form.checkValidity()) {
    event.preventDefault();
    event.stopPropagation();
  }
  form.classList.add('was-validated');
});
```

## Key Concepts

| Concept | Usage | Example |
|---------|-------|---------|
| `.form-control` | Standard input styling | `<input class="form-control">` |
| `.form-select` | Dropdown styling | `<select class="form-select">` |
| `.invalid-feedback` | Validation error messages | `<div class="invalid-feedback">Required</div>` |
| `.col-{breakpoint}-{size}` | Responsive columns | `class="col-12 col-md-6"` |
| `.mb-3` / `.mt-3` | Margin spacing (1rem = 16px) | `class="mb-3"` for bottom margin |
| `.btn-primary` | Primary action button | `<button class="btn btn-primary">Submit</button>` |

## Common Patterns

### Mobile-First Responsive Grid

**When:** Building any form section or page layout

```html
<!-- Stack on mobile, 2 columns on tablet+, 3 columns on desktop -->
<div class="row">
  <div class="col-12 col-md-6 col-lg-4 mb-3">
    <!-- Content -->
  </div>
  <div class="col-12 col-md-6 col-lg-4 mb-3">
    <!-- Content -->
  </div>
  <div class="col-12 col-md-6 col-lg-4 mb-3">
    <!-- Content -->
  </div>
</div>
```

### Form Group with Validation

**When:** Adding any new form field

```html
<div class="mb-3">
  <label for="email" class="form-label">Email <span class="text-danger">*</span></label>
  <input type="email" class="form-control" id="email" required>
  <div class="invalid-feedback">Please provide a valid email address.</div>
  <div class="form-text">We'll never share your email with anyone else.</div>
</div>
```

### Loading States for Form Submission

**When:** Implementing async form submission

```javascript
const submitBtn = $('#submitBtn');
const spinner = $('#loadingSpinner');

// Before submit
submitBtn.prop('disabled', true);
spinner.removeClass('d-none');

// After response
submitBtn.prop('disabled', false);
spinner.addClass('d-none');
```

## See Also

- [aesthetics](references/aesthetics.md) - Typography, colors, BSA branding
- [components](references/components.md) - Form controls, buttons, alerts
- [layouts](references/layouts.md) - Grid system, responsive patterns
- [motion](references/motion.md) - Transitions, loading states, animations
- [patterns](references/patterns.md) - Design anti-patterns and best practices

## Related Skills

- **bootstrap** - Bootstrap 5 framework patterns
- **jquery** - DOM manipulation and event handling for form interactions
- **select2** - Multi-select dropdown styling integration
- **express-validator** - Server-side validation that mirrors client validation