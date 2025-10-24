import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client();
const transcriptCache = new Map();

export const loadTranscript = async (key) => {
  try {
    const cached = transcriptCache.get(key);
    if(cached){
      return cached;
    }

    const res = await s3.send(new GetObjectCommand({ Bucket: process.env.BUCKET_NAME, key }));
    if (!res.Body) throw new Error('Empty S3 object body');
    const text = await res.Body.transformToString();

    transcriptCache.set(key, text);
    return text;
  } catch (err) {
    console.error(err);
    return '';
  }
};
