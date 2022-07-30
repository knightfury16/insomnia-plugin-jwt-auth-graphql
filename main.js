const _get = require('lodash.get');

module.exports.requestHooks = [
  async context => {
    // default unAuthenticatedOperation
    // Not setting any default
    const unAthenticated_operations = [];

    // custom unAuthenticated operations
    // if any opertion don't need the token, mention in environment explicitly
    const customUnAuthenticatedOperations = context.request.getEnvironmentVariable(
      'unathenticated_operations'
    );

    if (customUnAuthenticatedOperations) {
      unAthenticated_operations = [...customUnAuthenticatedOperations];
    }

    // get the current operation name
    const req = JSON.parse(context.request.getBody().text);
    const operationName = req.operationName;

    // cheking if this path need token or not based on the opertions name, if mentioned in environment
    const isNonAuthOperation = unAthenticated_operations.some(u => operationName.includes(u));

    // do not set header authorization header when path is any custom unAuthenticated operations
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
    const isLoginOperation = loginOperations.some(loginOperation => {
      return operationName.includes(loginOperation) && operationName.toLowerCase().includes('user');
    });

    console.log('IsloginOperation', isLoginOperation);

    // persistent jwt on the storage
    if (isLoginOperation) {
      // get the token from the response,
      // hard coded the taking of token from root level of data
      // TODO: Make it dynamic, or at least give the control to the user
      const res = context.response.getBody().toString();
      const data = JSON.parse(res);
      if (data.data) {
        const [queryName] = Object.keys(data.data);
        const token = _get(data['data'][queryName], tokenName, 'token');
        await context.store.setItem('jwt', token);
        console.log('Token Set', token);
      }
    }
  }
];
