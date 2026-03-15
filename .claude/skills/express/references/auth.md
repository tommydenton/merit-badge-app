# Auth Reference

## Contents
- BSA Volunteer Validation Pattern
- Conditional Field Requirements
- Future Authentication Patterns
- Anti-Patterns

---

## BSA Volunteer Validation Pattern

This application validates BSA volunteer status and conditionally requires BSA Member ID and District fields. There is **no user authentication** currently—the form is publicly accessible.

### Current Implementation

```javascript
// routes/applications.js - Validation middleware
const validateApplication = [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('age').isInt({ min: 18 }).withMessage('Age must be at least 18'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('phone').optional({ checkFalsy: true }).trim(),
    body('isVolunteer').notEmpty().withMessage('Please indicate if you are a BSA volunteer'),
    body('bsaMemberId').optional({ checkFalsy: true }).trim(),
    body('district').optional({ checkFalsy: true }).trim(),
    body('purpose').notEmpty().withMessage('Please select what you would like to do'),
    body('qualifications').optional({ checkFalsy: true }).trim(),
    body('additionalInfo').optional({ checkFalsy: true }).trim(),
];
```

### Conditional Validation Based on Volunteer Status

**Frontend Logic (public/js/app.js):**

```javascript
// Show/hide BSA fields based on volunteer status
$('#volunteerStatus').on('change', function() {
    const isVolunteer = $(this).val() === 'yes';
    
    if (isVolunteer) {
        $('#bsaFields').show();
        $('#bsaMemberId').prop('required', true);
        $('#district').prop('required', true);
        $('#volunteerWarning').hide();
    } else {
        $('#bsaFields').hide();
        $('#bsaMemberId').prop('required', false).val('');
        $('#district').prop('required', false).val('');
        $('#volunteerWarning').show();
    }
});
```

**Backend Validation Enhancement (not currently implemented):**

```javascript
// Conditional validation - RECOMMENDED ADDITION
const validateApplication = [
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('age').isInt({ min: 18 }),
    body('email').isEmail().normalizeEmail(),
    body('isVolunteer').notEmpty(),
    
    // Conditional validation
    body('bsaMemberId').if(body('isVolunteer').equals('yes'))
        .notEmpty().withMessage('BSA Member ID is required for registered volunteers'),
    body('district').if(body('isVolunteer').equals('yes'))
        .notEmpty().withMessage('District is required for registered volunteers'),
    
    body('purpose').notEmpty(),
    body('qualifications').optional({ checkFalsy: true }).trim(),
    body('additionalInfo').optional({ checkFalsy: true }).trim(),
];
```

---

## Future Authentication Patterns

This section documents how to add authentication if the application evolves to require user accounts.

### Session-Based Authentication (Recommended for This Stack)

**Install Dependencies:**

```bash
npm install express-session connect-session-sequelize bcrypt
```

**Session Configuration:**

```javascript
// server.js
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

const sessionStore = new MySQLStore({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

app.use(session({
    key: 'session_cookie_name',
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' // HTTPS only in production
    }
}));
```

**Login Route:**

```javascript
// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');

router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        req.session.userId = user.id;
        req.session.email = user.email;
        
        res.json({ success: true, user: { id: user.id, email: user.email } });
    } catch (error) {
        next(error);
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Logout failed' });
        }
        res.clearCookie('session_cookie_name');
        res.json({ success: true, message: 'Logged out' });
    });
});

module.exports = router;
```

**Auth Middleware:**

```javascript
// middleware/requireAuth.js
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    next();
}

module.exports = requireAuth;

// Usage in routes
const requireAuth = require('../middleware/requireAuth');
router.post('/applications', requireAuth, upload.array('certifications', 10), validateApplication, async (req, res, next) => {
    // Only authenticated users can submit applications
});
```

### JWT Authentication Alternative

**Install Dependencies:**

```bash
npm install jsonwebtoken
```

**JWT Issuance:**

```javascript
// routes/auth.js
const jwt = require('jsonwebtoken');

router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User.findByEmail(email);
        
        if (!user || !await bcrypt.compare(password, user.password_hash)) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({ success: true, token });
    } catch (error) {
        next(error);
    }
});
```

**JWT Middleware:**

```javascript
// middleware/requireAuth.js
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer '
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach user info to request
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
}

module.exports = requireAuth;
```

**Frontend Token Storage:**

```javascript
// public/js/app.js
// Store token after login
localStorage.setItem('authToken', response.token);

// Include in API requests
$.ajax({
    url: '/api/applications',
    method: 'POST',
    headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('authToken')
    },
    data: formData
});
```

---

## Anti-Patterns

### WARNING: Trusting Client-Side Validation Only

**The Problem:**

```javascript
// BAD - Only frontend validates volunteer status
// Frontend: $('#bsaMemberId').prop('required', true);
// Backend: body('bsaMemberId').optional({ checkFalsy: true })

// Attacker bypasses frontend, sends isVolunteer=yes without bsaMemberId
// Database stores incomplete data
```

**Why This Breaks:**
1. **Data Integrity:** Applications marked as volunteer but missing BSA ID
2. **Easy to Bypass:** Anyone can modify frontend JavaScript or use curl
3. **Compliance Risk:** Invalid applications processed

**The Fix:**

```javascript
// GOOD - Backend enforces conditional validation
const validateApplication = [
    body('isVolunteer').notEmpty(),
    body('bsaMemberId').if(body('isVolunteer').equals('yes'))
        .notEmpty().withMessage('BSA Member ID required for volunteers')
        .isLength({ min: 5 }).withMessage('Invalid BSA Member ID format'),
    body('district').if(body('isVolunteer').equals('yes'))
        .notEmpty().withMessage('District required for volunteers')
];
```

### WARNING: Storing Passwords in Plain Text (If Adding Auth)

**The Problem:**

```javascript
// BAD - NEVER store plain text passwords
const [result] = await connection.query(
    'INSERT INTO users (email, password) VALUES (?, ?)',
    [email, password] // Plain text password
);
```

**Why This Breaks:**
1. **Data Breach Impact:** One breach exposes all passwords
2. **User Reuse:** Users often reuse passwords across sites
3. **Legal Liability:** GDPR/privacy law violations

**The Fix:**

```javascript
// GOOD - Hash with bcrypt
const bcrypt = require('bcrypt');

router.post('/register', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        await connection.query(
            'INSERT INTO users (email, password_hash) VALUES (?, ?)',
            [email, passwordHash]
        );
        
        res.status(201).json({ success: true });
    } catch (error) {
        next(error);
    }
});
```

See the **express-validator** skill for validation patterns and the **node** skill for environment variable security.