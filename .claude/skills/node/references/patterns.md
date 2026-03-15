# Node.js Patterns Reference

## Contents
- Async/Await with Error Handling
- Connection Pool Management
- Environment Configuration
- Middleware Pipeline
- File Stream Processing
- Anti-Patterns

---

## Async/Await with Error Handling

### Database Operations with Transactions

```javascript
// models/Application.js - GOOD: Transaction with proper cleanup
static async create(data) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        const [applicationResult] = await connection.query(
            'INSERT INTO applications (first_name, last_name, email, age) VALUES (?, ?, ?, ?)',
            [data.firstName, data.lastName, data.email, data.age]
        );
        
        if (data.certifications.length > 0) {
            const certValues = data.certifications.map(cert => [
                applicationResult.insertId,
                cert.filename,
                cert.filepath,
                cert.size
            ]);
            
            await connection.query(
                'INSERT INTO certifications (application_id, filename, filepath, file_size) VALUES ?',
                [certValues]
            );
        }
        
        await connection.commit();
        return { applicationId: applicationResult.insertId };
    } catch (error) {
        await connection.rollback();
        throw error; // Let route handler catch and pass to error middleware
    } finally {
        connection.release(); // CRITICAL: Always release connection
    }
}
```

### WARNING: Missing Error Propagation

```javascript
// BAD - Swallowing errors silently
router.post('/applications', async (req, res) => {
    try {
        const result = await Application.create(req.body);
        res.json({ success: true, data: result });
    } catch (error) {
        console.log(error); // Silent failure - user sees nothing
    }
});

// GOOD - Pass to Express error middleware
router.post('/applications', async (req, res, next) => {
    try {
        const result = await Application.create(req.body);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error); // Express error handler will format response
    }
});
```

**Why Silent Failures Break:**
1. User receives no feedback when operations fail
2. Debugging production issues becomes impossible
3. Database connections may leak if cleanup is in catch block
4. Violates HTTP contract - should return 500 on server errors

---

## Connection Pool Management

### Pool Configuration for Express Apps

```javascript
// config/database.js - Production-ready pool
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,      // Queue requests when pool exhausted
    connectionLimit: 10,            // Max connections (adjust for load)
    queueLimit: 0,                  // Unlimited queue (change for backpressure)
    enableKeepAlive: true,          // Prevent connection timeouts
    keepAliveInitialDelay: 10000    // 10s keepalive ping
});

// Test connection on startup
pool.getConnection()
    .then(connection => {
        console.log('✓ Database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('✗ Database connection failed:', err.message);
        process.exit(1);
    });

module.exports = pool;
```

### WARNING: Creating New Pool Per Request

```javascript
// BAD - NEVER create pool in request handler
router.get('/data', async (req, res) => {
    const pool = mysql.createPool({ /* config */ }); // Connection leak!
    const [rows] = await pool.query('SELECT * FROM data');
    res.json(rows);
});

// GOOD - Import singleton pool
const db = require('../config/database');

router.get('/data', async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM data');
        res.json(rows);
    } catch (error) {
        next(error);
    }
});
```

**Why New Pools Break:**
1. **Connection exhaustion** - MySQL has connection limits (default 151)
2. **Memory leaks** - Pools never get garbage collected
3. **Performance degradation** - Connection handshake on every request
4. **Server crashes** - OS file descriptor limits exceeded

---

## Environment Configuration

### dotenv Loading Strategy

```javascript
// server.js - Load at application entry point
require('dotenv').config(); // FIRST LINE after imports

const express = require('express');
const db = require('./config/database'); // Uses process.env from dotenv

const app = express();
const PORT = process.env.PORT || 3000;

// Validate critical env vars on startup
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missing = requiredEnvVars.filter(v => !process.env[v]);

if (missing.length > 0) {
    console.error(`✗ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
}
```

### Type Coercion for Environment Variables

```javascript
// routes/applications.js - Multer config
const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 31457280, // String to number
        files: parseInt(process.env.MAX_FILES) || 10
    }
});

// config/database.js - Boolean conversion
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});
```

---

## Middleware Pipeline

### Request Processing Order

```javascript
// server.js - Middleware order matters
const express = require('express');
const cors = require('cors');
const app = express();

// 1. CORS must be first to handle preflight
app.use(cors());

// 2. Body parsers before routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Static files (no processing needed)
app.use(express.static('public'));

// 4. Application routes
app.use('/api/applications', require('./routes/applications'));

// 5. Error handler MUST be last
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});
```

### WARNING: Middleware After Routes

```javascript
// BAD - Body parser after routes
app.use('/api/applications', require('./routes/applications'));
app.use(express.json()); // Never runs for /api/applications

// GOOD - Parsers before routes
app.use(express.json());
app.use('/api/applications', require('./routes/applications'));
```

---

## File Stream Processing

### Multer with Cleanup on Error

```javascript
// routes/applications.js - Error handling with file cleanup
router.post('/', upload.array('certifications', 10), async (req, res, next) => {
    try {
        const certifications = req.files ? req.files.map(file => ({
            filename: file.originalname,
            filepath: file.path,
            size: file.size
        })) : [];
        
        const result = await Application.create({ ...req.body, certifications });
        res.status(201).json({ success: true, applicationId: result.applicationId });
        
    } catch (error) {
        // CRITICAL: Clean up uploaded files on application error
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

### File Filter for Security

```javascript
// routes/applications.js - Block executable files
const path = require('path');

const fileFilter = (req, file, cb) => {
    const forbiddenExtensions = ['.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.js', '.vbs', '.sh'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (forbiddenExtensions.includes(ext)) {
        return cb(new Error(`File type ${ext} is not allowed for security reasons`), false);
    }
    
    cb(null, true);
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter
});
```

See the **multer** skill for advanced file upload patterns.