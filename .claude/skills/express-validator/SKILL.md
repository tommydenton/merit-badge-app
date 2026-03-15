---
name: express-validator
description: |
  Implements server-side input validation and error handling middleware for Express.js routes
  Use when: validating user input, sanitizing form data, handling multipart/form-data with file uploads, preventing SQL injection through validation
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__query-docs
---

# Express-validator Skill

Server-side validation middleware using express-validator 7.0.1 for the Merit Badge Counselor application. This project validates form submissions with 11+ fields, handles multipart/form-data with file uploads, and prevents SQL injection through strict input validation before database operations.

## Quick Start

### Basic Field Validation

```javascript
// routes/applications.js - Current validation setup
const { body, validationResult } = require('express-validator');

const validateApplication = [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('age').isInt({ min: 18 }).withMessage('Age must be at least 18'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('phone').optional({ checkFalsy: true }).trim()
];

router.post('/', upload.array('certifications', 10), validateApplication, async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    // Process validated data
});
```

### Conditional Validation

```javascript
// Validate BSA Member ID only if volunteer status is "Yes"
body('bsaMemberId')
    .if(body('isVolunteer').equals('Yes'))
    .trim()
    .notEmpty()
    .withMessage('BSA Member ID is required for registered volunteers')
```

## Key Concepts

| Concept | Usage | Example |
|---------|-------|---------|
| Validation chain | Build rules sequentially | `body('email').trim().isEmail().normalizeEmail()` |
| Custom messages | Override default errors | `.withMessage('Age must be at least 18')` |
| Sanitization | Clean input before validation | `.trim()`, `.escape()`, `.normalizeEmail()` |
| Optional fields | Only validate if present | `.optional({ checkFalsy: true })` |
| Error extraction | Get validation results | `validationResult(req)` |
| Conditional validation | Apply rules based on conditions | `.if(body('field').equals('value'))` |

## Common Patterns

### Handling Optional Fields with Dependencies

**When:** Form has conditional sections (volunteer status reveals BSA ID field)

```javascript
// DO - Use optional with checkFalsy to skip validation for empty strings
body('bsaMemberId').optional({ checkFalsy: true }).trim(),
body('district').optional({ checkFalsy: true }).trim()

// DON'T - Validate unconditionally, causes errors when fields are hidden
body('bsaMemberId').trim().notEmpty() // Fails when isVolunteer === 'No'
```

### JSON Array Parsing in Multipart Forms

**When:** Handling multi-select inputs sent as JSON strings alongside file uploads

```javascript
// DO - Parse JSON safely with fallback
if (req.body.badgesToCounsel) {
    try {
        badgesToCounsel = JSON.parse(req.body.badgesToCounsel);
    } catch (e) {
        badgesToCounsel = [];
    }
}

// DON'T - Trust JSON.parse without error handling
badgesToCounsel = JSON.parse(req.body.badgesToCounsel); // Crashes on malformed JSON
```

### Validation Error Responses

**When:** Returning structured errors to frontend for field-specific feedback

```javascript
// DO - Return full error array for frontend mapping
if (!errors.isEmpty()) {
    return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array() // [{ field: 'email', msg: '...' }]
    });
}

// DON'T - Return only first error, breaks multi-field validation UX
return res.status(400).json({ message: errors.array()[0].msg });
```

## See Also

- [routes](references/routes.md) - Route-level validation patterns
- [services](references/services.md) - Business logic validation
- [database](references/database.md) - Pre-database validation checks
- [auth](references/auth.md) - Authentication field validation
- [errors](references/errors.md) - Error handling and reporting

## Related Skills

- **express** - Core framework for route handlers
- **node** - Async/await patterns for validation middleware
- **mysql** - Parameterized queries after validation
- **multer** - File upload validation integration

## Documentation Resources

> Fetch latest express-validator documentation with Context7.

**How to use Context7:**
1. Use `mcp__context7__resolve-library-id` to search for "express-validator"
2. **Prefer website documentation** (IDs starting with `/websites/`) over source code repositories when available
3. Query with `mcp__context7__query-docs` using the resolved library ID

**Library ID:** `/express-validator/express-validator` _(resolve using mcp__context7__resolve-library-id, prefer /websites/ when available)_

**Recommended Queries:**
- "express-validator validation chain methods"
- "express-validator conditional validation"
- "express-validator custom validators"
- "express-validator sanitization best practices"