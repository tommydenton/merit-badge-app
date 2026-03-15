# Error Handling Reference

## Contents
- Validation Error Formatting
- File Upload Error Cleanup
- Database Error Handling
- Client Error Responses
- Server Error Logging

## Validation Error Formatting

### Structured Error Responses

```javascript
// DO - Return field-mapped errors for frontend
const errors = validationResult(req);
if (!errors.isEmpty()) {
    return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array() // Array of { field, msg, value, location }
    });
}

// Example response:
// {
//   "success": false,
//   "message": "Validation failed",
//   "errors": [
//     { "field": "email", "msg": "Valid email is required", "value": "invalid", "location": "body" },
//     { "field": "age", "msg": "Age must be at least 18", "value": "16", "location": "body" }
//   ]
// }

// DON'T - Return only the first error
return res.status(400).json({
    message: errors.array()[0].msg
});
// User must fix one error at a time, terrible UX
```

**Frontend integration:**

```javascript
// public/js/app.js - Map errors to form fields
const displayValidationErrors = (errors) => {
    errors.forEach(error => {
        const field = document.querySelector(`[name="${error.field}"]`);
        if (field) {
            field.setCustomValidity(error.msg);
            field.reportValidity();
            
            // Bootstrap invalid feedback
            const feedback = field.parentElement.querySelector('.invalid-feedback');
            if (feedback) {
                feedback.textContent = error.msg;
            }
            field.classList.add('is-invalid');
        }
    });
};
```

### Custom Error Messages

```javascript
// DO - Provide actionable error messages
body('age')
    .isInt({ min: 18, max: 120 })
    .withMessage('Age must be between 18 and 120 years')

body('email')
    .isEmail()
    .withMessage('Please enter a valid email address (e.g., name@example.com)')

// DON'T - Use generic messages
body('age').isInt({ min: 18 }).withMessage('Invalid input')
// User doesn't know what's wrong or how to fix it
```

### Error Message Consistency

```javascript
// DO - Consistent error format across validations
body('firstName').trim().notEmpty().withMessage('First name is required')
body('lastName').trim().notEmpty().withMessage('Last name is required')
body('email').isEmail().withMessage('Email is required')

// Pattern: "[Field name] is required" or "[Field name] must be [constraint]"

// DON'T - Inconsistent messaging
body('firstName').notEmpty().withMessage('Please enter your first name')
body('lastName').notEmpty().withMessage('Last name required!')
body('email').isEmail().withMessage('Email invalid')
// Inconsistent capitalization, punctuation, phrasing
```

## File Upload Error Cleanup

### Cleanup on Validation Failure

**CRITICAL:** Delete uploaded files when validation fails to prevent orphaned files.

```javascript
// DO - Clean up files on ANY error
router.post('/', upload.array('certifications', 10), validateApplication, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Delete uploaded files
            if (req.files && req.files.length > 0) {
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
        
        // Process application
        const result = await Application.create(applicationData);
        
        res.status(201).json({
            success: true,
            message: 'Application submitted successfully',
            applicationId: result.applicationId
        });
        
    } catch (error) {
        // ALSO clean up on processing errors
        if (req.files && req.files.length > 0) {
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

// DON'T - Leave orphaned files
if (!errors.isEmpty()) {
    return res.status(400).json({ ... });
    // Files remain in public/uploads forever, filling disk
}
```

**Why this matters:**
- 10 failed submissions/day × 5MB avg = 50MB wasted daily
- 1 year = 18GB of orphaned files
- Disk fills up, server crashes

### File Upload Error Helper

```javascript
// DO - Extract cleanup to reusable function
const cleanupUploadedFiles = (files) => {
    if (!files || files.length === 0) return;
    
    const fs = require('fs');
    files.forEach(file => {
        fs.unlink(file.path, err => {
            if (err) console.error(`Error deleting file ${file.filename}:`, err);
        });
    });
};

router.post('/', upload.array('certifications', 10), validateApplication, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            cleanupUploadedFiles(req.files);
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        
        // ... processing ...
        
    } catch (error) {
        cleanupUploadedFiles(req.files);
        next(error);
    }
});
```

## Database Error Handling

### Unique Constraint Errors

```javascript
// DO - Map database errors to user-friendly messages
router.post('/', upload.array('certifications', 10), validateApplication, async (req, res, next) => {
    try {
        const result = await Application.create(applicationData);
        res.status(201).json({ success: true, applicationId: result.applicationId });
        
    } catch (error) {
        cleanupUploadedFiles(req.files);
        
        // Handle unique constraint violation
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.message.includes('idx_email')) {
                return res.status(409).json({
                    success: false,
                    message: 'An application with this email address already exists',
                    field: 'email'
                });
            }
        }
        
        // Handle foreign key constraint violation
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({
                success: false,
                message: 'Invalid reference data (merit badge or district)'
            });
        }
        
        next(error);
    }
});

// DON'T - Let raw MySQL errors reach the client
// Error: Duplicate entry 'user@example.com' for key 'applications.idx_email'
// Exposes database schema, confuses users
```

### Transaction Rollback Errors

```javascript
// models/Application.js - Handle rollback gracefully
static async create(applicationData) {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // ... inserts ...
        
        await connection.commit();
        return { success: true, applicationId };
        
    } catch (error) {
        await connection.rollback();
        
        // Log error with context
        console.error('Transaction failed:', {
            error: error.message,
            code: error.code,
            applicationEmail: applicationData.email
        });
        
        // Re-throw for route handler
        throw error;
        
    } finally {
        connection.release();
    }
}

// DON'T - Silently swallow errors
catch (error) {
    await connection.rollback();
    return { success: false }; // Route handler doesn't know what failed
}
```

## Client Error Responses

### 400 Bad Request (Validation Failure)

```javascript
// DO - Use 400 for validation errors
if (!errors.isEmpty()) {
    return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
    });
}

// DON'T - Use 500 for validation errors
return res.status(500).json({ message: 'Server error' });
// 500 implies server problem, not client input problem
```

### 409 Conflict (Duplicate Resource)

```javascript
// DO - Use 409 for duplicate email/BSA ID
if (existing.length > 0) {
    return res.status(409).json({
        success: false,
        message: 'An application with this email address already exists',
        field: 'email'
    });
}

// DON'T - Use 400 for duplicates
return res.status(400).json({ message: 'Invalid email' });
// Not invalid format, it's a duplicate (409 is semantic)
```

### 422 Unprocessable Entity (Business Logic Failure)

```javascript
// DO - Use 422 for business rule violations
if (req.body.purpose === 'Become a Counselor' && badgesToCounsel.length === 0) {
    return res.status(422).json({
        success: false,
        message: 'At least one merit badge must be selected when becoming a counselor',
        field: 'badgesToCounsel'
    });
}

// 422 vs 400:
// - 400: Syntax/format errors (invalid email, age < 18)
// - 422: Valid format but violates business rules
```

## Server Error Logging

### Error Context Logging

```javascript
// DO - Log errors with context for debugging
app.use((err, req, res, next) => {
    console.error('Error occurred:', {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        body: req.body, // Be careful with sensitive data
        error: {
            message: err.message,
            code: err.code,
            stack: err.stack
        }
    });
    
    res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message
    });
});

// DON'T - Log only error message
console.error('Error:', err.message);
// No context, can't reproduce issue
```

### Sensitive Data Filtering

```javascript
// DO - Filter sensitive data from logs
const sanitizeForLogging = (body) => {
    const sanitized = { ...body };
    
    // Remove sensitive fields
    delete sanitized.bsaMemberId;
    if (sanitized.email) {
        // Mask email: user@example.com → u***@example.com
        sanitized.email = sanitized.email.replace(/^(.{1})(.*)(@.*)$/, '$1***$3');
    }
    
    return sanitized;
};

app.use((err, req, res, next) => {
    console.error('Error occurred:', {
        method: req.method,
        path: req.path,
        body: sanitizeForLogging(req.body),
        error: err.message
    });
    
    // ... response ...
});

// DON'T - Log full BSA Member IDs, emails, phone numbers
console.error('Error:', { body: req.body });
// Leaks PII in logs, GDPR/privacy violation
```

### Multer Error Handling

```javascript
// DO - Handle Multer-specific errors
app.use((err, req, res, next) => {
    // File too large
    if (err.code === 'LIMIT_FILE_SIZE') {
        cleanupUploadedFiles(req.files);
        return res.status(400).json({
            success: false,
            message: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE / 1048576}MB`
        });
    }
    
    // Too many files
    if (err.code === 'LIMIT_FILE_COUNT') {
        cleanupUploadedFiles(req.files);
        return res.status(400).json({
            success: false,
            message: `Too many files. Maximum is ${process.env.MAX_FILES} files`
        });
    }
    
    // Forbidden file type (from fileFilter)
    if (err.message && err.message.includes('not allowed')) {
        cleanupUploadedFiles(req.files);
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    
    // Generic error
    next(err);
});

// DON'T - Generic error for all Multer errors
// User doesn't know if file is too large, wrong type, or too many files