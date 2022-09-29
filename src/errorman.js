

module.exports = function (error, config, logStr, asin, outputObj=null) {

  var errCode = -1;

  if (error.response) {

    /* The request was made and the server responded with a status code that falls out of the range of 2xx */

    if (config.debugMode) {
      if (config.debugMode>2) {
        console.log(`!! ${logStr} [${asin}] error.response.data =>`,    error.response.data);
        console.log(`!! ${logStr} [${asin}] error.response.headers =>`, error.response.headers);
      }
      console.log(`!! ${logStr} [${asin}] error.response.status =>`, "error="+error.response.status, "\n");
    }

    errCode = error.response.status;

  }

  else if (error.request) {

    /* The request was made but no response was received.
       `error.request` is an instance of XMLHttpRequest in the browser and an instance of http.ClientRequest in node.js */

    if (config.debugMode) console.log(`!! ${logStr} [${asin}] error.request =>`, ((config.debugMode>1) ? error.request : "error=200"));

    errCode = 200;

  } else {

    /* Something happened in setting up the request that triggered an Error */

    const createRandomSwear = () => {
      var roll = Math.floor(Math.random()*8); // roll = 0..7
      switch (roll) {
        case 0 : return (config.language=='TR') ? 'ALLAH KAHRETMESiN EMi ..' : "GOD DAMN (DON'T) ..";
        case 1 : return (config.language=='TR') ? 'YAPMA BE YAAA !' : "DON'T DO IT, UWW !";
        case 2 : return (config.language=='TR') ? 'BU NE Ki SiMDi ?' : "WHAT IS IT NOW ?";
        case 3 : return (config.language=='TR') ? 'BASLIYACAM SiMDi AMA ..' : "I'M GONNA START NOW THO ..";
        case 4 : return (config.language=='TR') ? 'HOPPALAAAA !' : "OLEEYYY !";
        case 5 : return (config.language=='TR') ? 'ABiCiM NEREDEN CIKTI BU HATA ?' : "WHERE DID THIS ERROR COME FROM BRO ?";
        case 6 : return (config.language=='TR') ? 'BANA HATA DiYE GELMEYiN KARDESiM ..' : "BRO, DON'T COME TO ME SAYING ERROR ..";
        case 7 : return (config.language=='TR') ? 'DE Ki; HATASIZ KUL OLMAZ ..' : "SAY IT; NO HUMAN IS WITHOUT ERRORS ..";
      }
    }
    // createRandomSwear()

    if (config.beEmotional) console.log('\n!! '+createRandomSwear()+'\n');
    if ((config.debugMode>1)&&(error.stack)) console.log(`!! ${logStr} [${asin}] error.stack =>`,   error.stack);
                                        else console.log(`!! ${logStr} [${asin}] error.message =>`, error.message);
    console.log('');
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
