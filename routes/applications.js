const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const Application = require('../models/Application');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, process.env.UPLOAD_DIR || 'public/uploads');
    },
    filename: function (req, file, cb) {
        // Create unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

// File filter - block executable files
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
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 31457280, // 30MB default
        files: parseInt(process.env.MAX_FILES) || 10
    },
    fileFilter: fileFilter
});

// Validation middleware
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

// GET /api/applications/merit-badges - Get all merit badges
router.get('/merit-badges', async (req, res, next) => {
    try {
        const badges = await Application.getAllMeritBadges();
        res.json({
            success: true,
            badges
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/applications - Submit new application
router.post('/', upload.array('certifications', 10), validateApplication, async (req, res, next) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        // Parse badges arrays (sent as JSON strings from frontend)
        let badgesToCounsel = [];
        let badgesToDrop = [];

        if (req.body.badgesToCounsel) {
            try {
                badgesToCounsel = JSON.parse(req.body.badgesToCounsel);
            } catch (e) {
                badgesToCounsel = [];
            }
        }

        if (req.body.badgesToDrop) {
            try {
                badgesToDrop = JSON.parse(req.body.badgesToDrop);
            } catch (e) {
                badgesToDrop = [];
            }
        }

        // Prepare certification files data
        const certifications = req.files ? req.files.map(file => ({
            filename: file.originalname,
            filepath: file.path,
            size: file.size
        })) : [];

        // Prepare application data
        const applicationData = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            age: req.body.age,
            phone: req.body.phone,
            email: req.body.email,
            isVolunteer: req.body.isVolunteer,
            bsaMemberId: req.body.bsaMemberId,
            district: req.body.district,
            purpose: req.body.purpose,
            qualifications: req.body.qualifications,
            additionalInfo: req.body.additionalInfo,
            badgesToCounsel,
            badgesToDrop,
            certifications
        };

        // Save to database
        const result = await Application.create(applicationData);

        res.status(201).json({
            success: true,
            message: 'Application submitted successfully',
            applicationId: result.applicationId
        });

    } catch (error) {
        // If there's an error, clean up uploaded files
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

// GET /api/applications/:id - Get application by ID
router.get('/:id', async (req, res, next) => {
    try {
        const application = await Application.getById(req.params.id);

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        res.json({
            success: true,
            application
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;
