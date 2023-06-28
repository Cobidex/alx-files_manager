import dbClient from '../utils/db';
import userQueue from '../userWorker';
import redisClient from '../utils/redis';
import crypto from 'crypto';
import { ObjectId } from 'mongodb';


class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      res.status(400).send({'Error': 'Missing email'});
      return;
    }

    if (!password) {
      res.status(400).send({'Error': 'Missing password'});
      return;
    }

    const hashedPwd = crypto.createHash('sha1').update(password).digest('hex');
    const user = {
      'email': email,
      'password': hashedPwd,
    };
    const exists = await dbClient.findUser({'email': email});
    if (exists) {
      res.status(400).send({'Error': 'Already exist'});
      return;
    }

    try {
      const id = await dbClient.addUser(user);
      await userQueue.add({ userId: id });
      return res.status(201).send({'id': id, 'email': email});
    } catch (error) {
      console.log(error);
      res.status(500).send('failed to add user');
    }
  }

  static async getMe(req, res) {
    const token = req.headers['x-token'];
    const key = `auth_${token}`;
    const id = await redisClient.get(key);
    if (!id) {
      res.status(401).send({'Error': 'unauthorized'});
      return;
    }
    const user = await dbClient.findUser({_id: ObjectId(id)});
    res.status(200).send({'id': user._id, 'email': user.email});
  }
}

export default UsersController;
