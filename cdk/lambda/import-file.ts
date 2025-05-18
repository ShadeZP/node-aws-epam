import { S3Handler } from 'aws-lambda';
import { APIGatewayProxyHandler } from "aws-lambda";
import * as AWS from 'aws-sdk';
import csv from 'csv-parser';

const s3 = new AWS.S3({ region: 'eu-west-1', signatureVersion: 'v4' });
const bucketName = process.env.BUCKET_NAME!;

export const importFileHandler: APIGatewayProxyHandler = async (event) => {
  const fileName = event.queryStringParameters?.name;

  if (!fileName) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing "name" query parameter' }),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Content-Type": "application/json",
      }
    };
  }

  const params = {
    Bucket: bucketName,
    Key: `uploaded/${fileName}`,
    Expires: 60,
    ContentType: 'text/csv',
  };

  try {
    const signedUrl = await s3.getSignedUrlPromise('putObject', params);

    return {
      statusCode: 200,
      body: JSON.stringify({ url: signedUrl }),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Content-Type": "application/json",
      }
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Could not generate signed URL', error: err }),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Content-Type": "application/json",
      }
    };
  }
};

export const parseFileHandler: S3Handler = async (event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    console.log(`Processing file from bucket: ${bucket}, key: ${key}`);

    const s3Stream = s3.getObject({ Bucket: bucket, Key: key }).createReadStream();

    await new Promise<void>((resolve, reject) => {
      s3Stream
        .pipe(csv())
        .on('data', (data) => console.log('Parsed record:', data))
        .on('end', () => {
          console.log('Finished parsing file');
          resolve();
        })
        .on('error', (error) => {
          console.error('Error while reading CSV:', error);
          reject(error);
        });
    });
  }
};
