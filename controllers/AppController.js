import dbClient from '../utils/db';

import redisClient from '../utils/redis';

class AppController {
  static async getStatus(req, res) {
    const statusOb = {
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    };
    res.send(statusOb);
  }

  static async getStats(req, res) {
    const stats = {
      users: await dbClient.nbUsers(),
      files: await dbClient.nbFiles(),
    };
    res.send(stats);
  }
}

export default AppController;
