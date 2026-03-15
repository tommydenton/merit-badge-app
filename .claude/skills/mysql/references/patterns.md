# MySQL Patterns Reference

## Contents
- Parameterized Queries (SQL Injection Prevention)
- Transaction Patterns
- Connection Pool Management
- Error Handling
- Batch Operations
- Schema Design Patterns

---

## WARNING: Never Use String Concatenation in Queries

**The Problem:**

```javascript
// BAD - SQL injection vulnerability
static async getByEmail(email) {
    const [rows] = await pool.query(
        `SELECT * FROM applications WHERE email = '${email}'`
    );
    return rows[0];
}
```

**Why This Breaks:**
1. **SQL Injection** - Input `' OR '1'='1` returns all records
2. **Data Breach** - Attacker can dump entire database with `'; DROP TABLE applications; --`
3. **No Type Safety** - Numbers, booleans, nulls handled incorrectly

**The Fix:**

```javascript
// GOOD - Parameterized query prevents injection
static async getByEmail(email) {
    const [rows] = await pool.query(
        'SELECT * FROM applications WHERE email = ?',
        [email]  // mysql2 escapes this automatically
    );
    return rows[0];
}
```

**When You Might Be Tempted:**
Building dynamic WHERE clauses, sorting by column names, or complex filtering. Instead, use parameter arrays and whitelist column names.

---

## Parameterized Queries

### Single Parameter

```javascript
// models/Application.js
static async getById(id) {
    const [rows] = await pool.query(
        'SELECT * FROM applications WHERE id = ?',
        [id]
    );
    return rows[0];
}
```

### Multiple Parameters

```javascript
static async create(data) {
    const [result] = await pool.query(
        'INSERT INTO applications (first_name, last_name, age, phone, email, is_bsa_volunteer, bsa_member_id, district, purpose, qualifications, additional_info) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
            data.firstName,
            data.lastName,
            data.age,
            data.phone,
            data.email,
            data.isVolunteer,
            data.bsaMemberId,
            data.district,
            data.purpose,
            data.qualifications,
            data.additionalInfo
        ]
    );
    return result.insertId;
}
```

### Dynamic WHERE Clauses (Safe Pattern)

```javascript
// DON'T concatenate column names from user input
// DO use a whitelist

static async search(filters) {
    const allowedColumns = ['first_name', 'last_name', 'email', 'district'];
    const conditions = [];
    const values = [];
    
    for (const [key, value] of Object.entries(filters)) {
        if (allowedColumns.includes(key)) {
            conditions.push(`${key} = ?`);
            values.push(value);
        }
    }
    
    const whereClause = conditions.length > 0 
        ? `WHERE ${conditions.join(' AND ')}` 
        : '';
    
    const [rows] = await pool.query(
        `SELECT * FROM applications ${whereClause}`,
        values
    );
    return rows;
}
```

---

## Transaction Patterns

### Multi-Table Insert (Used in Application.create)

```javascript
// models/Application.js
static async create(data) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Step 1: Insert main record
        const [appResult] = await connection.query(
            'INSERT INTO applications (first_name, last_name, email, ...) VALUES (?, ?, ?, ...)',
            [data.firstName, data.lastName, data.email, ...]
        );
        const applicationId = appResult.insertId;

        // Step 2: Insert related records
        for (const badgeId of data.badgesToCounsel) {
            await connection.query(
                'INSERT INTO application_badges (application_id, merit_badge_id, badge_type) VALUES (?, ?, ?)',
                [applicationId, badgeId, 'counsel']
            );
        }

        // Step 3: Insert file metadata
        for (const cert of data.certifications) {
            await connection.query(
                'INSERT INTO certifications (application_id, filename, filepath, file_size) VALUES (?, ?, ?, ?)',
                [applicationId, cert.filename, cert.filepath, cert.size]
            );
        }

        await connection.commit();
        return { applicationId };
    } catch (error) {
        await connection.rollback();
        throw error;  // Let Express error handler deal with it
    } finally {
        connection.release();  // ALWAYS release connection
    }
}
```

### WARNING: Forgetting connection.release()

**The Problem:**

```javascript
// BAD - Connection leak
static async update(id, data) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    await connection.query('UPDATE applications SET ... WHERE id = ?', [..., id]);
    await connection.commit();
    // Missing connection.release() - pool exhausted after 10 requests
}
```

**Why This Breaks:**
1. **Connection Pool Exhaustion** - After 10 requests, new requests hang forever
2. **Memory Leak** - Connections never returned to pool
3. **Timeout Errors** - Users see "Connection timeout" after pool limit reached

**The Fix:**

```javascript
// GOOD - Always release in finally block
static async update(id, data) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query('UPDATE applications SET ... WHERE id = ?', [..., id]);
        await connection.commit();
        return { success: true };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();  // Runs even if error occurs
    }
}
```

---

## Connection Pool Configuration

### Production Settings (config/database.js)

```javascript
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,      // Queue requests when pool full
    connectionLimit: 10,            // Max concurrent connections
    queueLimit: 0,                  // Unlimited queue
    enableKeepAlive: true,          // Prevent idle connection drops
    keepAliveInitialDelay: 0
});
```

### Testing Connection on Startup

```javascript
// server.js
const pool = require('./config/database');

pool.query('SELECT 1')
    .then(() => console.log('✓ Database connected successfully'))
    .catch(err => {
        console.error('✗ Database connection failed:', err.message);
        process.exit(1);  // Fail fast if DB unavailable
    });
```

---

## Error Handling

### Express Route Error Pattern

```javascript
// routes/applications.js
router.post('/', upload.array('certifications', 10), validateApplication, async (req, res, next) => {
    try {
        const result = await Application.create(applicationData);
        res.status(201).json({
            success: true,
            message: 'Application submitted successfully',
            applicationId: result.applicationId
        });
    } catch (error) {
        // Clean up uploaded files on database error
        if (req.files) {
            const fs = require('fs');
            req.files.forEach(file => {
                fs.unlink(file.path, err => {
                    if (err) console.error('Error deleting file:', err);
                });
            });
        }
        next(error);  // Pass to Express error handler
    }
});
```

### Model Error Handling

```javascript
// models/Application.js - Let errors bubble up
static async getById(id) {
    // DON'T catch errors here - let routes handle them
    const [rows] = await pool.query(
        'SELECT * FROM applications WHERE id = ?',
        [id]
    );
    return rows[0];
}
```

---

## Batch Operations

### Batch Insert with VALUES

```javascript
// Instead of N queries, use one query with multiple value sets
static async createBadges(applicationId, badgeIds, badgeType) {
    if (badgeIds.length === 0) return;
    
    const values = badgeIds.map(badgeId => [applicationId, badgeId, badgeType]);
    
    await pool.query(
        'INSERT INTO application_badges (application_id, merit_badge_id, badge_type) VALUES ?',
        [values]  // mysql2 handles array of arrays
    );
}
```

### Batch Update Pattern

```javascript
// Update multiple records efficiently
static async updateApplicationStatus(applicationIds, status) {
    await pool.query(
        'UPDATE applications SET status = ? WHERE id IN (?)',
        [status, applicationIds]  // mysql2 handles array in IN clause
    );
}
```

---

## Schema Design Patterns

### Character Set and Collation

```sql
-- database/schema.sql
-- ALWAYS use utf8mb4 for full Unicode support (including emoji)
CREATE TABLE applications (
    ...
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Database-level setting
CREATE DATABASE merit_badge_app 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;
```

### Index Strategy

```sql
-- Index frequently queried columns
CREATE TABLE applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    district VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),          -- For WHERE email = ?
    INDEX idx_district (district),    -- For filtering by district
    INDEX idx_created_at (created_at) -- For ORDER BY created_at DESC
);
```

### Foreign Keys with CASCADE

```sql
-- application_badges table
CREATE TABLE application_badges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    merit_badge_id INT NOT NULL,
    badge_type ENUM('counsel', 'drop') NOT NULL,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (merit_badge_id) REFERENCES merit_badges(id) ON DELETE CASCADE,
    INDEX idx_application (application_id),
    INDEX idx_badge (merit_badge_id)
);

-- ON DELETE CASCADE: deleting an application automatically deletes related badges