---
name: bootstrap
description: |
  Applies Bootstrap 5 responsive grid, components, and form styling to frontend interfaces.
  Use when building or modifying form layouts, responsive grids, or interactive UI components.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__query-docs
---

# Bootstrap 5 Skill

Bootstrap 5 powers the responsive form interface in this Merit Badge Counselor application. The project uses Bootstrap's grid system for layout, form validation classes for client-side feedback, utility classes for spacing/visibility, and component patterns for modals/alerts. All custom styles in `public/css/style.css` extend Bootstrap defaults rather than override them.

## Quick Start

### Responsive Form Layout

```html
<!-- From public/index.html -->
<div class="container mt-5">
  <div class="row justify-content-center">
    <div class="col-lg-8">
      <form id="applicationForm" class="needs-validation" novalidate>
        <div class="mb-3">
          <label for="firstName" class="form-label">First Name *</label>
          <input type="text" class="form-control" id="firstName" required>
          <div class="invalid-feedback">First name is required</div>
        </div>
      </form>
    </div>
  </div>
</div>
```

### Conditional Visibility with Utilities

```html
<!-- Show/hide sections based on form state -->
<div id="counselBadgesSection" class="mb-3 d-none">
  <label class="form-label">Merit Badges to Counsel *</label>
  <select class="form-select" id="badgesToCounsel" multiple required>
    <!-- Options populated by JavaScript -->
  </select>
</div>
```

```javascript
// Toggle visibility in public/js/app.js
if (purpose === 'become-counselor') {
  document.getElementById('counselBadgesSection').classList.remove('d-none');
} else {
  document.getElementById('counselBadgesSection').classList.add('d-none');
}
```

## Key Concepts

| Concept | Usage | Example |
|---------|-------|---------|
| Grid System | 12-column responsive layout | `<div class="col-lg-8 col-md-10 col-12">` |
| Form Validation | `.needs-validation` + `.is-invalid` | `<form class="needs-validation" novalidate>` |
| Utility Classes | Spacing, display, text alignment | `mt-5`, `d-none`, `text-center` |
| Form Controls | Styled inputs, selects, textareas | `<input class="form-control">` |
| Alerts | Success/error messages | `<div class="alert alert-success">` |

## Common Patterns

### Form Validation Feedback

**When:** Providing real-time validation to users

```html
<input type="email" class="form-control" id="email" required>
<div class="invalid-feedback">Please provide a valid email</div>
<div class="valid-feedback">Looks good!</div>
```

```javascript
// Trigger validation on submit
form.addEventListener('submit', (e) => {
  if (!form.checkValidity()) {
    e.preventDefault();
    e.stopPropagation();
  }
  form.classList.add('was-validated');
});
```

### Responsive Column Sizing

**When:** Creating forms that work on mobile, tablet, and desktop

```html
<!-- Full width on mobile, 10 cols on tablet, 8 cols on desktop -->
<div class="row justify-content-center">
  <div class="col-12 col-md-10 col-lg-8">
    <!-- Form content -->
  </div>
</div>
```

### Alert Messages for User Feedback

**When:** Showing success/error states after form submission

```html
<div id="successMessage" class="alert alert-success alert-dismissible fade show d-none">
  Application submitted successfully!
  <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
</div>

<div id="errorMessage" class="alert alert-danger alert-dismissible fade show d-none">
  <strong>Error!</strong> <span id="errorText"></span>
  <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
</div>
```

```javascript
// Show alert dynamically
function showSuccess(message) {
  const alert = document.getElementById('successMessage');
  alert.textContent = message;
  alert.classList.remove('d-none');
}
```

### Button States and Loading Indicators

**When:** Disabling buttons during async operations

```html
<button type="submit" class="btn btn-primary" id="submitBtn">
  <span id="submitBtnText">Submit Application</span>
  <span id="submitBtnSpinner" class="spinner-border spinner-border-sm d-none"></span>
</button>
```

```javascript
// Toggle loading state
submitBtn.disabled = true;
document.getElementById('submitBtnText').classList.add('d-none');
document.getElementById('submitBtnSpinner').classList.remove('d-none');
```

## WARNING: Common Anti-Patterns

### Using `!important` to Override Bootstrap

**The Problem:**

```css
/* BAD - Fighting Bootstrap with !important */
.form-control {
  padding: 20px !important;
  border-color: red !important;
}
```

**Why This Breaks:**
1. Creates specificity wars requiring more `!important` declarations
2. Makes responsive breakpoints impossible to override
3. Breaks future Bootstrap updates

**The Fix:**

```css
/* GOOD - Use higher specificity or custom classes */
.custom-form .form-control {
  padding: 20px;
  border-color: red;
}
```

### Inline Styles for Layout

**The Problem:**

```html
<!-- BAD - Inline styles bypass responsive breakpoints -->
<div style="width: 500px; margin-left: 100px;">
```

**Why This Breaks:**
1. Not responsive - fixed widths break on mobile
2. Can't use Bootstrap's breakpoint system
3. Harder to maintain and override

**The Fix:**

```html
<!-- GOOD - Use utility classes -->
<div class="col-lg-6 ms-lg-5 col-12">
```

## See Also

- [patterns](references/patterns.md) - Bootstrap integration patterns with Select2 and validation
- [workflows](references/workflows.md) - Step-by-step guides for common UI tasks

## Related Skills

- **jquery** - DOM manipulation and event handling used with Bootstrap components
- **select2** - Enhanced multi-select dropdowns styled with Bootstrap theme
- **frontend-design** - Overall UI/UX patterns complementing Bootstrap layouts

## Documentation Resources

> Fetch latest Bootstrap 5 documentation with Context7.

**How to use Context7:**
1. Use `mcp__context7__resolve-library-id` to search for "bootstrap 5"
2. **Prefer website documentation** (IDs starting with `/websites/`) over source code repositories when available
3. Query with `mcp__context7__query-docs` using the resolved library ID

**Library ID:** `/websites/getbootstrap.com` _(resolve using mcp__context7__resolve-library-id)_

**Recommended Queries:**
- "bootstrap 5 grid system responsive breakpoints"
- "bootstrap 5 form validation"
- "bootstrap 5 utility classes spacing"
- "bootstrap 5 alert components"