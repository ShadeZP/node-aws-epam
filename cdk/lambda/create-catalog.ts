import { v4 as uuidv4 } from 'uuid';
import { SQSEvent } from 'aws-lambda';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

const snsClient = new SNSClient({ region: process.env.AWS_REGION });
const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });

export const createCatalog = async (event: SQSEvent) => {
  const topicArn = process.env.CREATE_PRODUCT_TOPIC_ARN;
  const gamesTableName = process.env.GAMES_TABLE;

  for (const record of event.Records) {
    const product = JSON.parse(record.body);
    await dynamoDBClient.send(
      new PutItemCommand({
        TableName: gamesTableName,
        Item: {
          id: { S: uuidv4() },
          title: { S: product.title },
          description: { S: product.description },
          price: { N: product.price.toString() },
        },
      }),
    );

    await snsClient.send(
      new PublishCommand({
        Subject: 'New product created',
        Message: `Product created: ${JSON.stringify(product)}`,
        TopicArn: topicArn,
      }),
    );
  }

  return { statusCode: 200 };
};
