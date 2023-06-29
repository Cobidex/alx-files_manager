import Queue from 'bull';
import dbClient from './utils/db';

const userQueue = new Queue('userQueue')


userQueue.process(async (job) => {
  const { userId } = job.data;

  if (!userId) {
    throw new Error('Missing userId');
  }

  const user = await dbClient.findUser({ _id: userId });
  if (!user) {
    throw new Error('User not found');
  }
  console.log(`Welcome ${user.email}!`);
});

export default userQueue;
