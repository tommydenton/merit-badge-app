# Merit Badge Counselor Application

A full-stack web application for managing Merit Badge Counselor applications for the Longhorn Council. The application provides a responsive form interface for applicants to submit their credentials, select merit badges to counsel, and upload certification files. All submissions are validated both client-side and server-side, stored in MySQL, and accessible via a clean RESTful API.

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Runtime | Node.js | 14+ | JavaScript runtime environment |
| Framework | Express.js | 4.18.2 | RESTful API backend and static file serving |
| Language | JavaScript | ES6+ | Dynamic typing for rapid development |
| Database | MySQL | 5.7+ | Relational database with proper schema design |
| Frontend | Bootstrap 5 | 5.3.2 | Responsive UI framework |
| Form Library | Select2 | 4.1.0 | Enhanced multi-select dropdown functionality |
| File Upload | Multer | 1.4.5 | Middleware for handling file uploads |
| Validation | Express Validator | 7.0.1 | Server-side input validation |
| Environment | dotenv | 16.3.1 | Environment variable management |

## Quick Start

### Prerequisites
- Node.js v14 or higher
- MySQL 5.7 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd merit-badge-app

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your database credentials
# DB_HOST=localhost
# DB_USER=your_mysql_user
# DB_PASSWORD=your_password
# DB_NAME=merit_badge_app
# PORT=3000

# Create MySQL database
mysql -u your_user -p
> CREATE DATABASE merit_badge_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
> USE merit_badge_app;
> source database/schema.sql
> source database/seed_merit_badges.sql
> exit

# Start development server
npm run dev

# Or start production server
npm start
```

The application will be available at `http://localhost:3000`

## Project Structure

```
merit-badge-app/
├── config/
│   └── database.js              # MySQL connection pool configuration
├── database/
│   ├── schema.sql               # Database schema (4 tables)
│   ├── seed_merit_badges.sql    # Seed data for 150+ merit badges
│   └── seed_districts.sql       # Optional district reference data
├── models/
│   └── Application.js           # Application data model with DB methods
├── public/
│   ├── css/
│   │   └── style.css            # Custom styling
│   ├── js/
│   │   └── app.js               # Frontend JavaScript (jQuery + Select2)
│   ├── uploads/                 # Directory for uploaded certification files
│   └── index.html               # Main application form
├── routes/
│   └── applications.js          # API route handlers for applications
├── server.js                    # Express server entry point
├── package.json                 # Dependencies and scripts
├── .env.example                 # Environment variables template
└── README.md                    # Full documentation
```

## Architecture Overview

The application follows a classic three-tier architecture:

**Frontend Layer** (Bootstrap 5 + jQuery): Browser-based form with client-side validation, Select2 multi-select dropdowns, and dynamic form sections that show/hide based on user selections.

**API Layer** (Express.js): RESTful endpoints that handle form submission, file uploads, badge lookup, and application retrieval. Uses Express Validator for input validation and Multer for secure file handling.

**Data Layer** (MySQL): Normalized schema with four tables: applications (main data), merit_badges (reference), application_badges (junction table for counseling/dropping badges), and certifications (file metadata).

### Key Modules

| Module | Location | Purpose |
|--------|----------|---------|
| Application Model | models/Application.js | Static methods for database operations: create(), getAllMeritBadges(), getById() |
| Database Config | config/database.js | MySQL connection pool with promise-based interface |
| API Routes | routes/applications.js | Express route handlers for GET/POST endpoints with validation and file upload |
| Server | server.js | Express app initialization, middleware setup, error handling |
| Frontend Logic | public/js/app.js | jQuery-based form initialization, Select2 setup, AJAX requests, form validation |

## Development Guidelines

### File Naming
- **Route files**: camelCase with descriptive names (`applications.js`, `database.js`)
- **Model files**: PascalCase class names in files (`Application.js`)
- **Config files**: descriptive lowercase (`database.js`)
- **Frontend files**: lowercase with purpose indicator (`app.js`, `style.css`)
- **Database files**: descriptive with underscores (`seed_merit_badges.sql`)

### Code Naming
- **Functions**: camelCase, verb-prefixed when handling actions (`loadMeritBadges()`, `setupFormListeners()`, `validateApplication`)
- **Variables**: camelCase (`badgesToCounsel`, `applicationData`, `certifications`)
- **Classes**: PascalCase (`Application`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_FILE_SIZE`, `MAX_FILES`)
- **Database fields**: snake_case (`first_name`, `bsa_member_id`, `created_at`)

### Import Order
1. External packages (express, mysql2, multer, etc.)
2. Relative imports with `./` or `../`
3. Type/class definitions
4. dotenv configuration (typically at top of file)

### Async/Error Handling
- Use async/await with try-catch blocks
- Database operations use promise-based mysql2 pool
- Express routes pass errors to middleware via `next(error)`
- API responses follow `{ success: boolean, message?, data? }` pattern
- Database transactions use connection.beginTransaction() and connection.commit()

### Validation Pattern
- Client-side: Browser HTML5 validation with Bootstrap feedback classes
- Server-side: Express Validator middleware on routes with error collection
- File uploads: Multer fileFilter blocks executable extensions

## Available Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start production server (requires .env configured) |
| `npm run dev` | Start development server with nodemon auto-reload |
| `npm install` | Install dependencies from package.json |

## Environment Variables

All variables are defined in `.env.example` and should be copied to `.env`:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PORT` | Yes | Server port | 3000 |
| `NODE_ENV` | Yes | Environment mode | development or production |
| `DB_HOST` | Yes | MySQL hostname | localhost |
| `DB_USER` | Yes | MySQL username | merit_user |
| `DB_PASSWORD` | Yes | MySQL password | secure_password |
| `DB_NAME` | Yes | Database name | merit_badge_app |
| `DB_PORT` | No | MySQL port | 3306 |
| `MAX_FILE_SIZE` | No | Max file size in bytes | 31457280 (30MB) |
| `MAX_FILES` | No | Max number of files | 10 |
| `UPLOAD_DIR` | No | File upload directory | public/uploads |

## API Endpoints

### GET /api/applications/merit-badges
Retrieves all available merit badges for form dropdowns.

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
Submits a new merit badge counselor application with optional file uploads.

**Request:** multipart/form-data with:
- Form fields: firstName, lastName, age, phone, email, isVolunteer, bsaMemberId, district, purpose, qualifications, additionalInfo
- JSON strings: badgesToCounsel, badgesToDrop (parsed from JSON arrays)
- Files: certifications (up to 10 files, max 30MB total)

**Response:**
```json
{
  "success": true,
  "message": "Application submitted successfully",
  "applicationId": 123
}
```

### GET /api/applications/:id
Retrieves a submitted application with all related data.

**Response:**
```json
{
  "success": true,
  "application": {
    "id": 123,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "badges_to_counsel": ["Archery", "Camping"],
    "badges_to_drop": ["Swimming"],
    "certifications": [
      { "id": 1, "filename": "cert.pdf", "filepath": "public/uploads/...", "file_size": 2000 }
    ]
  }
}
```

## Database Schema

**applications**: Main applicant data with personal info, volunteer status, purpose, and qualifications.

**merit_badges**: Reference table with 150+ merit badge names (pre-populated via seed).

**application_badges**: Junction table linking applications to badges with type (counsel/drop).

**certifications**: File metadata including filename, filepath, size, and upload timestamp.

All tables use InnoDB with proper indexes on frequently queried fields (email, district, created_at, application_id, merit_badge_id).

## Security Features

- **SQL Injection Prevention**: All queries use parameterized statements with `?` placeholders
- **File Upload Security**: Multer blocks executable extensions (.exe, .bat, .sh, .js, etc.)
- **File Size Limits**: 30MB per file, 10 files maximum per submission
- **Input Validation**: Express Validator validates all user inputs before processing
- **CORS Enabled**: Cross-origin requests configured via cors middleware
- **Transaction Safety**: Database inserts use transactions to ensure data consistency

## Testing

No formal test suite currently exists. To test the application:

1. Start server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. Fill form with valid data
4. Select merit badges using multi-select
5. Upload test files
6. Submit and verify in MySQL: `SELECT * FROM applications ORDER BY created_at DESC;`

## Deployment

For Namecheap hosting via cPanel with Node.js enabled:

1. Create Node.js application in cPanel setup with startup file `server.js`
2. Create MySQL database and user in cPanel MySQL Databases section
3. Upload project files via FTP or Git
4. Run `npm install --production` in application directory
5. Set environment variables in cPanel Node.js app settings
6. Set file permissions on `public/uploads` to 755
7. Restart application from cPanel

See README.md for full Namecheap deployment instructions.

## Additional Resources

- @README.md - Complete project documentation and deployment guide
- @CONFIGURATION_CHECKLIST.md - Comprehensive setup verification
- @PROJECT_SUMMARY.md - Architecture and feature overview
- Database schema: @database/schema.sql
- API implementation: @routes/applications.js


## Skill Usage Guide

When working on tasks involving these technologies, invoke the corresponding skill:

| Skill | Invoke When |
|-------|-------------|
| mysql | Designs MySQL schemas, writes parameterized queries, and manages database connections |
| bootstrap | Applies Bootstrap 5 responsive grid, components, and form styling |
| node | Configures Node.js runtime, async patterns, and npm package management |
| express | Manages Express.js routing, middleware setup, and REST API endpoints |
| frontend-design | Designs responsive Bootstrap 5 UI with form validation and mobile-first layouts |
| jquery | Implements jQuery DOM manipulation, event handling, and AJAX requests |
| multer | Configures file upload middleware, storage, and file validation |
| select2 | Configures Select2 multi-select dropdowns and search functionality |
| express-validator | Implements server-side input validation and error handling middleware |
