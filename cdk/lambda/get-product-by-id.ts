import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Product, ProductResponse } from './models/product.model';
import { Stock } from './models/stock.model';

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoDB);
const gamesTableName = 'Games';
const stockTableName = 'Stock';

export async function getProductById(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const productId = event.pathParameters?.id;

  if (!productId) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'Missing product id' }),
    };
  }

  const getProduct = new GetCommand({
    TableName: gamesTableName,
    Key: {
      id: productId,
    },
  });

  const getStock = new GetCommand({
    TableName: stockTableName,
    Key: {
      product_id: productId,
    },
  });

  try {
    const [productsData, stocksData]: [{ Item?: Partial<Product> }, {
      Item?: Partial<Stock>
    }] = await Promise.all([
      docClient.send(getProduct),
      docClient.send(getStock),
    ]);

    if (!productsData.Item || !stocksData.Item) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST , PUT, DELETE, OPTIONS',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ message: 'ProductResponse not found' }),
      };
    }

    const data: Partial<ProductResponse> = {
      ...productsData.Item,
      count: stocksData.Item.count,
    };

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'content-type': 'application/json',
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error('DynamoDB error: ', err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Could not fetch product' }),
    };
  }
}
