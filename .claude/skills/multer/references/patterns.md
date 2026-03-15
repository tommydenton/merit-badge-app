# Multer Patterns Reference

## Contents
- Storage Engines
- File Filtering and Validation
- Error Handling
- Security Patterns
- File Metadata Management

---

## Storage Engines

### diskStorage vs memoryStorage

**Use diskStorage** for this application - files must persist and be linked to database records.

```javascript
// GOOD - Current pattern (routes/applications.js)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, process.env.UPLOAD_DIR || 'public/uploads');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });
```

```javascript
// BAD - memoryStorage loses files on process restart
const upload = multer({ storage: multer.memoryStorage() });
// Files stored in req.file.buffer - no persistence
// Only use for: immediate processing (image resize), cloud uploads (S3)
```

**Why diskStorage matters:**
1. **Persistence** - Files survive server restarts
2. **Database linkage** - filepath stored in certifications table
3. **Serving files** - Static middleware can serve from `public/uploads/`

---

## File Filtering and Validation

### WARNING: MIME Type Validation Alone Is Insufficient

**The Problem:**

```javascript
// BAD - MIME types can be spoofed
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg') {
        cb(null, true);
    } else {
        cb(null, false);
    }
};
```

**Why This Breaks:**
1. **Client-controlled** - Browsers set MIME type based on file extension, easily faked
2. **No content inspection** - A .exe renamed to .jpg passes validation
3. **Security vulnerability** - Executable files can be uploaded and executed

**The Fix:**

```javascript
// GOOD - Extension blacklist (current implementation)
const fileFilter = (req, file, cb) => {
    const forbiddenExtensions = ['.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.js', '.vbs', '.sh'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (forbiddenExtensions.includes(ext)) {
        return cb(new Error(`File type ${ext} is not allowed for security reasons`), false);
    }
    
    cb(null, true);
};
```

**When You Might Be Tempted:**
- Accepting only specific file types (PDFs, images)
- Trusting client-reported MIME types for convenience

**Better Approach:**
Combine extension validation with content inspection using libraries like `file-type` for critical security:

```javascript
const FileType = require('file-type');

const fileFilter = async (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    
    // First: Block known dangerous extensions
    const forbiddenExtensions = ['.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.js', '.vbs', '.sh'];
    if (forbiddenExtensions.includes(ext)) {
        return cb(new Error(`File type ${ext} is not allowed`), false);
    }
    
    // Second: For high-security needs, inspect file content
    const fileTypeFromContent = await FileType.fromBuffer(file.buffer);
    if (fileTypeFromContent && fileTypeFromContent.ext === 'exe') {
        return cb(new Error('Executable files not allowed'), false);
    }
    
    cb(null, true);
};
```

---

## Limits Configuration

### File Size and Count Enforcement

```javascript
// GOOD - Current implementation with environment configuration
const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 31457280,  // 30MB
        files: parseInt(process.env.MAX_FILES) || 10
    },
    fileFilter: fileFilter
});
```

**Environment Variables (.env):**
```env
MAX_FILE_SIZE=31457280  # 30MB in bytes
MAX_FILES=10            # Maximum files per upload
UPLOAD_DIR=public/uploads
```

**Why environment-driven limits:**
- **Deployment flexibility** - Different limits for dev/staging/production
- **No code changes** - Adjust limits via hosting provider's environment settings
- **Documentation** - .env.example documents constraints

---

## Error Handling

### WARNING: Uploaded Files Persist on Error

**The Problem:**

```javascript
// BAD - Files remain on disk if validation fails
router.post('/', upload.array('certifications', 10), async (req, res, next) => {
    const applicationData = { /* ... */ };
    const result = await Application.create(applicationData);  // Fails here
    res.json({ success: true, applicationId: result.applicationId });
});
```

**Why This Breaks:**
1. **Orphaned files** - Uploaded files exist but no database record points to them
2. **Disk space leak** - Files accumulate over time with no cleanup
3. **Security risk** - Uploaded executables remain accessible even if rejected

**The Fix:**

```javascript
// GOOD - Current implementation (routes/applications.js)
try {
    const result = await Application.create(applicationData);
    res.status(201).json({ success: true, applicationId: result.applicationId });
} catch (error) {
    // CRITICAL: Clean up uploaded files on failure
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
```

**When You Might Be Tempted:**
- Assuming database rollback handles files (it doesn't)
- Relying on periodic cleanup jobs (orphans still accumulate)

---

## File Upload Methods

### .array() vs .single() vs .fields()

```javascript
// Current implementation - multiple files, same field name
upload.array('certifications', 10)
// req.files = [{ fieldname, originalname, path, size, ... }, ...]
```

```javascript
// Single file upload
upload.single('certification')
// req.file = { fieldname, originalname, path, size, ... }
```

```javascript
// Multiple fields with different names
upload.fields([
    { name: 'certifications', maxCount: 10 },
    { name: 'resume', maxCount: 1 }
])
// req.files = {
//   certifications: [...],
//   resume: [...]
// }
```

**Pattern selection:**
- **array** - Multiple files, same input name (current use case)
- **single** - One file per upload
- **fields** - Multiple file inputs with different purposes

---

## Unique Filename Generation

### Current Pattern Analysis

```javascript
// routes/applications.js
filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
}
```

**What this prevents:**
1. **Collision** - Timestamp + random number ensures uniqueness
2. **Path traversal** - Concatenating suffix first neutralizes `../../../etc/passwd` in originalname
3. **Predictability** - Random component prevents enumeration attacks

**Potential improvement for high-throughput:**

```javascript
const { randomBytes } = require('crypto');

filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + randomBytes(16).toString('hex');
    cb(null, uniqueSuffix + '-' + file.originalname);
}
```

**When to use cryptographic randomness:**
- High upload volume (>1000/sec) where timestamp collisions are possible
- Security-critical applications where predictability is a risk

---

## Destination Directory Management

### WARNING: Directory Must Exist Before Upload

**The Problem:**

```javascript
// BAD - Assumes directory exists
const storage = multer.diskStorage({
    destination: 'public/uploads'
});
// Multer will throw ENOENT if public/uploads doesn't exist
```

**The Fix:**

```javascript
// GOOD - Ensure directory exists at startup (server.js pattern)
const fs = require('fs');
const uploadDir = process.env.UPLOAD_DIR || 'public/uploads';

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
```

**Why This Breaks:**
1. **Deployment failure** - Fresh deployments crash on first upload
2. **No error message** - Multer error is cryptic: "ENOENT: no such file or directory"
3. **Manual intervention** - Requires SSH access to create directory

**Best Practice:**
Add directory creation to server startup (server.js):

```javascript
// After environment loading, before route registration
const uploadDir = process.env.UPLOAD_DIR || 'public/uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`✓ Created upload directory: ${uploadDir}`);
}