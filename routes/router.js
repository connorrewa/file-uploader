const express = require('express');
const isAuthenticated = require('../middleware/isAuthenticated');
const controller = require('../controllers/mainController'); // Import the controller
const multer = require('multer');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage: storage });

// Routes for login and signup
router.get('/login', controller.getLoginPage); // Render sign-in page
router.get('/signup', controller.getSignupPage); // Render sign-up page

// Routes for handling form submissions
router.post('/signup', controller.signupUser); // Handle sign-up
router.post('/login', controller.loginUser); // Handle login

// Secure file storage route
router.get('/files', isAuthenticated, controller.getFilesPage);
router.post(
    '/upload',
    isAuthenticated,
    upload.single('file'),
    controller.uploadFile
);

// Logout route
router.get('/logout', controller.logoutUser);

// Session test routes
router.get('/set-session', controller.setSessionData);
router.get('/get-session', controller.getSessionData);

// Catch-all 404 route handler
router.use((req, res, next) => {
    res.status(404).render('error', { message: 'Page not found' });
});

// General error handling middleware for unexpected server errors
router.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', {
        message: 'An unexpected error occurred',
    });
});

module.exports = router;
