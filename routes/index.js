import express from 'express';

import AppController from '../controllers/AppController';

import UsersController from '../controllers/UsersController';

import AuthController from '../controllers/AuthController';

import FilesController from '../controllers/FilesController';

const routes = express.Router();

routes.post('/users', UsersController.postNew);

routes.post('/files', FilesController.postUpload);

routes.put('/files/:id/publish', FilesController.putPublish);

routes.put('/files/:id/unpublish', FilesController.putUnpublish);

routes.get('/stats', AppController.getStats);

routes.get('/files/:id', FilesController.getShow);

routes.get('/files', FilesController.getIndex);

routes.get('/connect', AuthController.getConnect);

routes.get('/disconnect', AuthController.getDisconnect);

routes.get('/files/:id/data', FilesController.getFile);

routes.get('/users/me', UsersController.getMe);

routes.get('/status', AppController.getStatus);

export default routes;
