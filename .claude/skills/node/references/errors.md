# Node.js Error Handling Reference

## Contents
- Async Error Propagation
- Express Error Middleware
- Database Error Handling
- File Upload Error Recovery
- Anti-Patterns

---

## Async Error Propagation

### Try-Catch with next(error) Pattern

```javascript
// routes/applications.js - Standard async error handling
router.post('/', upload.array('certifications', 10), async (req, res, next) => {
    try {
        const result = await Application.create(req.body);
        res.status(201).json({
            success: true,
            applicationId: result.applicationId
        });
    } catch (error) {
        next(error); // Pass to Express error middleware
    }
});
```

### WARNING: Async Errors Without Try-Catch

```javascript
// BAD - Unhandled promise rejection crashes Node.js
router.get('/badges', async (req, res) => {
    const badges = await Application.getAllMeritBadges(); // If this throws, server crashes
    res.json(badges);
});

// GOOD - Catch and propagate
router.get('/badges', async (req, res, next) => {
    try {
        const badges = await Application.getAllMeritBadges();
        res.json(badges);
    } catch (error) {
        next(error);
    }
});
```

**Why Unhandled Promises Break:**
1. **Server crash** - Node.js exits on unhandled rejections (default behavior)
2. **No error response** - Client hangs waiting for response
3. **Lost context** - Stack trace doesn't show which request failed
4. **Memory leaks** - Pending connections never close

---

## Express Error Middleware

### Centralized Error Handler

```javascript
// server.js - Global error middleware (MUST be last)
app.use('/api/applications', require('./routes/applications'));

// Error handler AFTER all routes
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
    
    // Don't leak stack traces to production clients
    const response = {
        success: false,
        message: err.message || 'Internal server error'
    };
    
    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
    }
    
    res.status(err.statusCode || 500).json(response);
});
```

### Custom Error Classes

```javascript
// utils/errors.js - Application-specific errors
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
        this.statusCode = 400;
    }
}

class NotFoundError extends Error {
    constructor(resource) {
        super(`${resource} not found`);
        this.name = 'NotFoundError';
        this.statusCode = 404;
    }
}

module.exports = { ValidationError, NotFoundError };

// Usage:
const { NotFoundError } = require('../utils/errors');

router.get('/:id', async (req, res, next) => {
    try {
        const app = await Application.getById(req.params.id);
        if (!app) {
            throw new NotFoundError('Application');
        }
        res.json({ success: true, application: app });
    } catch (error) {
        next(error);
    }
});
```

---

## Database Error Handling

### Transaction Rollback on Error

```javascript
// models/Application.js - Transaction with rollback
static async create(data) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        const [applicationResult] = await connection.query(
            'INSERT INTO applications SET ?',
            [applicationRecord]
        );
        
        const applicationId = applicationResult.insertId;
        
        // If badge insert fails, application insert is rolled back
        if (data.badgesToCounsel.length > 0) {
            await connection.query(
                'INSERT INTO application_badges (application_id, merit_badge_id, badge_type) VALUES ?',
                [badgeValues]
            );
        }
        
        await connection.commit();
        return { applicationId };
        
    } catch (error) {
        await connection.rollback(); // Undo all changes
        throw error; // Propagate to route handler
    } finally {
        connection.release(); // ALWAYS release connection
    }
}
```

### WARNING: Missing Connection Release

```javascript
// BAD - Connection leak on error
static async create(data) {
    const connection = await db.getConnection();
    try {
        await connection.query('INSERT INTO applications SET ?', [data]);
        await connection.commit();
        connection.release(); // Only releases on success!
    } catch (error) {
        await connection.rollback();
        throw error; // Connection never released!
    }
}

// GOOD - Always release in finally
static async create(data) {
    const connection = await db.getConnection();
    try {
        await connection.query('INSERT INTO applications SET ?', [data]);
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release(); // Guaranteed to run
    }
}
```

**Why Connection Leaks Break:**
1. **Pool exhaustion** - New requests hang waiting for connections
2. **Server hangs** - All connections stuck in error state
3. **Database locks** - Uncommitted transactions hold locks indefinitely
4. **Restart required** - Only fix is restart server to reset pool

See the **mysql** skill for database-specific error patterns.

---

## File Upload Error Recovery

### Cleanup Uploaded Files on Application Error

```javascript
// routes/applications.js - File cleanup on error
router.post('/', upload.array('certifications', 10), async (req, res, next) => {
    try {
        const certifications = req.files ? req.files.map(file => ({
            filename: file.originalname,
            filepath: file.path,
            size: file.size
        })) : [];
        
        const result = await Application.create({
            ...req.body,
            certifications
        });
        
        res.status(201).json({
            success: true,
            applicationId: result.applicationId
        });
        
    } catch (error) {
        // CRITICAL: Delete uploaded files if database insert fails
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

### Multer Error Handling

```javascript
// routes/applications.js - Handle Multer-specific errors
const multer = require('multer');

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Multer-specific errors (file size, file count)
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE} bytes`
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: `Too many files. Maximum is ${process.env.MAX_FILES}`
            });
        }
    }
    
    // Other errors
    next(err);
});
```

See the **multer** skill for file upload error patterns.

---

## Validation Error Handling

### express-validator Integration

```javascript
// routes/applications.js - Validation error formatting
const { body, validationResult } = require('express-validator');

const validateApplication = [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('age').isInt({ min: 18 }).withMessage('Age must be at least 18'),
    body('email').isEmail().withMessage('Valid email is required'),
];

router.post('/', validateApplication, async (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array() // [{ msg: "...", param: "...", location: "body" }]
        });
    }
    
    // Validation passed, proceed
    try {
        const result = await Application.create(req.body);
        res.status(201).json({ success: true, applicationId: result.applicationId });
    } catch (error) {
        next(error);
    }
});
```

See the **express-validator** skill for validation patterns.

---

## Process-Level Error Handling

### Unhandled Rejection Handler

```javascript
// server.js - Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // In production, log to monitoring service (e.g., Sentry)
    // process.exit(1); // Optionally exit to restart via process manager
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1); // Must exit, app state is undefined
});
```

### Graceful Shutdown

```javascript
// server.js - Handle shutdown signals
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

const shutdown = async () => {
    console.log('Shutting down gracefully...');
    
    server.close(() => {
        console.log('HTTP server closed');
    });
    
    // Close database pool
    await db.end();
    console.log('Database connections closed');
    
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);