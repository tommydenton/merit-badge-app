---
name: node
description: |
  Configures Node.js runtime, async patterns, and npm package management for Express.js applications with MySQL integration.
  Use when: setting up Node.js environments, managing async operations, configuring npm scripts, handling event loop behavior, or debugging Node.js runtime issues
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__query-docs
---

# Node Skill

Node.js runtime management for the Merit Badge Counselor application. This project uses Node.js 14+ with Express.js for RESTful APIs, async/await patterns for database operations, and npm for dependency management. Critical patterns include promise-based MySQL connections via mysql2/promise, Multer file upload handling, and environment-based configuration with dotenv.

## Quick Start

### Server Initialization with Error Handling

```javascript
// server.js - Express app with proper async initialization
const express = require('express');
const db = require('./config/database');
const app = express();
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    try {
        // Test database connection on startup
        await db.query('SELECT 1');
        console.log(`✓ Server running on port ${PORT}`);
        console.log('✓ Database connected successfully');
    } catch (error) {
        console.error('✗ Database connection failed:', error.message);
        process.exit(1);
    }
});
```

### Async/Await with Database Transactions

```javascript
// models/Application.js - Transaction pattern
static async create(data) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        const [result] = await connection.query(
            'INSERT INTO applications SET ?',
            [applicationRecord]
        );
        
        // Insert related records
        if (data.badgesToCounsel.length > 0) {
            await connection.query(
                'INSERT INTO application_badges (application_id, merit_badge_id, badge_type) VALUES ?',
                [badgeValues]
            );
        }
        
        await connection.commit();
        return { applicationId: result.insertId };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
```

## Key Concepts

| Concept | Usage | Example |
|---------|-------|---------|
| Event Loop | Non-blocking I/O for database/file operations | `await db.query()` instead of blocking calls |
| Connection Pooling | Reuse database connections | `mysql2.createPool()` in config/database.js |
| Middleware Chain | Request processing pipeline | `express.json()`, `multer()`, validators |
| Error Propagation | Pass errors to Express error handler | `next(error)` in async route handlers |
| Environment Config | Runtime configuration via .env | `process.env.DB_HOST` |

## Common Patterns

### Promise-Based MySQL Connection Pool

**When:** All database operations require connection management

```javascript
// config/database.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;
```

### Async Route Handler Error Handling

**When:** Every async Express route must catch errors

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

### File Upload with Stream Processing

**When:** Handling multipart form data with files

```javascript
// routes/applications.js - Multer configuration
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, process.env.UPLOAD_DIR || 'public/uploads');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 31457280,
        files: parseInt(process.env.MAX_FILES) || 10
    }
});
```

## See Also

- [patterns](references/patterns.md) - Async patterns, error handling, middleware
- [types](references/types.md) - Type coercion, environment variables, Buffer handling
- [modules](references/modules.md) - CommonJS imports, module structure, npm scripts
- [errors](references/errors.md) - Error handling strategies, debugging, logging

## Related Skills

- **express** - Web framework built on Node.js runtime
- **mysql** - Database operations use Node.js async patterns
- **multer** - File upload middleware leveraging Node.js streams
- **express-validator** - Validation middleware in Express pipeline

## Documentation Resources

> Fetch latest Node.js documentation with Context7.

**How to use Context7:**
1. Use `mcp__context7__resolve-library-id` to search for "nodejs official documentation"
2. **Prefer website documentation** (IDs starting with `/websites/`) over source code repositories when available
3. Query with `mcp__context7__query-docs` using the resolved library ID

**Recommended Queries:**
- "nodejs async await best practices"
- "nodejs event loop and blocking operations"
- "nodejs stream processing and buffers"
- "nodejs error handling patterns"