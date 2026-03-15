# Node.js Type Handling Reference

## Contents
- Environment Variable Type Coercion
- Buffer and Stream Types
- JSON Parsing Safety
- Boolean Conversion
- Anti-Patterns

---

## Environment Variable Type Coercion

### String to Number Conversion

All environment variables are strings. ALWAYS convert numeric configs:

```javascript
// routes/applications.js - GOOD: Explicit parseInt with fallback
const upload = multer({
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 31457280, // 30MB default
        files: parseInt(process.env.MAX_FILES) || 10
    }
});

// config/database.js - Port number conversion
const pool = mysql.createPool({
    port: parseInt(process.env.DB_PORT) || 3306
});
```

### WARNING: Implicit Type Coercion

```javascript
// BAD - String used where number expected
const maxSize = process.env.MAX_FILE_SIZE || 31457280;
// If MAX_FILE_SIZE="5000000", maxSize becomes "5000000" (string)
// Multer may accept string, but comparisons break: "5000000" > 31457280 === true (string comparison)

// GOOD - Explicit conversion
const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 31457280;
```

**Why This Breaks:**
1. String comparison is lexicographic: `"9" > "10"` returns true
2. Math operations fail silently: `"100" + 50` returns `"10050"` (concatenation)
3. Database drivers may reject string values for numeric columns
4. JSON responses encode numbers as strings, breaking client validation

---

## Boolean Conversion from Environment

### String to Boolean Pattern

```javascript
// config/database.js - Boolean SSL configuration
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
    } : false
});

// Alternative: Truthy environment check
const isProduction = process.env.NODE_ENV === 'production';
const enableDebug = process.env.DEBUG === 'true' || process.env.DEBUG === '1';
```

### WARNING: Truthy Environment Variables

```javascript
// BAD - "false" is truthy string
if (process.env.ENABLE_FEATURE) {
    // Runs even if ENABLE_FEATURE="false" (string is truthy)
}

// GOOD - Explicit comparison
if (process.env.ENABLE_FEATURE === 'true') {
    // Only runs if explicitly set to "true"
}
```

---

## JSON Parsing Safety

### Validating JSON from Request Body

```javascript
// routes/applications.js - Parse JSON arrays from multipart form
router.post('/', upload.array('certifications', 10), async (req, res, next) => {
    let badgesToCounsel = [];
    let badgesToDrop = [];
    
    // GOOD: Try-catch around JSON.parse
    if (req.body.badgesToCounsel) {
        try {
            badgesToCounsel = JSON.parse(req.body.badgesToCounsel);
        } catch (e) {
            badgesToCounsel = []; // Fallback to empty array
        }
    }
    
    if (req.body.badgesToDrop) {
        try {
            badgesToDrop = JSON.parse(req.body.badgesToDrop);
        } catch (e) {
            badgesToDrop = [];
        }
    }
});
```

### WARNING: Unvalidated JSON.parse

```javascript
// BAD - No error handling
const badges = JSON.parse(req.body.badgesToCounsel); // Crashes on invalid JSON

// GOOD - Validate and fallback
let badges = [];
if (req.body.badgesToCounsel) {
    try {
        badges = JSON.parse(req.body.badgesToCounsel);
        if (!Array.isArray(badges)) {
            badges = []; // Ensure it's an array
        }
    } catch (e) {
        return res.status(400).json({
            success: false,
            message: 'Invalid JSON in badgesToCounsel'
        });
    }
}
```

**Why Unhandled Parse Breaks:**
1. **Server crash** - Unhandled exception in async context
2. **No error message** - User sees generic 500 instead of validation error
3. **Security risk** - Stack traces leak implementation details
4. **Data corruption** - Partial writes if crash happens mid-transaction

---

## Buffer and Stream Types

### File Upload Buffer Handling

Multer provides file metadata, not raw buffers in standard usage:

```javascript
// routes/applications.js - File metadata from Multer
router.post('/', upload.array('certifications', 10), async (req, res, next) => {
    // req.files is array of file objects with metadata
    const certifications = req.files ? req.files.map(file => ({
        filename: file.originalname,  // String
        filepath: file.path,           // String (disk path)
        size: file.size                // Number (bytes)
    })) : [];
    
    // Files are already written to disk by Multer storage
    // Buffer operations not needed unless using memoryStorage
});
```

### Stream Processing for Large Files

```javascript
// If using memory storage (not recommended for this app)
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload', upload.single('file'), (req, res) => {
    // req.file.buffer is a Buffer object
    const buffer = req.file.buffer;
    
    // Convert Buffer to string (for text files)
    const content = buffer.toString('utf8');
    
    // Write Buffer to disk manually
    const fs = require('fs');
    fs.writeFile('path/to/file', buffer, (err) => {
        if (err) return res.status(500).json({ error: 'Write failed' });
        res.json({ success: true });
    });
});
```

---

## Type Validation with express-validator

### Input Type Enforcement

```javascript
// routes/applications.js - Type-safe validation
const { body, validationResult } = require('express-validator');

const validateApplication = [
    body('firstName').trim().notEmpty().isString(),
    body('lastName').trim().notEmpty().isString(),
    body('age').isInt({ min: 18 }).toInt(),      // Coerce to integer
    body('email').isEmail().normalizeEmail(),
    body('phone').optional({ checkFalsy: true }).trim().isMobilePhone(),
];

router.post('/', validateApplication, (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    
    // req.body.age is now guaranteed to be integer >= 18
});
```

See the **express-validator** skill for comprehensive validation patterns.

---

## Database Type Mapping

### MySQL to JavaScript Type Conversion

```javascript
// models/Application.js - Type mapping from MySQL results
static async getById(id) {
    const [rows] = await db.query('SELECT * FROM applications WHERE id = ?', [id]);
    
    if (rows.length === 0) return null;
    
    const app = rows[0];
    
    // MySQL returns:
    // - BOOLEAN as 0/1 (convert to true/false)
    // - TIMESTAMP as Date object
    // - INT as number
    // - VARCHAR/TEXT as string
    
    return {
        id: app.id,                               // number
        firstName: app.first_name,                // string
        isVolunteer: Boolean(app.is_bsa_volunteer), // boolean (from TINYINT)
        createdAt: app.created_at,                // Date object
        age: app.age                              // number
    };
}
```

### WARNING: Boolean Confusion with MySQL

```javascript
// BAD - Assumes boolean field is true/false
if (app.is_bsa_volunteer) { /* ... */ } // Works if 1, but 0 is falsy

// GOOD - Explicit boolean conversion
if (Boolean(app.is_bsa_volunteer)) { /* ... */ }
// Or use strict equality
if (app.is_bsa_volunteer === 1) { /* ... */ }
```

See the **mysql** skill for database type handling details.