# Bootstrap Patterns Reference

## Contents
- Integration with Select2
- Form Validation Patterns
- Responsive Grid Layouts
- Alert and Feedback Messages
- Dynamic Show/Hide Sections
- Button State Management
- Custom Styling Extensions

---

## Integration with Select2

Bootstrap form controls integrate with **select2** dropdowns for enhanced multi-select functionality.

### Pattern: Bootstrap-Styled Select2

```html
<div class="mb-3">
  <label for="badgesToCounsel" class="form-label">Merit Badges to Counsel *</label>
  <select class="form-select" id="badgesToCounsel" multiple required>
    <!-- Options loaded via AJAX -->
  </select>
  <div class="invalid-feedback">Please select at least one badge</div>
</div>
```

```javascript
// Initialize Select2 with Bootstrap 5 theme
$('#badgesToCounsel').select2({
  theme: 'bootstrap-5',
  placeholder: 'Select merit badges',
  allowClear: true,
  width: '100%'
});
```

**Why This Works:**
- `form-select` class provides base Bootstrap styling
- Select2 `bootstrap-5` theme matches form aesthetics
- `invalid-feedback` integrates with Bootstrap validation

**Common Mistake:**

```javascript
// BAD - No theme specified, looks inconsistent
$('#badgesToCounsel').select2({
  placeholder: 'Select merit badges'
});
```

### Pattern: Validation for Select2 Dropdowns

Select2 hides the original `<select>`, breaking Bootstrap's validation display.

```javascript
// Fix: Manually toggle invalid class on Select2 container
function validateSelect2(selectId) {
  const select = document.getElementById(selectId);
  const select2Container = $(select).next('.select2-container');
  
  if (!select.value || select.selectedOptions.length === 0) {
    select2Container.addClass('is-invalid');
    select.setCustomValidity('Please select at least one option');
  } else {
    select2Container.removeClass('is-invalid');
    select.setCustomValidity('');
  }
}

// Call on form submit
form.addEventListener('submit', (e) => {
  validateSelect2('badgesToCounsel');
  // ... rest of validation
});
```

---

## Form Validation Patterns

Bootstrap's `.needs-validation` and `.was-validated` classes provide client-side validation without JavaScript logic.

### Pattern: HTML5 Validation with Bootstrap Feedback

```html
<form class="needs-validation" novalidate>
  <div class="mb-3">
    <label for="age" class="form-label">Age *</label>
    <input type="number" class="form-control" id="age" min="18" required>
    <div class="invalid-feedback">You must be at least 18 years old</div>
  </div>
  
  <div class="mb-3">
    <label for="email" class="form-label">Email *</label>
    <input type="email" class="form-control" id="email" required>
    <div class="invalid-feedback">Please provide a valid email address</div>
  </div>
  
  <button type="submit" class="btn btn-primary">Submit</button>
</form>
```

```javascript
// Activate validation on submit
const form = document.querySelector('.needs-validation');
form.addEventListener('submit', (e) => {
  if (!form.checkValidity()) {
    e.preventDefault();
    e.stopPropagation();
  }
  form.classList.add('was-validated');
});
```

**Why This Pattern:**
- `novalidate` disables browser default bubbles
- `.needs-validation` prepares form for Bootstrap validation
- `.was-validated` triggers validation display on all fields
- `invalid-feedback` only shows when adjacent input has `:invalid` state

### Pattern: Conditional Required Fields

```javascript
// Make fields required based on another field's value
document.getElementById('isVolunteer').addEventListener('change', (e) => {
  const bsaIdField = document.getElementById('bsaMemberId');
  const districtField = document.getElementById('district');
  
  if (e.target.value === 'yes') {
    bsaIdField.required = true;
    districtField.required = true;
    document.getElementById('volunteerFields').classList.remove('d-none');
  } else {
    bsaIdField.required = false;
    districtField.required = false;
    bsaIdField.value = '';
    districtField.value = '';
    document.getElementById('volunteerFields').classList.add('d-none');
  }
});
```

---

## Responsive Grid Layouts

### Pattern: Centered Form Container

```html
<div class="container mt-5">
  <div class="row justify-content-center">
    <div class="col-lg-8 col-md-10 col-12">
      <!-- Form content: 8 cols on large screens, 10 on medium, full width on mobile -->
    </div>
  </div>
</div>
```

**Breakpoints Used:**
- `col-12`: Mobile (default, < 768px)
- `col-md-10`: Tablet (≥ 768px)
- `col-lg-8`: Desktop (≥ 992px)

### Pattern: Multi-Column Form Fields

```html
<div class="row">
  <div class="col-md-6 mb-3">
    <label for="firstName" class="form-label">First Name *</label>
    <input type="text" class="form-control" id="firstName" required>
  </div>
  <div class="col-md-6 mb-3">
    <label for="lastName" class="form-label">Last Name *</label>
    <input type="text" class="form-control" id="lastName" required>
  </div>
</div>
```

**Responsive Behavior:**
- Desktop: Two columns side-by-side
- Mobile: Stacks vertically (default Bootstrap behavior)

**Common Mistake:**

```html
<!-- BAD - No bottom margin on mobile, fields touch -->
<div class="col-md-6">
  <label for="firstName">First Name</label>
  <input type="text" class="form-control" id="firstName">
</div>
```

**Fix:** Always add `mb-3` to column divs for consistent spacing.

---

## Alert and Feedback Messages

### Pattern: Dismissible Success Alert

```html
<div id="successMessage" class="alert alert-success alert-dismissible fade show d-none" role="alert">
  <strong>Success!</strong> Your application has been submitted.
  <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
</div>
```

```javascript
function showSuccessMessage(message) {
  const alert = document.getElementById('successMessage');
  alert.innerHTML = `<strong>Success!</strong> ${message} <button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
  alert.classList.remove('d-none');
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    alert.classList.add('d-none');
  }, 5000);
}
```

### Pattern: Error Alert with Dynamic Content

```html
<div id="errorMessage" class="alert alert-danger alert-dismissible fade show d-none" role="alert">
  <strong>Error!</strong> <span id="errorText"></span>
  <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
</div>
```

```javascript
function showErrorMessage(error) {
  const errorText = document.getElementById('errorText');
  const errorAlert = document.getElementById('errorMessage');
  
  errorText.textContent = error.message || 'An unexpected error occurred';
  errorAlert.classList.remove('d-none');
  errorAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
```

**Why scrollIntoView:** Ensures user sees error even if form is long.

---

## Dynamic Show/Hide Sections

### Pattern: Purpose-Based Section Visibility

```javascript
// Show/hide form sections based on dropdown selection
document.getElementById('purpose').addEventListener('change', (e) => {
  const purpose = e.target.value;
  
  // Hide all optional sections first
  document.querySelectorAll('[data-purpose-section]').forEach(section => {
    section.classList.add('d-none');
  });
  
  // Show relevant sections
  switch (purpose) {
    case 'become-counselor':
      document.getElementById('counselBadgesSection').classList.remove('d-none');
      document.getElementById('qualificationsSection').classList.remove('d-none');
      break;
    case 'drop-badges':
      document.getElementById('dropBadgesSection').classList.remove('d-none');
      break;
    case 'change-add-badges':
      document.getElementById('counselBadgesSection').classList.remove('d-none');
      document.getElementById('qualificationsSection').classList.remove('d-none');
      break;
  }
});
```

**HTML Structure:**

```html
<div id="counselBadgesSection" class="mb-3 d-none" data-purpose-section>
  <!-- Content -->
</div>

<div id="qualificationsSection" class="mb-3 d-none" data-purpose-section>
  <!-- Content -->
</div>
```

**Why `data-purpose-section`:** Allows batch operations on all conditional sections.

---

## Button State Management

### Pattern: Loading State for Async Submit

```html
<button type="submit" class="btn btn-primary" id="submitBtn">
  <span id="submitBtnText">Submit Application</span>
  <span id="submitBtnSpinner" class="spinner-border spinner-border-sm d-none" role="status">
    <span class="visually-hidden">Loading...</span>
  </span>
</button>
```

```javascript
function setSubmitButtonLoading(isLoading) {
  const btn = document.getElementById('submitBtn');
  const text = document.getElementById('submitBtnText');
  const spinner = document.getElementById('submitBtnSpinner');
  
  if (isLoading) {
    btn.disabled = true;
    text.classList.add('d-none');
    spinner.classList.remove('d-none');
  } else {
    btn.disabled = false;
    text.classList.remove('d-none');
    spinner.classList.add('d-none');
  }
}

// Usage
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setSubmitButtonLoading(true);
  
  try {
    await submitForm();
    showSuccessMessage('Application submitted successfully');
  } catch (error) {
    showErrorMessage(error);
  } finally {
    setSubmitButtonLoading(false);
  }
});
```

---

## Custom Styling Extensions

### Pattern: Extending Bootstrap Without Breaking It

```css
/* public/css/style.css - GOOD approach */
.form-control:focus {
  border-color: #0d6efd;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
}

.custom-file-list {
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  padding: 0.75rem;
}

/* Extend alert styles for application-specific use */
.alert-info {
  background-color: #e7f3ff;
  border-color: #b3d9ff;
}
```

**DON'T:**

```css
/* BAD - Overriding core Bootstrap */
.form-control {
  border: none !important;
  background: white !important;
}
```

**Why This Breaks:** Removes Bootstrap's validation states (`:invalid`, `:valid` borders).