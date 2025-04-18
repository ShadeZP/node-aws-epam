import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { games } from './product.mock';

export async function getProductById(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const productId = event.pathParameters?.id;

  if (!productId) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "Missing product id" }),
    };
  }

  const product = games.find((g) => g.id === productId);

  if (!product) {
    return {
      statusCode: 404,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "Product not found" }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(product),
  };
}
