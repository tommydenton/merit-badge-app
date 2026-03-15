# Bootstrap Workflows Reference

## Contents
- Creating a New Form Section
- Adding Responsive Columns
- Implementing Conditional Form Fields
- Setting Up Form Validation
- Displaying User Feedback Messages
- Troubleshooting Bootstrap Issues

---

## Creating a New Form Section

### Workflow: Add a New Field to the Application Form

**Scenario:** Adding a "Years of Experience" field to the merit badge application.

Copy this checklist and track progress:
- [ ] Add HTML markup with Bootstrap classes
- [ ] Add validation markup
- [ ] Update form submission handler
- [ ] Test validation behavior
- [ ] Test responsive layout

**Step 1: Add HTML Markup**

```html
<!-- Add to public/index.html after existing fields -->
<div class="mb-3">
  <label for="yearsExperience" class="form-label">Years of Experience *</label>
  <input type="number" 
         class="form-control" 
         id="yearsExperience" 
         name="yearsExperience"
         min="0" 
         max="99"
         required>
  <div class="invalid-feedback">Please enter your years of experience (0-99)</div>
  <div class="form-text">How many years have you worked with this merit badge topic?</div>
</div>
```

**Bootstrap Classes Used:**
- `.mb-3`: Bottom margin (spacing)
- `.form-label`: Styled label
- `.form-control`: Styled input
- `.invalid-feedback`: Validation error message
- `.form-text`: Help text below input

**Step 2: Update JavaScript to Capture Value**

```javascript
// In public/js/app.js, add to form submission handler
const formData = new FormData();
formData.append('firstName', document.getElementById('firstName').value);
formData.append('lastName', document.getElementById('lastName').value);
// ... existing fields
formData.append('yearsExperience', document.getElementById('yearsExperience').value);
```

**Step 3: Test Validation**

1. Leave field empty and submit form
2. Verify Bootstrap shows `.invalid-feedback`
3. Enter value outside range (e.g., 100)
4. Verify HTML5 validation triggers
5. Enter valid value and verify submission

---

## Adding Responsive Columns

### Workflow: Convert Single-Column Form to Two-Column Layout

**Before:** All fields stacked vertically
**After:** Related fields side-by-side on desktop, stacked on mobile

**Step 1: Identify Related Fields**

Group fields logically:
- Personal info: First Name + Last Name
- Contact info: Phone + Email
- BSA info: Member ID + District

**Step 2: Wrap in Row and Columns**

```html
<!-- BEFORE: Single column -->
<div class="mb-3">
  <label for="firstName" class="form-label">First Name *</label>
  <input type="text" class="form-control" id="firstName" required>
</div>
<div class="mb-3">
  <label for="lastName" class="form-label">Last Name *</label>
  <input type="text" class="form-control" id="lastName" required>
</div>

<!-- AFTER: Two columns on medium+ screens -->
<div class="row">
  <div class="col-md-6 mb-3">
    <label for="firstName" class="form-label">First Name *</label>
    <input type="text" class="form-control" id="firstName" required>
    <div class="invalid-feedback">First name is required</div>
  </div>
  <div class="col-md-6 mb-3">
    <label for="lastName" class="form-label">Last Name *</label>
    <input type="text" class="form-control" id="lastName" required>
    <div class="invalid-feedback">Last name is required</div>
  </div>
</div>
```

**Step 3: Validate Responsive Behavior**

1. View on desktop (≥768px): Fields side-by-side
2. Resize to mobile (<768px): Fields stack vertically
3. Verify spacing looks consistent at all breakpoints

**Common Mistake:**

```html
<!-- BAD - Missing mb-3 on columns -->
<div class="row">
  <div class="col-md-6">
    <!-- Content -->
  </div>
</div>
```

This removes bottom margin on mobile, causing fields to touch.

---

## Implementing Conditional Form Fields

### Workflow: Show/Hide Sections Based on User Input

**Scenario:** Show "BSA Member ID" and "District" fields only if user selects "Yes" for volunteer status.

Copy this checklist:
- [ ] Add conditional sections with `d-none` class
- [ ] Write JavaScript to toggle visibility
- [ ] Update required attributes dynamically
- [ ] Clear hidden field values
- [ ] Test all conditional paths

**Step 1: Mark Sections as Initially Hidden**

```html
<div class="mb-3">
  <label for="isVolunteer" class="form-label">Are you currently a registered BSA volunteer? *</label>
  <select class="form-select" id="isVolunteer" required>
    <option value="">Select...</option>
    <option value="yes">Yes</option>
    <option value="no">No</option>
  </select>
</div>

<!-- Conditional section: hidden by default -->
<div id="volunteerFieldsSection" class="d-none">
  <div class="row">
    <div class="col-md-6 mb-3">
      <label for="bsaMemberId" class="form-label">BSA Member ID</label>
      <input type="text" class="form-control" id="bsaMemberId">
      <div class="invalid-feedback">BSA Member ID is required for volunteers</div>
    </div>
    <div class="col-md-6 mb-3">
      <label for="district" class="form-label">District</label>
      <select class="form-select" id="district">
        <option value="">Select...</option>
        <option value="central">Central</option>
        <!-- More options -->
      </select>
      <div class="invalid-feedback">Please select your district</div>
    </div>
  </div>
</div>
```

**Step 2: Add JavaScript Toggle Logic**

```javascript
// In public/js/app.js
document.getElementById('isVolunteer').addEventListener('change', function(e) {
  const section = document.getElementById('volunteerFieldsSection');
  const bsaIdField = document.getElementById('bsaMemberId');
  const districtField = document.getElementById('district');
  
  if (e.target.value === 'yes') {
    // Show section
    section.classList.remove('d-none');
    // Make fields required
    bsaIdField.required = true;
    districtField.required = true;
  } else {
    // Hide section
    section.classList.add('d-none');
    // Remove required attribute
    bsaIdField.required = false;
    districtField.required = false;
    // Clear values
    bsaIdField.value = '';
    districtField.value = '';
  }
});
```

**Step 3: Test All Paths**

1. Select "Yes" → Verify section appears
2. Fill in conditional fields → Submit → Verify validation works
3. Select "No" → Verify section disappears
4. Submit without filling conditional fields → Verify no validation errors
5. Select "Yes" again → Verify fields are empty (cleared)

---

## Setting Up Form Validation

### Workflow: Add Bootstrap Validation to a New Form

**Step 1: Add Bootstrap Validation Classes**

```html
<form id="myForm" class="needs-validation" novalidate>
  <div class="mb-3">
    <label for="username" class="form-label">Username *</label>
    <input type="text" 
           class="form-control" 
           id="username" 
           pattern="[a-zA-Z0-9_]{3,20}"
           required>
    <div class="invalid-feedback">
      Username must be 3-20 characters (letters, numbers, underscores only)
    </div>
  </div>
  
  <button type="submit" class="btn btn-primary">Submit</button>
</form>
```

**Step 2: Add JavaScript Validation Handler**

```javascript
const form = document.getElementById('myForm');

form.addEventListener('submit', function(e) {
  // Prevent default form submission
  e.preventDefault();
  e.stopPropagation();
  
  // Check HTML5 validity
  if (!form.checkValidity()) {
    // Show validation errors
    form.classList.add('was-validated');
    return;
  }
  
  // Form is valid - proceed with submission
  submitFormData();
});

async function submitFormData() {
  const formData = new FormData(form);
  
  try {
    const response = await fetch('/api/submit', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) throw new Error('Submission failed');
    
    showSuccessMessage('Form submitted successfully');
    form.reset();
    form.classList.remove('was-validated');
  } catch (error) {
    showErrorMessage(error.message);
  }
}
```

**Step 3: Validate Behavior**

1. Submit empty form → Verify all required fields show errors
2. Fill invalid data (e.g., username with spaces) → Verify pattern validation
3. Fill valid data → Verify submission succeeds
4. After success → Verify form resets and validation clears

---

## Displaying User Feedback Messages

### Workflow: Show Success/Error Alerts After Form Submission

**Step 1: Add Alert Containers to HTML**

```html
<!-- Add near top of form -->
<div id="alertContainer">
  <div id="successAlert" class="alert alert-success alert-dismissible fade show d-none" role="alert">
    <strong>Success!</strong> <span id="successMessage"></span>
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  </div>
  
  <div id="errorAlert" class="alert alert-danger alert-dismissible fade show d-none" role="alert">
    <strong>Error!</strong> <span id="errorMessage"></span>
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  </div>
</div>
```

**Step 2: Create Reusable Alert Functions**

```javascript
function showSuccessAlert(message) {
  const alert = document.getElementById('successAlert');
  const messageSpan = document.getElementById('successMessage');
  
  // Hide error alert if visible
  document.getElementById('errorAlert').classList.add('d-none');
  
  // Set message and show
  messageSpan.textContent = message;
  alert.classList.remove('d-none');
  
  // Scroll to alert
  alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    alert.classList.add('d-none');
  }, 5000);
}

function showErrorAlert(message) {
  const alert = document.getElementById('errorAlert');
  const messageSpan = document.getElementById('errorMessage');
  
  // Hide success alert if visible
  document.getElementById('successAlert').classList.add('d-none');
  
  // Set message and show
  messageSpan.textContent = message;
  alert.classList.remove('d-none');
  
  // Scroll to alert
  alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
```

**Step 3: Use in Form Submission**

```javascript
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    const response = await fetch('/api/submit', {
      method: 'POST',
      body: new FormData(form)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Submission failed');
    }
    
    showSuccessAlert(result.message || 'Application submitted successfully');
    form.reset();
  } catch (error) {
    showErrorAlert(error.message);
  }
});
```

---

## Troubleshooting Bootstrap Issues

### Issue: Validation Feedback Not Showing

**Symptoms:** `invalid-feedback` div doesn't appear when field is invalid

**Checklist:**
1. Verify form has `needs-validation` class
2. Verify `invalid-feedback` is sibling of input (not nested elsewhere)
3. Verify form has `was-validated` class (added by JavaScript)
4. Verify input has `required` or validation attribute (`pattern`, `min`, `max`)

**Debug Steps:**

```javascript
// Check if validation classes are applied
console.log('Form classes:', form.className);
console.log('Input validity:', input.validity);
console.log('Input checkValidity:', input.checkValidity());
```

**Fix:**

```javascript
// Ensure form validation is triggered
form.addEventListener('submit', (e) => {
  if (!form.checkValidity()) {
    e.preventDefault();
    e.stopPropagation();
  }
  form.classList.add('was-validated'); // CRITICAL: Activates Bootstrap validation
});
```

---

### Issue: Responsive Columns Not Working

**Symptoms:** Columns don't change layout at breakpoints

**Checklist:**
1. Verify Bootstrap CSS is loaded (check Network tab)
2. Verify column classes use correct breakpoint prefix (`col-md-6`, not `col-6-md`)
3. Verify total columns in row add up to 12 or less
4. Verify no custom CSS overriding `display` or `width`

**Fix:**

```html
<!-- WRONG -->
<div class="col-6-md">Content</div>

<!-- CORRECT -->
<div class="col-md-6">Content</div>
```

**Verify CSS Loading:**

```javascript
// Check if Bootstrap CSS is applied
const element = document.querySelector('.col-md-6');
const styles = window.getComputedStyle(element);
console.log('Width:', styles.width); // Should be 50% on medium+ screens
```

---

### Issue: Select2 Dropdowns Not Styled

**Symptoms:** Select2 dropdowns look different from Bootstrap form controls

**Cause:** Select2 theme not set to Bootstrap 5

**Fix:**

```javascript
// BAD - No theme
$('#mySelect').select2({
  placeholder: 'Select...'
});

// GOOD - Bootstrap 5 theme
$('#mySelect').select2({
  theme: 'bootstrap-5',
  placeholder: 'Select...',
  width: '100%' // Ensures dropdown matches form-control width
});
```

See the **select2** skill for integration details.