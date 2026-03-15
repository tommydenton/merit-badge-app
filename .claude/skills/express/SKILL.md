---
name: express
description: |
  Manages Express.js routing, middleware setup, and REST API endpoints.
  Use when: creating API routes, handling file uploads, validating requests, configuring middleware, or implementing RESTful endpoints in this Merit Badge application.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__query-docs
---

# Express Skill

This Merit Badge Counselor application uses Express.js 4.18.2 as a RESTful API backend with MySQL database integration. The architecture separates routing (`routes/`), business logic (`models/`), and database configuration (`config/`). File uploads use **multer**, validation uses **express-validator**, and all database operations use promise-based mysql2 with connection pooling.

## Quick Start

### Creating a New Route

```javascript
// routes/applications.js
const express = require('express');
const router = express.Router();
const Application = require('../models/Application');

router.get('/merit-badges', async (req, res, next) => {
    try {
        const badges = await Application.getAllMeritBadges();
        res.json({ success: true, badges });
    } catch (error) {
        next(error); // Pass to error handler
    }
});

module.exports = router;
```

### File Upload Endpoint with Validation

```javascript
// routes/applications.js
const multer = require('multer');
const { body, validationResult } = require('express-validator');

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, process.env.UPLOAD_DIR),
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + '-' + file.originalname);
        }
    }),
    fileFilter: (req, file, cb) => {
        const forbidden = ['.exe', '.bat', '.sh', '.js'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (forbidden.includes(ext)) {
            return cb(new Error(`File type ${ext} not allowed`), false);
        }
        cb(null, true);
    }
});

router.post('/', 
    upload.array('certifications', 10),
    [
        body('firstName').trim().notEmpty(),
        body('email').isEmail().normalizeEmail()
    ],
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        // Process request
    }
);
```

## Key Concepts

| Concept | Usage | Example |
|---------|-------|---------|
| Router | Modular route handlers | `const router = express.Router()` |
| Middleware | Request processing pipeline | `app.use(cors())`, `app.use(express.json())` |
| Error Handler | Centralized error responses | `app.use((err, req, res, next) => {...})` |
| Static Files | Serve frontend assets | `app.use(express.static('public'))` |
| Async Routes | Promise-based handlers | `async (req, res, next) => {...}` |

## Common Patterns

### API Response Structure

**Standard Format:**

```javascript
// SUCCESS
res.json({
    success: true,
    data: result,
    message: 'Optional success message'
});

// ERROR
res.status(400).json({
    success: false,
    message: 'User-friendly error',
    errors: validationErrors // Optional
});
```

### Environment-Based Configuration

```javascript
// server.js
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
```

## See Also

- [routes](references/routes.md) - Route organization, RESTful patterns, parameter handling
- [services](references/services.md) - Business logic separation, model integration
- [database](references/database.md) - Connection pooling, transaction handling, query patterns
- [auth](references/auth.md) - BSA volunteer validation, request authentication
- [errors](references/errors.md) - Error handling middleware, validation errors, file cleanup

## Related Skills

- **multer** - File upload middleware (certifications up to 10 files, 30MB total)
- **express-validator** - Server-side validation for form inputs
- **mysql** - Database operations via mysql2 connection pool
- **node** - Runtime environment and async/await patterns

## Documentation Resources

> Fetch latest Express.js documentation with Context7.

**How to use Context7:**
1. Use `mcp__context7__resolve-library-id` to search for "express"
2. **Prefer website documentation** (IDs starting with `/websites/`) over source code repositories when available
3. Query with `mcp__context7__query-docs` using the resolved library ID

**Library ID:** `/expressjs/expressjs.com` _(resolve using mcp__context7__resolve-library-id, prefer /websites/ when available)_

**Recommended Queries:**
- "Middleware order and execution"
- "Error handling in async routes"
- "Router mounting and modular routing"
- "Request validation best practices"