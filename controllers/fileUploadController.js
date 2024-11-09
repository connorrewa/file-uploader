const path = require('path');
const fs = require('fs');

// Middleware to create folder if it doesn't exist
const createFolderIfNotExists = (folderPath) => {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }
};

// Display files and folders in the current folder
exports.listFiles = (req, res) => {
    const currentFolder = req.params.folder || ''; // Default to root if no folder specified
    const folderPath = path.join(__dirname, '..', 'uploads', currentFolder);
    console.log('Current Folder:', currentFolder); // For debugging
    console.log('Folder Path:', folderPath); // For debugging
    // Read the content of the current folder
    fs.readdir(folderPath, (err, files) => {
        if (err) {
            return res.status(500).send('Error reading the directory');
        }

        // Filter out directories and files
        const folders = files.filter((file) =>
            fs.statSync(path.join(folderPath, file)).isDirectory()
        );
        const uploadedFiles = files.filter((file) =>
            fs.statSync(path.join(folderPath, file)).isFile()
        );

        // Render the view with folder and file information
        res.render('files', { currentFolder, folders, uploadedFiles });
    });
};

// Create a new folder in the current folder
exports.createFolder = (req, res) => {
    const currentFolder = req.query.folder || ''; // Get the current folder from the query string (default to root if not provided)
    const newFolderName = req.body.folderName; // Folder name from the form input
    const folderPath = path.join(
        __dirname,
        '..',
        'uploads',
        currentFolder,
        newFolderName
    );

    // Ensure the folder is created
    createFolderIfNotExists(folderPath);

    // Redirect back to the current folder page
    res.redirect(`/files/${currentFolder}`);
};

// Handle file upload
exports.uploadFile = (req, res) => {
    const currentFolder = req.params.folder || ''; // Current folder path
    const uploadPath = path.join(__dirname, '..', 'uploads', currentFolder); // Full path to the folder

    // Ensure the folder exists
    createFolderIfNotExists(uploadPath);

    const multer = require('multer');
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, uploadPath); // Save the file in the folder
        },
        filename: function (req, file, cb) {
            cb(null, Date.now() + path.extname(file.originalname)); // Unique filename based on timestamp
        },
    });

    const upload = multer({ storage: storage }).single('file'); // Handle single file upload
    upload(req, res, function (err) {
        if (err) {
            return res.status(500).send('Error uploading file');
        }
        res.redirect(`/files/${currentFolder}`); // Redirect to the current folder page after upload
    });
};
