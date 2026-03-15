# Database Validation Reference

## Contents
- Pre-Insert Validation
- Transaction Safety
- N+1 Query Prevention
- Data Integrity Checks
- Type Coercion Validation

## Pre-Insert Validation

**CRITICAL:** Validate data BEFORE starting database transactions.

```javascript
// DO - Validate before transaction
router.post('/', upload.array('certifications', 10), validateApplication, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Fail before touching database
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    
    // Parse and validate business logic
    const badgesToCounsel = req.body.badgesToCounsel 
        ? JSON.parse(req.body.badgesToCounsel) 
        : [];
    
    // Validate badge names exist (single query)
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
    
    // NOW start transaction with validated data
    const result = await Application.create(applicationData);
});

// DON'T - Validate during transaction
// models/Application.js (ANTI-PATTERN)
static async create(applicationData) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    // WRONG - Validation inside transaction holds lock
    if (!applicationData.email || !applicationData.email.includes('@')) {
        await connection.rollback();
        throw new Error('Invalid email'); // Transaction held for entire validation
    }
    
    // ... insert logic ...
}
```

**Why this breaks:**
1. Validation failures trigger rollback (wasted database resources)
2. Connection held during validation (blocks other requests)
3. Multiple validation failures require multiple transaction attempts
4. Database locks held unnecessarily

## Transaction Safety

### Validation Prevents Partial Commits

**Pattern:** Express-validator ensures ALL fields are valid before transaction begins.

```javascript
// models/Application.js - Current implementation
static async create(applicationData) {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // 1. Insert main application
        const [applicationResult] = await connection.query(
            `INSERT INTO applications (first_name, last_name, ...) VALUES (?, ?, ...)`,
            [applicationData.firstName, applicationData.lastName, ...]
        );
        
        const applicationId = applicationResult.insertId;
        
        // 2. Insert badges to counsel
        for (const badgeName of applicationData.badgesToCounsel) {
            // ... insert application_badges ...
        }
        
        // 3. Insert certifications
        for (const file of applicationData.certifications) {
            // ... insert certifications ...
        }
        
        await connection.commit();
        return { success: true, applicationId };
        
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// DO - Ensure validation catches ALL errors before this runs
// routes/applications.js
const errors = validationResult(req);
if (!errors.isEmpty()) {
    return res.status(400).json({ ... }); // Stop before transaction
}

const applicationData = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    age: req.body.age,
    // ... all fields validated ...
};

const result = await Application.create(applicationData);
```

**Why validation before transactions matters:**
- Prevents partial data (application without badges)
- Reduces rollback frequency
- Avoids orphaned foreign key references
- Maintains referential integrity without database overhead

### Validation Error Rollback Prevention

**The Problem:** Validation inside transactions forces unnecessary rollbacks.

```javascript
// DON'T - Validate after transaction starts
static async create(applicationData) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    // Insert application
    const [result] = await connection.query('INSERT INTO applications ...', [...]);
    
    // Validate badges AFTER application inserted (WRONG)
    if (!applicationData.badgesToCounsel || applicationData.badgesToCounsel.length === 0) {
        await connection.rollback(); // Rollback wasted INSERT
        throw new Error('No badges selected');
    }
    
    // ... continue ...
}

// DO - Validate BEFORE transaction
router.post('/', upload.array('certifications', 10), validateApplication, async (req, res) => {
    const badgesToCounsel = JSON.parse(req.body.badgesToCounsel || '[]');
    
    if (badgesToCounsel.length === 0 && req.body.purpose === 'Become a Counselor') {
        return res.status(400).json({
            success: false,
            message: 'At least one merit badge is required'
        });
    }
    
    // Transaction only runs with valid data
    await Application.create(applicationData);
});
```

## N+1 Query Prevention

### Batch Badge Validation

**The Problem:** Current implementation queries merit_badges individually (N+1 pattern).

```javascript
// ANTI-PATTERN - models/Application.js (current code)
for (const badgeName of applicationData.badgesToCounsel) {
    const [badge] = await connection.query(
        'SELECT id FROM merit_badges WHERE name = ?',
        [badgeName]
    );
    
    if (badge.length > 0) {
        await connection.query(
            'INSERT INTO application_badges (application_id, merit_badge_id, badge_type) VALUES (?, ?, ?)',
            [applicationId, badge[0].id, 'counsel']
        );
    }
}
// 5 badges = 5 SELECT queries + 5 INSERT queries = 10 queries
```

**The Fix:** Batch validation and bulk insert.

```javascript
// DO - Single query for all badge IDs
if (applicationData.badgesToCounsel && applicationData.badgesToCounsel.length > 0) {
    // 1. Get all badge IDs in one query
    const [badges] = await connection.query(
        'SELECT id, name FROM merit_badges WHERE name IN (?)',
        [applicationData.badgesToCounsel]
    );
    
    // 2. Build bulk insert values
    const badgeValues = badges.map(badge => 
        [applicationId, badge.id, 'counsel']
    );
    
    // 3. Bulk insert
    if (badgeValues.length > 0) {
        await connection.query(
            'INSERT INTO application_badges (application_id, merit_badge_id, badge_type) VALUES ?',
            [badgeValues]
        );
    }
}
// 5 badges = 1 SELECT + 1 INSERT = 2 queries (5x faster)
```

**Performance impact:**
- **Before:** 10 queries for 5 badges (100ms @ 10ms/query)
- **After:** 2 queries for 5 badges (20ms @ 10ms/query)
- **Savings:** 80ms per application submission

### Pre-Validation Badge Lookup

```javascript
// DO - Validate badge names exist BEFORE transaction
router.post('/', upload.array('certifications', 10), validateApplication, async (req, res) => {
    const badgesToCounsel = JSON.parse(req.body.badgesToCounsel || '[]');
    
    if (badgesToCounsel.length > 0) {
        // Single query to validate ALL badges exist
        const [validBadges] = await pool.query(
            'SELECT name FROM merit_badges WHERE name IN (?)',
            [badgesToCounsel]
        );
        
        const validNames = validBadges.map(b => b.name);
        const invalidBadges = badgesToCounsel.filter(name => !validNames.includes(name));
        
        if (invalidBadges.length > 0) {
            // Fail before transaction
            return res.status(400).json({
                success: false,
                message: `Invalid merit badges: ${invalidBadges.join(', ')}`
            });
        }
    }
    
    // Transaction runs only with valid badge names
    await Application.create(applicationData);
});
```

## Data Integrity Checks

### Foreign Key Validation

**Pattern:** Validate foreign key references exist before insertion.

```javascript
// DO - Pre-validate district exists (if using districts table)
// If using enum/check constraint, express-validator is enough:
body('district')
    .if(body('isVolunteer').equals('Yes'))
    .isIn(VALID_DISTRICTS)
    .withMessage('Invalid district')

// If district references districts table:
router.post('/', upload.array('certifications', 10), validateApplication, async (req, res) => {
    if (req.body.district) {
        const [districtExists] = await pool.query(
            'SELECT id FROM districts WHERE name = ?',
            [req.body.district]
        );
        
        if (districtExists.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid district selection'
            });
        }
    }
    
    await Application.create(applicationData);
});

// DON'T - Let database foreign key constraint fail
// User gets "Error: Foreign key constraint fails" instead of helpful message
```

### Type Coercion Validation

**CRITICAL:** MySQL silently converts invalid types. Validate before insertion.

```javascript
// DO - Validate types in express-validator
body('age').isInt({ min: 18, max: 120 }).withMessage('Age must be an integer between 18-120')

// MySQL behavior:
// INSERT INTO applications (age) VALUES ('abc') → age = 0 (silent conversion!)
// INSERT INTO applications (age) VALUES (18.7) → age = 19 (rounds silently!)

// DON'T - Trust MySQL to reject bad types
// It won't. It silently converts and inserts garbage data.
```

**Common silent conversions:**
- String to INT: `'abc'` → `0`
- Float to INT: `18.9` → `19`
- String to BOOLEAN: `'No'` → `0`, `'Yes'` → `0` (any non-zero string → `0`!)
- Out-of-range dates: `'2025-13-45'` → `'0000-00-00'`

### NULL vs Default Value Validation

```javascript
// schema.sql
// is_bsa_volunteer BOOLEAN NOT NULL DEFAULT FALSE

// DO - Ensure field is never NULL
body('isVolunteer').notEmpty().withMessage('Volunteer status is required')

// In route handler:
const applicationData = {
    isVolunteer: req.body.isVolunteer === 'Yes' // Explicit boolean, never NULL
};

// DON'T - Allow NULL for NOT NULL columns
const applicationData = {
    isVolunteer: req.body.isVolunteer || null // NULL fails NOT NULL constraint
};
```

## Validation for Database Constraints

### Unique Constraint Handling

**Pattern:** Check uniqueness before insertion for better error messages.

```javascript
// DO - Pre-check for duplicates
router.post('/', upload.array('certifications', 10), validateApplication, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    // Check email uniqueness
    const [existing] = await pool.query(
        'SELECT id FROM applications WHERE email = ?',
        [req.body.email]
    );
    
    if (existing.length > 0) {
        return res.status(409).json({
            success: false,
            message: 'An application with this email address already exists',
            field: 'email'
        });
    }
    
    await Application.create(applicationData);
});

// DON'T - Let MySQL duplicate key error bubble up
// Error: Duplicate entry 'user@example.com' for key 'applications.idx_email'
// User-facing error message is cryptic
```

### String Length Validation

```javascript
// schema.sql: first_name VARCHAR(100)

// DO - Validate length matches schema
body('firstName')
    .trim()
    .notEmpty()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be 1-100 characters')

// DON'T - Allow longer strings (MySQL truncates silently)
body('firstName').trim().notEmpty()
// User submits 150-character name, MySQL truncates to 100, data loss