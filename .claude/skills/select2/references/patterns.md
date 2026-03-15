# Select2 Patterns Reference

## Contents
- Bootstrap 5 Theme Integration
- Data Loading and Initialization
- Multi-Instance Configuration
- Dynamic Form Control
- Validation Integration
- Anti-Patterns

---

## Bootstrap 5 Theme Integration

Select2 4.1.0 includes native Bootstrap 5 theme support. Always use `theme: 'bootstrap-5'` for consistent styling with the form.

```javascript
// GOOD - Bootstrap 5 theme with proper config
$('#badgesToCounsel').select2({
    theme: 'bootstrap-5',
    placeholder: 'Search and select badges...',
    allowClear: true,
    width: '100%'
});
```

```javascript
// BAD - Missing theme, Select2 uses default styling (clashes with Bootstrap)
$('#badgesToCounsel').select2({
    placeholder: 'Search and select badges...',
    allowClear: true
});
```

**Why the default theme breaks:**
1. **Visual inconsistency** - Default theme has different border radius, colors, font sizes
2. **Validation styling** - Bootstrap's `.is-invalid` class won't style Select2 correctly
3. **Responsive issues** - Default theme doesn't adapt to Bootstrap grid breakpoints

---

## Data Loading and Initialization

**CRITICAL:** Select2 must be initialized AFTER data is loaded from the API. Initialization with empty data shows a useless dropdown.

### Correct Initialization Sequence

```javascript
// From public/js/app.js
let meritBadges = [];

async function loadMeritBadges() {
    try {
        const response = await fetch('/api/applications/merit-badges');
        const result = await response.json();
        
        if (result.success) {
            meritBadges = result.badges; // Store globally
            initializeSelect2Dropdowns(); // Initialize AFTER data loads
        }
    } catch (error) {
        console.error('Error loading merit badges:', error);
        // Show user-friendly error
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

// Initialize on page load
$(document).ready(function() {
    loadMeritBadges();
    setupFormListeners();
});
```

### WARNING: Race Condition Anti-Pattern

```javascript
// BAD - Race condition, Select2 initializes before data arrives
$(document).ready(function() {
    loadMeritBadges(); // Async, doesn't block
    initializeSelect2Dropdowns(); // Runs immediately with empty meritBadges array
});
```

**Why this breaks:**
1. **Empty dropdown** - `meritBadges` is `[]` when `initializeSelect2Dropdowns()` runs
2. **No visual feedback** - User sees working dropdown but can't find any options
3. **Hard to debug** - Console shows no errors, dropdown "works" but has no data

---

## Multi-Instance Configuration

This form uses two Select2 instances: one for badges to counsel, one for badges to drop. Use a shared config object to ensure consistency.

```javascript
// GOOD - Shared config prevents inconsistency
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
```

```javascript
// BAD - Duplicated config, easy to desync
$('#badgesToCounsel').select2({
    theme: 'bootstrap-5',
    placeholder: 'Search and select badges...',
    allowClear: true,
    width: '100%',
    data: meritBadges.map(badge => ({id: badge.id, text: badge.name}))
});

$('#badgesToDrop').select2({
    theme: 'bootstrap-5',
    placeholder: 'Select badges to drop...', // Different placeholder!
    allowClear: true,
    width: '100%',
    data: meritBadges.map(badge => ({id: badge.id, text: badge.name}))
});
```

---

## Dynamic Form Control

Select2 dropdowns show/hide based on the selected purpose. When hiding, clear the value and remove validation to prevent form submission errors.

```javascript
// From public/js/app.js - Purpose change handler
$('#purpose').on('change', function() {
    const purpose = $(this).val();
    
    // Reset all sections
    $('#counselBadgesSection').hide();
    $('#dropBadgesSection').hide();
    $('#qualificationsSection').hide();
    
    // Clear Select2 selections and validation
    $('#badgesToCounsel').val(null).trigger('change').prop('required', false);
    $('#badgesToDrop').val(null).trigger('change').prop('required', false);
    
    // Show relevant sections
    if (purpose === 'counsel' || purpose === 'change') {
        $('#counselBadgesSection').show();
        $('#qualificationsSection').show();
        $('#badgesToCounsel').prop('required', true);
    }
    
    if (purpose === 'drop' || purpose === 'change') {
        $('#dropBadgesSection').show();
        $('#badgesToDrop').prop('required', true);
    }
});
```

### WARNING: Forgetting to Trigger Change Event

```javascript
// BAD - .val(null) doesn't notify Select2 of the change
$('#badgesToCounsel').val(null);
// Select2 still shows old selected values visually!

// GOOD - .trigger('change') updates Select2 display
$('#badgesToCounsel').val(null).trigger('change');
```

**Why `.trigger('change')` is required:**
- Select2 listens for `change` events to update its UI
- jQuery's `.val()` sets the underlying `<select>` value but doesn't fire events
- Without triggering change, the visual dropdown shows stale data while the form value is cleared

---

## Validation Integration

Bootstrap 5 validation requires special handling for Select2. The underlying `<select>` element is hidden, so validation feedback must be manually positioned.

```javascript
// Add validation styling to Select2 container
$('#applicationForm').on('submit', function(e) {
    // Let Bootstrap validate first
    if (!this.checkValidity()) {
        e.preventDefault();
        e.stopPropagation();
        
        // Add visual feedback to Select2 dropdowns
        if ($('#badgesToCounsel').prop('required') && !$('#badgesToCounsel').val()) {
            $('#badgesToCounsel').next('.select2-container')
                .addClass('is-invalid');
        }
    }
    
    $(this).addClass('was-validated');
});
```

### Form Submission Data Extraction

Select2 values must be extracted as arrays and sent as JSON strings in the multipart form data.

```javascript
// From public/js/app.js - Form submission
const formData = new FormData();

// Get selected badge IDs as arrays
const badgesToCounsel = $('#badgesToCounsel').val() || [];
const badgesToDrop = $('#badgesToDrop').val() || [];

// Send as JSON strings (parsed server-side in routes/applications.js)
formData.append('badgesToCounsel', JSON.stringify(badgesToCounsel));
formData.append('badgesToDrop', JSON.stringify(badgesToDrop));
```

**Server-side parsing (routes/applications.js:86-100):**

```javascript
// Parse badges arrays (sent as JSON strings from frontend)
let badgesToCounsel = [];
let badgesToDrop = [];

if (req.body.badgesToCounsel) {
    try {
        badgesToCounsel = JSON.parse(req.body.badgesToCounsel);
    } catch (e) {
        badgesToCounsel = [];
    }
}
```

---

## Anti-Patterns

### WARNING: Initializing Select2 Multiple Times

**The Problem:**

```javascript
// BAD - Re-initializing Select2 on an already-initialized element
function showCounselSection() {
    $('#counselBadgesSection').show();
    $('#badgesToCounsel').select2({theme: 'bootstrap-5'}); // BREAKS!
}
```

**Why This Breaks:**
1. **Memory leaks** - Each initialization creates new event listeners without removing old ones
2. **Visual glitches** - Multiple Select2 containers stack on top of each other
3. **Event duplication** - Click handlers fire multiple times

**The Fix:**

```javascript
// GOOD - Initialize once on page load, then show/hide the container
function showCounselSection() {
    $('#counselBadgesSection').show(); // Select2 already initialized
}

// Or destroy before re-initializing
function reinitializeSelect2() {
    $('#badgesToCounsel').select2('destroy'); // Clean up first
    $('#badgesToCounsel').select2({theme: 'bootstrap-5'});
}
```

### WARNING: Using Array Index as Badge ID

**The Problem:**

```javascript
// BAD - Array index as ID breaks when badges are added/removed from database
data: meritBadges.map((badge, index) => ({
    id: index,           // WRONG! Unstable ID
    text: badge.name
}))
```

**Why This Breaks:**
1. **Database mismatch** - Submitted IDs don't match merit_badges table primary keys
2. **Foreign key violations** - application_badges insertion fails
3. **Wrong badge saved** - If "Archery" moves from index 0 to 5, user selects wrong badge

**The Fix:**

```javascript
// GOOD - Use database ID from API response
data: meritBadges.map(badge => ({
    id: badge.id,        // Database primary key
    text: badge.name
}))