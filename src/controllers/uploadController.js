const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

// Configure multer for file upload
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET,
    acl: 'public-read',
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const fileName = `${Date.now()}_${path.basename(file.originalname)}`;
      cb(null, fileName);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error('Invalid file type'));
      return;
    }
    cb(null, true);
  },
});

const uploadController = {
  // Upload single image
  uploadImage: upload.single('image'),

  // Handle successful upload
  async handleUpload(req, res) {
    try {
      if (!req.file) {
        throw new Error('No file uploaded');
      }

      res.json({
        url: req.file.location,
        key: req.file.key,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Delete image from S3
  async deleteImage(req, res) {
    try {
      const { key } = req.params;

      await s3
        .deleteObject({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: key,
        })
        .promise();

      res.json({ message: 'File deleted successfully' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
};

module.exports = uploadController;
