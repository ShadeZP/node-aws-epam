import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';

const GamesTableName = 'Games';
const StockTableName = 'Stock';

export class GameStoreStack extends cdk.Stack {
  public readonly catalogItemsQueue: sqs.Queue;

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

    const getProductsLambda = new NodejsFunction(this, 'GetProductsHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'getProducts',
      entry: path.join(__dirname, '../lambda/get-products.ts'),
    });
    gamesTable.grantReadData(getProductsLambda);
    stockTable.grantReadData(getProductsLambda);

    const getProductByIdLambda = new NodejsFunction(this, 'GetProductByIdHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'getProductById',
      entry: path.join(__dirname, '../lambda/get-product-by-id.ts'),
    });
    gamesTable.grantReadData(getProductByIdLambda);
    stockTable.grantReadData(getProductByIdLambda);

    const createProductLambda = new NodejsFunction(this, 'CreateProductHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'createProduct',
      entry: path.join(__dirname, '../lambda/create-product.ts'),
    });
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

    const catalogItemsQueue = new sqs.Queue(this, 'CatalogItemsQueue', {
      queueName: 'catalogItemsQueue',
    });

    this.catalogItemsQueue = catalogItemsQueue;

    const createProductTopic = new sns.Topic(this, 'CreateProductTopic', {
      topicName: 'createProductTopic',
    });

    createProductTopic.addSubscription(new subs.EmailSubscription('stanoque@protonmail.com'));

    const createCatalogLambda = new NodejsFunction(this, 'CreateCatalogHandler', {
      handler: 'createCatalog',
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../lambda/create-catalog.ts'),
      environment: {
        GAMES_TABLE: gamesTable.tableName,
        STOCK_TABLE: stockTable.tableName,
        CREATE_PRODUCT_TOPIC_ARN: createProductTopic.topicArn,
      },
    });

    gamesTable.grantReadWriteData(createCatalogLambda);
    stockTable.grantReadWriteData(createCatalogLambda);
    catalogItemsQueue.grantConsumeMessages(createCatalogLambda);
    createProductTopic.grantPublish(createCatalogLambda);

    createCatalogLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(catalogItemsQueue, {
        batchSize: 5,
      }),
    );

    new cdk.CfnOutput(this, 'CatalogItemsQueueURL', {
      value: catalogItemsQueue.queueUrl,
      exportName: 'CatalogItemsQueueURL',
    });
  }
}
