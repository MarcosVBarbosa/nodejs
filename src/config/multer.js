import multer from 'multer';
import crypto from 'crypto';
import { extname } from 'path';
import { getUploadPath } from '../app/utils/file/UploadPath.js';

export default {
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, getUploadPath());
    },
    filename: (req, file, cb) => {
      crypto.randomBytes(16, (err, res) => {
        if (err) return cb(err);
        cb(null, res.toString('hex') + extname(file.originalname));
      });
    },
  }),
};
