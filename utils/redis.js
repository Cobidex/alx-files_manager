const redis = require('redis');

const { promisify } = require('util');


class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.client.on('error', (error) => {
      console.log('Redis client error:', error);
    });
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    const asyncVal = promisify(this.client.get).bind(this.client);
    try {
      const value = await asyncVal(key);
      return value;
    } catch (error) {
      console.log(`error retrieving value: ${error}`);
      throw error;
    }
  }

  async set(key, value, duration) {
    const asyncSet =  promisify(this.client.set).bind(this.client);
    try {
      await asyncSet(key, value, 'EX', duration);
    } catch (error) {
      console.log(`error setting value: ${error}`);
      throw error;
    }
  }

  async del(key) {
    const asyncDel = promisify(this.client.del).bind(this.client);
    try {
      await asyncDel(key);
    } catch (error) {
      console.log(`error deleting key ${error}`);
      throw error;
    }
  }
}

const redisClient = new RedisClient()

module.exports = redisClient;
