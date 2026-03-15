---
name: jquery
description: |
  Implements jQuery DOM manipulation, event handling, and AJAX requests.
  Use when: working with public/js/app.js, implementing form interactions, handling Select2 initialization, or making AJAX requests to the Express API.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__query-docs
---

# jQuery Skill

This application uses jQuery 3.x for frontend form interactions, Select2 initialization, AJAX form submission, and dynamic show/hide logic based on user selections. jQuery is loaded from CDN and works alongside Bootstrap 5 for validation and UI feedback.

## Quick Start

### Select2 Initialization Pattern

```javascript
// From public/js/app.js - Multi-select dropdown setup
$('#badgesToCounsel').select2({
    placeholder: 'Select merit badges you would like to counsel',
    allowClear: true,
    width: '100%'
});
```

### AJAX Form Submission with FormData

```javascript
// From public/js/app.js - Multipart form submission pattern
const formData = new FormData(document.getElementById('applicationForm'));
formData.append('badgesToCounsel', JSON.stringify($('#badgesToCounsel').val()));

$.ajax({
    url: '/api/applications',
    method: 'POST',
    data: formData,
    processData: false,
    contentType: false,
    success: function(response) {
        // Handle success
    }
});
```

### Conditional Field Visibility

```javascript
// From public/js/app.js - Show/hide sections based on select value
$('#isVolunteer').on('change', function() {
    if ($(this).val() === 'yes') {
        $('#volunteerFields').removeClass('d-none');
        $('#bsaMemberId, #district').attr('required', true);
    } else {
        $('#volunteerFields').addClass('d-none');
        $('#bsaMemberId, #district').removeAttr('required');
    }
});
```

## Key Concepts

| Concept | Usage | Example |
|---------|-------|---------|
| `$(selector)` | Select DOM elements | `$('#applicationForm')` |
| `.on('event', fn)` | Attach event handlers | `$('#purpose').on('change', handlePurpose)` |
| `.val()` | Get/set input values | `$('#badgesToCounsel').val()` |
| `.addClass/.removeClass` | Toggle Bootstrap classes | `$('#section').removeClass('d-none')` |
| `$.ajax()` | Make HTTP requests | `$.ajax({ url: '/api/merit-badges' })` |
| `.attr()` | Set element attributes | `$('#field').attr('required', true)` |

## Common Patterns

### Loading Data from API on Page Load

**When:** Populating Select2 dropdowns from database

```javascript
$(document).ready(function() {
    $.ajax({
        url: '/api/applications/merit-badges',
        method: 'GET',
        success: function(response) {
            if (response.success && response.badges) {
                const select = $('#badgesToCounsel');
                response.badges.forEach(badge => {
                    select.append(new Option(badge.name, badge.id));
                });
            }
        }
    });
});
```

### Form Validation Before AJAX Submit

**When:** Ensuring Bootstrap validation passes before submission

```javascript
const form = document.getElementById('applicationForm');
if (!form.checkValidity()) {
    form.classList.add('was-validated');
    return;
}
```

### Displaying Success/Error Messages

**When:** Showing feedback after AJAX operations

```javascript
function showMessage(message, type) {
    const alertDiv = $(`
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `);
    $('#messageContainer').html(alertDiv);
}
```

## WARNING: Common Anti-Patterns

### DON'T Use jQuery for FormData Construction

**The Problem:**
```javascript
// BAD - jQuery serialize() doesn't handle file uploads
const formData = $('#applicationForm').serialize();
$.ajax({
    url: '/api/applications',
    data: formData // Files are missing!
});
```

**Why This Breaks:**
1. `serialize()` only encodes text fields as URL-encoded strings
2. File inputs are completely ignored
3. Multipart/form-data boundary is not set
4. Server receives incomplete data without error

**The Fix:**
```javascript
// GOOD - Use native FormData for file uploads
const formData = new FormData(document.getElementById('applicationForm'));
$.ajax({
    url: '/api/applications',
    data: formData,
    processData: false,  // Don't convert to query string
    contentType: false   // Let browser set multipart boundary
});
```

### DON'T Nest AJAX Calls (Callback Hell)

**The Problem:**
```javascript
// BAD - Waterfall requests, hard to maintain
$.ajax({
    url: '/api/badges',
    success: function(badges) {
        $.ajax({
            url: '/api/districts',
            success: function(districts) {
                // Now we can render...
            }
        });
    }
});
```

**The Fix:**
```javascript
// GOOD - Parallel requests with Promise.all
Promise.all([
    $.ajax('/api/badges'),
    $.ajax('/api/districts')
]).then([badges, districts] => {
    // Both loaded simultaneously
});
```

## See Also

- [patterns](references/patterns.md) - Form handling, event delegation, Select2 integration
- [workflows](references/workflows.md) - Adding new form sections, implementing AJAX endpoints

## Related Skills

- **select2** - Multi-select dropdown initialization and configuration
- **bootstrap** - Form validation classes and component integration
- **express** - API endpoint structure that jQuery calls

## Documentation Resources

> Fetch latest jQuery documentation with Context7.

**How to use Context7:**
1. Use `mcp__context7__resolve-library-id` to search for "jquery"
2. **Prefer website documentation** (IDs starting with `/websites/`) over source code repositories when available
3. Query with `mcp__context7__query-docs` using the resolved library ID

**Library ID:** `/jquery/api` _(resolve using mcp__context7__resolve-library-id, prefer /websites/ when available)_

**Recommended Queries:**
- "jquery ajax file upload formdata"
- "jquery event delegation best practices"
- "jquery select2 integration"
- "jquery promise chaining ajax"