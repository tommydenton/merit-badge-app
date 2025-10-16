// Merit Badge Counselor Application - Frontend JavaScript

$(document).ready(function() {
    // Load merit badges from API
    loadMeritBadges();

    // Initialize Select2 for multi-select dropdowns
    initializeSelect2();

    // Setup form event listeners
    setupFormListeners();

    // File upload handling
    setupFileUpload();

    // Form submission
    setupFormSubmission();
});

// Load merit badges from API
function loadMeritBadges() {
    $.ajax({
        url: '/api/applications/merit-badges',
        method: 'GET',
        success: function(response) {
            if (response.success) {
                const badges = response.badges;
                const counselSelect = $('#badgesToCounsel');
                const dropSelect = $('#badgesToDrop');

                // Populate both dropdowns
                badges.forEach(badge => {
                    counselSelect.append(`<option value="${badge.name}">${badge.name}</option>`);
                    dropSelect.append(`<option value="${badge.name}">${badge.name}</option>`);
                });

                // Reinitialize Select2 after adding options
                counselSelect.select2({
                    theme: 'bootstrap-5',
                    placeholder: 'Select merit badges',
                    allowClear: true
                });

                dropSelect.select2({
                    theme: 'bootstrap-5',
                    placeholder: 'Select merit badges',
                    allowClear: true
                });
            }
        },
        error: function(xhr, status, error) {
            console.error('Error loading merit badges:', error);
            showAlert('Error loading merit badges. Please refresh the page.', 'danger');
        }
    });
}

// Initialize Select2
function initializeSelect2() {
    // Initialize with empty options (will be populated by loadMeritBadges)
    $('#badgesToCounsel, #badgesToDrop').select2({
        theme: 'bootstrap-5',
        placeholder: 'Loading...',
        disabled: true
    });
}

// Setup form event listeners
function setupFormListeners() {
    // Volunteer status change
    $('#isVolunteer').on('change', function() {
        const value = $(this).val();

        if (value === 'Yes') {
            $('#volunteerFields').show().addClass('fade-in');
            $('#noVolunteerAlert').hide();
            $('#bsaMemberId, #district').attr('required', true);
        } else if (value === 'No') {
            $('#volunteerFields').hide();
            $('#noVolunteerAlert').show().addClass('fade-in');
            $('#bsaMemberId, #district').removeAttr('required').val('');
        } else {
            $('#volunteerFields').hide();
            $('#noVolunteerAlert').hide();
            $('#bsaMemberId, #district').removeAttr('required').val('');
        }
    });

    // Purpose change - show/hide relevant sections
    $('#purpose').on('change', function() {
        const value = $(this).val();

        // Hide all conditional sections
        $('#counselBadgesDiv, #dropBadgesDiv, #qualificationsSection').hide();

        // Show relevant sections based on purpose
        if (value === 'Become a Counselor' || value === 'Change/Add Badges') {
            $('#counselBadgesDiv').show().addClass('fade-in');
            $('#qualificationsSection').show().addClass('fade-in');
            $('#certifications').attr('required', true);
        } else if (value === 'Drop Badges') {
            $('#dropBadgesDiv').show().addClass('fade-in');
            $('#certifications').removeAttr('required');
        } else if (value === 'Update Certifications') {
            $('#qualificationsSection').show().addClass('fade-in');
            $('#certifications').attr('required', true);
        } else {
            $('#certifications').removeAttr('required');
        }
    });

    // Phone number formatting
    $('#phone').on('input', function() {
        let value = $(this).val().replace(/\D/g, '');
        if (value.length > 0) {
            if (value.length <= 3) {
                value = `(${value}`;
            } else if (value.length <= 6) {
                value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
            } else {
                value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
            }
        }
        $(this).val(value);
    });
}

// Setup file upload handling
function setupFileUpload() {
    const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB
    const MAX_FILES = 10;

    $('#certifications').on('change', function() {
        const files = this.files;
        const fileListDiv = $('#fileList');
        const fileSizeError = $('#fileSizeError');

        fileListDiv.empty();
        fileSizeError.hide();

        if (files.length === 0) {
            return;
        }

        // Check file count
        if (files.length > MAX_FILES) {
            fileSizeError.text(`Maximum ${MAX_FILES} files allowed. You selected ${files.length} files.`).show();
            this.value = '';
            return;
        }

        // Calculate total size and display files
        let totalSize = 0;
        const fileItems = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            totalSize += file.size;

            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
            const fileItem = `
                <div class="file-item">
                    <div>
                        <strong>${file.name}</strong>
                        <small class="d-block">${fileSizeMB} MB</small>
                    </div>
                    <span class="badge bg-success">Selected</span>
                </div>
            `;
            fileItems.push(fileItem);
        }

        fileListDiv.html(fileItems.join(''));

        // Check total size
        if (totalSize > MAX_FILE_SIZE) {
            const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
            fileSizeError.text(`Total file size (${totalSizeMB} MB) exceeds the maximum limit of 30 MB.`).show();
            this.value = '';
            fileListDiv.empty();
            return;
        }

        // Show total size
        const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
        fileListDiv.append(`
            <div class="alert alert-info mt-2 mb-0">
                <strong>Total size:</strong> ${totalSizeMB} MB / 30 MB
            </div>
        `);
    });
}

// Setup form submission
function setupFormSubmission() {
    const form = document.getElementById('applicationForm');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        e.stopPropagation();

        // Bootstrap validation
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            showAlert('Please fill in all required fields correctly.', 'danger');
            return;
        }

        // Prepare form data
        const formData = new FormData();

        // Add all text fields
        formData.append('firstName', $('#firstName').val());
        formData.append('lastName', $('#lastName').val());
        formData.append('age', $('#age').val());
        formData.append('phone', $('#phone').val());
        formData.append('email', $('#email').val());
        formData.append('isVolunteer', $('#isVolunteer').val());
        formData.append('bsaMemberId', $('#bsaMemberId').val());
        formData.append('district', $('#district').val());
        formData.append('purpose', $('#purpose').val());
        formData.append('qualifications', $('#qualifications').val());
        formData.append('additionalInfo', $('#additionalInfo').val());

        // Add merit badges as JSON strings
        const badgesToCounsel = $('#badgesToCounsel').val() || [];
        const badgesToDrop = $('#badgesToDrop').val() || [];
        formData.append('badgesToCounsel', JSON.stringify(badgesToCounsel));
        formData.append('badgesToDrop', JSON.stringify(badgesToDrop));

        // Add files
        const files = $('#certifications')[0].files;
        for (let i = 0; i < files.length; i++) {
            formData.append('certifications', files[i]);
        }

        // Show loading state
        $('#submitBtn').prop('disabled', true);
        $('#submitText').text('Submitting...');
        $('#submitSpinner').show();

        // Submit form
        try {
            const response = await fetch('/api/applications', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // Show success message
                showSuccessMessage(result.applicationId);

                // Reset form
                form.reset();
                form.classList.remove('was-validated');
                $('#badgesToCounsel, #badgesToDrop').val(null).trigger('change');
                $('#fileList').empty();
                $('#volunteerFields, #counselBadgesDiv, #dropBadgesDiv, #qualificationsSection').hide();

                // Scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });

            } else {
                // Show error message
                let errorMsg = result.message || 'An error occurred while submitting your application.';

                if (result.errors && result.errors.length > 0) {
                    errorMsg += '<ul class="mb-0 mt-2">';
                    result.errors.forEach(err => {
                        errorMsg += `<li>${err.msg}</li>`;
                    });
                    errorMsg += '</ul>';
                }

                showAlert(errorMsg, 'danger');
            }

        } catch (error) {
            console.error('Submission error:', error);
            showAlert('A network error occurred. Please check your connection and try again.', 'danger');
        } finally {
            // Reset button state
            $('#submitBtn').prop('disabled', false);
            $('#submitText').text('Submit Application');
            $('#submitSpinner').hide();
        }
    });
}

// Show alert message
function showAlert(message, type = 'info') {
    const alertContainer = $('#alertContainer');
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;

    alertContainer.html(alertHtml);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alertContainer.find('.alert').alert('close');
    }, 5000);
}

// Show success message
function showSuccessMessage(applicationId) {
    const successHtml = `
        <div class="success-message fade-in">
            <h3>Application Submitted Successfully!</h3>
            <p class="mb-2">Thank you for submitting your Merit Badge Counselor application.</p>
            <p class="mb-0">Your application ID is: <strong>${applicationId}</strong></p>
            <p class="mt-2 mb-0 text-muted">You will be contacted by your district regarding the next steps.</p>
        </div>
    `;

    $('#alertContainer').html(successHtml);
}
