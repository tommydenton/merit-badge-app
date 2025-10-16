-- Merit Badge Counselor Application Database Schema
-- MySQL Database

-- Create database (run this separately if needed)
-- CREATE DATABASE merit_badge_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE merit_badge_app;

-- Table: applications
CREATE TABLE IF NOT EXISTS applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    age INT NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255) NOT NULL,
    is_bsa_volunteer BOOLEAN NOT NULL DEFAULT FALSE,
    bsa_member_id VARCHAR(50),
    district VARCHAR(100),
    purpose VARCHAR(100) NOT NULL,
    qualifications TEXT,
    additional_info TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_district (district),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: merit_badges
CREATE TABLE IF NOT EXISTS merit_badges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: application_badges (junction table)
CREATE TABLE IF NOT EXISTS application_badges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    merit_badge_id INT NOT NULL,
    badge_type ENUM('counsel', 'drop') NOT NULL,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (merit_badge_id) REFERENCES merit_badges(id) ON DELETE CASCADE,
    INDEX idx_application (application_id),
    INDEX idx_badge (merit_badge_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: certifications
CREATE TABLE IF NOT EXISTS certifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    INDEX idx_application (application_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
