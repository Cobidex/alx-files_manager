import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';

    const uri = `mongodb://${host}:${port}`;
    this.client = new MongoClient(uri, { useUnifiedTopology: true });
    this.db = null;
    this.client.connect()
      .then((client) => {
        this.db = client.db(database);
      })
      .catch((error) => {
        console.error('Error connecting to MongoDB:', error);
    });
  }

  isAlive() {
    return !!this.db;
  }

  async nbUsers() {
    return this.db.collection('users').countDocuments()
      .then(count => count)
      .catch(error => {
        console.log(error);
        return;
      });
    }

  async nbFiles() {
    return this.db.collection('files').countDocuments()
      .then(count => count)
      .catch(error => {
        console.log(error);
        return;
      });
  }

  async addUser(user) {
    try {
      const users = this.db.collection('users');
      const result = await users.insertOne(user);
      return result.insertedId;
    } catch (error) {
      console.log(`error inserting to user: ${error}`);
    }
  }

  async findUser(fields) {
    try {
      const users = this.db.collection('users');
      const exists = await users.findOne(fields);
      return exists;
    } catch (error) {
      console.log('could not search database');
    }
  }

  async findFile(fields) {
    try {
      const files = this.db.collection('files');
      const exists = await files.findOne(fields);
      return exists;
    } catch (error) {
      console.log('could not search database');
    }
  }

  async addFile(file) {
    try {
      const files = this.db.collection('files');
      const result = await files.insertOne(file);
      return result.insertedId;
    } catch (error) {
      console.log(`error inserting to files: ${error}`);
    }
  }

  async updateFile(filter, update) {
    try {
      const files = this.db.collection('files');
      const options = { returnOriginal: false };
      const update = { $set: update};
      const result = await files.findOneAndUpdate(filter, update, options);
      return result.value;
    } catch (error) {
      console.log(`unable to update document ${error}`);
      return;
    }
  }

  async paginate(parId, pageSize, skipDocuments) {
    try {
      const pipeline = [
        {
          $match: {
            parentId: parId
          }
        },
        { $skip: skipDocuments },
        { $limit: pageSize }
      ];
      const files = this.db.collection('files');
      const list = await files.aggregate(pipeline).toArray();
      return list;
    } catch (error) {
      console.log(`error paginating: ${error}`);
      return;
    }
  }
}

const dbClient = new DBClient();

export default dbClient;
