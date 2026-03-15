---
name: mysql
description: |
  Designs MySQL schemas, writes parameterized queries, and manages database connections.
  Use when: creating database schemas, writing queries, setting up connection pools, performing transactions, or troubleshooting database operations in this Express.js application.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__query-docs
---

# MySQL Skill

Manages MySQL database operations for the Merit Badge Counselor application using mysql2 with promise-based connection pooling. This project uses parameterized queries exclusively, implements transactions for multi-table inserts, and follows a normalized schema design with four core tables.

## Quick Start

### Connection Pool Setup

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

### Parameterized Query Pattern

```javascript
// models/Application.js - Safe query with parameters
static async getAllMeritBadges() {
    const [rows] = await pool.query(
        'SELECT id, name FROM merit_badges ORDER BY name ASC'
    );
    return rows;
}

static async getById(id) {
    const [rows] = await pool.query(
        'SELECT * FROM applications WHERE id = ?',
        [id]  // Parameters prevent SQL injection
    );
    return rows[0];
}
```

### Transaction for Multi-Table Insert

```javascript
// models/Application.js - Transaction ensures atomicity
static async create(data) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Insert application
        const [appResult] = await connection.query(
            'INSERT INTO applications (first_name, last_name, age, phone, email, is_bsa_volunteer, bsa_member_id, district, purpose, qualifications, additional_info) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [data.firstName, data.lastName, data.age, data.phone, data.email, data.isVolunteer, data.bsaMemberId, data.district, data.purpose, data.qualifications, data.additionalInfo]
        );

        const applicationId = appResult.insertId;

        // Insert badges
        for (const badgeId of data.badgesToCounsel) {
            await connection.query(
                'INSERT INTO application_badges (application_id, merit_badge_id, badge_type) VALUES (?, ?, ?)',
                [applicationId, badgeId, 'counsel']
            );
        }

        // Insert certifications
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
        throw error;
    } finally {
        connection.release();
    }
}
```

## Key Concepts

| Concept | Usage | Example |
|---------|-------|---------|
| Connection Pool | Reusable connections for concurrent requests | `const pool = mysql.createPool({...})` |
| Parameterized Query | Prevent SQL injection with `?` placeholders | `pool.query('SELECT * FROM users WHERE id = ?', [userId])` |
| Transaction | Atomic multi-table operations | `connection.beginTransaction()` → `commit()` / `rollback()` |
| Promise API | mysql2/promise for async/await | `const [rows] = await pool.query(...)` |
| Destructuring | Extract rows and metadata | `const [rows, fields] = await pool.query(...)` |

## Common Patterns

### Schema Design with Foreign Keys

**When:** Defining related tables with referential integrity

```sql
-- database/schema.sql
CREATE TABLE IF NOT EXISTS applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS application_badges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    merit_badge_id INT NOT NULL,
    badge_type ENUM('counsel', 'drop') NOT NULL,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (merit_badge_id) REFERENCES merit_badges(id) ON DELETE CASCADE,
    INDEX idx_application (application_id)
) ENGINE=InnoDB;
```

### Join Query for Related Data

**When:** Retrieving application with associated badges

```javascript
static async getById(id) {
    const [apps] = await pool.query(
        'SELECT * FROM applications WHERE id = ?',
        [id]
    );
    
    if (!apps.length) return null;
    
    const [badges] = await pool.query(`
        SELECT mb.name, ab.badge_type 
        FROM application_badges ab 
        JOIN merit_badges mb ON ab.merit_badge_id = mb.id 
        WHERE ab.application_id = ?`,
        [id]
    );
    
    return { ...apps[0], badges };
}
```

## See Also

- [patterns](references/patterns.md) - Query patterns, transactions, error handling
- [workflows](references/workflows.md) - Schema design, migrations, backup procedures

## Related Skills

- **express** - Routes use models that call MySQL queries
- **node** - mysql2 runs on Node.js runtime
- **express-validator** - Validates input before database operations
- **multer** - File uploads stored with metadata in certifications table

## Documentation Resources

> Fetch latest MySQL and mysql2 documentation with Context7.

**How to use Context7:**
1. Use `mcp__context7__resolve-library-id` to search for "mysql2 node" or "mysql database"
2. **Prefer website documentation** (IDs starting with `/websites/`) over source code repositories when available
3. Query with `mcp__context7__query-docs` using the resolved library ID

**Library ID:** Resolve using `mcp__context7__resolve-library-id` with query "mysql2 node promise"

**Recommended Queries:**
- "mysql2 connection pool best practices"
- "mysql2 parameterized queries"
- "mysql2 transaction handling"
- "mysql character set utf8mb4"