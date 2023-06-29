import fs from 'fs';
import promisify from 'util';
import imageThumbnail from 'image-thumbnail';
import path from 'path';
import queue from 'bull';
import dbClient from './utils/db';

const fileQueue = queue('fileQueue');
const writeFileAsync = promisify(fs.writeFile);

fileQueue.process(async (job) => {
  const { userId, fileId } = job.data;

  if (!userId) {
    throw new Error('Missing userId');
  }

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  const file = await dbClient.findFile({ _id: fileId, userId });

  if (!file) {
    throw new Error('File not found');
  }

  if (file.type !== 'image') {
    throw new Error('Invalid file type');
  }

  const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
  const filePath = path.join(folderPath, file.localPath);

  try {
    const options = { width: 500 };
    const thumbnail500 = await imageThumbnail(filePath, options);
    const thumbnail250 = await imageThumbnail(filePath, { width: 250 });
    const thumbnail100 = await imageThumbnail(filePath, { width: 100 });

    const thumbnailPath500 = `${filePath}_500`;
    const thumbnailPath250 = `${filePath}_250`;
    const thumbnailPath100 = `${filePath}_100`;

    await writeFileAsync(thumbnailPath500, thumbnail500);
    await writeFileAsync(thumbnailPath250, thumbnail250);
    await writeFileAsync(thumbnailPath100, thumbnail100);

    console.log('Thumbnails generated successfully');
  } catch (error) {
    console.error('Error generating thumbnails:', error);
    throw new Error('Thumbnail generation failed');
  }
});

export default fileQueue;
