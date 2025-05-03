import { APIGatewayProxyEvent, APIGatewayProxyResult, Handler } from 'aws-lambda';
import { DynamoDBClient, TransactWriteItemsCommand, TransactWriteItemsCommandInput } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { ProductRequest } from './models/product.model';

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const gamesTableName = 'Games';
const stockTableName = 'Stock';

export async function createProduct(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const product: ProductRequest = event.body && JSON.parse(event.body);

  if (!product || !product.title || !product.description || !product.price || !product.count) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'content-type': 'application/json',
      },
      body: 'Invalid product data',
    };
  }

  const productId = uuidv4();

  const transactParams: TransactWriteItemsCommandInput = {
    TransactItems: [
      {
        Put: {
          TableName: gamesTableName,
          Item: {
            id: { S: productId },
            title: { S: product.title },
            description: { S: product.description },
            price: { N: product.price.toString() },
          },
        },
      },
      {
        Put: {
          TableName: stockTableName,
          Item: {
            product_id: { S: productId },
            count: { N: product.count.toString() },
          },
        },
      },
    ],
  };

  try {
    const command = new TransactWriteItemsCommand(transactParams);
    const response = await dynamoDB.send(command);
    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'content-type': 'application/json',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('DynamoDB error: ', error);

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: 'Could not create product',
    };
  }
};
