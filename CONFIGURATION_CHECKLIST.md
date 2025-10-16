# Configuration Checklist

Use this checklist to ensure your Merit Badge Counselor Application is properly configured.

## Pre-Deployment Checklist

### Local Development Setup

- [ ] **Node.js Installed**
  - Version 14.x or higher
  - Check with: `node --version`

- [ ] **MySQL Installed**
  - Version 5.7 or higher
  - Check with: `mysql --version`

- [ ] **Dependencies Installed**
  - Run: `npm install`
  - Verify no errors

- [ ] **Database Created**
  - Database name: `merit_badge_app`
  - Character set: `utf8mb4`
  - Collation: `utf8mb4_unicode_ci`

- [ ] **Schema Imported**
  - File: `database/schema.sql`
  - All 4 tables created: applications, merit_badges, application_badges, certifications

- [ ] **Merit Badges Seeded**
  - File: `database/seed_merit_badges.sql`
  - Verify: `SELECT COUNT(*) FROM merit_badges;` (should be 120+)

- [ ] **.env File Configured**
  - Copy from: `.env.example`
  - All values filled in (see below)

- [ ] **Uploads Directory Exists**
  - Path: `public/uploads/`
  - Permissions: 755

- [ ] **Application Starts**
  - Run: `npm start`
  - No errors in console

- [ ] **Database Connection Works**
  - Should see: "✓ Database connected successfully"

- [ ] **Form Accessible**
  - URL: `http://localhost:3000`
  - Form loads without errors

## Environment Variables Configuration

### Required Variables

```env
# Server
PORT=3000                           ✓ Port number (usually 3000)
NODE_ENV=production                 ✓ Environment (development/production)

# Database
DB_HOST=localhost                   ✓ Database host
DB_USER=your_mysql_username         ✓ MySQL username
DB_PASSWORD=your_mysql_password     ✓ MySQL password
DB_NAME=merit_badge_app             ✓ Database name
DB_PORT=3306                        ✓ MySQL port (usually 3306)

# Upload Configuration
MAX_FILE_SIZE=31457280              ✓ Max size in bytes (30MB)
MAX_FILES=10                        ✓ Max number of files
UPLOAD_DIR=public/uploads           ✓ Upload directory path
```

### Verify Each Variable

- [ ] `PORT` - Server will run on this port
- [ ] `NODE_ENV` - Set to "production" for hosting, "development" for local
- [ ] `DB_HOST` - Usually "localhost" (may differ on Namecheap)
- [ ] `DB_USER` - Your MySQL username (include prefix on Namecheap)
- [ ] `DB_PASSWORD` - Your MySQL password (no quotes needed)
- [ ] `DB_NAME` - Database name (include prefix on Namecheap)
- [ ] `DB_PORT` - Usually 3306 (default MySQL port)
- [ ] `MAX_FILE_SIZE` - 31457280 bytes = ~30MB
- [ ] `MAX_FILES` - Maximum 10 files per upload
- [ ] `UPLOAD_DIR` - Relative path to uploads folder

## Namecheap Deployment Checklist

### cPanel Setup

- [ ] **Node.js App Created**
  - Location: Software → Setup Node.js App
  - Application root path set
  - Application URL configured
  - Startup file: `server.js`
  - Node.js version: 14+ selected

- [ ] **MySQL Database Created**
  - Location: Databases → MySQL Databases
  - Database created with name: `username_meritbadge`
  - User created: `username_mbapp`
  - User added to database with ALL PRIVILEGES
  - Credentials saved securely

- [ ] **Database Schema Imported**
  - Via phpMyAdmin
  - Import → `schema.sql`
  - Import → `seed_merit_badges.sql`
  - Verify tables exist

- [ ] **Files Uploaded**
  - All project files in application root
  - Via File Manager, FTP, or SSH
  - node_modules/ NOT uploaded (will install via npm)

- [ ] **NPM Dependencies Installed**
  - In Node.js App interface
  - Click "Run NPM Install"
  - Wait for completion
  - Check for errors

- [ ] **Environment Variables Set**
  - In Node.js App interface
  - All variables from .env added
  - Database credentials match cPanel MySQL setup

- [ ] **Permissions Set**
  - `public/uploads/` → 755 permissions
  - Recursive permissions enabled

- [ ] **Application Started**
  - Status shows "Running"
  - No errors in logs

### Post-Deployment Verification

- [ ] **Form Accessible**
  - Navigate to your domain
  - Form loads without errors

- [ ] **Merit Badges Load**
  - Dropdowns populate with badges
  - No JavaScript errors in browser console

- [ ] **Form Validation Works**
  - Required fields show errors when empty
  - Email validation works
  - Age validation (18+) works

- [ ] **Conditional Logic Works**
  - Volunteer status shows/hides fields
  - Purpose selection shows/hides sections

- [ ] **File Upload Works**
  - Can select files
  - File list displays
  - Size validation works

- [ ] **Form Submission Works**
  - Submit with valid data
  - Success message appears
  - No errors

- [ ] **Data Saved to Database**
  - Check in phpMyAdmin
  - Query: `SELECT * FROM applications ORDER BY id DESC LIMIT 1;`
  - Data appears correctly

- [ ] **Files Saved**
  - Check in File Manager
  - Navigate to `public/uploads/`
  - Uploaded files present

## Security Checklist

- [ ] **SSL Enabled**
  - cPanel → SSL/TLS Status
  - Install free Let's Encrypt certificate
  - Force HTTPS (optional .htaccess rule)

- [ ] **Strong Passwords**
  - Database password is strong (12+ characters, mixed case, numbers, symbols)
  - cPanel password is strong
  - FTP password is strong

- [ ] **.env File Protected**
  - Not accessible via web browser
  - Listed in .gitignore if using Git

- [ ] **File Upload Security**
  - Executable files blocked (.exe, .bat, etc.)
  - File size limits enforced
  - Upload directory not directly browsable

- [ ] **Database Security**
  - Database user has only necessary privileges
  - Database not accessible remotely (unless needed)
  - Regular backups enabled

## Testing Checklist

### Functional Testing

- [ ] **Personal Information Section**
  - First name field accepts input
  - Last name field accepts input
  - Age field validates 18+
  - Phone auto-formats: (123) 456-7890
  - Email validates format

- [ ] **Volunteer Status Section**
  - Dropdown shows Yes/No options
  - "Yes" shows BSA ID and District fields
  - "No" shows warning message
  - Fields become required when visible

- [ ] **Purpose Section**
  - All 6 options available
  - "Become Counselor" shows counsel badges + qualifications
  - "Drop Badges" shows drop badges
  - "Change/Add" shows counsel badges + qualifications
  - Other options work correctly

- [ ] **Merit Badge Selection**
  - Counsel badges dropdown loads all badges
  - Drop badges dropdown loads all badges
  - Can select multiple badges
  - Search works in Select2
  - Can deselect badges

- [ ] **File Upload**
  - Can select multiple files (up to 10)
  - File list shows selected files
  - File sizes display correctly
  - Total size calculated
  - Error if exceeds 30MB
  - Error if more than 10 files

- [ ] **Form Submission**
  - Loading spinner shows
  - Button disabled during submit
  - Success message on success
  - Error message on failure
  - Form resets after success

### Browser Testing

- [ ] **Chrome** - Form works correctly
- [ ] **Firefox** - Form works correctly
- [ ] **Safari** - Form works correctly
- [ ] **Edge** - Form works correctly
- [ ] **Mobile Safari (iOS)** - Form works correctly
- [ ] **Mobile Chrome (Android)** - Form works correctly

### Responsive Testing

- [ ] **Desktop (1920x1080)** - Looks good
- [ ] **Laptop (1366x768)** - Looks good
- [ ] **Tablet (768x1024)** - Looks good
- [ ] **Mobile (375x667)** - Looks good

## Performance Checklist

- [ ] **Page Load Time**
  - Under 3 seconds on first load
  - Under 1 second on subsequent loads

- [ ] **Database Queries**
  - Merit badges load quickly
  - Form submission completes in < 2 seconds

- [ ] **File Uploads**
  - Multiple files upload successfully
  - 30MB upload completes without timeout

- [ ] **Server Resources**
  - Application doesn't crash under load
  - Memory usage reasonable
  - No memory leaks

## Maintenance Checklist

### Daily
- [ ] Check application is running
- [ ] Check for critical errors in logs

### Weekly
- [ ] Review application logs
- [ ] Check disk space usage
- [ ] Verify backups are running

### Monthly
- [ ] Backup database manually
- [ ] Download backup to local machine
- [ ] Review and clean old uploaded files
- [ ] Check for npm package updates
- [ ] Review security advisories

### Quarterly
- [ ] Update npm dependencies
- [ ] Review and update documentation
- [ ] Security audit
- [ ] Performance review

## Troubleshooting Checklist

If something isn't working, check:

### Application Won't Start
- [ ] Node.js version compatible (14+)
- [ ] All dependencies installed (`npm install`)
- [ ] .env file exists and configured
- [ ] Startup file is `server.js`
- [ ] Port is available (not in use)
- [ ] Check error logs

### Database Connection Fails
- [ ] Database exists
- [ ] Credentials in .env are correct
- [ ] Database user has proper permissions
- [ ] DB_HOST is correct (localhost or specific host)
- [ ] MySQL service is running
- [ ] Firewall not blocking connection

### Form Not Loading
- [ ] Application is running
- [ ] Correct URL being accessed
- [ ] No JavaScript errors in console
- [ ] Static files being served
- [ ] Bootstrap CSS loading
- [ ] jQuery loading

### Merit Badges Not Loading
- [ ] Database connection working
- [ ] merit_badges table populated
- [ ] API endpoint accessible: `/api/applications/merit-badges`
- [ ] No CORS errors
- [ ] Check browser console for errors

### File Upload Not Working
- [ ] uploads directory exists
- [ ] uploads directory has correct permissions (755)
- [ ] UPLOAD_DIR path is correct in .env
- [ ] File size within limits
- [ ] File type is allowed
- [ ] Disk space available

### Form Submission Fails
- [ ] All required fields filled
- [ ] Validation passing
- [ ] Database connection working
- [ ] API endpoint accessible
- [ ] Check server logs for errors
- [ ] Check browser console for errors

## Final Verification

Before going live:

- [ ] All configuration items checked ✓
- [ ] All tests passing ✓
- [ ] Security measures in place ✓
- [ ] Backup system working ✓
- [ ] Documentation reviewed ✓
- [ ] Team trained on viewing submissions ✓
- [ ] Contact information for support ready ✓

---

## Configuration Complete! 🎉

Once all items are checked, your Merit Badge Counselor Application is ready for production use.

For ongoing support, refer to:
- README.md - General documentation
- NAMECHEAP_DEPLOYMENT.md - Deployment guide
- PROJECT_SUMMARY.md - Feature overview
