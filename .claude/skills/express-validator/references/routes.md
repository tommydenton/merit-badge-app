# Routes Validation Reference

## Contents
- Middleware Chain Order
- Multipart Form Validation
- Conditional Field Validation
- Error Handling Patterns
- Common Mistakes

## Middleware Chain Order

**CRITICAL:** Multer must run BEFORE express-validator for multipart/form-data routes.

```javascript
// DO - Correct order for file upload routes
router.post('/', 
    upload.array('certifications', 10),  // 1. Multer parses multipart
    validateApplication,                  // 2. Validator checks fields
    async (req, res, next) => { ... }    // 3. Route handler
);

// DON'T - Wrong order causes req.body to be undefined
router.post('/',
    validateApplication,                  // Runs before body is parsed!
    upload.array('certifications', 10),
    async (req, res, next) => { ... }
);
```

**Why order matters:** Express-validator reads from `req.body`, but multipart/form-data requires Multer to parse the body first. If validation runs before Multer, `req.body` is empty and all validations fail.

## Multipart Form Validation

### JSON Arrays in Form Data

**The Problem:** Multi-select inputs are sent as JSON strings in FormData.

```javascript
// Frontend sends (public/js/app.js):
formData.append('badgesToCounsel', JSON.stringify(['Archery', 'Camping']));

// Backend receives as STRING, not array
req.body.badgesToCounsel // '["Archery","Camping"]'
```

**The Fix:** Parse after validation, not during.

```javascript
// DO - Validate as string, parse in route handler
const validateApplication = [
    body('badgesToCounsel').optional().isString()
];

router.post('/', upload.array('certifications', 10), validateApplication, async (req, res) => {
    let badgesToCounsel = [];
    if (req.body.badgesToCounsel) {
        try {
            badgesToCounsel = JSON.parse(req.body.badgesToCounsel);
            // Additional validation after parsing
            if (!Array.isArray(badgesToCounsel)) {
                throw new Error('Invalid format');
            }
        } catch (e) {
            return res.status(400).json({
                success: false,
                message: 'Invalid badge selection format'
            });
        }
    }
});

// DON'T - Try to validate array before parsing
body('badgesToCounsel').isArray() // Always fails on JSON string
```

### File Upload Integration

```javascript
// DO - Validate file metadata after upload
router.post('/', upload.array('certifications', 10), validateApplication, async (req, res) => {
    // req.files populated by Multer before validation runs
    if (req.files && req.files.length > 10) {
        return res.status(400).json({
            success: false,
            message: 'Maximum 10 files allowed'
        });
    }
    
    const totalSize = req.files.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > 31457280) { // 30MB
        return res.status(400).json({
            success: false,
            message: 'Total file size exceeds 30MB'
        });
    }
});

// DON'T - Validate files in express-validator (it can't access req.files)
body('certifications').custom((value, { req }) => {
    // req.files not guaranteed to exist here
    return true;
})
```

## Conditional Field Validation

### Volunteer Status Dependencies

**Pattern:** BSA Member ID and District are required only when `isVolunteer === 'Yes'`.

```javascript
// DO - Use .if() for conditional validation
const validateApplication = [
    body('isVolunteer').notEmpty().withMessage('Please indicate if you are a BSA volunteer'),
    
    body('bsaMemberId')
        .if(body('isVolunteer').equals('Yes'))
        .trim()
        .notEmpty()
        .withMessage('BSA Member ID is required for registered volunteers')
        .isLength({ min: 5, max: 50 })
        .withMessage('BSA Member ID must be 5-50 characters'),
    
    body('district')
        .if(body('isVolunteer').equals('Yes'))
        .trim()
        .notEmpty()
        .withMessage('District selection is required for registered volunteers')
        .isIn([
            'Austin District', 'Balcones District', 'Bastrop District', 
            'Blanco River District', 'Bright Star District', 'Buffalo Trace District',
            'Capitol District', 'Central Texas District', 'Chisholm Trail District',
            'Circle Ten District', 'Colorado River District', 'Hill Country District',
            'Longhorn District', 'Tonkawa District'
        ])
        .withMessage('Please select a valid district')
];

// DON'T - Use optional() for conditionally required fields
body('bsaMemberId').optional({ checkFalsy: true }).trim()
// This allows empty values when isVolunteer === 'Yes'
```

**Why `.if()` beats `.optional()`:** `.optional()` makes fields truly optional, but conditional fields are **required when condition is met**. Use `.if()` to enforce requirement based on another field's value.

### Purpose-Based Validation

**Pattern:** Different purpose selections require different badge selections.

```javascript
// DO - Custom validator for complex business logic
body('purpose').custom((value, { req }) => {
    const needsCounselBadges = [
        'Become a Counselor',
        'Change/Add Badges',
        'Update Certifications'
    ].includes(value);
    
    const needsDropBadges = [
        'Drop Badges',
        'No Longer Wish to Serve'
    ].includes(value);
    
    if (needsCounselBadges) {
        const badges = req.body.badgesToCounsel;
        if (!badges || badges === '[]') {
            throw new Error('Please select at least one merit badge to counsel');
        }
    }
    
    if (needsDropBadges) {
        const badges = req.body.badgesToDrop;
        if (!badges || badges === '[]') {
            throw new Error('Please select at least one merit badge to drop');
        }
    }
    
    return true;
})

// DON'T - Try to use .if() with complex multi-field dependencies
body('badgesToCounsel')
    .if(body('purpose').equals('Become a Counselor'))
    .if(body('purpose').equals('Change/Add Badges'))
    // .if() doesn't support OR logic easily
```

## Error Handling Patterns

### Structured Error Responses

```javascript
// DO - Return field-mapped errors for frontend
const errors = validationResult(req);
if (!errors.isEmpty()) {
    return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array() // [{ field: 'email', msg: 'Invalid email', ... }]
    });
}

// Frontend can map to specific fields:
// errors.forEach(err => {
//     document.querySelector(`[name="${err.field}"]`).setCustomValidity(err.msg);
// });
```

### File Upload Error Cleanup

**CRITICAL:** Delete uploaded files on validation failure to prevent orphaned files.

```javascript
// DO - Clean up files when validation or processing fails
router.post('/', upload.array('certifications', 10), validateApplication, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Delete uploaded files
            if (req.files) {
                const fs = require('fs');
                req.files.forEach(file => {
                    fs.unlink(file.path, err => {
                        if (err) console.error('Error deleting file:', err);
                    });
                });
            }
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        
        // Process application...
        const result = await Application.create(applicationData);
        
    } catch (error) {
        // Also clean up on processing errors
        if (req.files) {
            const fs = require('fs');
            req.files.forEach(file => {
                fs.unlink(file.path, err => {
                    if (err) console.error('Error deleting file:', err);
                });
            });
        }
        next(error);
    }
});

// DON'T - Leave orphaned files on disk
if (!errors.isEmpty()) {
    return res.status(400).json({ ... });
    // Files remain in public/uploads forever
}
```

## Common Mistakes

### WARNING: Using .optional() Instead of .if()

**The Problem:**
```javascript
// BAD - Optional allows empty values even when required
body('bsaMemberId').optional({ checkFalsy: true }).trim()
```

**Why This Breaks:**
1. Field is skipped when empty, even if `isVolunteer === 'Yes'`
2. User can submit form without BSA ID when it should be required
3. Database receives NULL for required conditional fields

**The Fix:**
```javascript
// GOOD - Conditional validation enforces requirement
body('bsaMemberId')
    .if(body('isVolunteer').equals('Yes'))
    .trim()
    .notEmpty()
    .withMessage('BSA Member ID is required for registered volunteers')
```

### WARNING: Validating Before Body Parsing

**The Problem:**
```javascript
// BAD - Validator runs before multer
router.post('/', validateApplication, upload.array('certifications', 10), handler);
```

**Why This Breaks:**
1. `req.body` is undefined during validation
2. All validations fail with "field is required"
3. Cryptic errors for users

**When You Might Be Tempted:** When defining middleware arrays in the wrong order, or when copying route patterns from non-multipart routes.

### WARNING: Trusting JSON.parse Without Try-Catch

**The Problem:**
```javascript
// BAD - Crashes on malformed JSON
badgesToCounsel = JSON.parse(req.body.badgesToCounsel);
```

**Why This Breaks:**
1. Malformed JSON crashes the entire request
2. User gets 500 error instead of validation error
3. Uploaded files are orphaned (not cleaned up)

**Real-world scenario:** Attacker sends `badgesToCounsel: "['Archery'` (unterminated array) to crash the server.