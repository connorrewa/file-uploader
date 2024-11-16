const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cloudinary = require('cloudinary').v2;

exports.fileDetails = async (req, res) => {
    const fileId = req.params.fileId;

    try {
        const file = await prisma.file.findUnique({
            where: { id: Number(fileId) },
        });

        if (!file) {
            return res.status(404).send('File not found');
        }

        const fileSizeInMB = (file.size / (1024 * 1024)).toFixed(2);

        // Generate a downloadable URL
        const downloadUrl = cloudinary.url(file.url, { flags: 'attachment' });

        res.render('fileDetails', { file, fileSizeInMB, downloadUrl });
    } catch (error) {
        console.error('Error fetching file details:', error);
        res.status(500).send('An error occurred while fetching file details');
    }
};
