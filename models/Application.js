const { pool } = require('../config/database');

class Application {
    // Create a new application with all related data
    static async create(applicationData) {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Insert main application
            const [applicationResult] = await connection.query(
                `INSERT INTO applications
                (first_name, last_name, age, phone, email, is_bsa_volunteer,
                 bsa_member_id, district, purpose, qualifications, additional_info)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    applicationData.firstName,
                    applicationData.lastName,
                    applicationData.age,
                    applicationData.phone || null,
                    applicationData.email,
                    applicationData.isVolunteer === 'Yes' ? 1 : 0,
                    applicationData.bsaMemberId || null,
                    applicationData.district || null,
                    applicationData.purpose,
                    applicationData.qualifications || null,
                    applicationData.additionalInfo || null
                ]
            );

            const applicationId = applicationResult.insertId;

            // Insert badges to counsel
            if (applicationData.badgesToCounsel && applicationData.badgesToCounsel.length > 0) {
                for (const badgeName of applicationData.badgesToCounsel) {
                    const [badge] = await connection.query(
                        'SELECT id FROM merit_badges WHERE name = ?',
                        [badgeName]
                    );

                    if (badge.length > 0) {
                        await connection.query(
                            'INSERT INTO application_badges (application_id, merit_badge_id, badge_type) VALUES (?, ?, ?)',
                            [applicationId, badge[0].id, 'counsel']
                        );
                    }
                }
            }

            // Insert badges to drop
            if (applicationData.badgesToDrop && applicationData.badgesToDrop.length > 0) {
                for (const badgeName of applicationData.badgesToDrop) {
                    const [badge] = await connection.query(
                        'SELECT id FROM merit_badges WHERE name = ?',
                        [badgeName]
                    );

                    if (badge.length > 0) {
                        await connection.query(
                            'INSERT INTO application_badges (application_id, merit_badge_id, badge_type) VALUES (?, ?, ?)',
                            [applicationId, badge[0].id, 'drop']
                        );
                    }
                }
            }

            // Insert certification files
            if (applicationData.certifications && applicationData.certifications.length > 0) {
                for (const file of applicationData.certifications) {
                    await connection.query(
                        'INSERT INTO certifications (application_id, filename, filepath, file_size) VALUES (?, ?, ?, ?)',
                        [applicationId, file.filename, file.filepath, file.size]
                    );
                }
            }

            await connection.commit();
            return { success: true, applicationId };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Get all merit badges for dropdown
    static async getAllMeritBadges() {
        try {
            const [badges] = await pool.query(
                'SELECT id, name FROM merit_badges ORDER BY name ASC'
            );
            return badges;
        } catch (error) {
            throw error;
        }
    }

    // Get application by ID with all related data
    static async getById(id) {
        try {
            const [applications] = await pool.query(
                'SELECT * FROM applications WHERE id = ?',
                [id]
            );

            if (applications.length === 0) {
                return null;
            }

            const application = applications[0];

            // Get badges to counsel
            const [badgesToCounsel] = await pool.query(
                `SELECT mb.name FROM application_badges ab
                 JOIN merit_badges mb ON ab.merit_badge_id = mb.id
                 WHERE ab.application_id = ? AND ab.badge_type = 'counsel'`,
                [id]
            );

            // Get badges to drop
            const [badgesToDrop] = await pool.query(
                `SELECT mb.name FROM application_badges ab
                 JOIN merit_badges mb ON ab.merit_badge_id = mb.id
                 WHERE ab.application_id = ? AND ab.badge_type = 'drop'`,
                [id]
            );

            // Get certifications
            const [certifications] = await pool.query(
                'SELECT * FROM certifications WHERE application_id = ?',
                [id]
            );

            return {
                ...application,
                badgesToCounsel: badgesToCounsel.map(b => b.name),
                badgesToDrop: badgesToDrop.map(b => b.name),
                certifications
            };

        } catch (error) {
            throw error;
        }
    }
}

module.exports = Application;
