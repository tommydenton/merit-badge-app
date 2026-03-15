# Database Reference

## Contents
- Connection Pool Configuration
- Query Patterns with mysql2
- Transaction Best Practices
- N+1 Query Prevention
- Migration Management
- Anti-Patterns

---

## Connection Pool Configuration

This application uses **mysql2/promise** with connection pooling for concurrent request handling.

### Database Config Setup

```javascript
// config/database.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,        // Max 10 concurrent connections
    queueLimit: 0,              // Unlimited queue
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
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

### Environment Variables

```env
# .env
DB_HOST=localhost
DB_USER=merit_user
DB_PASSWORD=secure_password
DB_NAME=merit_badge_app
DB_PORT=3306
```

**Why Connection Pooling:**
- **Reuse:** Avoid connection overhead for every request
- **Concurrency:** Handle 10 simultaneous requests without blocking
- **Resilience:** Automatic reconnection on connection loss

---

## Query Patterns with mysql2

### Basic SELECT

```javascript
const db = require('../config/database');

static async getAllMeritBadges() {
    const connection = await db.getConnection();
    try {
        const [rows] = await connection.query(
            'SELECT id, name FROM merit_badges ORDER BY name'
        );
        return rows; // Array of objects: [{ id: 1, name: 'Archery' }, ...]
    } finally {
        connection.release();
    }
}
```

**mysql2 Promise Response:**
- `[rows, fields]` destructuring returns:
  - `rows`: Array of result objects
  - `fields`: Column metadata (usually ignored)

### Parameterized Query (SQL Injection Prevention)

```javascript
static async getById(id) {
    const connection = await db.getConnection();
    try {
        const [rows] = await connection.query(
            'SELECT * FROM applications WHERE id = ?',
            [id] // Values array
        );
        return rows[0] || null;
    } finally {
        connection.release();
    }
}
```

**Multiple Parameters:**

```javascript
const [rows] = await connection.query(
    'SELECT * FROM applications WHERE email = ? AND district = ?',
    [email, district]
);
```

### INSERT and Get Auto-Increment ID

```javascript
static async create(data) {
    const connection = await db.getConnection();
    try {
        const [result] = await connection.query(
            `INSERT INTO applications 
            (first_name, last_name, age, phone, email, is_bsa_volunteer, bsa_member_id, district, purpose, qualifications, additional_info) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.firstName,
                data.lastName,
                data.age,
                data.phone,
                data.email,
                data.isVolunteer === 'yes',
                data.bsaMemberId,
                data.district,
                data.purpose,
                data.qualifications,
                data.additionalInfo
            ]
        );
        return { applicationId: result.insertId }; // Auto-increment ID
    } finally {
        connection.release();
    }
}
```

### Batch INSERT (Multiple Rows)

```javascript
// Insert multiple application_badges rows
const badgesToCounsel = [1, 5, 12]; // Badge IDs
const applicationId = 123;

const badgeValues = badgesToCounsel.map(badgeId => 
    [applicationId, badgeId, 'counsel']
);

await connection.query(
    'INSERT INTO application_badges (application_id, merit_badge_id, badge_type) VALUES ?',
    [badgeValues] // Note: array of array
);

// Generates:
// INSERT INTO application_badges (application_id, merit_badge_id, badge_type) 
// VALUES (123, 1, 'counsel'), (123, 5, 'counsel'), (123, 12, 'counsel')
```

---

## Transaction Best Practices

### Standard Transaction Pattern

```javascript
static async create(data) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        // 1. Insert main application
        const [appResult] = await connection.query(
            'INSERT INTO applications (...) VALUES (?)',
            [...]
        );
        const applicationId = appResult.insertId;
        
        // 2. Insert badges to counsel
        if (data.badgesToCounsel.length > 0) {
            const counselValues = data.badgesToCounsel.map(badgeId => 
                [applicationId, badgeId, 'counsel']
            );
            await connection.query(
                'INSERT INTO application_badges (application_id, merit_badge_id, badge_type) VALUES ?',
                [counselValues]
            );
        }
        
        // 3. Insert badges to drop
        if (data.badgesToDrop.length > 0) {
            const dropValues = data.badgesToDrop.map(badgeId => 
                [applicationId, badgeId, 'drop']
            );
            await connection.query(
                'INSERT INTO application_badges (application_id, merit_badge_id, badge_type) VALUES ?',
                [dropValues]
            );
        }
        
        // 4. Insert certifications
        if (data.certifications.length > 0) {
            const certValues = data.certifications.map(cert => 
                [applicationId, cert.filename, cert.filepath, cert.size]
            );
            await connection.query(
                'INSERT INTO certifications (application_id, filename, filepath, file_size) VALUES ?',
                [certValues]
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
```

**Transaction Guarantees:**
- **Atomicity:** All inserts succeed or none do
- **Consistency:** Foreign key constraints enforced across all tables
- **Rollback on Error:** Partial data never committed

---

## N+1 Query Prevention

### WARNING: N+1 Query Anti-Pattern

**The Problem:**

```javascript
// BAD - N+1 query problem
static async getAllApplications() {
    const [applications] = await connection.query('SELECT * FROM applications');
    
    for (const app of applications) {
        // This runs a separate query for EACH application
        const [badges] = await connection.query(
            'SELECT mb.name FROM application_badges ab JOIN merit_badges mb ON ab.merit_badge_id = mb.id WHERE ab.application_id = ?',
            [app.id]
        );
        app.badges = badges;
    }
    return applications;
}

// 1 query for applications + N queries for badges = 101 queries for 100 applications
```

**Why This Breaks:**
1. **Performance Degradation:** 101 queries instead of 2
2. **Database Load:** Each query has connection overhead
3. **Slow Response Times:** Linear scaling with number of records

**The Fix - JOIN in Single Query:**

```javascript
// GOOD - Single query with JOIN
static async getAllApplications() {
    const [rows] = await connection.query(`
        SELECT 
            a.*,
            GROUP_CONCAT(DISTINCT CASE WHEN ab.badge_type = 'counsel' THEN mb.name END) as badges_to_counsel,
            GROUP_CONCAT(DISTINCT CASE WHEN ab.badge_type = 'drop' THEN mb.name END) as badges_to_drop
        FROM applications a
        LEFT JOIN application_badges ab ON a.id = ab.application_id
        LEFT JOIN merit_badges mb ON ab.merit_badge_id = mb.id
        GROUP BY a.id
        ORDER BY a.created_at DESC
    `);
    
    // Post-process: Convert comma-separated strings to arrays
    return rows.map(app => ({
        ...app,
        badges_to_counsel: app.badges_to_counsel ? app.badges_to_counsel.split(',') : [],
        badges_to_drop: app.badges_to_drop ? app.badges_to_drop.split(',') : []
    }));
}
```

**Alternative - Two Queries with Mapping:**

```javascript
// GOOD - Two queries, map in memory
static async getAllApplications() {
    const [applications] = await connection.query('SELECT * FROM applications');
    const [badges] = await connection.query(`
        SELECT ab.application_id, mb.name, ab.badge_type
        FROM application_badges ab
        JOIN merit_badges mb ON ab.merit_badge_id = mb.id
    `);
    
    // Build lookup map
    const badgeMap = badges.reduce((acc, badge) => {
        if (!acc[badge.application_id]) {
            acc[badge.application_id] = { counsel: [], drop: [] };
        }
        acc[badge.application_id][badge.badge_type].push(badge.name);
        return acc;
    }, {});
    
    // Attach to applications
    return applications.map(app => ({
        ...app,
        badges_to_counsel: badgeMap[app.id]?.counsel || [],
        badges_to_drop: badgeMap[app.id]?.drop || []
    }));
}
```

---

## Migration Management

This project uses **manual SQL migration files** without a migration framework.

### Schema File Structure

```sql
-- database/schema.sql
CREATE TABLE IF NOT EXISTS applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    age INT NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255) NOT NULL,
    is_bsa_volunteer BOOLEAN NOT NULL DEFAULT FALSE,
    bsa_member_id VARCHAR(50),
    district VARCHAR(100),
    purpose VARCHAR(100) NOT NULL,
    qualifications TEXT,
    additional_info TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_district (district),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Applying Schema

```bash
# Fresh install
mysql -u your_user -p merit_badge_app < database/schema.sql

# Seed data
mysql -u your_user -p merit_badge_app < database/seed_merit_badges.sql
```

### Adding New Migrations

**Create dated migration file:**

```bash
# database/migrations/2024-01-15-add-status-column.sql
ALTER TABLE applications 
ADD COLUMN status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending';

ALTER TABLE applications 
ADD INDEX idx_status (status);
```

**Apply manually:**

```bash
mysql -u your_user -p merit_badge_app < database/migrations/2024-01-15-add-status-column.sql
```

**WARNING: Missing Professional Migration Tool**

**Detected:** No migration framework (Knex, Sequelize, Prisma Migrate)

**Impact:**
- No rollback capability if migration fails
- No automatic tracking of which migrations have run
- Manual coordination required across development team
- Risk of schema drift between environments

**Recommended Solution:**

Install a migration tool:

```bash
npm install knex --save
npm install mysql2 --save  # Already installed
```

**Knex Migration Example:**

```javascript
// knexfile.js
module.exports = {
  development: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    },
    migrations: {
      directory: './database/migrations'
    }
  }
};

// Create migration
// npx knex migrate:make add_status_column

// Run migrations
// npx knex migrate:latest

// Rollback
// npx knex migrate:rollback
```

---

## Anti-Patterns

### WARNING: Not Using Indexes on Foreign Keys

**The Problem:**

```sql
-- BAD - No index on application_id
CREATE TABLE certifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    FOREIGN KEY (application_id) REFERENCES applications(id)
);

-- Query: SELECT * FROM certifications WHERE application_id = 123
-- Result: Full table scan on 100,000 rows
```

**The Fix:**

```sql
-- GOOD - Index on foreign key
CREATE TABLE certifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    FOREIGN KEY (application_id) REFERENCES applications(id),
    INDEX idx_application (application_id)  -- Critical
);
```

**When You Might Be Tempted:**
- "We only have 100 records" - indexes are cheap, add them preemptively
- "Foreign keys auto-index" - Not in MySQL, must manually add

See the **node** skill for async/await patterns.