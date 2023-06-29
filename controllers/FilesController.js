import { ObjectId } from 'mongodb';
import path from 'path';
import promisify from 'util';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import fileQueue from '../worker';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const key = `auth_${token}`;
    const id = await redisClient.get(key);
    if (!id) {
      return res.status(401).send({ Error: 'unauthorized' });
    }
    const {
      name, type, parentId = 0, isPublic = false, data,
    } = req.body;

    if (!name) {
      return res.status(400).send({ Error: 'Missing name' });
    }
    const list = ['folder', 'file', 'image'];
    if (!type || !list.includes(type)) {
      return res.status(400).send({ Error: 'Missing name' });
    }
    if (!data && type !== 'folder') {
      return res.status(400).send({ Error: 'Missing name' });
    }
    if (parentId !== 0) {
      const file = await dbClient.findFile({ parentId });
      if (!file) {
        return res.status(400).send({ Error: 'Parent not found' });
      }
      if (file.type !== 'folder') {
        return res.status(400).send({ Error: 'Parent is not a folder' });
      }
    }
    const newFile = {
      userId: id,
      name,
      type,
      isPublic,
      parentId,
    };
    try {
      if (type === 'folder') {
        const insertedId = await dbClient.addFile(newFile);
        delete newFile._id;
        return res.status(201).send({ id: insertedId.toString(), ...newFile });
      }
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      const filePath = path.join(folderPath, `${uuidv4()}`);
      const writeFileAsync = promisify(fs.writeFile);
      await writeFileAsync(filePath, Buffer.from(data, 'base64'));

      newFile.localPath = filePath;
      const insId = await dbClient.addFile(newFile);
      delete newFile._id;

      fileQueue.add({ userId: id, insId });
      return res.status(201).send({ id: insId.toString(), ...newFile });
    } catch (error) {
      console.error('Error uploading file:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async putPublish(req, res) {
    const user = await FilesController.getUser(req);
    if (user) {
      const fileUserId = user._id.toString();
      const fileId = req.params.id;
      const file = await dbClient.findFile({ userId: fileUserId, id: fileId });
      if (!file) {
        return res.status(404).send({ Error: 'Not found' });
      }
      const update = { isPublic: true };
      const newFile = await dbClient.updateFile({ id: fileId }, update);
      return res.status(200).send(newFile);
    }
    return res.status(401).send({ Error: 'Unauthorized' });
  }

  static async putUnpublish(req, res) {
    const user = await FilesController.getUser(req);
    if (user) {
      const fileUserId = user._id.toString();
      const fileId = req.params.id;
      const file = await dbClient.findFile({ userId: fileUserId, id: fileId });
      if (!file) {
        return res.status(404).send({ Error: 'Not found' });
      }
      const update = { isPublic: false };
      const newFile = await dbClient.updateFile({ id: fileId }, update);
      return res.status(200).send(newFile);
    }
    return res.status(401).send({ Error: 'Unauthorized' });
  }

  static async getShow(req, res) {
    const user = await FilesController.getUser(req);
    const fileUserId = user._id.toString();
    const fileId = req.params.id;
    const file = await dbClient.findFile({ userId: fileUserId, id: fileId });
    if (!file) {
      return res.status(404).send({ Error: 'Not found' });
    }
    return res.status(200).send(file);
  }

  static async getIndex(req, res) {
    const user = await FilesController.getUser(req);
    if (user) {
      const parentId = req.params.parentId || 0;
      const page = parseInt(req.query.page, 10) || 0;
      const pageSize = 20;
      const skipDocuments = page * pageSize;
      const list = await dbClient.paginate(parentId, pageSize, skipDocuments);
      return res.status(200).send(list);
    }
    return res.status(401).send({ Error: 'Unauthorized' });
  }

  static async getUser(req) {
    const token = req.headers['x-token'];

    if (!token) {
      return null;
    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return null;
    }
    return dbClient.findUser({ _id: ObjectId(userId) });
  }

  static async getFile(req, res) {
    const user = await FilesController.getUser(req);
    if (user) {
      const fileId = req.params.id;
      const file = dbClient.getFile({ id: fileId });
      if (!file) {
        return res.status(404).send({ Error: 'Not found' });
      }
      if (file.userId !== user._id.toString() || !file.isPublic) {
        return res.status(404).send({ Error: 'Not found' });
      }
      if (file.type === 'folder') {
        return res.status(400).send({ Error: 'A folder doesn\'t have content' });
      }
      const filePath = file.localPath;
      fs.readFile(filePath, (err, data) => {
        if (err) {
          return res.status(404).json({ error: 'Not found' });
        }

        const mimeType = mime.lookup(file.name);

        res.setHeader('Content-Type', mimeType);
        return res.send(data);
      });
      return null;
    }
    return res.status(404).send({ Error: 'Not found' });
  }
}

export default FilesController;
