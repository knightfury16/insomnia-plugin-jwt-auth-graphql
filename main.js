const _get = require('lodash.get');

module.exports.requestHooks = [
  async context => {
    // default unAuthenticatedOperation
    const unAthenticated_operations = ['login', 'register', 'create'];
    // custom unAuthenticated operations

    const customUnAuthenticatedOperations = context.request.getEnvironmentVariable(
      'unathenticated_operations'
    );

    if (customUnAuthenticatedOperations) {
      unAthenticated_operations = [
        ...unAthenticated_operations,
        ...customUnAuthenticatedOperations
      ];
    }

    // get the current operation name
    const req = JSON.parse(context.request.getBody().text);
    const operationName = req.operationName;

    const isNonAuthOperation = unAthenticated_operations.some(u => operationName.includes(u));

    // do not set header authorization header when path is 'login' or 'register' or any custom unAuthenticated operations
    if (!isNonAuthOperation) {
      const jwt = await context.store.getItem('jwt');
      context.request.addHeader('Authorization', `Bearer ${jwt}`);
      console.log('Auth token added ', jwt);
    }
  }
];

module.exports.responseHooks = [
  async context => {
    // get the token field name response from api
    const tokenName = context.request.getEnvironmentVariable('access_token') || 'token';

    // operation name for which jwt token would be set (deafult)
    const loginOperations = ['login', 'create', 'register'];

    // check for custom operation name
    const customOperations = context.request.getEnvironmentVariable('login_operations_name');

    if (customOperations) {
      loginOperations = [...loginOperations, ...customOperations];
    }

    // get the current operation name
    const req = JSON.parse(context.request.getBody().text);
    const operationName = req.operationName;

    // check if the operation name contain the loginOperation name
    const isLoginOperation = loginOperations.some(loginOperation =>
      operationName.includes(loginOperation)
    );

    // persistent jwt on the storage
    if (isLoginOperation) {
      // get the token from the response,
      // hard coded the taking of token from root level of data
      // TODO: Make it dynamic, or at least give the control to the user
      const res = context.response.getBody().toString();
      const data = JSON.parse(res);
      const [queryName] = Object.keys(data.data);
      const token = _get(data['data'][queryName], tokenName, 'token');

      await context.store.setItem('jwt', token);
      console.log('Token Set', token);
    }
  }
];
