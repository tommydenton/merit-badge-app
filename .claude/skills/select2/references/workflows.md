# Select2 Workflows Reference

## Contents
- Initial Setup Workflow
- Form Submission Workflow
- Dynamic Section Toggle Workflow
- Debugging Select2 Issues
- Adding New Dropdowns

---

## Initial Setup Workflow

### Complete Initialization Checklist

Copy this checklist when setting up Select2 on a new form:

- [ ] Include Select2 CSS in HTML `<head>`
- [ ] Include Select2 JS after jQuery
- [ ] Load data from API endpoint
- [ ] Wait for data load to complete
- [ ] Initialize Select2 with Bootstrap 5 theme
- [ ] Configure placeholder and allowClear
- [ ] Set up dynamic show/hide logic
- [ ] Add validation handling
- [ ] Test search functionality
- [ ] Test clear button
- [ ] Test form submission with selections

### Step-by-Step Setup

**1. Include Dependencies (public/index.html)**

```html
<head>
    <!-- jQuery (required for Select2) -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    
    <!-- Select2 CSS -->
    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
    <link href="https://cdn.jsdelivr.net/npm/select2-bootstrap-5-theme@1.3.0/dist/select2-bootstrap-5-theme.min.css" rel="stylesheet" />
    
    <!-- Select2 JS -->
    <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
</head>
```

**2. Create HTML Select Elements**

```html
<!-- Merit badges to counsel -->
<div id="counselBadgesSection" style="display: none;">
    <label for="badgesToCounsel" class="form-label">Merit Badges to Counsel</label>
    <select id="badgesToCounsel" name="badgesToCounsel" class="form-select" multiple>
        <!-- Options populated via JavaScript -->
    </select>
</div>
```

**3. Load Data and Initialize (public/js/app.js)**

```javascript
let meritBadges = [];

async function loadMeritBadges() {
    try {
        const response = await fetch('/api/applications/merit-badges');
        const result = await response.json();
        
        if (!result.success) {
            throw new Error('API returned success: false');
        }
        
        meritBadges = result.badges;
        initializeSelect2Dropdowns();
        
    } catch (error) {
        console.error('Error loading merit badges:', error);
        alert('Failed to load merit badges. Please refresh the page.');
    }
}

function initializeSelect2Dropdowns() {
    const config = {
        theme: 'bootstrap-5',
        placeholder: 'Search and select badges...',
        allowClear: true,
        width: '100%',
        data: meritBadges.map(badge => ({
            id: badge.id,
            text: badge.name
        }))
    };
    
    $('#badgesToCounsel').select2(config);
    $('#badgesToDrop').select2(config);
}

$(document).ready(function() {
    loadMeritBadges();
});
```

**4. Validate Setup**

Run these checks in browser console:

```javascript
// Check if Select2 is loaded
typeof $.fn.select2 !== 'undefined' // Should be true

// Check if data loaded
meritBadges.length > 0 // Should be true (150+ badges)

// Check if Select2 initialized
$('#badgesToCounsel').hasClass('select2-hidden-accessible') // Should be true
```

If validation fails, check:
- [ ] jQuery loaded before Select2
- [ ] No console errors during initialization
- [ ] API endpoint `/api/applications/merit-badges` returns data
- [ ] Network tab shows successful 200 response

---

## Form Submission Workflow

### Extract and Submit Select2 Values

**1. Extract Selected Values on Form Submit**

```javascript
$('#applicationForm').on('submit', async function(e) {
    e.preventDefault();
    
    // Extract Select2 values as arrays
    const badgesToCounsel = $('#badgesToCounsel').val() || [];
    const badgesToDrop = $('#badgesToDrop').val() || [];
    
    // Build FormData for multipart upload
    const formData = new FormData(this);
    
    // Append as JSON strings (parsed server-side)
    formData.append('badgesToCounsel', JSON.stringify(badgesToCounsel));
    formData.append('badgesToDrop', JSON.stringify(badgesToDrop));
    
    // Submit via AJAX
    try {
        const response = await fetch('/api/applications', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Application submitted successfully!');
            $('#applicationForm')[0].reset();
            $('#badgesToCounsel').val(null).trigger('change');
            $('#badgesToDrop').val(null).trigger('change');
        }
    } catch (error) {
        console.error('Submission error:', error);
        alert('Failed to submit application.');
    }
});
```

**2. Server-Side Parsing (routes/applications.js)**

See the **express** skill for full route implementation. Key parsing logic:

```javascript
// Parse JSON strings from FormData
let badgesToCounsel = [];
if (req.body.badgesToCounsel) {
    try {
        badgesToCounsel = JSON.parse(req.body.badgesToCounsel);
    } catch (e) {
        badgesToCounsel = [];
    }
}

// Save to database via Application model
const result = await Application.create({
    // ... other fields
    badgesToCounsel, // Array of badge IDs
    badgesToDrop
});
```

**3. Database Storage (models/Application.js)**

Badge IDs are stored in the `application_badges` junction table:

```javascript
// Insert badges to counsel
for (const badgeId of data.badgesToCounsel) {
    await connection.query(
        'INSERT INTO application_badges (application_id, merit_badge_id, badge_type) VALUES (?, ?, ?)',
        [applicationId, badgeId, 'counsel']
    );
}
```

---

## Dynamic Section Toggle Workflow

### Show/Hide Dropdowns Based on Purpose

**Workflow:** User selects application purpose → relevant Select2 dropdowns show/hide → validation requirements update

```javascript
$('#purpose').on('change', function() {
    const purpose = $(this).val();
    
    // 1. Hide all sections initially
    $('#counselBadgesSection').hide();
    $('#dropBadgesSection').hide();
    $('#qualificationsSection').hide();
    
    // 2. Clear Select2 values and remove required attribute
    $('#badgesToCounsel').val(null).trigger('change').prop('required', false);
    $('#badgesToDrop').val(null).trigger('change').prop('required', false);
    $('#qualifications').prop('required', false);
    
    // 3. Show sections based on purpose
    if (purpose === 'counsel' || purpose === 'change') {
        $('#counselBadgesSection').show();
        $('#qualificationsSection').show();
        $('#badgesToCounsel').prop('required', true);
        $('#qualifications').prop('required', true);
    }
    
    if (purpose === 'drop' || purpose === 'change') {
        $('#dropBadgesSection').show();
        $('#badgesToDrop').prop('required', true);
    }
    
    // 4. Remove validation styling
    $('#badgesToCounsel').next('.select2-container').removeClass('is-invalid');
    $('#badgesToDrop').next('.select2-container').removeClass('is-invalid');
});
```

**Purpose Options:**

| Purpose | Shows Counsel Badges | Shows Drop Badges | Shows Qualifications |
|---------|---------------------|-------------------|---------------------|
| `counsel` | ✓ | ✗ | ✓ |
| `drop` | ✗ | ✓ | ✗ |
| `change` | ✓ | ✓ | ✓ |
| `update` | ✗ | ✗ | ✓ |
| `question` | ✗ | ✗ | ✗ |
| `no_longer_serve` | ✗ | ✗ | ✗ |

**Testing Checklist:**

- [ ] "Become Counselor" shows counsel badges + qualifications
- [ ] "Drop Badges" shows only drop badges
- [ ] "Change/Add Badges" shows both counsel and drop badges + qualifications
- [ ] Hidden dropdowns don't trigger required validation
- [ ] Switching purposes clears previous selections
- [ ] Form submits successfully with each purpose option

---

## Debugging Select2 Issues

### Common Problems and Solutions

**Problem: Dropdown shows but has no options**

**Diagnose:**

```javascript
// 1. Check if data loaded
console.log('Merit badges:', meritBadges);
// Should show array of 150+ objects with {id, name}

// 2. Check Select2 data
console.log('Select2 data:', $('#badgesToCounsel').select2('data'));
// Should show array of {id, text} objects

// 3. Check API response
fetch('/api/applications/merit-badges')
    .then(r => r.json())
    .then(console.log);
// Should show {success: true, badges: [...]}
```

**Fix:**

1. Verify API endpoint is running and returns 200 status
2. Check `loadMeritBadges()` was called and completed
3. Ensure `initializeSelect2Dropdowns()` ran AFTER data loaded
4. Look for console errors during fetch or initialization

---

**Problem: Select2 styling doesn't match Bootstrap**

**Diagnose:**

```javascript
// Check theme setting
console.log($('#badgesToCounsel').data('select2').options.options.theme);
// Should be 'bootstrap-5'
```

**Fix:**

```javascript
// Destroy and re-initialize with correct theme
$('#badgesToCounsel').select2('destroy');
$('#badgesToCounsel').select2({
    theme: 'bootstrap-5',
    // ... other options
});
```

---

**Problem: Validation doesn't show on Select2**

**Diagnose:**

```html
<!-- Inspect the DOM - Select2 hides the original <select> -->
<select id="badgesToCounsel" class="form-select select2-hidden-accessible" required>
</select>
<!-- The actual visible element is: -->
<span class="select2-container ..."></span>
```

**Fix:**

```javascript
// Manually add .is-invalid to Select2 container
if ($('#badgesToCounsel').prop('required') && !$('#badgesToCounsel').val()) {
    $('#badgesToCounsel').next('.select2-container').addClass('is-invalid');
} else {
    $('#badgesToCounsel').next('.select2-container').removeClass('is-invalid');
}
```

---

**Problem: Form submits but badges not saved to database**

**Diagnose:**

```javascript
// Check FormData contents
const formData = new FormData($('#applicationForm')[0]);
for (let pair of formData.entries()) {
    console.log(pair[0] + ': ' + pair[1]);
}
// Should see: badgesToCounsel: [1,5,12] (as JSON string)
```

**Server-side diagnosis (routes/applications.js):**

```javascript
// Add logging in POST /api/applications route
console.log('Raw body:', req.body.badgesToCounsel);
console.log('Parsed:', badgesToCounsel);
// Should see JSON string, then parsed array
```

**Fix:**

1. Ensure FormData appends JSON strings: `JSON.stringify(badgesToCounsel)`
2. Verify server-side parsing with `JSON.parse()`
3. Check for SQL errors in Application.create() method
4. Verify merit_badge_id values exist in merit_badges table

---

## Adding New Dropdowns

### Workflow: Add a New Select2 Dropdown

**Scenario:** Add a "Districts" dropdown to filter counselors by district.

**1. Create API Endpoint**

See the **express** skill for route creation. Add to `routes/applications.js`:

```javascript
router.get('/districts', async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT id, name FROM districts ORDER BY name');
        res.json({success: true, districts: rows});
    } catch (error) {
        next(error);
    }
});
```

**2. Add HTML Element**

```html
<div class="mb-3">
    <label for="district" class="form-label">District</label>
    <select id="district" name="district" class="form-select">
        <option value="">Choose...</option>
    </select>
</div>
```

**3. Load Data and Initialize**

```javascript
let districts = [];

async function loadDistricts() {
    try {
        const response = await fetch('/api/applications/districts');
        const result = await response.json();
        if (result.success) {
            districts = result.districts;
            initializeDistrictDropdown();
        }
    } catch (error) {
        console.error('Error loading districts:', error);
    }
}

function initializeDistrictDropdown() {
    $('#district').select2({
        theme: 'bootstrap-5',
        placeholder: 'Select your district...',
        allowClear: true,
        width: '100%',
        data: districts.map(d => ({id: d.id, text: d.name}))
    });
}

$(document).ready(function() {
    loadMeritBadges();
    loadDistricts();
});
```

**4. Test Workflow**

- [ ] API returns district data
- [ ] Dropdown populates on page load
- [ ] Search filters districts
- [ ] Clear button resets selection
- [ ] Form submits selected district ID
- [ ] Server receives correct district value