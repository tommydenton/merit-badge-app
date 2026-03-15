# Errors Reference

## Contents
- Error Handling Middleware
- Validation Error Formatting
- File Upload Error Handling
- Database Error Handling
- Production vs Development Errors
- Anti-Patterns

---

## Error Handling Middleware

Express error handlers must have **4 parameters** `(err, req, res, next)` to be recognized as error middleware.

### Centralized Error Handler

```javascript
// server.js
const express = require('express');
const app = express();

// Routes
app.use('/api/applications', require('./routes/applications'));

// 404 Handler - must come after all routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error Handler - must come last
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Multer file size error
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE / 1024 / 1024}MB`
        });
    }
    
    // Multer file count error
    if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
            success: false,
            message: `Too many files. Maximum is ${process.env.MAX_FILES} files`
        });
    }
    
    // Multer file filter error
    if (err.message && err.message.includes('not allowed')) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    
    // Database connection errors
    if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
        return res.status(503).json({
            success: false,
            message: 'Database connection failed. Please try again later.'
        });
    }
    
    // Generic server error
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

### Passing Errors from Routes

```javascript
// routes/applications.js
router.get('/merit-badges', async (req, res, next) => {
    try {
        const badges = await Application.getAllMeritBadges();
        res.json({ success: true, badges });
    } catch (error) {
        next(error); // Pass to error middleware
    }
});
```

**Critical:** Always use `next(error)` in async route handlers. Without it, Express won't catch errors and the request will hang.

---

## Validation Error Formatting

### Express Validator Error Collection

```javascript
// routes/applications.js
const { body, validationResult } = require('express-validator');

const validateApplication = [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('age').isInt({ min: 18 }).withMessage('Age must be at least 18'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('purpose').notEmpty().withMessage('Please select what you would like to do')
];

router.post('/', upload.array('certifications', 10), validateApplication, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        
        // Process valid request
        const result = await Application.create(req.body);
        res.status(201).json({ success: true, applicationId: result.applicationId });
    } catch (error) {
        next(error);
    }
});
```

### Error Response Format

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "msg": "First name is required",
      "param": "firstName",
      "location": "body"
    },
    {
      "msg": "Age must be at least 18",
      "param": "age",
      "location": "body",
      "value": "16"
    }
  ]
}
```

### Frontend Error Display

```javascript
// public/js/app.js
$('#applicationForm').on('submit', function(e) {
    e.preventDefault();
    
    $.ajax({
        url: '/api/applications',
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function(response) {
            showSuccessMessage(response.message);
        },
        error: function(xhr) {
            const response = xhr.responseJSON;
            if (response.errors) {
                // Display validation errors
                response.errors.forEach(error => {
                    showFieldError(error.param, error.msg);
                });
            } else {
                showErrorMessage(response.message || 'An error occurred');
            }
        }
    });
});
```

---

## File Upload Error Handling

### Multer Error Codes

| Error Code | Cause | User Message |
|------------|-------|--------------|
| `LIMIT_FILE_SIZE` | File exceeds `fileSize` limit | "File too large. Max 30MB." |
| `LIMIT_FILE_COUNT` | More files than `files` limit | "Too many files. Max 10 files." |
| `LIMIT_UNEXPECTED_FILE` | Field name mismatch | "Unexpected file field" |
| Custom error | `fileFilter` rejection | "File type .exe not allowed" |

### File Cleanup on Error

```javascript
// routes/applications.js
router.post('/', upload.array('certifications', 10), validateApplication, async (req, res, next) => {
    try {
        const certifications = req.files ? req.files.map(file => ({
            filename: file.originalname,
            filepath: file.path,
            size: file.size
        })) : [];
        
        const result = await Application.create({ ...req.body, certifications });
        res.status(201).json({ success: true, applicationId: result.applicationId });
    } catch (error) {
        // CRITICAL: Clean up uploaded files if database insert fails
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
```

**Why This Matters:**
- Database transaction fails but files already saved to disk
- Without cleanup, orphaned files accumulate indefinitely
- Privacy concern: uploaded files accessible but not in database

---

## Database Error Handling

### Connection Errors

```javascript
// config/database.js
pool.getConnection()
    .then(connection => {
        console.log('✓ Database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('✗ Database connection failed:', err.message);
        process.exit(1); // Don't start server if database unavailable
    });
```

### Query Errors

```javascript
// models/Application.js
static async create(data) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        const [result] = await connection.query(
            'INSERT INTO applications (...) VALUES (?)',
            [...]
        );
        
        await connection.commit();
        return { applicationId: result.insertId };
    } catch (error) {
        await connection.rollback();
        
        // Log detailed error server-side
        console.error('Database error:', error.code, error.message);
        
        // Throw generic error to client
        throw new Error('Failed to save application');
    } finally {
        connection.release();
    }
}
```

### Common MySQL Error Codes

| Code | Cause | Solution |
|------|-------|----------|
| `ER_DUP_ENTRY` | Duplicate unique key | Check for existing record before insert |
| `ER_NO_REFERENCED_ROW` | Foreign key violation | Verify referenced record exists |
| `ER_BAD_NULL_ERROR` | NULL in NOT NULL column | Validate required fields |
| `ECONNREFUSED` | MySQL not running | Start MySQL service |
| `ER_ACCESS_DENIED` | Invalid credentials | Check DB_USER and DB_PASSWORD |

---

## Production vs Development Errors

### Environment-Specific Error Details

```javascript
// server.js error handler
app.use((err, req, res, next) => {
    const isProduction = process.env.NODE_ENV === 'production';
    
    console.error('Error:', err); // Always log server-side
    
    res.status(err.status || 500).json({
        success: false,
        message: isProduction 
            ? 'An error occurred' 
            : err.message,
        ...(isProduction ? {} : { stack: err.stack }) // Stack trace in dev only
    });
});
```

**Production Response:**

```json
{
  "success": false,
  "message": "An error occurred"
}
```

**Development Response:**

```json
{
  "success": false,
  "message": "Cannot read property 'id' of undefined",
  "stack": "TypeError: Cannot read property 'id' of undefined\n    at Application.getById (/app/models/Application.js:45:20)\n    ..."
}
```

---

## Anti-Patterns

### WARNING: Swallowing Errors Silently

**The Problem:**

```javascript
// BAD - Error disappears
router.get('/merit-badges', async (req, res, next) => {
    try {
        const badges = await Application.getAllMeritBadges();
        res.json({ success: true, badges });
    } catch (error) {
        console.log('Error occurred'); // Logged but not handled
        res.json({ success: true, badges: [] }); // Lies to client
    }
});
```

**Why This Breaks:**
1. **Silent Failures:** Client thinks request succeeded but data is wrong
2. **Hard to Debug:** No error response, logs are vague
3. **Data Integrity:** Frontend displays empty list instead of error

**The Fix:**

```javascript
// GOOD - Propagate error
router.get('/merit-badges', async (req, res, next) => {
    try {
        const badges = await Application.getAllMeritBadges();
        res.json({ success: true, badges });
    } catch (error) {
        next(error); // Pass to error handler
    }
});
```

### WARNING: Exposing Internal Errors to Clients

**The Problem:**

```javascript
// BAD - Leaks implementation details
app.use((err, req, res, next) => {
    res.status(500).json({
        success: false,
        message: err.message, // "SELECT * FROM users WHERE password = 'abc123'"
        stack: err.stack      // Full file paths and line numbers
    });
});
```

**Why This Breaks:**
1. **Security Risk:** Reveals database schema, file paths, library versions
2. **Attack Surface:** Helps attackers find vulnerabilities
3. **User Experience:** Technical errors confuse non-technical users

**The Fix:**

```javascript
// GOOD - Generic message in production
app.use((err, req, res, next) => {
    console.error('Error:', err); // Log full details server-side
    
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.status(err.status || 500).json({
        success: false,
        message: isProduction 
            ? 'An error occurred. Please try again later.' 
            : err.message
    });
});
```

### WARNING: Not Handling Async Errors in Routes

**The Problem:**

```javascript
// BAD - Async error crashes server
router.get('/merit-badges', async (req, res) => {
    const badges = await Application.getAllMeritBadges(); // Throws error
    res.json({ success: true, badges });
    // Error not caught, request hangs, server may crash
});
```

**The Fix:**

```javascript
// GOOD - Wrap in try-catch and use next(error)
router.get('/merit-badges', async (req, res, next) => {
    try {
        const badges = await Application.getAllMeritBadges();
        res.json({ success: true, badges });
    } catch (error) {
        next(error);
    }
});
```

**Alternative - Express 5.x+ Auto-Catch (Not Available in This Project):**

```javascript
// Express 5.x automatically catches async errors (this project uses 4.18.2)
router.get('/merit-badges', async (req, res) => {
    const badges = await Application.getAllMeritBadges();
    res.json({ success: true, badges });
});
```

See the **express-validator** skill for validation middleware and the **multer** skill for file upload error handling.