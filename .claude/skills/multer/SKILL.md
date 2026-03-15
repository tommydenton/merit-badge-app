---
name: multer
description: |
  Configures file upload middleware, storage, and file validation for Express.js applications.
  Use when: handling multipart/form-data file uploads, storing uploaded files, validating file types or sizes, implementing secure file upload endpoints.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__query-docs
---

# Multer Skill

Multer is the de-facto standard middleware for handling multipart/form-data file uploads in Express.js. This project uses Multer 1.4.5 to handle certification file uploads (max 10 files, 30MB total) with security-focused file filtering and diskStorage for persistence. All uploads are stored in `public/uploads/` with unique timestamped filenames.

## Quick Start

### File Upload Route with Validation

```javascript
// routes/applications.js - Current implementation
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, process.env.UPLOAD_DIR || 'public/uploads');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

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
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 31457280,
        files: parseInt(process.env.MAX_FILES) || 10
    },
    fileFilter: fileFilter
});

router.post('/', upload.array('certifications', 10), validateApplication, async (req, res, next) => {
    // Access uploaded files via req.files
    const certifications = req.files ? req.files.map(file => ({
        filename: file.originalname,
        filepath: file.path,
        size: file.size
    })) : [];
});
```

### Error Cleanup Pattern

```javascript
// routes/applications.js - Cleanup on error
try {
    const result = await Application.create(applicationData);
    res.status(201).json({ success: true, applicationId: result.applicationId });
} catch (error) {
    // CRITICAL: Delete uploaded files if database insert fails
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

## Key Concepts

| Concept | Usage | Example |
|---------|-------|---------|
| **diskStorage** | Persist files to disk with custom naming | `multer.diskStorage({ destination, filename })` |
| **fileFilter** | Validate file types before storage | `fileFilter: (req, file, cb) => cb(null, true)` |
| **limits** | Enforce file size/count restrictions | `limits: { fileSize: 31457280, files: 10 }` |
| **req.files** | Access uploaded files array | `upload.array('fieldname', maxCount)` |
| **req.file** | Access single uploaded file | `upload.single('fieldname')` |

## Common Patterns

### File Type Validation

**When:** Preventing malicious file uploads (executables, scripts)

```javascript
// Current implementation - security-first approach
const fileFilter = (req, file, cb) => {
    const forbiddenExtensions = ['.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.js', '.vbs', '.sh'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (forbiddenExtensions.includes(ext)) {
        return cb(new Error(`File type ${ext} is not allowed for security reasons`), false);
    }
    
    cb(null, true);
};
```

### Unique Filename Generation

**When:** Avoiding filename collisions, preventing path traversal attacks

```javascript
filename: function (req, file, cb) {
    // Timestamp + random number ensures uniqueness
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
}
```

### Environment-Driven Configuration

**When:** Supporting different upload limits/paths per environment

```javascript
const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 31457280,  // 30MB default
        files: parseInt(process.env.MAX_FILES) || 10
    }
});
```

## See Also

- [patterns](references/patterns.md) - Storage engines, error handling, security patterns
- [workflows](references/workflows.md) - Upload implementation, testing, migration workflows

## Related Skills

- **express** - Multer is Express.js middleware, see that skill for routing patterns
- **express-validator** - Used alongside Multer for form field validation (routes/applications.js)
- **node** - For fs operations and path handling in file storage

## Documentation Resources

> Fetch latest Multer documentation with Context7.

**How to use Context7:**
1. Use `mcp__context7__resolve-library-id` to search for "multer"
2. **Prefer website documentation** (IDs starting with `/websites/`) over source code repositories when available
3. Query with `mcp__context7__query-docs` using the resolved library ID

**Library ID:** `/expressjs/multer` _(resolve using mcp__context7__resolve-library-id, prefer /websites/ when available)_

**Recommended Queries:**
- "multer disk storage configuration"
- "multer file validation and filtering"
- "multer error handling best practices"
- "multer security considerations"