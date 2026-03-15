# jQuery Workflows Reference

## Contents
- Adding a New Form Section with Conditional Logic
- Implementing a New AJAX Endpoint Call
- Adding File Upload Validation
- Creating Dynamic List Display
- Debugging jQuery and AJAX Issues

---

## Adding a New Form Section with Conditional Logic

**Scenario:** You need to add a new section that shows/hides based on a dropdown selection, following the existing pattern in `public/js/app.js`.

### Workflow Checklist

Copy this checklist and track progress:
- [ ] Add HTML section with unique ID and `d-none` class
- [ ] Add option to trigger dropdown (e.g., `#purpose`)
- [ ] Write change event handler in `app.js`
- [ ] Toggle visibility with `.addClass('d-none')` / `.removeClass('d-none')`
- [ ] Set/remove `required` attribute on conditional fields
- [ ] Test all combinations of dropdown values
- [ ] Verify form validation works when section is hidden

### Step-by-Step Example

**1. Add HTML Section (public/index.html)**

```html
<!-- Add after existing sections -->
<div id="previousExperienceSection" class="mb-4 d-none">
    <h5>Previous Experience</h5>
    <div class="mb-3">
        <label for="yearsExperience" class="form-label">Years of Experience</label>
        <input type="number" class="form-control" id="yearsExperience" min="0">
    </div>
</div>
```

**2. Add Trigger Option**

```html
<select class="form-select" id="purpose" name="purpose" required>
    <option value="">-- Select --</option>
    <option value="become-counselor">Become Merit Badge Counselor</option>
    <!-- Add new option -->
    <option value="update-experience">Update Previous Experience</option>
</select>
```

**3. Implement Event Handler (public/js/app.js)**

```javascript
// Add to existing #purpose change handler
$('#purpose').on('change', function() {
    const purpose = $(this).val();
    
    // Hide all conditional sections first
    $('#counselBadgesSection, #dropBadgesSection, #qualificationsSection, #previousExperienceSection').addClass('d-none');
    $('#badgesToCounsel, #badgesToDrop, #qualifications, #yearsExperience').removeAttr('required');
    
    // Show sections based on selection
    if (purpose === 'become-counselor' || purpose === 'change-add') {
        $('#counselBadgesSection, #qualificationsSection').removeClass('d-none');
        $('#badgesToCounsel, #qualifications').attr('required', true);
    }
    
    if (purpose === 'update-experience') {
        $('#previousExperienceSection').removeClass('d-none');
        $('#yearsExperience').attr('required', true);
    }
    
    // ... rest of existing conditions
});
```

**4. Validation Iteration Loop**

1. Select each dropdown option in browser
2. Verify correct sections show/hide
3. Try submitting form with empty required fields
4. Check that validation errors appear ONLY for visible sections
5. If validation fires for hidden fields, you forgot `.removeAttr('required')`
6. Repeat until all combinations pass

---

## Implementing a New AJAX Endpoint Call

**Scenario:** You need to call a new Express API endpoint and display the results.

### Workflow Checklist

- [ ] Verify endpoint exists and returns correct format (see **express** skill)
- [ ] Write AJAX call with success and error handlers
- [ ] Add loading state UI feedback
- [ ] Parse and display response data
- [ ] Handle error cases with user-friendly messages
- [ ] Test with network throttling (Chrome DevTools)
- [ ] Test with endpoint returning 500 error

### Step-by-Step Example

**Scenario:** Add endpoint to fetch application statistics.

**1. Create AJAX Function (public/js/app.js)**

```javascript
function loadStatistics() {
    // Show loading indicator
    $('#statsContainer').html('<div class="spinner-border" role="status"></div>');
    
    $.ajax({
        url: '/api/applications/statistics',
        method: 'GET',
        timeout: 5000, // 5 second timeout
        success: function(response) {
            if (response.success && response.stats) {
                displayStatistics(response.stats);
            } else {
                showError('Invalid statistics data received');
            }
        },
        error: function(xhr, status, error) {
            console.error('Statistics error:', status, error);
            
            let errorMessage = 'Failed to load statistics';
            if (status === 'timeout') {
                errorMessage = 'Request timed out. Please try again.';
            } else if (xhr.status === 404) {
                errorMessage = 'Statistics endpoint not found';
            } else if (xhr.responseJSON?.message) {
                errorMessage = xhr.responseJSON.message;
            }
            
            showError(errorMessage);
        }
    });
}

function displayStatistics(stats) {
    const html = `
        <div class="card">
            <div class="card-body">
                <h5>Applications Submitted: ${stats.total}</h5>
                <p>This month: ${stats.thisMonth}</p>
            </div>
        </div>
    `;
    $('#statsContainer').html(html);
}

function showError(message) {
    $('#statsContainer').html(`<div class="alert alert-danger">${message}</div>`);
}
```

**2. Call on Page Load**

```javascript
$(document).ready(function() {
    loadMeritBadges();
    setupFormListeners();
    loadStatistics(); // Add new call
});
```

**3. Testing Iteration**

1. Start server: `npm run dev`
2. Open browser DevTools Network tab
3. Reload page, verify `/api/applications/statistics` request
4. Check response format matches expected `{ success: true, stats: {...} }`
5. Simulate failure: Stop server, reload page
6. Verify error message displays in `#statsContainer`
7. Simulate timeout: Add `app.get('/api/applications/statistics', (req, res) => setTimeout(() => res.json(...), 10000))` in Express route
8. Verify timeout message after 5 seconds

---

## Adding File Upload Validation

**Scenario:** Add validation for specific file types or additional size checks.

### Workflow Checklist

- [ ] Determine validation rules (file types, size, count)
- [ ] Attach `change` event handler to file input
- [ ] Loop through `this.files` array
- [ ] Check each file's `.type`, `.size`, `.name`
- [ ] Display validation errors or file list
- [ ] Clear input if validation fails
- [ ] Match server-side validation (see routes/applications.js)

### Example: PDF-Only Validation

```javascript
$('#certifications').on('change', function() {
    const files = this.files;
    const maxFiles = 10;
    const maxSize = 31457280; // 30MB
    const allowedTypes = ['application/pdf'];
    
    // Validate file count
    if (files.length > maxFiles) {
        alert(`Maximum ${maxFiles} files allowed`);
        $(this).val('');
        return;
    }
    
    // Validate each file
    let totalSize = 0;
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Check file type
        if (!allowedTypes.includes(file.type)) {
            alert(`${file.name} is not a PDF file. Only PDFs are allowed.`);
            $(this).val('');
            return;
        }
        
        totalSize += file.size;
    }
    
    // Check total size
    if (totalSize > maxSize) {
        const sizeMB = (maxSize / 1024 / 1024).toFixed(0);
        alert(`Total file size exceeds ${sizeMB}MB limit`);
        $(this).val('');
        return;
    }
    
    // Display file list
    displayFileList(files);
});

function displayFileList(files) {
    let html = '<ul class="list-group">';
    for (let i = 0; i < files.length; i++) {
        const sizeMB = (files[i].size / 1024 / 1024).toFixed(2);
        html += `<li class="list-group-item">${files[i].name} (${sizeMB} MB)</li>`;
    }
    html += '</ul>';
    $('#fileList').html(html);
}
```

**Server-Side Match:** Update `routes/applications.js` fileFilter to match:

```javascript
const fileFilter = (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
        return cb(new Error('Only PDF files are allowed'), false);
    }
    cb(null, true);
};
```

---

## Creating Dynamic List Display

**Scenario:** Display a list of items fetched from the API with actions (view, edit, delete).

### Example: Display Recent Applications

```javascript
function loadRecentApplications() {
    $.ajax({
        url: '/api/applications/recent',
        method: 'GET',
        success: function(response) {
            if (response.success && response.applications) {
                displayApplicationsList(response.applications);
            }
        },
        error: function() {
            $('#applicationsList').html('<p class="text-danger">Failed to load applications</p>');
        }
    });
}

function displayApplicationsList(applications) {
    if (applications.length === 0) {
        $('#applicationsList').html('<p>No applications found</p>');
        return;
    }
    
    let html = '<div class="list-group">';
    applications.forEach(app => {
        html += `
            <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6>${app.first_name} ${app.last_name}</h6>
                        <small class="text-muted">${app.email}</small>
                    </div>
                    <button class="btn btn-sm btn-primary view-app" data-id="${app.id}">
                        View
                    </button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    $('#applicationsList').html(html);
}

// Event delegation for dynamically added buttons
$('#applicationsList').on('click', '.view-app', function() {
    const appId = $(this).data('id');
    viewApplication(appId);
});

function viewApplication(id) {
    $.ajax({
        url: `/api/applications/${id}`,
        method: 'GET',
        success: function(response) {
            if (response.success && response.application) {
                displayApplicationDetails(response.application);
            }
        }
    });
}
```

**Event Delegation Key:** Use `$('#applicationsList').on('click', '.view-app', ...)` instead of `$('.view-app').on('click', ...)` because buttons are added dynamically.

---

## Debugging jQuery and AJAX Issues

### Common Issues Checklist

When jQuery code isn't working:

- [ ] **Check browser console for errors** (F12 → Console tab)
- [ ] **Verify element selectors exist**: `console.log($('#elementId').length)` should be > 0
- [ ] **Check event handler attachment**: Add `console.log('Handler attached')` inside event function
- [ ] **Inspect AJAX request in Network tab**: Verify URL, method, payload
- [ ] **Check server logs**: Express should log incoming requests
- [ ] **Verify CORS headers** if calling from different domain
- [ ] **Test with simpler version**: Remove complexity until it works, then add back

### Debugging AJAX Failures

**1. Network Tab Analysis**

```
Open Chrome DevTools → Network tab
1. Check request URL: Does it match Express route?
2. Check request method: GET vs POST
3. Check request payload (for POST): Are FormData entries correct?
4. Check response status: 200, 400, 404, 500?
5. Check response body: Does it match expected format?
```

**2. Add Detailed Logging**

```javascript
$.ajax({
    url: '/api/applications',
    method: 'POST',
    data: formData,
    processData: false,
    contentType: false,
    beforeSend: function() {
        console.log('Sending request to /api/applications');
    },
    success: function(response) {
        console.log('Success response:', response);
    },
    error: function(xhr, status, error) {
        console.error('AJAX Error Details:');
        console.error('Status:', status);
        console.error('Error:', error);
        console.error('Response:', xhr.responseText);
        console.error('Status Code:', xhr.status);
    },
    complete: function() {
        console.log('Request completed');
    }
});
```

**3. FormData Debugging**

```javascript
const formData = new FormData(document.getElementById('applicationForm'));

// Log all FormData entries
for (let pair of formData.entries()) {
    console.log(pair[0], pair[1]);
}
```

**4. Select2 Value Issues**

```javascript
// If Select2 value is null/undefined
const badgeIds = $('#badgesToCounsel').val();
console.log('Badge IDs:', badgeIds); // Should be array like [1, 3, 5]

// If null, check:
// 1. Was Select2 initialized? $('#badgesToCounsel').hasClass('select2-hidden-accessible')
// 2. Are options populated? $('#badgesToCounsel option').length
// 3. Is element disabled? $('#badgesToCounsel').prop('disabled')
```

### Iterate Until Fixed

1. Identify the failing step (element not found, AJAX 404, validation failure)
2. Add logging before and after the failing step
3. Check assumptions (element exists, data is correct format, server is running)
4. Simplify: Remove complexity until it works
5. Add back one piece at a time until failure reproduces
6. Fix the specific issue identified
7. Verify fix with multiple test cases
8. Remove debug logging

---

## See Also

- [patterns](patterns.md) - Detailed code patterns and anti-patterns
- **express** skill - Server-side API endpoint implementation
- **bootstrap** skill - Form validation and styling integration