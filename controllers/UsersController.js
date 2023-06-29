import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import userQueue from '../userWorker';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      res.status(400).send({ Error: 'Missing email' });
    }

    if (!password) {
      res.status(400).send({ Error: 'Missing password' });
    }

    const hashedPwd = crypto.createHash('sha1').update(password).digest('hex');
    const user = {
      email,
      password: hashedPwd,
    };
    const exists = await dbClient.findUser({ email });
    if (exists) {
      res.status(400).send({ Error: 'Already exist' });
      return null;
    }

    try {
      const id = await dbClient.addUser(user);
      await userQueue.add({ userId: id });
      return res.status(201).send({ id, email });
    } catch (error) {
      console.log(error);
      res.status(500).send({ Error: 'failed to add user' });
      return null;
    }
  }

  static async getMe(req, res) {
    const token = req.headers['x-token'];
    const key = `auth_${token}`;
    const id = await redisClient.get(key);
    if (!id) {
      res.status(401).send({ Error: 'unauthorized' });
      return null;
    }
    const user = await dbClient.findUser({ _id: ObjectId(id) });
    return res.status(200).send({ id: user._id, email: user.email });
  }
}

export default UsersController;
