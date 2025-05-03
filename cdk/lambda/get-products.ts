import {
  DynamoDBClient
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand
} from '@aws-sdk/lib-dynamodb';
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult
} from 'aws-lambda';
import {
  Product,
  ProductResponse
} from './models/product.model';
import {
  Stock
} from './models/stock.model';

const dynamoDB = new DynamoDBClient({
  region: process.env.AWS_REGION
});
const docClient = DynamoDBDocumentClient.from(dynamoDB);
const gamesTableName = 'Games';
const stockTableName = 'Stock';

export async function getProducts(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const [gamesResult, stockResult] = await Promise.all([
      docClient.send(new ScanCommand({
        TableName: gamesTableName
      })),
      docClient.send(new ScanCommand({
        TableName: stockTableName
      })),
    ]);

    const products: Product[] = gamesResult.Items as Product[] || [];
    const stockMap = new Map(
      (stockResult.Items as Stock[] || []).map(stock => [stock.product_id, stock.count])
    );

    const response: ProductResponse[] = products.map(product => ({
      ...product,
      count: stockMap.get(product.id) ?? 0,
    }));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: 'Could not fetch products'
      }),
    };
  }
}
