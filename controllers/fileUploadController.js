const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Middleware to create folder if it doesn't exist
const createFolderIfNotExists = (folderPath) => {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }
};

exports.viewFiles = async (req, res) => {
    const currentFolderId = req.params.folderId || null; // Default to root if no folder ID is provided
    const userId = req.user.id; // Get the authenticated user's ID

    try {
        // Fetch the current folder (if specified)
        const currentFolder = currentFolderId
            ? await prisma.folder.findUnique({
                  where: { id: Number(currentFolderId), userId },
              })
            : null;

        // Fetch folders within the current folder
        const folders = await prisma.folder.findMany({
            where: {
                userId,
                parentFolderId: currentFolderId
                    ? Number(currentFolderId)
                    : null,
            },
        });

        // Fetch files within the current folder
        const uploadedFiles = await prisma.file.findMany({
            where: {
                userId,
                folderId: currentFolderId ? Number(currentFolderId) : undefined,
            },
        });

        // Render the template with folders, files, and current folder data
        res.render('files', { folders, uploadedFiles, currentFolder });
    } catch (error) {
        console.error('Error fetching files and folders:', error);
        res.status(500).json({ error: 'Failed to retrieve files and folders' });
    }
};

exports.createFolder = async (req, res) => {
    const { name, parentFolderId } = req.body;
    const userId = req.user.id;

    const parentFolderIdInt = parentFolderId ? Number(parentFolderId) : null;

    console.log('Request Body:', req.body); // Debug log

    if (!name) {
        return res.status(400).json({ error: 'Folder name is required' });
    }

    try {
        const folder = await prisma.folder.create({
            data: {
                userId,
                name,
                parentFolderId: parentFolderIdInt,
            },
        });
        res.redirect('/files');
    } catch (error) {
        console.error('Error creating folder:', error);
        res.status(500).json({ error: 'Failed to create folder' });
    }
};
exports.getFolder = async (req, res) => {
    const userId = req.user.id;

    // Parse folderIds from the URL parameters (path segments)
    const folderIds = req.params[0]?.split('/').map((id) => Number(id)) || [];

    try {
        let currentFolderId = null; // Initially null for the root folder
        let currentFolder = null; // Will hold the current folder

        // If no folder IDs are passed, we're at the root folder
        if (folderIds.length === 0) {
            currentFolderId = null; // Representing the root folder (null ID)
        }

        // Loop through the folder IDs to resolve each folder in the path
        for (const folderId of folderIds) {
            // Fetch the folder by ID and ensure it belongs to the correct user
            const folder = await prisma.folder.findUnique({
                where: {
                    id: folderId,
                    userId,
                },
            });

            // If folder not found or parent folder ID is incorrect, return an error
            if (!folder) {
                return res
                    .status(404)
                    .json({ error: 'Folder not found or invalid hierarchy' });
            }

            // Validate the folder's parent ID to ensure we're navigating correctly
            // For the root folder, currentFolderId is null, so no validation needed
            if (
                currentFolderId !== null &&
                folder.parentFolderId !== currentFolderId
            ) {
                return res
                    .status(404)
                    .json({ error: 'Invalid folder hierarchy' });
            }

            // Set the current folder ID to this folder's ID for the next iteration
            currentFolderId = folderId;
            currentFolder = folder; // Update the current folder
        }

        // After looping, currentFolderId should hold the final folder's ID
        const subfolders = await prisma.folder.findMany({
            where: {
                parentFolderId: currentFolderId,
                userId,
            },
        });

        const files = await prisma.file.findMany({
            where: {
                userId,
                folderId: currentFolderId || undefined, // Null for root folder
            },
        });

        // Render the folder's page with subfolders and files
        res.render('files', {
            folder: currentFolder, // Ensure the current folder is passed to the view
            subfolders,
            files,
        });
    } catch (error) {
        console.error('Error fetching folder details:', error);
        res.status(500).json({ error: 'Failed to retrieve folder details' });
    }
};

// Controller for deleting a folder
exports.deleteFolder = async (req, res) => {
    const folderId = req.params.folderId; // Folder ID from the URL parameter
    const userId = req.user.id; // Authenticated user's ID

    try {
        // Check if the folder exists and belongs to the current user
        const folder = await prisma.folder.findUnique({
            where: { id: Number(folderId), userId },
        });

        if (!folder) {
            return res
                .status(404)
                .json({ error: 'Folder not found or unauthorized' });
        }

        // Check if the folder has subfolders
        const subfolders = await prisma.folder.findMany({
            where: { parentFolderId: Number(folderId) },
        });

        // Check if the folder contains files
        const files = await prisma.file.findMany({
            where: { folderId: Number(folderId) },
        });

        // If the folder has subfolders or files, return an error
        if (subfolders.length > 0 || files.length > 0) {
            return res.status(400).json({
                error: 'Folder contains files or subfolders and cannot be deleted',
            });
        }

        // If folder is empty (no files or subfolders), delete it
        await prisma.folder.delete({
            where: { id: Number(folderId) },
        });

        res.redirect('/files');
    } catch (error) {
        console.error('Error deleting folder:', error);
        res.status(500).json({ error: 'Failed to delete folder' });
    }
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
