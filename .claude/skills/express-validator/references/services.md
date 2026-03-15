# Services Validation Reference

## Contents
- Business Logic Validation
- Data Type Conversion
- Sanitization Patterns
- Cross-Field Validation
- Pre-Database Validation

## Business Logic Validation

Express-validator handles **input format** validation. Business logic validation happens in route handlers before database operations.

### Age Restriction Enforcement

```javascript
// routes/applications.js - Format validation
body('age').isInt({ min: 18 }).withMessage('Age must be at least 18')

// DO - Additional business logic in handler
router.post('/', upload.array('certifications', 10), validateApplication, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    // Business rule: Age must be exactly 18-120
    const age = parseInt(req.body.age);
    if (age < 18 || age > 120) {
        return res.status(400).json({
            success: false,
            message: 'Age must be between 18 and 120 years'
        });
    }
    
    // Continue processing...
});

// DON'T - Put business logic in validation middleware
body('age').custom(async (value, { req }) => {
    // This runs during validation phase, can't access other business context
    if (parseInt(value) > 120) {
        throw new Error('Age too high');
    }
    return true;
});
```

**Why separate:** Business logic often needs database lookups, external API calls, or complex cross-field checks that shouldn't block validation phase.

### Email Uniqueness Checks

```javascript
// DON'T - Async database checks in validation middleware
body('email').custom(async (email) => {
    const existing = await pool.query('SELECT id FROM applications WHERE email = ?', [email]);
    if (existing[0].length > 0) {
        throw new Error('Email already registered');
    }
    return true;
});

// DO - Check uniqueness in route handler after validation
router.post('/', upload.array('certifications', 10), validateApplication, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    // Business logic: Check email uniqueness
    const [existing] = await pool.query(
        'SELECT id FROM applications WHERE email = ?',
        [req.body.email]
    );
    
    if (existing.length > 0) {
        return res.status(409).json({
            success: false,
            message: 'An application with this email already exists'
        });
    }
    
    // Continue with insertion...
});
```

**Why this matters:** Database checks add latency. Run fast format validations first to fail quickly, then do expensive uniqueness checks.

## Data Type Conversion

### Boolean Field Handling

**The Problem:** HTML forms send "Yes"/"No" strings, database expects 0/1 integers.

```javascript
// routes/applications.js - Validate as string
body('isVolunteer').notEmpty().withMessage('Please indicate if you are a BSA volunteer')

// models/Application.js - Convert during insertion
applicationData.isVolunteer === 'Yes' ? 1 : 0

// DO - Explicit conversion with validation
router.post('/', upload.array('certifications', 10), validateApplication, async (req, res) => {
    const isVolunteer = req.body.isVolunteer === 'Yes';
    
    const applicationData = {
        // ... other fields
        isVolunteer, // Boolean for model
        // ... other fields
    };
    
    await Application.create(applicationData);
});

// DON'T - Trust string directly in database
await connection.query(
    'INSERT INTO applications (is_bsa_volunteer) VALUES (?)',
    [req.body.isVolunteer] // "Yes" → 1 in MySQL, but implicit conversion is fragile
);
```

### Null vs Empty String

**CRITICAL:** Optional fields must be explicitly converted to NULL for SQL.

```javascript
// models/Application.js - Correct NULL handling
await connection.query(
    `INSERT INTO applications
    (first_name, last_name, phone, bsa_member_id, district, qualifications, additional_info)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
        applicationData.firstName,        // Required, never null
        applicationData.lastName,         // Required, never null
        applicationData.phone || null,    // Optional → NULL if empty
        applicationData.bsaMemberId || null,
        applicationData.district || null,
        applicationData.qualifications || null,
        applicationData.additionalInfo || null
    ]
);

// DON'T - Insert empty strings into nullable columns
applicationData.phone, // Empty string → '' in MySQL, breaks JOIN optimizations
```

**Why NULL matters:**
1. Empty strings take more storage than NULL
2. NULL has semantic meaning (unknown/not applicable)
3. Indexes work better with NULL than empty strings
4. Queries like `WHERE phone IS NULL` are faster than `WHERE phone = ''`

## Sanitization Patterns

### Trim Before Validate

```javascript
// DO - Trim before other validations
body('firstName').trim().notEmpty().withMessage('First name is required')

// DON'T - Validate before trimming
body('firstName').notEmpty().trim() // " " passes notEmpty check
```

**Why order matters:** `.notEmpty()` on untrimmed input allows whitespace-only values.

### Email Normalization

```javascript
// DO - Use normalizeEmail for consistent storage
body('email').isEmail().normalizeEmail().withMessage('Valid email is required')

// Result: "User@Example.COM" → "user@example.com"
```

**Normalization prevents:**
- Duplicate applications with different email casing
- SMTP case-sensitivity issues
- User confusion ("I already registered!")

### Phone Number Sanitization

```javascript
// DO - Accept multiple formats, store consistently
body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[\d\s\(\)\-\+]+$/)
    .withMessage('Phone must contain only digits, spaces, and () - +')

// In route handler: Further sanitization
const sanitizedPhone = req.body.phone
    ? req.body.phone.replace(/[\s\(\)\-]/g, '') // Remove formatting
    : null;

// Store: "5125551234" instead of "(512) 555-1234"

// DON'T - Store formatted input directly
applicationData.phone = req.body.phone; // Stores "(512) 555-1234"
```

**Why sanitize phone numbers:**
- Consistent querying (`WHERE phone = ?` works reliably)
- Format once on display, not on storage
- Avoid duplicate checks failing due to formatting differences

## Cross-Field Validation

### Purpose and Badge Selection

**Business Rule:** If purpose is "Become a Counselor", at least one badge to counsel is required.

```javascript
// DO - Custom validator with cross-field logic
body('purpose').custom((purpose, { req }) => {
    const requiresCounsel = [
        'Become a Counselor',
        'Change/Add Badges'
    ].includes(purpose);
    
    if (requiresCounsel) {
        const badges = req.body.badgesToCounsel;
        // Remember: JSON string from multipart form
        if (!badges || badges === '[]') {
            throw new Error('Please select at least one merit badge to counsel for this purpose');
        }
        
        // Validate JSON structure
        try {
            const parsed = JSON.parse(badges);
            if (!Array.isArray(parsed) || parsed.length === 0) {
                throw new Error('Invalid badge selection');
            }
        } catch (e) {
            throw new Error('Invalid badge selection format');
        }
    }
    
    return true;
});

// DON'T - Separate validations can't reference each other
body('purpose').isIn(['Become a Counselor', 'Drop Badges', ...]),
body('badgesToCounsel').notEmpty() // Always required, wrong logic
```

### File Upload and Purpose Validation

**Business Rule:** "Update Certifications" requires at least one file upload.

```javascript
// DO - Validate files in route handler (req.files populated by Multer)
router.post('/', upload.array('certifications', 10), validateApplication, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    // Cross-field validation with files
    if (req.body.purpose === 'Update Certifications') {
        if (!req.files || req.files.length === 0) {
            // Clean up any uploaded files (defensive)
            return res.status(400).json({
                success: false,
                message: 'Please upload at least one certification file when updating certifications'
            });
        }
    }
    
    // Continue processing...
});

// DON'T - Try to validate req.files in express-validator
body('purpose').custom((value, { req }) => {
    // req.files not guaranteed to be populated here
    if (value === 'Update Certifications' && !req.files) {
        throw new Error('Files required');
    }
    return true;
});
```

## Pre-Database Validation

### Merit Badge Name Validation

**Pattern:** Validate badge names exist before attempting database insertion.

```javascript
// DO - Pre-validate against reference data
router.post('/', upload.array('certifications', 10), validateApplication, async (req, res) => {
    // ... validation check ...
    
    // Parse badges
    const badgesToCounsel = req.body.badgesToCounsel 
        ? JSON.parse(req.body.badgesToCounsel) 
        : [];
    
    // Pre-validate badge names exist
    if (badgesToCounsel.length > 0) {
        const [validBadges] = await pool.query(
            'SELECT name FROM merit_badges WHERE name IN (?)',
            [badgesToCounsel]
        );
        
        const validNames = validBadges.map(b => b.name);
        const invalidBadges = badgesToCounsel.filter(name => !validNames.includes(name));
        
        if (invalidBadges.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Invalid merit badges: ${invalidBadges.join(', ')}`
            });
        }
    }
    
    // Now safe to insert
    await Application.create(applicationData);
});

// DON'T - Let database insertion fail silently
// models/Application.js (ANTI-PATTERN)
for (const badgeName of applicationData.badgesToCounsel) {
    const [badge] = await connection.query(
        'SELECT id FROM merit_badges WHERE name = ?',
        [badgeName]
    );
    
    if (badge.length > 0) { // Silently skips invalid badges
        await connection.query(
            'INSERT INTO application_badges ...',
            [applicationId, badge[0].id, 'counsel']
        );
    }
}
// User thinks they selected 5 badges, only 3 were saved
```

**Why pre-validate:** Fail fast with clear error messages instead of silent partial failures.

### District Validation

```javascript
// DO - Validate against known district list
const VALID_DISTRICTS = [
    'Austin District', 'Balcones District', 'Bastrop District',
    'Blanco River District', 'Bright Star District', 'Buffalo Trace District',
    'Capitol District', 'Central Texas District', 'Chisholm Trail District',
    'Circle Ten District', 'Colorado River District', 'Hill Country District',
    'Longhorn District', 'Tonkawa District'
];

body('district')
    .if(body('isVolunteer').equals('Yes'))
    .trim()
    .notEmpty()
    .isIn(VALID_DISTRICTS)
    .withMessage('Please select a valid district')

// DON'T - Accept any string
body('district').optional({ checkFalsy: true }).trim()
// Allows "Fake District" to be inserted