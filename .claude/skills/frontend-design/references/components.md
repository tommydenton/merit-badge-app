# Components Reference

## Contents
- Form Controls
- Buttons and Actions
- Validation Feedback
- Alerts and Messages
- Select2 Integration
- File Upload Components

---

## Form Controls

### Text Inputs

```html
<!-- Standard text input with label -->
<div class="mb-3">
  <label for="firstName" class="form-label">
    First Name <span class="text-danger">*</span>
  </label>
  <input 
    type="text" 
    class="form-control" 
    id="firstName" 
    name="firstName"
    placeholder="Enter first name"
    required
  >
  <div class="invalid-feedback">First name is required</div>
</div>
```

### Email Input with Validation

```html
<div class="mb-3">
  <label for="email" class="form-label">Email Address <span class="text-danger">*</span></label>
  <input 
    type="email" 
    class="form-control" 
    id="email" 
    name="email"
    placeholder="example@domain.com"
    required
  >
  <div class="invalid-feedback">Please provide a valid email address</div>
  <div class="form-text">We'll never share your email with anyone else.</div>
</div>
```

### Number Input with Constraints

```html
<div class="mb-3">
  <label for="age" class="form-label">Age <span class="text-danger">*</span></label>
  <input 
    type="number" 
    class="form-control" 
    id="age" 
    name="age"
    min="18"
    required
  >
  <div class="invalid-feedback">You must be at least 18 years old</div>
</div>
```

### DO: Consistent Input Structure

```html
<!-- Good: Every input follows the same pattern -->
<div class="mb-3">
  <label class="form-label">Field Name <span class="text-danger">*</span></label>
  <input type="text" class="form-control" required>
  <div class="invalid-feedback">Error message</div>
  <div class="form-text">Optional helper text</div>
</div>
```

### DON'T: Mix Input Patterns

```html
<!-- Bad: Inconsistent structure -->
<label>Field Name</label>
<input type="text" class="form-control">
<span style="color: red;">Required</span>

<div>
  <input type="text" class="form-control" placeholder="Another Field *">
</div>
```

**Why this breaks:** Inconsistent patterns make the form harder to parse visually and break screen reader navigation. Always use `.mb-3` wrapper, `.form-label`, and validation feedback.

---

## Buttons and Actions

### Primary Action Button

```html
<button type="submit" class="btn btn-primary btn-lg" id="submitBtn">
  <span id="submitText">Submit Application</span>
  <span id="loadingSpinner" class="spinner-border spinner-border-sm ms-2 d-none" role="status" aria-hidden="true"></span>
</button>
```

### Secondary Actions

```html
<div class="d-flex gap-2">
  <button type="button" class="btn btn-outline-secondary">Cancel</button>
  <button type="submit" class="btn btn-primary">Save & Continue</button>
</div>
```

### Button States (JavaScript)

```javascript
// Disable button during submission
function setButtonLoading(isLoading) {
  const btn = $('#submitBtn');
  const text = $('#submitText');
  const spinner = $('#loadingSpinner');
  
  if (isLoading) {
    btn.prop('disabled', true);
    text.text('Submitting...');
    spinner.removeClass('d-none');
  } else {
    btn.prop('disabled', false);
    text.text('Submit Application');
    spinner.addClass('d-none');
  }
}
```

### DO: Clear Visual Hierarchy

```html
<!-- Good: Primary action stands out -->
<div class="d-flex justify-content-between mt-4">
  <button type="button" class="btn btn-outline-secondary">Save Draft</button>
  <button type="submit" class="btn btn-primary btn-lg">Submit Application</button>
</div>
```

### DON'T: Multiple Primary Buttons

```html
<!-- Bad: Two primary actions confuse users -->
<div class="d-flex gap-2">
  <button type="button" class="btn btn-primary">Cancel</button>
  <button type="submit" class="btn btn-primary">Submit</button>
</div>
```

**Why this breaks:** Multiple primary buttons create confusion about the intended action. Use `.btn-outline-secondary` or `.btn-secondary` for secondary actions.

---

## Validation Feedback

### Bootstrap 5 Validation Classes

```javascript
// Enable Bootstrap validation
const forms = document.querySelectorAll('.needs-validation');

forms.forEach(form => {
  form.addEventListener('submit', event => {
    if (!form.checkValidity()) {
      event.preventDefault();
      event.stopPropagation();
    }
    form.classList.add('was-validated');
  }, false);
});
```

### Custom Validation Messages

```html
<div class="mb-3">
  <label for="bsaMemberId" class="form-label">BSA Member ID <span class="text-danger">*</span></label>
  <input 
    type="text" 
    class="form-control" 
    id="bsaMemberId" 
    pattern="[0-9]{6,10}"
    required
  >
  <div class="invalid-feedback">Please enter a valid 6-10 digit BSA Member ID</div>
</div>
```

### Dynamic Validation (JavaScript)

```javascript
// Custom validation for conditional fields
$('#volunteerStatus').on('change', function() {
  const isVolunteer = $(this).val() === 'yes';
  const bsaIdField = $('#bsaMemberId');
  
  if (isVolunteer) {
    bsaIdField.prop('required', true);
    bsaIdField.closest('.mb-3').show();
  } else {
    bsaIdField.prop('required', false);
    bsaIdField.closest('.mb-3').hide();
  }
});
```

### DO: Inline Validation Feedback

```html
<!-- Good: Immediate feedback -->
<input 
  type="email" 
  class="form-control" 
  id="email" 
  required
  pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
>
<div class="invalid-feedback">Please enter a valid email address</div>
```

### DON'T: Generic Error Messages

```html
<!-- Bad: Unhelpful error message -->
<input type="email" class="form-control" required>
<div class="invalid-feedback">Invalid input</div>
```

**Why this breaks:** Generic messages don't help users fix the problem. Provide specific guidance: "Please enter a valid email address" or "Age must be 18 or older".

---

## Alerts and Messages

### Success Alert

```html
<div class="alert alert-success alert-dismissible fade show" role="alert">
  <strong>Success!</strong> Your application has been submitted successfully.
  <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
</div>
```

### Error Alert

```html
<div class="alert alert-danger alert-dismissible fade show" role="alert">
  <strong>Error!</strong> There was a problem submitting your application. Please try again.
  <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
</div>
```

### Dynamic Alerts (JavaScript)

```javascript
// Show success message after form submission
function showSuccessMessage(message) {
  const alert = $('<div>')
    .addClass('alert alert-success alert-dismissible fade show')
    .attr('role', 'alert')
    .html(`
      <strong>Success!</strong> ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `);
  
  $('#alertContainer').html(alert);
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => alert.alert('close'), 5000);
}
```

### DO: Use Semantic Alert Types

```javascript
// Good: Clear intent
showAlert('success', 'Application submitted successfully');
showAlert('danger', 'Failed to submit application');
showAlert('warning', 'Please review the required fields');
showAlert('info', 'Your session will expire in 5 minutes');
```

### DON'T: Inconsistent Alert Styling

```html
<!-- Bad: Custom alert styling -->
<div style="background: #d4edda; padding: 15px; border-radius: 5px; color: #155724;">
  Success! Application submitted.
</div>
```

**Why this breaks:** Custom alert styling bypasses Bootstrap's semantic system and breaks consistency. Always use `.alert-success`, `.alert-danger`, etc.

---

## Select2 Integration

### Basic Select2 Multi-Select

```javascript
// Initialize Select2 for merit badge selection
$('#badgesToCounsel').select2({
  placeholder: 'Select merit badges to counsel',
  allowClear: true,
  width: '100%',
  theme: 'bootstrap-5'
});
```

### Loading Data from API

```javascript
// Load merit badges from server
async function loadMeritBadges() {
  try {
    const response = await fetch('/api/applications/merit-badges');
    const data = await response.json();
    
    if (data.success) {
      const select = $('#badgesToCounsel');
      select.empty();
      
      data.badges.forEach(badge => {
        select.append(new Option(badge.name, badge.id));
      });
      
      select.select2({
        placeholder: 'Select merit badges',
        allowClear: true,
        width: '100%'
      });
    }
  } catch (error) {
    console.error('Failed to load merit badges:', error);
  }
}
```

### DO: Consistent Select2 Styling

```javascript
// Good: All Select2 instances use same config
const select2Config = {
  theme: 'bootstrap-5',
  width: '100%',
  placeholder: 'Select...',
  allowClear: true
};

$('#badgesToCounsel').select2(select2Config);
$('#badgesToDrop').select2(select2Config);
```

### DON'T: Inconsistent Multi-Select UIs

```javascript
// Bad: Mixing Select2 with native selects
$('#badgesToCounsel').select2();
// But then using native <select multiple> elsewhere
```

**Why this breaks:** Mixing enhanced and native selects creates visual inconsistency. Use Select2 for all multi-select dropdowns. See the **select2** skill for advanced patterns.

---

## File Upload Components

### File Input with Validation

```html
<div class="mb-3">
  <label for="certifications" class="form-label">Upload Certifications</label>
  <input 
    type="file" 
    class="form-control" 
    id="certifications" 
    name="certifications"
    multiple
    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
  >
  <div class="form-text">
    Upload up to 10 files (max 30MB total). Accepted: PDF, DOC, DOCX, JPG, PNG
  </div>
  <div id="fileList" class="mt-2"></div>
</div>
```

### File List Display (JavaScript)

```javascript
// Display selected files with sizes
$('#certifications').on('change', function(e) {
  const files = e.target.files;
  const fileList = $('#fileList');
  fileList.empty();
  
  if (files.length === 0) return;
  
  let totalSize = 0;
  const maxSize = 30 * 1024 * 1024; // 30MB
  
  Array.from(files).forEach(file => {
    totalSize += file.size;
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    
    fileList.append(`
      <div class="d-flex justify-content-between align-items-center border-bottom py-2">
        <span>${file.name}</span>
        <span class="badge bg-secondary">${sizeMB} MB</span>
      </div>
    `);
  });
  
  if (totalSize > maxSize) {
    fileList.append(`
      <div class="alert alert-danger mt-2">
        Total file size exceeds 30MB limit
      </div>
    `);
  }
});
```

### DO: Clear File Upload Feedback

```javascript
// Good: Show progress and validation
function validateFileUploads(files) {
  const errors = [];
  const maxFiles = 10;
  const maxSize = 30 * 1024 * 1024;
  
  if (files.length > maxFiles) {
    errors.push(`Maximum ${maxFiles} files allowed`);
  }
  
  const totalSize = Array.from(files).reduce((sum, f) => sum + f.size, 0);
  if (totalSize > maxSize) {
    errors.push(`Total size exceeds 30MB (current: ${(totalSize / (1024 * 1024)).toFixed(2)}MB)`);
  }
  
  return errors;
}
```

### DON'T: Silent File Upload Failures

```html
<!-- Bad: No feedback on file selection -->
<input type="file" multiple>
```

**Why this breaks:** Users need to see what files they've selected and whether they meet requirements. Always display the file list with sizes and validation feedback. See the **multer** skill for server-side file handling.