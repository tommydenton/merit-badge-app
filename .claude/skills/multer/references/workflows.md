# Multer Workflows Reference

## Contents
- Adding File Upload to New Route
- Changing File Upload Limits
- Implementing Additional File Validation
- Testing File Upload Functionality
- Migrating to Cloud Storage

---

## Adding File Upload to New Route

### Workflow: Implementing a New Upload Endpoint

**Scenario:** Adding profile picture upload to a user profile route

Copy this checklist and track progress:
- [ ] Define storage configuration (reuse existing or create new)
- [ ] Implement fileFilter for allowed types
- [ ] Configure limits (size, count)
- [ ] Create route with upload middleware
- [ ] Add error cleanup handler
- [ ] Test with valid and invalid files
- [ ] Update database schema for file metadata

**Step 1: Define Storage (Reuse Pattern)**

```javascript
// routes/users.js - Reuse existing storage config
const multer = require('multer');
const path = require('path');
const storage = require('../config/multerStorage');  // Extract to shared config

// Or define new storage for different destination
const profileStorage = multer.diskStorage({
    destination: process.env.PROFILE_UPLOAD_DIR || 'public/uploads/profiles',
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
```

**Step 2: Implement File Filter**

```javascript
// Only allow images for profile pictures
const imageFilter = (req, file, cb) => {
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
        return cb(new Error(`Only image files allowed (${allowedExtensions.join(', ')})`), false);
    }
    
    cb(null, true);
};
```

**Step 3: Configure Upload Middleware**

```javascript
const upload = multer({
    storage: profileStorage,
    limits: {
        fileSize: 5 * 1024 * 1024,  // 5MB for profile pictures
        files: 1                     // Single file
    },
    fileFilter: imageFilter
});
```

**Step 4: Create Route with Error Handling**

```javascript
router.post('/profile/picture', upload.single('profilePicture'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        
        const pictureData = {
            filename: req.file.originalname,
            filepath: req.file.path,
            size: req.file.size
        };
        
        // Save to database
        await User.updateProfilePicture(req.userId, pictureData);
        
        res.json({ success: true, picture: pictureData });
    } catch (error) {
        // Cleanup uploaded file on error
        if (req.file) {
            const fs = require('fs');
            fs.unlink(req.file.path, err => {
                if (err) console.error('Error deleting file:', err);
            });
        }
        next(error);
    }
});
```

**Step 5: Test Workflow**

```bash
# Test with valid file
curl -X POST http://localhost:3000/api/users/profile/picture \
  -F "profilePicture=@test-image.jpg"

# Test with invalid file type
curl -X POST http://localhost:3000/api/users/profile/picture \
  -F "profilePicture=@document.pdf"

# Test with oversized file
curl -X POST http://localhost:3000/api/users/profile/picture \
  -F "profilePicture=@large-image.jpg"
```

Iterate validation steps until all test cases pass.

---

## Changing File Upload Limits

### Workflow: Increasing Maximum File Size

**Scenario:** Business requirement changes from 30MB to 50MB total upload

Copy this checklist:
- [ ] Update environment variable
- [ ] Verify no hardcoded limits in code
- [ ] Update client-side validation (frontend)
- [ ] Test with files at new limit
- [ ] Update documentation
- [ ] Consider hosting provider disk limits

**Step 1: Update Environment Variable**

```env
# .env
MAX_FILE_SIZE=52428800  # 50MB in bytes (50 * 1024 * 1024)
```

**Step 2: Verify No Hardcoded Limits**

```bash
# Search for hardcoded file size limits
grep -r "31457280" --include="*.js" .
grep -r "30\s*\*\s*1024\s*\*\s*1024" --include="*.js" .
```

If hardcoded limits exist, replace with environment variable:

```javascript
// BAD - Hardcoded
limits: { fileSize: 31457280 }

// GOOD - Environment-driven (current pattern)
limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 31457280 }
```

**Step 3: Update Frontend Validation**

```javascript
// public/js/app.js - Update client-side check
const MAX_FILE_SIZE = 50 * 1024 * 1024;  // Match backend

document.getElementById('certifications').addEventListener('change', function(e) {
    const files = Array.from(e.target.files);
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    
    if (totalSize > MAX_FILE_SIZE) {
        alert(`Total file size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
        e.target.value = '';
    }
});
```

**Step 4: Test New Limits**

```bash
# Create test file at new limit
dd if=/dev/zero of=test-50mb.bin bs=1M count=50

# Test upload
curl -X POST http://localhost:3000/api/applications \
  -F "certifications=@test-50mb.bin" \
  -F "firstName=Test" \
  -F "lastName=User" \
  # ... other required fields
```

**Step 5: Update Documentation**

```markdown
# README.md - Update limits section
MAX_FILE_SIZE=52428800  # 50MB in bytes
```

---

## Implementing Additional File Validation

### Workflow: Adding File Content Inspection

**Scenario:** Enforce PDF-only uploads with content verification (not just extension)

Copy this checklist:
- [ ] Install file-type library
- [ ] Implement async fileFilter
- [ ] Handle buffer-based validation
- [ ] Test with valid/spoofed files
- [ ] Add error messages

**Step 1: Install Dependencies**

```bash
npm install file-type
```

**Step 2: Implement Content-Based Validation**

```javascript
const FileType = require('file-type');
const { promisify } = require('util');

// Convert Multer to use memoryStorage temporarily for inspection
const memStorage = multer.memoryStorage();

const contentFilter = async (req, file, cb) => {
    // First: Extension check (fast fail)
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.pdf'];
    
    if (!allowedExtensions.includes(ext)) {
        return cb(new Error('Only PDF files allowed'), false);
    }
    
    // Note: Full content inspection requires reading file buffer
    // For disk storage, perform validation after upload in route handler
    cb(null, true);
};

// Route handler validation
router.post('/documents', upload.single('document'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        
        // Read uploaded file for content inspection
        const fs = require('fs').promises;
        const fileBuffer = await fs.readFile(req.file.path);
        const fileType = await FileType.fromBuffer(fileBuffer);
        
        // Verify actual content is PDF
        if (!fileType || fileType.mime !== 'application/pdf') {
            // Delete uploaded file
            await fs.unlink(req.file.path);
            return res.status(400).json({ 
                success: false, 
                message: 'File content is not a valid PDF' 
            });
        }
        
        // Process valid PDF
        res.json({ success: true, file: req.file });
    } catch (error) {
        if (req.file) {
            const fs = require('fs');
            fs.unlink(req.file.path, err => {});
        }
        next(error);
    }
});
```

**Why Post-Upload Validation:**
- fileFilter runs before buffer is available in diskStorage
- Reading entire file into memory for every upload is inefficient
- Post-upload validation allows rejection with proper cleanup

**Step 3: Test with Spoofed Files**

```bash
# Create fake PDF (text file with .pdf extension)
echo "This is not a PDF" > fake.pdf

# Test upload - should be rejected
curl -X POST http://localhost:3000/api/documents \
  -F "document=@fake.pdf"
```

---

## Testing File Upload Functionality

### Comprehensive Test Workflow

Copy this checklist:
- [ ] Test valid file upload (success path)
- [ ] Test file size limit enforcement
- [ ] Test file count limit enforcement
- [ ] Test forbidden file type rejection
- [ ] Test error cleanup (files deleted on failure)
- [ ] Test concurrent uploads
- [ ] Verify database records match uploaded files

**Valid Upload Test:**

```bash
# Create test files
echo "Test certification 1" > cert1.txt
echo "Test certification 2" > cert2.txt

# Submit form with files
curl -X POST http://localhost:3000/api/applications \
  -F "firstName=John" \
  -F "lastName=Doe" \
  -F "age=25" \
  -F "email=john@example.com" \
  -F "isVolunteer=yes" \
  -F "bsaMemberId=12345" \
  -F "district=Example District" \
  -F "purpose=counsel" \
  -F "certifications=@cert1.txt" \
  -F "certifications=@cert2.txt"
```

**File Size Limit Test:**

```bash
# Create file exceeding limit (31MB)
dd if=/dev/zero of=large-file.bin bs=1M count=32

# Should return error
curl -X POST http://localhost:3000/api/applications \
  -F "certifications=@large-file.bin" \
  # ... other fields
```

**File Count Limit Test:**

```bash
# Create 11 files (exceeds MAX_FILES=10)
for i in {1..11}; do
  echo "File $i" > "file$i.txt"
done

# Upload all 11 - should reject
curl -X POST http://localhost:3000/api/applications \
  $(for i in {1..11}; do echo "-F certifications=@file$i.txt"; done) \
  # ... other fields
```

**Forbidden File Type Test:**

```bash
# Create executable file
echo "malicious" > test.exe

# Should be rejected by fileFilter
curl -X POST http://localhost:3000/api/applications \
  -F "certifications=@test.exe" \
  # ... other fields
```

**Error Cleanup Verification:**

```bash
# Before test: Count files in uploads directory
ls -1 public/uploads | wc -l

# Trigger database error (invalid email format)
curl -X POST http://localhost:3000/api/applications \
  -F "email=invalid-email" \
  -F "certifications=@cert1.txt" \
  # ... other fields

# After test: Verify file count unchanged (cleanup worked)
ls -1 public/uploads | wc -l
```

If file count increased, error cleanup is broken. Verify try-catch block includes file deletion.

---

## Migrating to Cloud Storage

### Workflow: Moving from diskStorage to S3/Cloud Storage

**Scenario:** Application scales beyond single-server deployment, need centralized file storage

Copy this checklist:
- [ ] Install storage adapter (multer-s3, @google-cloud/storage)
- [ ] Configure cloud credentials (environment variables)
- [ ] Replace diskStorage with cloud storage
- [ ] Update file serving logic (presigned URLs)
- [ ] Migrate existing files to cloud
- [ ] Test upload/download flows
- [ ] Update database filepath format

**Step 1: Install S3 Adapter**

```bash
npm install multer-s3 @aws-sdk/client-s3
```

**Step 2: Configure S3 Storage**

```javascript
// routes/applications.js - Replace diskStorage
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const storage = multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `certifications/${uniqueSuffix}-${file.originalname}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 31457280,
        files: parseInt(process.env.MAX_FILES) || 10
    },
    fileFilter: fileFilter  // Keep existing file filter
});
```

**Step 3: Update Environment Variables**

```env
# .env - Add AWS credentials
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=merit-badge-uploads
```

**Step 4: Update Database Storage**

```javascript
// routes/applications.js - req.file changes with S3
router.post('/', upload.array('certifications', 10), async (req, res, next) => {
    try {
        const certifications = req.files ? req.files.map(file => ({
            filename: file.originalname,
            filepath: file.key,           // S3 key instead of local path
            s3_location: file.location,   // Public URL (if bucket is public)
            size: file.size
        })) : [];
        
        // Rest of application logic unchanged
    } catch (error) {
        // NOTE: S3 uploads are not automatically cleaned up
        // Implement lifecycle policies or manual deletion
        next(error);
    }
});
```

**Step 5: Migrate Existing Files**

```javascript
// scripts/migrate-to-s3.js
const fs = require('fs').promises;
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const db = require('../config/database');

async function migrateFiles() {
    const s3 = new S3Client({ /* credentials */ });
    const [certifications] = await db.execute('SELECT * FROM certifications');
    
    for (const cert of certifications) {
        const localPath = cert.filepath;
        const fileContent = await fs.readFile(localPath);
        const s3Key = `certifications/${path.basename(localPath)}`;
        
        await s3.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Key,
            Body: fileContent
        }));
        
        // Update database with new S3 key
        await db.execute(
            'UPDATE certifications SET filepath = ?, s3_location = ? WHERE id = ?',
            [s3Key, `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${s3Key}`, cert.id]
        );
        
        console.log(`Migrated: ${localPath} -> ${s3Key}`);
    }
}

migrateFiles().catch(console.error);
```

**Step 6: Test Cloud Upload**

```bash
# Upload test file
curl -X POST http://localhost:3000/api/applications \
  -F "certifications=@test.txt" \
  # ... other fields

# Verify in S3 console or CLI
aws s3 ls s3://merit-badge-uploads/certifications/