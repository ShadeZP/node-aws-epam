export const authHandler = async (event: any) => {
  console.log('Received event:', JSON.stringify(event));

  const authHeader = event?.Authorization || event?.authorization || event?.authorizationToken;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    throw new Error('Unauthorized');
  }

  const base64Credentials = authHeader.split(' ')[1];
  const decoded = Buffer.from(base64Credentials, 'base64').toString('utf8');
  const [username, password] = decoded.split(':');

  const gitPassword = process.env.GIT_PASSWORD;
  const gitName = process.env.GIT_NAME;
  if (!username || !password) {
    throw new Error('Unauthorized');
  }

  if (username === gitName && password === gitPassword) {
    return {
      principalId: username,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: event.methodArn,
          },
        ],
      },
      context: {
        username,
      },
    };
  } else {
    return {
      principalId: username,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: event.methodArn,
          },
        ],
      },
      context: {
        username,
      },
    };
  }
};
