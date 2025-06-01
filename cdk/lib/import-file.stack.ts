import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as path from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { S3EventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { ResponseType } from 'aws-cdk-lib/aws-apigateway';

interface ImportServiceStackProps extends cdk.StackProps {
  catalogItemsQueue: sqs.IQueue;
}

export class ImportFileStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ImportServiceStackProps) {
    super(scope, id, props);

    const importBucket = new s3.Bucket(this, 'ImportBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000,
        },
      ],
    });

    const catalogItemsQueue = props.catalogItemsQueue;

    const importProductsFileLambda = new NodejsFunction(this, 'ImportProductsFileLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../lambda/import-file.ts'),
      handler: 'importFileHandler',
      environment: {
        BUCKET_NAME: importBucket.bucketName,
      },
    });

    importBucket.grantPut(importProductsFileLambda);

    const api = new apigateway.RestApi(this, 'ImportApi', {
      restApiName: 'Import File',
    });

    api.addGatewayResponse('AccessDeniedResponse', {
      type: ResponseType.ACCESS_DENIED,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'*'",
      },
    });

    api.addGatewayResponse('UnauthorizedResponse', {
      type: ResponseType.UNAUTHORIZED,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'*'",
      },
    });

    api.addGatewayResponse('Default4xxResponse', {
      type: ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'*'",
      },
    });

    const importResource = api.root.addResource('import', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['*', 'Authorization'],
      },
    });

    const importFileParserLambda = new NodejsFunction(this, 'ImportFileParserLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../lambda/import-file.ts'),
      handler: 'parseFileHandler',
      environment: {
        SQS_URL: catalogItemsQueue.queueUrl,
      },
    });

    catalogItemsQueue.grantSendMessages(importFileParserLambda);

    importBucket.grantRead(importFileParserLambda);

    importFileParserLambda.addEventSource(
      new S3EventSource(importBucket, {
        events: [s3.EventType.OBJECT_CREATED],
        filters: [{ prefix: 'uploaded/' }],
      })
    );

    const basicAuthorizerLambda = new NodejsFunction(this, 'BasicAuthorizerLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../lambda/authorization-service.ts'),
      handler: 'authHandler',
      environment: {
        StanczykDev: process.env.StanczykDev as string,
      },
    });

    const authorizer = new apigateway.TokenAuthorizer(this, 'ImportApiLambdaAuthorizer', {
      handler: basicAuthorizerLambda,
      identitySource: 'method.request.header.Authorization',
    });

    importResource.addMethod('GET', new apigateway.LambdaIntegration(importProductsFileLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
      requestParameters: {
        'method.request.querystring.name': true,
      },
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': true,
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
          },
        },
      ],
    });

    new cdk.CfnOutput(this, 'ImportBucketName', {
      value: importBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'ImportAPI', {
      value: api.url,
    });
  }
}
