# Namecheap Deployment Quick Start Guide

This guide provides a streamlined process for deploying the Merit Badge Counselor Application on Namecheap shared hosting.

## Prerequisites Checklist

- [ ] Namecheap hosting account with cPanel access
- [ ] Node.js enabled on your hosting plan
- [ ] FTP/SSH credentials (optional but recommended)
- [ ] Domain or subdomain configured

## Quick Deployment Steps

### Step 1: Database Setup (5 minutes)

1. **Login to cPanel**
   - Navigate to your Namecheap hosting cPanel

2. **Create MySQL Database**
   - Go to **Databases** → **MySQL Databases**
   - Create database: `[username]_meritbadge`
   - Create user: `[username]_mbapp`
   - Generate strong password and **save it**
   - Add user to database with **ALL PRIVILEGES**

3. **Import Database Schema**
   - Go to **phpMyAdmin**
   - Select your new database
   - Click **Import** tab
   - Upload `database/schema.sql`
   - Upload `database/seed_merit_badges.sql`

### Step 2: Upload Files (10 minutes)

**Option A: File Manager (Easiest)**
1. In cPanel, open **File Manager**
2. Navigate to `public_html` or your preferred directory
3. Create folder: `merit-badge-app`
4. Upload all project files to this folder
5. Extract if uploaded as ZIP

**Option B: FTP Client**
1. Connect via FTP using your credentials
2. Navigate to your web directory
3. Create folder: `merit-badge-app`
4. Upload all files

### Step 3: Node.js Application Setup (5 minutes)

1. **Create Node.js App**
   - In cPanel, go to **Software** → **Setup Node.js App**
   - Click **Create Application**

2. **Configure Application**
   ```
   Node.js version: 14.x or higher (latest available)
   Application mode: Production
   Application root: merit-badge-app
   Application URL: yourdomain.com (or subdomain)
   Application startup file: server.js
   ```

3. **Click Create**

### Step 4: Install Dependencies (2 minutes)

1. In the Node.js App interface, click **Run NPM Install**
2. Wait for installation to complete

### Step 5: Environment Configuration (3 minutes)

In the Node.js App page, add these **Environment Variables**:

```
PORT                    3000
NODE_ENV                production
DB_HOST                 localhost
DB_USER                 [your_username]_mbapp
DB_PASSWORD             [your_database_password]
DB_NAME                 [your_username]_meritbadge
DB_PORT                 3306
MAX_FILE_SIZE           31457280
MAX_FILES               10
UPLOAD_DIR              public/uploads
```

**Important**: Replace bracketed values with your actual credentials.

### Step 6: Set Permissions (2 minutes)

1. In **File Manager**, navigate to `merit-badge-app/public/uploads`
2. Right-click → **Change Permissions**
3. Set to `755`
4. Check "Recurse into subdirectories"
5. Click **Change Permissions**

### Step 7: Start Application (1 minute)

1. Go back to **Setup Node.js App**
2. Find your application
3. Click **Restart**
4. Verify status shows **Running**

### Step 8: Test Application

1. Navigate to your domain: `https://yourdomain.com`
2. The Merit Badge Counselor form should appear
3. Test form submission with sample data

## Common Issues & Quick Fixes

### ❌ "Application Failed to Start"

**Fix:**
- Check error logs in Node.js App interface
- Verify `server.js` is the startup file
- Ensure all dependencies installed successfully
- Check Node.js version is 14+

### ❌ "Database Connection Error"

**Fix:**
```
1. Verify DB_HOST is "localhost" (or specific hostname from Namecheap)
2. Check database name includes username prefix: username_meritbadge
3. Verify database user has ALL PRIVILEGES
4. Test connection in phpMyAdmin
```

### ❌ "Cannot Write Files / Upload Error"

**Fix:**
```
1. Check public/uploads permissions: should be 755 or 775
2. Verify UPLOAD_DIR environment variable is set
3. Check disk space quota in cPanel
4. Verify max file size limits
```

### ❌ "404 Not Found" on Routes

**Fix:**
```
1. Verify Application URL in Node.js App settings
2. Check Application Root path is correct
3. Restart the application
4. Clear browser cache
```

### ❌ "Merit Badges Not Loading"

**Fix:**
```
1. Verify seed_merit_badges.sql was imported
2. Check database connection is working
3. Check browser console for JavaScript errors
4. Verify API endpoint is accessible: /api/applications/merit-badges
```

## Verification Checklist

After deployment, verify:

- [ ] Application accessible at your domain
- [ ] Form loads without errors
- [ ] Merit badges populate in dropdowns
- [ ] Conditional fields show/hide correctly
- [ ] File upload accepts files
- [ ] Form validation works
- [ ] Form submits successfully
- [ ] Data appears in database
- [ ] Files saved to uploads folder

## Testing the Application

### Test Form Submission

1. Fill out the form with test data:
   ```
   First Name: Test
   Last Name: User
   Age: 25
   Email: test@example.com
   Volunteer Status: Yes
   BSA Member ID: 123456
   District: Arrowhead
   Purpose: Become a Counselor
   Select 1-2 merit badges
   Upload a test PDF file
   ```

2. Submit the form

3. Check database in phpMyAdmin:
   ```sql
   SELECT * FROM applications ORDER BY id DESC LIMIT 1;
   ```

4. Verify file appears in `public/uploads/` directory

## Monitoring

### View Application Logs
- In cPanel → **Setup Node.js App** → Click your app → View logs

### Check Database
- phpMyAdmin → Select database → Browse tables

### Monitor Uploads
- File Manager → `merit-badge-app/public/uploads`

## Maintenance Tasks

### Weekly
- [ ] Check application is running
- [ ] Review error logs

### Monthly
- [ ] Backup database
- [ ] Clean old uploaded files
- [ ] Check disk space usage

### Database Backup Command
```bash
# Via SSH (if available)
mysqldump -u username -p database_name > backup_$(date +%Y%m%d).sql
```

Or use cPanel → **Backup** → **Download MySQL Database Backup**

## Support Resources

**Namecheap Support:**
- Knowledge Base: https://www.namecheap.com/support/knowledgebase/
- Live Chat: Available in cPanel
- Ticket System: Submit through account dashboard

**Application Issues:**
- Check README.md for detailed documentation
- Review server logs for errors
- Verify all environment variables are set correctly

## Performance Tips

1. **Enable Passenger (if available)**
   - Improves Node.js app performance
   - Available on some Namecheap plans

2. **Optimize Database**
   - Add indexes to frequently queried columns (already included in schema)
   - Regular OPTIMIZE TABLE commands

3. **File Management**
   - Periodically clean old upload files
   - Consider file size limits based on disk quota

4. **Monitoring**
   - Set up uptime monitoring (UptimeRobot, Pingdom)
   - Enable error notifications

## Next Steps

After successful deployment:

1. **Configure Email Notifications** (Optional)
   - Add email sending capability for application confirmations
   - Use Namecheap's SMTP settings

2. **Add Admin Panel** (Future Enhancement)
   - View submitted applications
   - Export to CSV
   - Manage merit badges

3. **SSL Certificate**
   - Enable free SSL in cPanel (Let's Encrypt)
   - Force HTTPS redirects

4. **Backup Strategy**
   - Set up automated database backups
   - Download backups regularly

## Security Recommendations

- [ ] Enable SSL/HTTPS
- [ ] Use strong database passwords
- [ ] Regularly update Node.js dependencies
- [ ] Monitor uploaded files
- [ ] Set up fail2ban (if available)
- [ ] Regular security audits

## Contact Information

For application-specific issues or customization requests, refer to the main README.md file.

---

**Deployment Time Estimate: 30-45 minutes**

**Skill Level Required: Intermediate (basic cPanel & database knowledge)**
