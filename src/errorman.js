

module.exports = function (error, config, logStr, asin, outputObj=null) {

  var errCode = -1;

  if (error.response) {

    /* The request was made and the server responded with a status code that falls out of the range of 2xx */

//console.log(`!! ${logStr} [${asin}] error.response.data =>`,    error.response.data);
//console.log(`!! ${logStr} [${asin}] error.response.headers =>`, error.response.headers);
    if (config.debugMode>0) console.log(`!! ${logStr} [${asin}] error.response.status =>`, "error="+error.response.status, "\n");

    errCode = error.response.status;

  }

  else if (error.request) {

    /* The request was made but no response was received.
       `error.request` is an instance of XMLHttpRequest in the browser and an instance of http.ClientRequest in node.js */

    if (config.debugMode>0) console.log(`!! ${logStr} [${asin}] error.request =>`, ((config.debugMode>1) ? error.request : "error=200"), '\n');

    errCode = 200;

  } else {

    /* Something happened in setting up the request that triggered an Error */

    if ((config.debugMode>1)&&(error.stack)) console.log(`!! ${logStr} [${asin}] error.stack =>`,   error.stack, '\n');
                                        else console.log(`!! ${logStr} [${asin}] error.message =>`, error.message, '\n');
    if (outputObj) {
      var err;
      if (error.stack) {
        err = {};
        Object.getOwnPropertyNames(error).forEach(function (propName) {
          err[propName] = error[propName];
        });
        err = JSON.stringify(err.stack).replace(/\\n    at /g, ' | at ').replace(/\\\\/g, '/').replace(/"/g, '');
        while (err.includes('/amazon-scraper/')) {
          err = err.split('/amazon-scraper/');
          let idx = err[0].lastIndexOf('(');
          err[1] = ((idx==-1) ? err[0] : err[0].substr(0,idx+1)) + err[1];
          err.shift();
          err = err.join('/amazon-scraper/');
        }
      } else {
        err = error.message;
      }
      err = logStr+' '+err;
      outputObj.trace = (outputObj.trace) ? (outputObj.trace+' [:] '+err) : err;
    }

    errCode = 999;

  }

  if ((config.debugMode>2)&&(error.config)) console.log(`!! ${logStr} [${asin}] error.config =>`, error.config);

  return errCode;

}
// module.exports()
