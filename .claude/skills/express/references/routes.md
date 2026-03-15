# Routes Reference

## Contents
- Route Organization Pattern
- RESTful Endpoint Structure
- Request Parameter Handling
- File Upload Routes
- Anti-Patterns

---

## Route Organization Pattern

This application uses **modular routers** mounted at `/api/applications`.

### Project Structure

```javascript
// server.js
const applicationRoutes = require('./routes/applications');
app.use('/api/applications', applicationRoutes);

// routes/applications.js
const router = express.Router();
router.get('/merit-badges', ...);  // -> /api/applications/merit-badges
router.post('/', ...);              // -> /api/applications
router.get('/:id', ...);            // -> /api/applications/:id
```

**Why This Works:**
- Clear separation: routes/ contains only HTTP layer logic
- Easy to test: routers can be tested independently
- Scalable: new resources get their own router file

### DO: Extract Business Logic to Models

```javascript
// GOOD - routes/applications.js
router.get('/merit-badges', async (req, res, next) => {
    try {
        const badges = await Application.getAllMeritBadges();
        res.json({ success: true, badges });
    } catch (error) {
        next(error);
    }
});

// GOOD - models/Application.js
static async getAllMeritBadges() {
    const connection = await db.getConnection();
    const [rows] = await connection.query(
        'SELECT id, name FROM merit_badges ORDER BY name'
    );
    connection.release();
    return rows;
}
```

### DON'T: Mix Database Logic in Routes

```javascript
// BAD - Business logic in route handler
router.get('/merit-badges', async (req, res, next) => {
    try {
        const connection = await db.getConnection();
        const [rows] = await connection.query('SELECT * FROM merit_badges');
        connection.release();
        res.json({ success: true, badges: rows });
    } catch (error) {
        next(error);
    }
});
```

**Why This Breaks:**
- Impossible to test business logic without HTTP mocking
- Database queries scattered across multiple files
- Route file bloats to 500+ lines

---

## RESTful Endpoint Structure

### Standard CRUD Pattern

```javascript
// GET /api/applications/merit-badges - List all
router.get('/merit-badges', async (req, res, next) => {
    try {
        const badges = await Application.getAllMeritBadges();
        res.json({ success: true, badges });
    } catch (error) {
        next(error);
    }
});

// POST /api/applications - Create new
router.post('/', upload.array('certifications', 10), validateApplication, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Validation failed',
                errors: errors.array() 
            });
        }
        
        const result = await Application.create(req.body);
        res.status(201).json({
            success: true,
            message: 'Application submitted successfully',
            applicationId: result.applicationId
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/applications/:id - Retrieve by ID
router.get('/:id', async (req, res, next) => {
    try {
        const application = await Application.getById(req.params.id);
        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }
        res.json({ success: true, application });
    } catch (error) {
        next(error);
    }
});
```

### Response Status Codes

| Code | Usage | Example |
|------|-------|---------|
| `200` | Successful GET/PUT | List merit badges |
| `201` | Resource created | New application submitted |
| `400` | Validation failed | Missing required fields |
| `404` | Not found | Application ID doesn't exist |
| `500` | Server error | Database connection failed |

---

## Request Parameter Handling

### URL Parameters

```javascript
// GET /api/applications/:id
router.get('/:id', async (req, res, next) => {
    const applicationId = req.params.id;
    // Use applicationId for database query
});
```

### Query Parameters (for filtering/pagination)

```javascript
// GET /api/applications?district=Central&status=pending
router.get('/', async (req, res, next) => {
    const { district, status } = req.query;
    const applications = await Application.findByFilters({ district, status });
    res.json({ success: true, applications });
});
```

### Request Body (JSON)

```javascript
// POST /api/applications
router.post('/', express.json(), async (req, res, next) => {
    const { firstName, lastName, email } = req.body;
    // Validate and process
});
```

### Multipart Form Data (with files)

```javascript
// POST with files + JSON fields
router.post('/', upload.array('certifications', 10), async (req, res, next) => {
    const formFields = req.body;          // Text fields
    const uploadedFiles = req.files;       // Array of file objects
    
    // Parse JSON strings from formData
    let badgesToCounsel = [];
    if (req.body.badgesToCounsel) {
        badgesToCounsel = JSON.parse(req.body.badgesToCounsel);
    }
});
```

---

## File Upload Routes

### WARNING: File Upload Without Cleanup on Error

**The Problem:**

```javascript
// BAD - Files remain on disk if database insert fails
router.post('/', upload.array('certifications', 10), async (req, res, next) => {
    const result = await Application.create(req.body); // Throws error
    res.status(201).json({ success: true });
    // Uploaded files are orphaned on disk
});
```

**Why This Breaks:**
1. **Disk Space Leak:** Failed requests leave files on server indefinitely
2. **Privacy Risk:** Uploaded files accessible but not in database
3. **Manual Cleanup Required:** No automatic garbage collection

**The Fix:**

```javascript
// GOOD - Clean up files on error
router.post('/', upload.array('certifications', 10), validateApplication, async (req, res, next) => {
    try {
        const certifications = req.files ? req.files.map(file => ({
            filename: file.originalname,
            filepath: file.path,
            size: file.size
        })) : [];
        
        const result = await Application.create({ ...req.body, certifications });
        res.status(201).json({ success: true, applicationId: result.applicationId });
    } catch (error) {
        // Clean up uploaded files on failure
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

### File Filter Security

```javascript
const fileFilter = (req, file, cb) => {
    const forbiddenExtensions = ['.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.js', '.vbs', '.sh'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (forbiddenExtensions.includes(ext)) {
        return cb(new Error(`File type ${ext} is not allowed for security reasons`), false);
    }
    cb(null, true);
};

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, process.env.UPLOAD_DIR || 'public/uploads'),
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + '-' + file.originalname);
        }
    }),
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 31457280, // 30MB
        files: parseInt(process.env.MAX_FILES) || 10
    },
    fileFilter: fileFilter
});
```

---

## Anti-Patterns

### WARNING: Ignoring Validation Errors

**The Problem:**

```javascript
// BAD - Silently ignoring validation failures
router.post('/', validateApplication, async (req, res, next) => {
    const errors = validationResult(req);
    // No check for errors - invalid data reaches database
    const result = await Application.create(req.body);
    res.status(201).json({ success: true });
});
```

**Why This Breaks:**
1. **Data Corruption:** Invalid emails, ages, phone numbers stored in database
2. **SQL Errors:** Unexpected NULL values cause database constraint violations
3. **Silent Failures:** Frontend receives success but data is incorrect

**The Fix:**

```javascript
// GOOD - Check validation before processing
router.post('/', validateApplication, async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    const result = await Application.create(req.body);
    res.status(201).json({ success: true, applicationId: result.applicationId });
});
```

### WARNING: Not Using `next(error)` in Async Routes

**The Problem:**

```javascript
// BAD - Express won't catch async errors
router.get('/merit-badges', async (req, res) => {
    const badges = await Application.getAllMeritBadges(); // Throws error
    res.json({ success: true, badges });
    // Error crashes server, no response sent
});
```

**The Fix:**

```javascript
// GOOD - Pass errors to Express error handler
router.get('/merit-badges', async (req, res, next) => {
    try {
        const badges = await Application.getAllMeritBadges();
        res.json({ success: true, badges });
    } catch (error) {
        next(error); // Express sends 500 response
    }
});
```

See the **express-validator** skill for validation patterns and the **multer** skill for file upload configuration.