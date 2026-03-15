---
name: select2
description: |
  Configures Select2 multi-select dropdowns with AJAX data loading and search functionality for merit badge selection.
  Use when: implementing multi-select dropdowns for merit badges, adding searchable dropdowns, configuring Select2 with Bootstrap 5, loading data from API endpoints
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__query-docs
---

# Select2 Skill

Select2 provides enhanced multi-select dropdowns for merit badge selection in this Bootstrap 5 application. The implementation loads 150+ merit badges via AJAX from `/api/applications/merit-badges` and integrates with Bootstrap's validation and styling system. Select2 is initialized in `public/js/app.js` after DOM load and populated dynamically based on form purpose selection.

## Quick Start

### Basic Multi-Select Initialization

```javascript
// From public/js/app.js - Initialize Select2 with AJAX data loading
$('#badgesToCounsel').select2({
    theme: 'bootstrap-5',
    placeholder: 'Search and select badges...',
    allowClear: true,
    width: '100%',
    data: meritBadges.map(badge => ({
        id: badge.id,
        text: badge.name
    }))
});
```

### AJAX Data Loading Pattern

```javascript
// Load merit badges from API on page load
async function loadMeritBadges() {
    try {
        const response = await fetch('/api/applications/merit-badges');
        const result = await response.json();
        
        if (result.success) {
            meritBadges = result.badges;
            initializeSelect2Dropdowns();
        }
    } catch (error) {
        console.error('Error loading merit badges:', error);
    }
}
```

## Key Concepts

| Concept | Usage | Example |
|---------|-------|---------|
| Theme | Bootstrap 5 integration | `theme: 'bootstrap-5'` |
| Data format | Array of {id, text} objects | `{id: 1, text: 'Archery'}` |
| Placeholder | Search hint text | `placeholder: 'Search and select badges...'` |
| AllowClear | Show × to clear selection | `allowClear: true` |
| Width | Responsive sizing | `width: '100%'` |

## Common Patterns

### Initialize After Data Load

**When:** Merit badges must be loaded from API before Select2 initialization

```javascript
// GOOD - Initialize Select2 after data is available
async function setupForm() {
    await loadMeritBadges();
    initializeSelect2Dropdowns();
    setupFormListeners();
}

// BAD - Select2 initialized before data loads
$('#badgesToCounsel').select2(); // Empty dropdown!
loadMeritBadges(); // Too late
```

### Multiple Select2 Instances

**When:** Form has separate dropdowns for counseling vs dropping badges

```javascript
// Initialize both dropdowns with same data
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

### Dynamic Show/Hide with Validation

**When:** Select2 dropdowns must show/hide based on purpose selection

```javascript
// Show/hide sections and clear validation when toggling
if (purpose === 'counsel' || purpose === 'change') {
    $('#counselBadgesSection').show();
    $('#badgesToCounsel').prop('required', true);
} else {
    $('#counselBadgesSection').hide();
    $('#badgesToCounsel').prop('required', false).val(null).trigger('change');
}
```

## See Also

- [patterns](references/patterns.md) - Select2 configuration patterns from this codebase
- [workflows](references/workflows.md) - Form setup and submission workflows

## Related Skills

- **bootstrap** - For Bootstrap 5 theme integration and validation styling
- **jquery** - For DOM manipulation and event handling with Select2
- **express** - For API endpoint serving merit badge data

## Documentation Resources

> Fetch latest Select2 documentation with Context7.

**How to use Context7:**
1. Use `mcp__context7__resolve-library-id` to search for "select2"
2. **Prefer website documentation** (IDs starting with `/websites/`) over source code repositories when available
3. Query with `mcp__context7__query-docs` using the resolved library ID

**Library ID:** `/select2/select2` _(resolve using mcp__context7__resolve-library-id, prefer /websites/ when available)_

**Recommended Queries:**
- "select2 bootstrap theme integration"
- "select2 ajax data loading"
- "select2 programmatic control"
- "select2 placeholder and allowClear options"