import { Router } from 'express';
import multer from 'multer';

// Controllers
import UsersController from './app/controllers/UsersController.js';
import PermissionsUsersController from './app/controllers/PermissionsUsersController.js';
import SessionsController from './app/controllers/SessionsController.js';
import FilesController from './app/controllers/FilesController.js';

// Middleware
import AuthMiddlware from './app/middleware/AuthMiddlware.js';

// Config
import multerConfig from './config/multer.js';

const router = new Router();
const uploads = multer(multerConfig);

// 🔓 Auth
router.post('/sessions', SessionsController.create);

// 🔒 Protege todas as rotas abaixo
router.use(AuthMiddlware);

// 👤 Users
router.get('/users', UsersController.index);
router.get('/users/:id', UsersController.show);
router.post('/users', UsersController.create);
router.put('/users/:id', UsersController.update);
router.delete('/users/:id', UsersController.destroy);

// 🔐 Permissions
router.get('/permissions-users', PermissionsUsersController.index);
router.get('/permissions-users/:id', PermissionsUsersController.show);
router.post('/permissions-users', PermissionsUsersController.create);
router.put('/permissions-users/:id', PermissionsUsersController.update);
router.delete('/permissions-users/:id', PermissionsUsersController.destroy);

// 📁 Files CRUD
router.get('/files', FilesController.index);
router.get('/files/:id', FilesController.show);
router.post('/files', uploads.single('file'), FilesController.create);
router.put('/files/:id', FilesController.update);
router.delete('/files/:id', FilesController.destroy);

export default router;
