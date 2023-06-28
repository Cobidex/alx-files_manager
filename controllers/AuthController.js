import { ObjectId } from 'mongodb';

import { v4 as uuidv4 } from 'uuid';

import crypto from 'crypto';

import dbClient from '../utils/db';

import redisClient from '../utils/redis';

function hash(password) {
  const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');
  return  hashedPassword;
}


class AuthController {
  static async getConnect(req, res) {
    const auth = req.headers.authorization;

    if (auth) {
      const encoded = auth.split(' ')[1];
      const decodedCredentials = Buffer.from(encoded, 'base64').toString('utf-8');
      const [email, password] = decodedCredentials.split(':');

      const user = await dbClient.findUser({'email': email, 'password': hash(password)});

      if (!user) {
        res.status(401).send({'Error': 'unauthorized'});
        return;
      }
      const token = uuidv4();
      const key = `auth_${token}`;
      await redisClient.set(key, user._id.toString(), 24 * 60);
      res.status(200).send({'token': token});
    } else {
      res.status(401).send({'Error': 'empty authentication header'});
    }
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    const key = `auth_${token}`;
    const id = await redisClient.get(key);
    if (!id) {
      res.status(401).send({'Error': 'unauthorized'});
      return;
    }
    const user = await dbClient.findUser({_id: ObjectId(id)});
    await redisClient.del(key);
    res.status(204).send();
  }
}

export default AuthController;
