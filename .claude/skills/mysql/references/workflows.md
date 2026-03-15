# MySQL Workflows Reference

## Contents
- Database Setup Workflow
- Schema Migration Workflow
- Query Development Workflow
- Backup and Restore Workflow
- Performance Troubleshooting Workflow

---

## Database Setup Workflow

### Local Development Setup

Copy this checklist:

- [ ] Install MySQL 5.7+ or 8.0+
- [ ] Create database with utf8mb4 charset
- [ ] Import schema.sql
- [ ] Import seed data (merit_badges, districts)
- [ ] Configure .env with credentials
- [ ] Test connection with `npm start`

**Step-by-Step:**

```bash
# 1. Install MySQL (macOS with Homebrew)
brew install mysql
brew services start mysql

# 2. Create database
mysql -u root -p
```

```sql
CREATE DATABASE merit_badge_app 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

CREATE USER 'merit_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON merit_badge_app.* TO 'merit_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

```bash
# 3. Import schema
mysql -u merit_user -p merit_badge_app < database/schema.sql

# 4. Import seed data
mysql -u merit_user -p merit_badge_app < database/seed_merit_badges.sql

# 5. Configure environment
cp .env.example .env
# Edit .env:
# DB_HOST=localhost
# DB_USER=merit_user
# DB_PASSWORD=secure_password
# DB_NAME=merit_badge_app

# 6. Test connection
npm start
# Should see: "✓ Database connected successfully"
```

---

## Schema Migration Workflow

### Adding a New Column

**Scenario:** Add a `phone_verified` column to applications table.

```bash
# 1. Create migration file
touch database/migrations/002_add_phone_verified.sql
```

```sql
-- database/migrations/002_add_phone_verified.sql
ALTER TABLE applications 
ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE AFTER phone;

ALTER TABLE applications
ADD INDEX idx_phone_verified (phone_verified);
```

```bash
# 2. Apply migration
mysql -u merit_user -p merit_badge_app < database/migrations/002_add_phone_verified.sql

# 3. Verify column added
mysql -u merit_user -p merit_badge_app -e "DESCRIBE applications;"

# 4. Update model (models/Application.js)
# Add phone_verified to INSERT and SELECT queries
```

### WARNING: Never Modify schema.sql Directly in Production

**The Problem:**

```bash
# BAD - Editing schema.sql and re-running it
mysql -u merit_user -p merit_badge_app < database/schema.sql
# Fails: "Table 'applications' already exists"
```

**Why This Breaks:**
1. **Data Loss Risk** - DROP TABLE removes all data
2. **No Rollback** - Can't undo schema changes without backup
3. **Version Control Chaos** - schema.sql becomes a moving target

**The Fix:**

```bash
# GOOD - Use numbered migration files
database/migrations/
├── 001_initial_schema.sql          # Copy of schema.sql
├── 002_add_phone_verified.sql      # ALTER statements only
├── 003_add_status_column.sql
└── rollback/
    ├── 002_rollback.sql            # Reverse of 002
    └── 003_rollback.sql
```

**Migration Template:**

```sql
-- database/migrations/00X_description.sql
-- Forward migration
ALTER TABLE applications ADD COLUMN new_column VARCHAR(100);

-- database/migrations/rollback/00X_rollback.sql
-- Rollback migration
ALTER TABLE applications DROP COLUMN new_column;
```

---

## Query Development Workflow

### Developing a Complex Query

**Scenario:** Get all applications with their badges grouped by type.

**Iterate-Until-Pass Pattern:**

1. Write query in MySQL CLI
2. Test with sample data
3. Verify results match expectations
4. Add to model
5. Test via API endpoint

```bash
# 1. Open MySQL CLI
mysql -u merit_user -p merit_badge_app
```

```sql
-- 2. Draft query
SELECT 
    a.id,
    a.first_name,
    a.last_name,
    a.email,
    GROUP_CONCAT(
        DISTINCT CASE WHEN ab.badge_type = 'counsel' THEN mb.name END 
        ORDER BY mb.name 
        SEPARATOR ', '
    ) AS badges_to_counsel,
    GROUP_CONCAT(
        DISTINCT CASE WHEN ab.badge_type = 'drop' THEN mb.name END 
        ORDER BY mb.name 
        SEPARATOR ', '
    ) AS badges_to_drop
FROM applications a
LEFT JOIN application_badges ab ON a.id = ab.application_id
LEFT JOIN merit_badges mb ON ab.merit_badge_id = mb.id
WHERE a.id = 1
GROUP BY a.id;

-- 3. Verify output looks correct
-- +----+------------+-----------+------------------+-------------------+-----------------+
-- | id | first_name | last_name | email            | badges_to_counsel | badges_to_drop  |
-- +----+------------+-----------+------------------+-------------------+-----------------+
-- |  1 | John       | Doe       | john@example.com | Archery, Camping  | Swimming        |
-- +----+------------+-----------+------------------+-------------------+-----------------+
```

```javascript
// 4. Add to models/Application.js
static async getByIdWithBadges(id) {
    const [rows] = await pool.query(`
        SELECT 
            a.*,
            GROUP_CONCAT(
                DISTINCT CASE WHEN ab.badge_type = 'counsel' THEN mb.name END 
                ORDER BY mb.name 
                SEPARATOR ', '
            ) AS badges_to_counsel,
            GROUP_CONCAT(
                DISTINCT CASE WHEN ab.badge_type = 'drop' THEN mb.name END 
                ORDER BY mb.name 
                SEPARATOR ', '
            ) AS badges_to_drop
        FROM applications a
        LEFT JOIN application_badges ab ON a.id = ab.application_id
        LEFT JOIN merit_badges mb ON ab.merit_badge_id = mb.id
        WHERE a.id = ?
        GROUP BY a.id
    `, [id]);
    
    return rows[0];
}
```

```javascript
// 5. Test via route (routes/applications.js)
router.get('/:id', async (req, res, next) => {
    try {
        const application = await Application.getByIdWithBadges(req.params.id);
        if (!application) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }
        res.json({ success: true, application });
    } catch (error) {
        next(error);
    }
});
```

```bash
# 6. Test endpoint
npm start
curl http://localhost:3000/api/applications/1 | jq
```

---

## Backup and Restore Workflow

### Daily Backup Script

```bash
#!/bin/bash
# scripts/backup_db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"
DB_NAME="merit_badge_app"
DB_USER="merit_user"

mkdir -p $BACKUP_DIR

mysqldump -u $DB_USER -p$DB_PASSWORD \
    --single-transaction \
    --routines \
    --triggers \
    $DB_NAME > $BACKUP_DIR/merit_badge_app_$DATE.sql

gzip $BACKUP_DIR/merit_badge_app_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: merit_badge_app_$DATE.sql.gz"
```

### Restore from Backup

```bash
# 1. Stop application
pm2 stop merit-badge-app

# 2. Drop and recreate database
mysql -u merit_user -p -e "DROP DATABASE IF EXISTS merit_badge_app;"
mysql -u merit_user -p -e "CREATE DATABASE merit_badge_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 3. Restore backup
gunzip < backups/merit_badge_app_20250227_120000.sql.gz | mysql -u merit_user -p merit_badge_app

# 4. Verify data restored
mysql -u merit_user -p merit_badge_app -e "SELECT COUNT(*) FROM applications;"

# 5. Restart application
pm2 start merit-badge-app
```

---

## Performance Troubleshooting Workflow

### Slow Query Diagnosis

**Checklist:**

- [ ] Enable slow query log
- [ ] Identify slow queries
- [ ] Run EXPLAIN on slow queries
- [ ] Add missing indexes
- [ ] Verify improvement with EXPLAIN
- [ ] Monitor production performance

**Step-by-Step:**

```sql
-- 1. Enable slow query log (MySQL CLI)
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;  -- Log queries > 1 second
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow-query.log';
```

```bash
# 2. Tail slow query log
tail -f /var/log/mysql/slow-query.log
```

```sql
-- 3. Run EXPLAIN on slow query
EXPLAIN SELECT 
    a.*, 
    GROUP_CONCAT(mb.name) AS badges
FROM applications a
LEFT JOIN application_badges ab ON a.id = ab.application_id
LEFT JOIN merit_badges mb ON ab.merit_badge_id = mb.id
WHERE a.district = 'Austin'
GROUP BY a.id
ORDER BY a.created_at DESC
LIMIT 10;

-- Check "type" column: ALL (bad) vs ref/index (good)
-- Check "Extra" column: "Using filesort" or "Using temporary" indicates missing index
```

```sql
-- 4. Add missing index if EXPLAIN shows table scan
ALTER TABLE applications ADD INDEX idx_district (district);

-- 5. Re-run EXPLAIN to verify improvement
EXPLAIN SELECT ...;
-- "type" should now be "ref" instead of "ALL"
```

### WARNING: Missing Index on Foreign Keys

**The Problem:**

```sql
-- BAD - Foreign key without index
CREATE TABLE application_badges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    merit_badge_id INT NOT NULL,
    FOREIGN KEY (application_id) REFERENCES applications(id)
    -- Missing: INDEX idx_application (application_id)
);
```

**Why This Breaks:**
1. **Slow Joins** - JOIN on application_id does full table scan
2. **Slow Deletes** - CASCADE delete scans entire table
3. **Lock Contention** - InnoDB locks entire table during FK checks

**The Fix:**

```sql
-- GOOD - Always index foreign key columns
CREATE TABLE application_badges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    merit_badge_id INT NOT NULL,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    INDEX idx_application (application_id),  -- Required for performance
    INDEX idx_badge (merit_badge_id)
);
```

---

## Connection Pool Exhaustion Troubleshooting

**Symptoms:**
- Requests hang after 10+ concurrent connections
- Error: "Too many connections"
- Application freezes under load

**Diagnosis:**

```sql
-- Check active connections
SHOW PROCESSLIST;

-- Check max connections
SHOW VARIABLES LIKE 'max_connections';
```

```javascript
// Add pool monitoring (config/database.js)
pool.on('connection', () => {
    console.log('New connection created');
});

pool.on('acquire', (connection) => {
    console.log('Connection acquired:', pool._allConnections.length, '/', pool.config.connectionLimit);
});

pool.on('release', (connection) => {
    console.log('Connection released:', pool._freeConnections.length, 'free');
});
```

**Common Causes:**

1. **Missing connection.release()** - See patterns.md for fix
2. **connectionLimit too low** - Increase to 20-50 for production
3. **Long-running transactions** - Break into smaller transactions or use queue

**Fix:**

```javascript
// config/database.js - Production settings
const pool = mysql.createPool({
    connectionLimit: 20,  // Increase from default 10
    queueLimit: 100,      // Limit queue to prevent memory issues
    acquireTimeout: 10000 // Timeout after 10 seconds instead of hanging
});