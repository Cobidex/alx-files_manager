import assert from 'assert';
import sinon from 'sinon';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';
import app = from '../server');

describe('Redis Client', () => {
  describe('get()', () => {
    it('should return the value associated with a given key', async () => {
      const expectedValue = '123456';
      sinon.stub(redisClient, 'get').returns(expectedValue);

      const key = 'auth_token';
      const value = await redisClient.get(key);

      assert.strictEqual(value, expectedValue);

      redisClient.get.restore();
    });

    it('should return null if the key does not exist', async () => {
      sinon.stub(redisClient, 'get').returns(null);

      const key = 'non_existing_key';
      const value = await redisClient.get(key);

      assert.strictEqual(value, null);

      redisClient.get.restore();
    });
  });
});

describe('DB Client', () => {
  describe('findFile()', () => {
    it('should return the file document based on the given filters', async () => {
      const expectedFile = { _id: '5f1e8896c7ba06511e683b25', userId: '5f1e7cda04a394508232559d', name: 'image.png', type: 'image', isPublic: true, parentId: '5f1e881cc7ba06511e683b23' };
      sinon.stub(dbClient, 'findFile').returns(expectedFile);

      const filters = { _id: '5f1e8896c7ba06511e683b25', userId: '5f1e7cda04a394508232559d' };
      const file = await dbClient.findFile(filters);

      assert.deepStrictEqual(file, expectedFile);

      dbClient.findFile.restore();
    });

    it('should return null if no file document matches the given filters', async () => {
      sinon.stub(dbClient, 'findFile').returns(null);

      const filters = { _id: 'non_existing_id', userId: 'non_existing_userId' };
      const file = await dbClient.findFile(filters);

      assert.strictEqual(file, null);

      dbClient.findFile.restore();
    });
  });
});

describe('API Endpoints', () => {
  describe('GET /status', () => {
    it('should return the status "OK"', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/status',
      });

      assert.strictEqual(response.statusCode, 200);
      assert.deepStrictEqual(response.json(), { status: 'OK' });
    });
  });

  describe('GET /files', () => {
    it('should return the files with pagination', async () => {
      const expectedFiles = [{ id: 'file1', name: 'file1.txt' }, { id: 'file2', name: 'file2.txt' }];
      sinon.stub(dbClient, 'getFiles').returns(expectedFiles);

      const response = await app.inject({
        method: 'GET',
        url: '/files?page=1&limit=10',
      });

      assert.strictEqual(response.statusCode, 200);
      assert.deepStrictEqual(response.json(), { files: expectedFiles });

      dbClient.getFiles.restore();
    });
  });
});

