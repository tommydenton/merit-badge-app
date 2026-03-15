# Authentication Validation Reference

## Contents
- Email Validation Patterns
- BSA Member ID Validation
- Session Field Validation
- Password Validation (Future)
- API Key Validation (Future)

## Email Validation Patterns

### Email Format and Normalization

```javascript
// DO - Validate format AND normalize
body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail()

// Normalization effect:
// Input: "User@Example.COM"
// Stored: "user@example.com"
```

**normalizeEmail() transformations:**
- Lowercases domain: `User@EXAMPLE.com` → `user@example.com`
- Lowercases local part (Gmail): `John.Doe@gmail.com` → `johndoe@gmail.com`
- Removes dots in Gmail addresses: `john.doe@gmail.com` → `johndoe@gmail.com`
- Removes plus aliases: `user+spam@example.com` → `user@example.com`

**Why normalize:**
1. Prevents duplicate registrations with different casing
2. Gmail treats dots as aliases (`john.doe@gmail.com` === `johndoe@gmail.com`)
3. Consistent lookups (`WHERE email = ?` works reliably)
4. Prevents plus-sign abuse for multiple accounts

### Email Uniqueness Validation

```javascript
// DO - Check uniqueness after format validation
router.post('/', upload.array('certifications', 10), validateApplication, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    // Email is normalized at this point
    const [existing] = await pool.query(
        'SELECT id, created_at FROM applications WHERE email = ?',
        [req.body.email] // Already normalized by express-validator
    );
    
    if (existing.length > 0) {
        return res.status(409).json({
            success: false,
            message: 'An application with this email address already exists',
            field: 'email',
            existingSince: existing[0].created_at
        });
    }
    
    await Application.create(applicationData);
});

// DON'T - Case-insensitive search manually
const [existing] = await pool.query(
    'SELECT id FROM applications WHERE LOWER(email) = LOWER(?)',
    [req.body.email]
);
// Slower (can't use index), unnecessary if normalizeEmail() ran
```

### Email Domain Validation

```javascript
// DO - Block disposable email providers
const DISPOSABLE_DOMAINS = [
    'tempmail.com', 'guerrillamail.com', '10minutemail.com',
    'mailinator.com', 'throwaway.email'
];

body('email').custom((email) => {
    const domain = email.split('@')[1].toLowerCase();
    if (DISPOSABLE_DOMAINS.includes(domain)) {
        throw new Error('Please use a permanent email address');
    }
    return true;
});

// DON'T - Allow disposable emails
// Users create throwaway applications, lose access, re-register
```

**When to use:** Prevents spam registrations and ensures users can be contacted for application status updates.

## BSA Member ID Validation

### Format Validation

```javascript
// DO - Validate BSA Member ID format (conditionally)
body('bsaMemberId')
    .if(body('isVolunteer').equals('Yes'))
    .trim()
    .notEmpty()
    .withMessage('BSA Member ID is required for registered volunteers')
    .isLength({ min: 5, max: 50 })
    .withMessage('BSA Member ID must be 5-50 characters')
    .matches(/^[A-Za-z0-9\-]+$/)
    .withMessage('BSA Member ID can only contain letters, numbers, and hyphens')

// DON'T - Accept any format
body('bsaMemberId').optional({ checkFalsy: true }).trim()
// Allows "!!!invalid!!!" to be stored
```

**BSA Member ID format:** Typically 8-digit numeric or alphanumeric (e.g., `12345678` or `S12345678`). Adjust regex based on actual BSA format requirements.

### Conditional Requirement Enforcement

```javascript
// DO - Enforce requirement based on volunteer status
body('bsaMemberId')
    .if(body('isVolunteer').equals('Yes'))
    .trim()
    .notEmpty()
    .withMessage('BSA Member ID is required for registered volunteers')

// Frontend conditional display (public/js/app.js):
// if (isVolunteer === 'Yes') {
//     document.getElementById('bsaMemberIdField').setAttribute('required', 'required');
// }

// DON'T - Use .optional() for conditionally required fields
body('bsaMemberId').optional({ checkFalsy: true })
// Skips validation even when isVolunteer === 'Yes'
```

**Why .if() matters:** Optional fields are NEVER required. Conditionally required fields are required WHEN condition is met. Use `.if()` for conditional requirements.

### BSA Member ID Uniqueness

```javascript
// DO - Allow multiple applications per BSA Member ID (update scenario)
router.post('/', upload.array('certifications', 10), validateApplication, async (req, res) => {
    // BSA Member ID can be reused for "Update Certifications" or "Change/Add Badges"
    if (req.body.bsaMemberId && req.body.purpose === 'Become a Counselor') {
        const [existing] = await pool.query(
            'SELECT id, email FROM applications WHERE bsa_member_id = ?',
            [req.body.bsaMemberId]
        );
        
        if (existing.length > 0 && existing[0].email !== req.body.email) {
            return res.status(409).json({
                success: false,
                message: 'This BSA Member ID is already registered with a different email address',
                field: 'bsaMemberId'
            });
        }
    }
    
    await Application.create(applicationData);
});

// DON'T - Block all duplicate BSA Member IDs
// Prevents legitimate update/change applications
```

## Session Field Validation

### District Validation

```javascript
// DO - Validate against known districts
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
    .withMessage('District is required for registered volunteers')
    .isIn(VALID_DISTRICTS)
    .withMessage('Please select a valid district')

// DON'T - Accept any string
body('district').optional({ checkFalsy: true }).trim()
// Allows "Fake District" → breaks reporting/analytics
```

**Why strict validation:** District names must match official BSA council districts for proper application routing and coordinator notifications.

### Conditional District Requirement

```javascript
// DO - Require district only for registered volunteers
body('district')
    .if(body('isVolunteer').equals('Yes'))
    .notEmpty()
    .isIn(VALID_DISTRICTS)

// DON'T - Make district always optional or always required
body('district').optional() // Wrong: required when isVolunteer === 'Yes'
body('district').notEmpty() // Wrong: not required when isVolunteer === 'No'
```

## Password Validation (Future Enhancement)

**Not currently implemented.** When adding user authentication for application tracking:

```javascript
// Future: Password validation for user accounts
body('password')
    .isLength({ min: 8, max: 72 }) // bcrypt max is 72 bytes
    .withMessage('Password must be 8-72 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[^A-Za-z0-9]/)
    .withMessage('Password must contain at least one special character')

body('passwordConfirm')
    .custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Password confirmation does not match');
        }
        return true;
    })

// DON'T - Validate plaintext password strength in database
// Validate BEFORE hashing with bcrypt
```

**NEVER:**
- Store passwords in plain text
- Log passwords (even temporarily)
- Include passwords in error messages
- Send passwords over email

## API Key Validation (Future Enhancement)

**Not currently implemented.** When adding API access for third-party integrations:

```javascript
// Future: API key validation for programmatic access
const validateApiKey = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
        return res.status(401).json({
            success: false,
            message: 'API key required'
        });
    }
    
    // Validate format (e.g., UUID v4)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(apiKey)) {
        return res.status(401).json({
            success: false,
            message: 'Invalid API key format'
        });
    }
    
    // Lookup in database (with rate limiting)
    const [key] = await pool.query(
        'SELECT * FROM api_keys WHERE key_hash = SHA2(?, 256) AND expires_at > NOW()',
        [apiKey]
    );
    
    if (key.length === 0) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired API key'
        });
    }
    
    req.apiKeyId = key[0].id;
    next();
};

// DON'T - Store API keys in plain text
// Hash with SHA-256 or bcrypt before storage