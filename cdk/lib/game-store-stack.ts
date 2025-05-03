import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from "path";

const GamesTableName = 'Games';
const StockTableName = 'Stock';

export class GameStoreStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const gamesTable = new dynamodb.Table(this, 'Games', {
      tableName: GamesTableName,
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
    });

    const stockTable = new dynamodb.Table(this, 'Stock', {
      tableName: StockTableName,
      partitionKey: {
        name: 'product_id',
        type: dynamodb.AttributeType.STRING,
      },
    });

    const getProductsLambda = new NodejsFunction(this, "GetProductsHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "getProducts",
      entry: path.join(__dirname, "../lambda/get-products.ts")
    });

    // const getProductsLambda = new lambda.Function(this, 'GetProductsHandler', {
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   memorySize: 1024,
    //   timeout: cdk.Duration.seconds(5),
    //   handler: 'get-products.getProducts',
    //   code: lambda.Code.fromAsset('lambda/get-products'),
    //   environment: {
    //     GAMES_TABLE_NAME: GamesTableName,
    //     STOCK_TABLE_NAME: StockTableName,
    //   },
    // });

    gamesTable.grantReadData(getProductsLambda);
    stockTable.grantReadData(getProductsLambda);

    const getProductByIdLambda = new NodejsFunction(this, "GetProductByIdHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "getProductById",
      entry: path.join(__dirname, "../lambda/get-product-by-id.ts")
    });

    // const getProductByIdLambda = new lambda.Function(this, 'GetProductByIdHandler', {
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   memorySize: 1024,
    //   timeout: cdk.Duration.seconds(5),
    //   handler: 'get-product-by-id.getProductById',
    //   code: lambda.Code.fromAsset('lambda/get-product-by-id'),
    //   environment: {
    //     GAMES_TABLE_NAME: GamesTableName,
    //     STOCK_TABLE_NAME: StockTableName,
    //   },
    // });

    gamesTable.grantReadData(getProductByIdLambda);
    stockTable.grantReadData(getProductByIdLambda);

    const createProductLambda = new NodejsFunction(this, "CreateProductHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "createProduct",
      entry: path.join(__dirname, "../lambda/create-product.ts")
    });

    // const createProductLambda = new lambda.Function(this, 'CreateProductHandler', {
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   memorySize: 1024,
    //   timeout: cdk.Duration.seconds(5),
    //   handler: 'create-product.createProduct',
    //   code: lambda.Code.fromAsset('lambda/create-product'),
    //   environment: {
    //     GAMES_TABLE_NAME: GamesTableName,
    //     STOCK_TABLE_NAME: StockTableName,
    //   },
    // });

    gamesTable.grantReadWriteData(createProductLambda);
    stockTable.grantReadWriteData(createProductLambda);

    const api = new apigateway.RestApi(this, 'GameStoreApi', {
      restApiName: 'Game Store Service',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
      },
    });

    const products = api.root.addResource('products');
    products.addMethod('GET', new apigateway.LambdaIntegration(getProductsLambda));
    products.addMethod('POST', new apigateway.LambdaIntegration(createProductLambda));

    const singleProduct = products.addResource('{id}');
    singleProduct.addMethod('GET', new apigateway.LambdaIntegration(getProductByIdLambda));
  }
}
