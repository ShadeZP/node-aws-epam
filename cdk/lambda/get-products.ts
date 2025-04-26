import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { games } from './product.mock';

export async function getProducts(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
    },
    body: JSON.stringify(games),
  };
}
