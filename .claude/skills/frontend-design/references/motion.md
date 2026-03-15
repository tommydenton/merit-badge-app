# Motion Reference

## Contents
- CSS Transitions
- Loading States
- Form Animations
- Scroll Behavior
- Performance Considerations

---

## CSS Transitions

### Bootstrap 5 Default Transitions

```css
/* Bootstrap applies these transitions by default */
.form-control {
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.btn {
  transition: color 0.15s ease-in-out, 
              background-color 0.15s ease-in-out, 
              border-color 0.15s ease-in-out, 
              box-shadow 0.15s ease-in-out;
}

.alert {
  transition: opacity 0.15s linear;
}
```

**Why 0.15s:** Fast enough to feel responsive, slow enough to be perceived. Below 0.1s feels instant, above 0.3s feels sluggish.

### Custom Transitions

```css
/* public/css/style.css - Conditional section animations */
.conditional-section {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
  transition: opacity 0.3s ease-in-out, max-height 0.3s ease-in-out;
}

.conditional-section.show {
  opacity: 1;
  max-height: 500px; /* Large enough for content */
}
```

### DO: Smooth Form Interactions

```css
/* Good: Smooth focus states */
.form-control:focus {
  border-color: #86b7fe;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

/* Smooth hover states on buttons */
.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.1);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
```

### DON'T: Slow Transitions

```css
/* Bad: Too slow, feels laggy */
.form-control {
  transition: all 0.8s ease-in-out;
}

/* Bad: Distracting animations */
.btn:hover {
  transform: scale(1.2) rotate(5deg);
  transition: transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

**Why this breaks:** Slow transitions make the interface feel unresponsive. Keep transitions under 0.3s for UI feedback. Avoid playful animations in professional forms.

---

## Loading States

### Spinner Component

```html
<!-- Bootstrap spinner -->
<div class="spinner-border text-primary" role="status">
  <span class="visually-hidden">Loading...</span>
</div>

<!-- Small spinner for buttons -->
<button class="btn btn-primary" disabled>
  <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
  Submitting...
</button>
```

### Form Submission Loading State

```javascript
// Show loading state during form submission
async function submitForm(formData) {
  const submitBtn = $('#submitBtn');
  const btnText = $('#submitText');
  const spinner = $('#loadingSpinner');
  
  // Set loading state
  submitBtn.prop('disabled', true);
  btnText.text('Submitting...');
  spinner.removeClass('d-none');
  
  try {
    const response = await fetch('/api/applications', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success) {
      showSuccessMessage('Application submitted successfully!');
    } else {
      showErrorMessage('Failed to submit application. Please try again.');
    }
  } catch (error) {
    showErrorMessage('Network error. Please check your connection.');
  } finally {
    // Reset loading state
    submitBtn.prop('disabled', false);
    btnText.text('Submit Application');
    spinner.addClass('d-none');
  }
}
```

### Loading Merit Badges

```javascript
// Show loading state while fetching data
async function loadMeritBadges() {
  const select = $('#badgesToCounsel');
  const loadingIndicator = $('#badgesLoading');
  
  // Show loading
  loadingIndicator.removeClass('d-none');
  select.prop('disabled', true);
  
  try {
    const response = await fetch('/api/applications/merit-badges');
    const data = await response.json();
    
    if (data.success) {
      select.empty();
      data.badges.forEach(badge => {
        select.append(new Option(badge.name, badge.id));
      });
      
      select.select2({
        placeholder: 'Select merit badges to counsel',
        allowClear: true
      });
    }
  } catch (error) {
    console.error('Failed to load badges:', error);
    showErrorMessage('Could not load merit badges. Please refresh the page.');
  } finally {
    // Hide loading
    loadingIndicator.addClass('d-none');
    select.prop('disabled', false);
  }
}
```

### DO: Clear Loading Feedback

```html
<!-- Good: User knows something is happening -->
<button type="submit" class="btn btn-primary" id="submitBtn">
  <span id="submitText">Submit Application</span>
  <span id="loadingSpinner" class="spinner-border spinner-border-sm ms-2 d-none"></span>
</button>
```

### DON'T: No Loading Indication

```html
<!-- Bad: User doesn't know if click registered -->
<button type="submit" class="btn btn-primary">Submit</button>
<!-- No spinner, no disabled state, no feedback -->
```

**Why this breaks:** Users will click multiple times if there's no feedback. Always show loading state for async operations. See the **jquery** skill for event handling.

---

## Form Animations

### Conditional Section Reveal

```javascript
// Smooth show/hide for conditional sections
$('#purpose').on('change', function() {
  const purpose = $(this).val();
  
  // Hide all conditional sections with animation
  $('.conditional-section').slideUp(300);
  
  // Show relevant section based on selection
  if (purpose === 'become_counselor' || purpose === 'change_add') {
    $('#counselorSection').slideDown(300);
  } else if (purpose === 'drop_badges') {
    $('#dropSection').slideDown(300);
  }
});
```

### Fade In Alerts

```javascript
// Fade in success/error messages
function showAlert(type, message) {
  const alert = $('<div>')
    .addClass(`alert alert-${type} alert-dismissible fade`)
    .attr('role', 'alert')
    .html(`
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `);
  
  $('#alertContainer').html(alert);
  
  // Trigger fade-in
  setTimeout(() => alert.addClass('show'), 10);
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => alert.alert('close'), 5000);
}
```

### DO: Purposeful Animation

```javascript
// Good: Animation provides feedback
$('#volunteerStatus').on('change', function() {
  const isVolunteer = $(this).val() === 'yes';
  
  if (isVolunteer) {
    $('#volunteerFields').slideDown(300);
  } else {
    $('#volunteerFields').slideUp(300);
  }
});
```

### DON'T: Gratuitous Animation

```javascript
// Bad: Animation serves no purpose
$('.form-control').each(function(index) {
  $(this).delay(index * 100).fadeIn(500);
});
```

**Why this breaks:** Unnecessary animations slow down form completion. Animate only when it provides feedback about state changes.

---

## Scroll Behavior

### Smooth Scroll to Error

```javascript
// Scroll to first validation error
function scrollToFirstError() {
  const firstInvalid = $('.is-invalid').first();
  
  if (firstInvalid.length) {
    $('html, body').animate({
      scrollTop: firstInvalid.offset().top - 100
    }, 300);
    
    firstInvalid.focus();
  }
}

// Use after validation
$('form').on('submit', function(e) {
  if (!this.checkValidity()) {
    e.preventDefault();
    scrollToFirstError();
  }
});
```

### Scroll to Success Message

```javascript
// Scroll to top after successful submission
function showSuccessAndScroll(message) {
  showSuccessMessage(message);
  
  $('html, body').animate({
    scrollTop: 0
  }, 300);
}
```

### DO: Smooth Scroll Navigation

```css
/* Native smooth scrolling */
html {
  scroll-behavior: smooth;
}
```

```javascript
// Polyfill for Safari < 15.4
if (!('scrollBehavior' in document.documentElement.style)) {
  // Use jQuery animate fallback
}
```

### DON'T: Jarring Jumps

```javascript
// Bad: Instant jump is disorienting
window.scrollTo(0, 0);
```

**Why this breaks:** Instant scrolling disorients users. Use smooth scrolling to maintain spatial context.

---

## Performance Considerations

### Animation Performance Checklist

```
✓ Use transform and opacity (GPU-accelerated)
✗ Avoid animating width, height, top, left (triggers layout)
✓ Use will-change for complex animations
✓ Limit animations to 60fps (16.67ms per frame)
✗ Avoid animating multiple elements simultaneously
```

### DO: GPU-Accelerated Transforms

```css
/* Good: Hardware-accelerated properties */
.modal-fade {
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 0.15s ease-out, transform 0.15s ease-out;
}

.modal-fade.show {
  opacity: 1;
  transform: scale(1);
}
```

### DON'T: Layout-Triggering Animations

```css
/* Bad: Forces reflow on every frame */
.slide-in {
  width: 0;
  transition: width 0.3s ease;
}

.slide-in.open {
  width: 300px; /* Triggers layout recalculation */
}
```

**Why this breaks:** Animating layout properties (width, height, top, left) causes expensive reflows. Stick to transform and opacity for smooth 60fps animations.

### Reduce Motion Preference

```css
/* Respect user's motion preferences */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Why this matters:** Users with vestibular disorders can experience nausea from animations. Always respect `prefers-reduced-motion`.

### Debounce Expensive Operations

```javascript
// Debounce file size calculation during multi-select
let debounceTimer;

$('#certifications').on('change', function() {
  clearTimeout(debounceTimer);
  
  debounceTimer = setTimeout(() => {
    calculateTotalFileSize();
  }, 150);
});
```

**Why debouncing matters:** Prevents excessive calculations during rapid user input. Use 150-300ms delays for non-critical updates.