# jQuery Patterns Reference

## Contents
- Form Initialization and Validation
- AJAX Request Patterns
- Event Delegation and Dynamic Elements
- Select2 Integration Patterns
- Conditional Field Logic
- Error Handling and User Feedback

---

## Form Initialization and Validation

### Document Ready Pattern

```javascript
// From public/js/app.js - Standard initialization
$(document).ready(function() {
    loadMeritBadges();
    setupFormListeners();
    initializeSelect2();
});
```

**Why:** Ensures DOM is fully loaded before attaching event handlers. All jQuery code in this project follows this pattern.

### Bootstrap Validation Integration

```javascript
// DO - Use native HTML5 validation with Bootstrap classes
const form = document.getElementById('applicationForm');
if (!form.checkValidity()) {
    form.classList.add('was-validated');
    return false;
}

// DON'T - Reimplement validation in jQuery
// BAD - Duplicates browser validation, out of sync with HTML
if ($('#firstName').val() === '') {
    alert('First name required');
    return false;
}
```

**Why DON'T Breaks:**
- Duplicates validation logic already in HTML `required` attributes
- Bootstrap `.was-validated` class provides visual feedback automatically
- Browser native validation handles edge cases (email format, number ranges)

### File Upload Size Validation

```javascript
// From public/js/app.js - Real-time file size checking
$('#certifications').on('change', function() {
    const files = this.files;
    let totalSize = 0;
    
    for (let i = 0; i < files.length; i++) {
        totalSize += files[i].size;
    }
    
    const maxSize = 31457280; // 30MB
    if (totalSize > maxSize) {
        alert('Total file size exceeds 30MB limit');
        $(this).val(''); // Clear selection
    }
});
```

**Why:** Server has MAX_FILE_SIZE limit enforced by Multer. Client-side validation prevents wasted upload time.

---

## AJAX Request Patterns

### GET Request with Error Handling

```javascript
// DO - Handle both success and error cases
$.ajax({
    url: '/api/applications/merit-badges',
    method: 'GET',
    success: function(response) {
        if (response.success) {
            populateBadgeDropdowns(response.badges);
        } else {
            showMessage('Failed to load merit badges', 'danger');
        }
    },
    error: function(xhr, status, error) {
        console.error('Error loading merit badges:', error);
        showMessage('Network error loading merit badges', 'danger');
    }
});

// DON'T - Ignore error handling
// BAD - User sees nothing if request fails
$.get('/api/merit-badges', function(data) {
    populateBadgeDropdowns(data.badges);
});
```

**Why DON'T Breaks:**
1. Network failures leave dropdowns empty with no explanation
2. Server errors (500) are silent, users think page is broken
3. No way to debug issues in production

### POST Request with File Upload (Multipart)

```javascript
// DO - Use FormData for file uploads
const formData = new FormData(document.getElementById('applicationForm'));

// Append JSON-stringified arrays (Express expects this format)
formData.append('badgesToCounsel', JSON.stringify($('#badgesToCounsel').val()));
formData.append('badgesToDrop', JSON.stringify($('#badgesToDrop').val()));

$.ajax({
    url: '/api/applications',
    method: 'POST',
    data: formData,
    processData: false,  // CRITICAL: Don't convert to query string
    contentType: false,  // CRITICAL: Let browser set multipart boundary
    success: function(response) {
        showMessage(response.message, 'success');
        $('#applicationForm')[0].reset();
    },
    error: function(xhr) {
        const error = xhr.responseJSON?.message || 'Submission failed';
        showMessage(error, 'danger');
    }
});

// DON'T - Use $.post or serialize() with files
// BAD - Files are ignored, server gets incomplete data
$.post('/api/applications', $('#applicationForm').serialize(), function(response) {
    // This will fail silently - no certifications uploaded
});
```

**Why processData: false and contentType: false Matter:**
- `processData: false` prevents jQuery from converting FormData to URL-encoded string (which strips files)
- `contentType: false` lets the browser set `Content-Type: multipart/form-data; boundary=...`
- Without these, Express Multer middleware won't parse the request

### Parallel AJAX Requests

```javascript
// DO - Load independent data simultaneously
function initializeForm() {
    Promise.all([
        $.ajax('/api/applications/merit-badges'),
        $.ajax('/api/districts') // If this endpoint existed
    ]).then(function([badgesResponse, districtsResponse]) {
        populateBadgeDropdowns(badgesResponse.badges);
        populateDistrictDropdown(districtsResponse.districts);
    }).catch(function(error) {
        console.error('Error loading form data:', error);
    });
}

// DON'T - Sequential requests (waterfall)
// BAD - Takes 2x as long, delays page load
$.ajax('/api/merit-badges', {
    success: function(badges) {
        populateBadgeDropdowns(badges);
        $.ajax('/api/districts', {
            success: function(districts) {
                populateDistrictDropdown(districts);
            }
        });
    }
});
```

**Performance Impact:** Sequential requests block each other. For two 200ms requests, sequential takes 400ms, parallel takes 200ms.

---

## Event Delegation and Dynamic Elements

### Event Delegation for Dynamic Content

```javascript
// DO - Use event delegation on parent container
$('#messageContainer').on('click', '.alert .btn-close', function() {
    $(this).closest('.alert').remove();
});

// DON'T - Attach directly to dynamic elements
// BAD - Event handler won't exist when alert is added later
$('.alert .btn-close').on('click', function() {
    $(this).closest('.alert').remove();
});
```

**Why:** Alert messages are added dynamically after AJAX responses. Direct event binding only works for elements that exist at page load.

### Conditional Field Visibility with Required Attributes

```javascript
// From public/js/app.js - Volunteer status toggle
$('#isVolunteer').on('change', function() {
    const isVolunteer = $(this).val() === 'yes';
    
    if (isVolunteer) {
        $('#volunteerFields').removeClass('d-none');
        $('#bsaMemberId, #district').attr('required', true);
        $('#warningMessage').addClass('d-none');
    } else {
        $('#volunteerFields').addClass('d-none');
        $('#bsaMemberId, #district').removeAttr('required');
        $('#warningMessage').removeClass('d-none');
    }
});
```

**Critical:** When hiding fields, REMOVE `required` attribute or form validation will fail on hidden fields.

---

## Select2 Integration Patterns

See the **select2** skill for detailed Select2 configuration.

### Basic Multi-Select Initialization

```javascript
// From public/js/app.js
$('#badgesToCounsel').select2({
    placeholder: 'Select merit badges you would like to counsel',
    allowClear: true,
    width: '100%'
});
```

### Populating Select2 After AJAX

```javascript
function loadMeritBadges() {
    $.ajax({
        url: '/api/applications/merit-badges',
        method: 'GET',
        success: function(response) {
            if (response.success && response.badges) {
                const counselSelect = $('#badgesToCounsel');
                const dropSelect = $('#badgesToDrop');
                
                // Populate both dropdowns
                response.badges.forEach(badge => {
                    const option = new Option(badge.name, badge.id);
                    counselSelect.append(option);
                    dropSelect.append($(option).clone());
                });
                
                // Initialize Select2 AFTER populating
                counselSelect.select2({ /* config */ });
                dropSelect.select2({ /* config */ });
            }
        }
    });
}
```

**Order Matters:** Always populate `<select>` options BEFORE calling `.select2()`, or re-trigger with `.select2('destroy').select2({ /* config */ })`.

### Getting Select2 Values

```javascript
// DO - Use jQuery .val() on original element
const selectedBadges = $('#badgesToCounsel').val(); // Returns array of IDs

// DON'T - Query Select2 container elements
// BAD - Returns display text, not values
const badgeText = $('.select2-selection__rendered').text();
```

---

## Conditional Field Logic

### Purpose Selection Handler

```javascript
// From public/js/app.js - Show/hide sections based on purpose
$('#purpose').on('change', function() {
    const purpose = $(this).val();
    
    // Hide all sections first
    $('#counselBadgesSection, #dropBadgesSection, #qualificationsSection').addClass('d-none');
    
    // Show relevant sections
    if (purpose === 'become-counselor' || purpose === 'change-add') {
        $('#counselBadgesSection, #qualificationsSection').removeClass('d-none');
        $('#badgesToCounsel').attr('required', true);
    }
    
    if (purpose === 'drop-badges' || purpose === 'change-add') {
        $('#dropBadgesSection').removeClass('d-none');
        $('#badgesToDrop').attr('required', true);
    }
});
```

**Pattern:** Always hide ALL sections first, then conditionally show. Prevents leftover visible sections from previous selections.

---

## Error Handling and User Feedback

### Display Alert Messages

```javascript
function showMessage(message, type) {
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    $('#messageContainer').html(alertHtml);
    
    // Scroll to message
    $('html, body').animate({ scrollTop: 0 }, 300);
}
```

**Types:** Use Bootstrap alert types: `success`, `danger`, `warning`, `info`.

### Loading State During AJAX

```javascript
$('#submitButton').on('click', function(e) {
    e.preventDefault();
    
    const $button = $(this);
    const originalText = $button.html();
    
    // Show loading spinner
    $button.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> Submitting...');
    
    $.ajax({
        url: '/api/applications',
        method: 'POST',
        data: formData,
        complete: function() {
            // Restore button state regardless of success/failure
            $button.prop('disabled', false).html(originalText);
        }
    });
});
```

**Why `complete` not `success`:** Restores button even if request fails, allowing retry.

---

## See Also

- [workflows](workflows.md) - Step-by-step guides for common tasks
- **bootstrap** skill - Form validation and component styling
- **express** skill - API endpoint structure