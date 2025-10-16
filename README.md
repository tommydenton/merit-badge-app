# Merit Badge Counselor Application

A full-stack web application for managing Merit Badge Counselor applications for the Boy Scouts of America.

## Features

- **Responsive Bootstrap 5 UI** - Mobile-friendly form interface
- **Multi-select Merit Badge Selection** - Select from 150+ merit badges using Select2
- **File Upload Support** - Upload up to 10 certification files (max 30MB total)
- **Form Validation** - Client-side and server-side validation
- **MySQL Database** - Relational database with proper schema design
- **RESTful API** - Express.js backend with clean API endpoints
- **Conditional Form Logic** - Dynamic form sections based on user selections
- **Security** - File type validation, SQL injection protection, input sanitization

## Tech Stack

### Frontend
- Bootstrap 5
- jQuery
- Select2 (multi-select dropdown)
- Vanilla JavaScript

### Backend
- Node.js
- Express.js
- MySQL 2 (MySQL client)
- Multer (file uploads)
- Express Validator (validation)
- dotenv (environment variables)

## Project Structure

```
merit-badge-app/
├── config/
│   └── database.js          # MySQL connection configuration
├── database/
│   ├── schema.sql           # Database schema
│   ├── seed_merit_badges.sql # Merit badges seed data
│   └── seed_districts.sql   # Districts reference
├── models/
│   └── Application.js       # Application model
├── public/
│   ├── css/
│   │   └── style.css        # Custom styles
│   ├── js/
│   │   └── app.js           # Frontend JavaScript
│   ├── uploads/             # Uploaded files directory
│   └── index.html           # Main form page
├── routes/
│   └── applications.js      # API routes
├── .env.example             # Environment variables template
├── .gitignore
├── package.json
├── server.js                # Express server
└── README.md
```

## Local Development Setup

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm or yarn

### Installation Steps

1. **Clone or download the project**
   ```bash
   cd merit-badge-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up MySQL database**

   Create a new MySQL database:
   ```sql
   CREATE DATABASE merit_badge_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   USE merit_badge_app;
   ```

   Run the schema script:
   ```bash
   mysql -u your_username -p merit_badge_app < database/schema.sql
   ```

   Seed the merit badges:
   ```bash
   mysql -u your_username -p merit_badge_app < database/seed_merit_badges.sql
   ```

4. **Configure environment variables**

   Copy the example file:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your database credentials:
   ```
   PORT=3000
   NODE_ENV=development

   DB_HOST=localhost
   DB_USER=your_mysql_username
   DB_PASSWORD=your_mysql_password
   DB_NAME=merit_badge_app
   DB_PORT=3306

   MAX_FILE_SIZE=31457280
   MAX_FILES=10
   UPLOAD_DIR=public/uploads
   ```

5. **Start the application**
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

6. **Access the application**

   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Namecheap Hosting Deployment

### Prerequisites
- Namecheap shared hosting with cPanel
- Node.js enabled on your hosting account
- MySQL database access

### Step-by-Step Deployment

#### 1. Set Up Node.js Application in cPanel

1. Log in to your Namecheap cPanel
2. Navigate to **Software** > **Setup Node.js App**
3. Click **Create Application**
4. Configure:
   - **Node.js version**: Select latest available (12.x or higher)
   - **Application mode**: Production
   - **Application root**: `merit-badge-app` (or your preferred directory)
   - **Application URL**: Your domain or subdomain
   - **Application startup file**: `server.js`
5. Click **Create**

#### 2. Create MySQL Database

1. In cPanel, go to **Databases** > **MySQL Databases**
2. Create a new database:
   - Database name: `yourusername_meritbadge`
3. Create a database user:
   - Username: `yourusername_mbapp`
   - Password: Generate a strong password
4. Add user to database with **ALL PRIVILEGES**
5. **Save the database credentials** - you'll need them for the `.env` file

#### 3. Upload Application Files

**Option A: Using File Manager**
1. In cPanel, open **File Manager**
2. Navigate to your application root directory
3. Upload all project files (or use Git if available)

**Option B: Using FTP**
1. Use an FTP client (FileZilla, etc.)
2. Connect to your hosting account
3. Upload all files to the application root directory

**Option C: Using SSH/Git (if available)**
```bash
ssh username@yourdomain.com
cd merit-badge-app
git clone <your-repository-url> .
```

#### 4. Install Dependencies

1. In cPanel, go back to **Setup Node.js App**
2. Click on your application
3. In the **Detected configuration files** section, click **Run NPM Install**

   Or use the terminal:
   ```bash
   cd merit-badge-app
   npm install --production
   ```

#### 5. Set Up Database

1. In cPanel, go to **phpMyAdmin**
2. Select your database
3. Click **Import** tab
4. Upload and execute `database/schema.sql`
5. Upload and execute `database/seed_merit_badges.sql`

#### 6. Configure Environment Variables

1. In the Node.js App setup page, scroll to **Environment Variables**
2. Add the following variables:

   ```
   PORT=3000
   NODE_ENV=production
   DB_HOST=localhost
   DB_USER=yourusername_mbapp
   DB_PASSWORD=your_database_password
   DB_NAME=yourusername_meritbadge
   DB_PORT=3306
   MAX_FILE_SIZE=31457280
   MAX_FILES=10
   UPLOAD_DIR=public/uploads
   ```

   **Note**: Some Namecheap accounts may use a specific hostname instead of `localhost` for DB_HOST. Check your MySQL remote connection settings.

#### 7. Set Upload Directory Permissions

1. In File Manager, navigate to `public/uploads`
2. Right-click > **Change Permissions**
3. Set to `755` (or `775` if needed)
4. Check "Recurse into subdirectories"
5. Click **Change Permissions**

#### 8. Start the Application

1. Go back to **Setup Node.js App**
2. Click **Restart** on your application
3. Verify the application is running (status should show "Running")

#### 9. Access Your Application

Navigate to your domain/subdomain:
```
https://yourdomain.com
```

### Troubleshooting on Namecheap

**Issue: Application won't start**
- Check the error logs in the Node.js App interface
- Verify all dependencies are installed
- Check that `server.js` is the correct startup file

**Issue: Database connection fails**
- Verify database credentials in environment variables
- Try using `localhost` or the specific hostname provided by Namecheap
- Check that the database user has proper permissions
- Verify the database exists and is accessible

**Issue: File uploads not working**
- Check directory permissions on `public/uploads`
- Verify the upload path in environment variables
- Check Namecheap's file size limits

**Issue: Application crashes after deployment**
- Check Node.js version compatibility
- Review application logs
- Ensure all required environment variables are set
- Verify MySQL connection is working

**Issue: 404 errors on routes**
- Check that the Application URL is configured correctly
- Verify `.htaccess` configuration if needed
- Ensure Express static file serving is working

### Environment-Specific Notes

**MySQL Connection on Namecheap:**
- Database host is usually `localhost`
- Some accounts may require the full hostname (check cPanel)
- Use the full database name including your cPanel username prefix

**File Paths:**
- Use relative paths, not absolute paths
- The `public/uploads` directory is relative to your app root
- Ensure write permissions are properly set

**Port Configuration:**
- Namecheap assigns the port automatically
- The PORT environment variable should match what cPanel assigns
- Default is usually 3000, but verify in the Node.js App settings

## Database Schema

### Tables

**applications**
- Stores main application data
- Fields: personal info, BSA volunteer status, purpose, qualifications

**merit_badges**
- Reference table for all merit badges
- Pre-populated with 150+ badges

**application_badges**
- Junction table linking applications to merit badges
- Tracks whether badges are to counsel or drop

**certifications**
- Stores uploaded certification file metadata
- Links to applications table

## API Endpoints

### GET /api/applications/merit-badges
Get all available merit badges for dropdown selection

**Response:**
```json
{
  "success": true,
  "badges": [
    { "id": 1, "name": "Archery" },
    { "id": 2, "name": "Camping" }
  ]
}
```

### POST /api/applications
Submit a new merit badge counselor application

**Request:** multipart/form-data
- Form fields
- File uploads (certifications)

**Response:**
```json
{
  "success": true,
  "message": "Application submitted successfully",
  "applicationId": 123
}
```

### GET /api/applications/:id
Get application details by ID

**Response:**
```json
{
  "success": true,
  "application": {
    "id": 123,
    "firstName": "John",
    "lastName": "Doe",
    ...
  }
}
```

## Security Features

- **SQL Injection Protection**: Parameterized queries with mysql2
- **File Upload Security**:
  - File type validation
  - Size limits (30MB total, 10 files max)
  - Executable files blocked
- **Input Validation**: Express-validator for all inputs
- **XSS Protection**: Input sanitization
- **CORS**: Configurable cross-origin requests

## Maintenance

### Viewing Submitted Applications

Connect to your MySQL database and query:

```sql
SELECT * FROM applications ORDER BY created_at DESC;
```

To see full application details with badges:

```sql
SELECT
    a.*,
    GROUP_CONCAT(DISTINCT CASE WHEN ab.badge_type = 'counsel' THEN mb.name END) as badges_to_counsel,
    GROUP_CONCAT(DISTINCT CASE WHEN ab.badge_type = 'drop' THEN mb.name END) as badges_to_drop
FROM applications a
LEFT JOIN application_badges ab ON a.id = ab.application_id
LEFT JOIN merit_badges mb ON ab.merit_badge_id = mb.id
WHERE a.id = 123
GROUP BY a.id;
```

### Backup Database

```bash
mysqldump -u username -p merit_badge_app > backup_$(date +%Y%m%d).sql
```

### Managing Uploaded Files

Files are stored in `public/uploads/` with unique filenames. Periodically clean up files from deleted applications.

## Support

For issues or questions:
- Check the troubleshooting section above
- Review application logs
- Verify database connections
- Check file permissions

## License

ISC

## Credits

Built for Boy Scouts of America Merit Badge Counselor applications.
