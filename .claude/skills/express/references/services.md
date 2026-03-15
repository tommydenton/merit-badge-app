# Services Reference

## Contents
- Model Layer Architecture
- Database Operation Patterns
- Transaction Handling
- Static Methods vs Instances
- Anti-Patterns

---

## Model Layer Architecture

This application uses a **static method model pattern** where models are classes with static methods for database operations. No ORM is used—all queries are raw SQL with parameterized statements.

### Project Pattern

```javascript
// models/Application.js
const db = require('../config/database');

class Application {
    static async create(data) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            
            // Insert main application
            const [result] = await connection.query(
                'INSERT INTO applications (first_name, last_name, ...) VALUES (?, ?, ...)',
                [data.firstName, data.lastName, ...]
            );
            const applicationId = result.insertId;
            
            // Insert related badges
            if (data.badgesToCounsel.length > 0) {
                const badgeValues = data.badgesToCounsel.map(badgeId => 
                    [applicationId, badgeId, 'counsel']
                );
                await connection.query(
                    'INSERT INTO application_badges (application_id, merit_badge_id, badge_type) VALUES ?',
                    [badgeValues]
                );
            }
            
            await connection.commit();
            return { applicationId };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = Application;
```

**Why This Works:**
- **Transaction safety:** All-or-nothing inserts prevent partial data
- **Connection management:** Always release connections back to pool
- **Error propagation:** Rollback on failure, routes handle via `next(error)`

---

## Database Operation Patterns

### SELECT Queries

```javascript
// models/Application.js
static async getAllMeritBadges() {
    const connection = await db.getConnection();
    try {
        const [rows] = await connection.query(
            'SELECT id, name FROM merit_badges ORDER BY name'
        );
        return rows;
    } finally {
        connection.release();
    }
}

static async getById(id) {
    const connection = await db.getConnection();
    try {
        // Main application data
        const [apps] = await connection.query(
            'SELECT * FROM applications WHERE id = ?',
            [id]
        );
        
        if (apps.length === 0) return null;
        
        const application = apps[0];
        
        // Related badges to counsel
        const [counselBadges] = await connection.query(`
            SELECT mb.name 
            FROM application_badges ab
            JOIN merit_badges mb ON ab.merit_badge_id = mb.id
            WHERE ab.application_id = ? AND ab.badge_type = 'counsel'
        `, [id]);
        application.badges_to_counsel = counselBadges.map(b => b.name);
        
        // Related certifications
        const [certs] = await connection.query(
            'SELECT * FROM certifications WHERE application_id = ?',
            [id]
        );
        application.certifications = certs;
        
        return application;
    } finally {
        connection.release();
    }
}
```

### INSERT with AUTO_INCREMENT

```javascript
static async create(data) {
    const connection = await db.getConnection();
    try {
        const [result] = await connection.query(
            'INSERT INTO applications (first_name, last_name, age, email, ...) VALUES (?, ?, ?, ?, ...)',
            [data.firstName, data.lastName, data.age, data.email, ...]
        );
        return { applicationId: result.insertId };
    } finally {
        connection.release();
    }
}
```

### Batch INSERT

```javascript
// Insert multiple application_badges rows
const badgeValues = data.badgesToCounsel.map(badgeId => 
    [applicationId, badgeId, 'counsel']
);

if (badgeValues.length > 0) {
    await connection.query(
        'INSERT INTO application_badges (application_id, merit_badge_id, badge_type) VALUES ?',
        [badgeValues] // Array of arrays
    );
}
```

---

## Transaction Handling

### Standard Transaction Pattern

```javascript
static async create(data) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        // Step 1: Insert main record
        const [appResult] = await connection.query(
            'INSERT INTO applications (...) VALUES (?)',
            [...]
        );
        const applicationId = appResult.insertId;
        
        // Step 2: Insert related badges
        if (data.badgesToCounsel.length > 0) {
            await connection.query(
                'INSERT INTO application_badges (application_id, merit_badge_id, badge_type) VALUES ?',
                [badgeValues]
            );
        }
        
        // Step 3: Insert certifications
        if (data.certifications.length > 0) {
            await connection.query(
                'INSERT INTO certifications (application_id, filename, filepath, file_size) VALUES ?',
                [certValues]
            );
        }
        
        await connection.commit();
        return { applicationId };
    } catch (error) {
        await connection.rollback();
        throw error; // Route handler will catch and send error response
    } finally {
        connection.release(); // Always return connection to pool
    }
}
```

**Critical Points:**
1. **Always rollback on error** - Prevents partial inserts
2. **Always release connection** - Use `finally` block to ensure pool cleanup
3. **Throw errors** - Let route handlers format HTTP responses

### WARNING: Forgetting to Release Connections

**The Problem:**

```javascript
// BAD - Connection leak
static async getAllMeritBadges() {
    const connection = await db.getConnection();
    const [rows] = await connection.query('SELECT * FROM merit_badges');
    return rows;
    // Connection never released - pool exhausted after ~10 requests
}
```

**Why This Breaks:**
1. **Pool Exhaustion:** After 10 concurrent requests, all connections are held
2. **Timeout Errors:** New requests hang waiting for available connection
3. **Server Crash:** Eventually runs out of database connections

**The Fix:**

```javascript
// GOOD - Always release
static async getAllMeritBadges() {
    const connection = await db.getConnection();
    try {
        const [rows] = await connection.query('SELECT * FROM merit_badges');
        return rows;
    } finally {
        connection.release(); // Guaranteed to run even if query throws
    }
}
```

---

## Static Methods vs Instances

This project uses **static methods** because there's no need for model instances with state.

### When to Use Static Methods

```javascript
// GOOD - Static methods for stateless operations
class Application {
    static async create(data) { ... }
    static async getById(id) { ... }
    static async getAllMeritBadges() { ... }
}

// Usage in routes
const badges = await Application.getAllMeritBadges();
const app = await Application.getById(123);
```

**Why This Works:**
- No instantiation overhead
- Clear that models are data access only
- Matches the project's stateless API design

### When You'd Use Instances (Not This Project)

```javascript
// Example from ActiveRecord-style ORMs
const application = new Application({ firstName: 'John', ... });
application.firstName = 'Jane'; // Modify state
await application.save();       // Persist changes
```

This project doesn't use instances because:
- No need to track state changes (form submissions are one-time)
- Simpler testing (static methods easier to mock)
- Raw SQL is more explicit than ORM magic

---

## Anti-Patterns

### WARNING: SQL Injection via String Concatenation

**The Problem:**

```javascript
// BAD - SQL injection vulnerability
static async getById(id) {
    const connection = await db.getConnection();
    const [rows] = await connection.query(
        `SELECT * FROM applications WHERE id = ${id}` // NEVER DO THIS
    );
    return rows[0];
}

// Exploit: Application.getById("1 OR 1=1") returns all applications
```

**Why This Breaks:**
1. **Data Breach:** Attacker can read all records
2. **Data Loss:** `DELETE` or `UPDATE` entire tables
3. **Privilege Escalation:** Access admin-only data

**The Fix:**

```javascript
// GOOD - Parameterized query
static async getById(id) {
    const connection = await db.getConnection();
    try {
        const [rows] = await connection.query(
            'SELECT * FROM applications WHERE id = ?', // Placeholder
            [id] // Value array
        );
        return rows[0];
    } finally {
        connection.release();
    }
}
```

**When You Might Be Tempted:**
- Dynamic WHERE clauses with multiple optional filters
- **Solution:** Build parameter arrays dynamically, never concatenate SQL strings

### WARNING: Not Handling Empty Arrays in Batch Inserts

**The Problem:**

```javascript
// BAD - Crashes if no badges selected
const badgeValues = data.badgesToCounsel.map(badgeId => [applicationId, badgeId, 'counsel']);
await connection.query(
    'INSERT INTO application_badges (application_id, merit_badge_id, badge_type) VALUES ?',
    [badgeValues] // Empty array causes SQL syntax error
);
```

**The Fix:**

```javascript
// GOOD - Check before inserting
if (data.badgesToCounsel.length > 0) {
    const badgeValues = data.badgesToCounsel.map(badgeId => 
        [applicationId, badgeId, 'counsel']
    );
    await connection.query(
        'INSERT INTO application_badges (application_id, merit_badge_id, badge_type) VALUES ?',
        [badgeValues]
    );
}
```

See the **mysql** skill for connection pooling configuration and the **node** skill for async/await patterns.