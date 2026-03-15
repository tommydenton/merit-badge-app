# Node.js Module System Reference

## Contents
- CommonJS Module Pattern
- Module Loading Order
- Circular Dependencies
- NPM Scripts
- Anti-Patterns

---

## CommonJS Module Pattern

### Standard Import/Export Pattern

This project uses CommonJS (require/module.exports), not ES modules:

```javascript
// config/database.js - Exporting a singleton
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

module.exports = pool; // Export pool directly

// Alternative: Named exports
module.exports = {
    pool,
    query: (sql, params) => pool.query(sql, params)
};
```

### Import Pattern in Route Files

```javascript
// routes/applications.js - Importing modules
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator'); // Destructure named exports
const Application = require('../models/Application'); // Default export

module.exports = router; // Export router
```

### WARNING: ES Module Syntax in CommonJS

```javascript
// BAD - ES6 import in CommonJS project
import express from 'express'; // SyntaxError: Cannot use import statement outside a module

// GOOD - CommonJS require
const express = require('express');
```

**Why Mixing Breaks:**
1. Node.js needs `"type": "module"` in package.json for ES modules
2. File extension must be `.mjs` or package.json must declare module type
3. CommonJS and ES modules have different resolution algorithms
4. `__dirname` and `require.resolve` unavailable in ES modules

---

## Module Loading Order

### Application Entry Point Pattern

```javascript
// server.js - Correct initialization order
require('dotenv').config(); // 1. Load environment first

const express = require('express');
const cors = require('cors');
const db = require('./config/database'); // 2. Database config (uses process.env)
const applicationsRouter = require('./routes/applications'); // 3. Routes

const app = express();

// 4. Configure middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// 5. Mount routes
app.use('/api/applications', applicationsRouter);

// 6. Error handler LAST
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: err.message });
});

// 7. Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

### WARNING: Loading Database Before dotenv

```javascript
// BAD - Database config loaded before environment
const db = require('./config/database'); // process.env is empty!
require('dotenv').config(); // Too late

// GOOD - Load dotenv first
require('dotenv').config();
const db = require('./config/database'); // Now has process.env values
```

---

## Circular Dependencies

### Avoiding Circular Imports

```javascript
// ANTI-PATTERN: Circular dependency
// models/Application.js
const Badge = require('./Badge'); // Badge requires Application

// models/Badge.js
const Application = require('./Application'); // Circular!

// GOOD: Use dependency injection or shared utilities
// models/Application.js
static async getBadges(applicationId) {
    const db = require('../config/database'); // Shared singleton
    const [rows] = await db.query(
        'SELECT mb.* FROM merit_badges mb JOIN application_badges ab ON mb.id = ab.merit_badge_id WHERE ab.application_id = ?',
        [applicationId]
    );
    return rows;
}
```

### Module Resolution Debugging

```javascript
// Debugging module paths
console.log('Module path:', require.resolve('./config/database'));
console.log('Loaded modules:', Object.keys(require.cache));

// Clear module cache (for testing only, never in production)
delete require.cache[require.resolve('./config/database')];
```

---

## NPM Scripts

### Package.json Scripts Pattern

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "echo \"No tests yet\"",
    "db:setup": "mysql -u root -p merit_badge_app < database/schema.sql",
    "db:seed": "mysql -u root -p merit_badge_app < database/seed_merit_badges.sql"
  }
}
```

### Running NPM Scripts

```bash
# Production mode
npm start

# Development with auto-reload
npm run dev

# Custom database setup scripts
npm run db:setup
npm run db:seed
```

### Script Environment Variables

```bash
# Pass environment variables to npm scripts
PORT=4000 npm start

# Or use cross-env for Windows compatibility (not in this project yet)
npm install --save-dev cross-env
```

```json
{
  "scripts": {
    "start": "cross-env NODE_ENV=production node server.js",
    "dev": "cross-env NODE_ENV=development nodemon server.js"
  }
}
```

---

## Dependency Management

### Production vs Development Dependencies

```bash
# Install production dependency
npm install express

# Install dev dependency (nodemon for auto-reload)
npm install --save-dev nodemon

# Install all dependencies
npm install

# Install only production dependencies (for deployment)
npm install --production
```

### Current Project Dependencies

**Production:**
- `express` - Web framework
- `mysql2` - MySQL client with promise support
- `multer` - File upload middleware
- `express-validator` - Input validation
- `dotenv` - Environment configuration
- `cors` - Cross-origin resource sharing

**Development:**
- `nodemon` - Auto-restart server on file changes

### WARNING: Missing Package Lock

```bash
# ALWAYS commit package-lock.json
# Without it, dependency versions may differ between environments

# If package-lock.json is missing, regenerate:
rm -rf node_modules
npm install
git add package-lock.json
```

---

## Module Exports Patterns

### Single Export (Database Pool)

```javascript
// config/database.js - Export singleton directly
const mysql = require('mysql2/promise');
const pool = mysql.createPool({ /* config */ });

module.exports = pool;

// Usage:
const db = require('./config/database');
db.query('SELECT * FROM applications');
```

### Multiple Named Exports (Model)

```javascript
// models/Application.js - Static methods on class
class Application {
    static async create(data) { /* ... */ }
    static async getById(id) { /* ... */ }
    static async getAllMeritBadges() { /* ... */ }
}

module.exports = Application;

// Usage:
const Application = require('./models/Application');
const badges = await Application.getAllMeritBadges();
```

### Router Export Pattern

```javascript
// routes/applications.js - Export configured router
const express = require('express');
const router = express.Router();

router.get('/merit-badges', async (req, res, next) => { /* ... */ });
router.post('/', async (req, res, next) => { /* ... */ });

module.exports = router;

// Usage in server.js:
const applicationsRouter = require('./routes/applications');
app.use('/api/applications', applicationsRouter);
```

See the **express** skill for router patterns.