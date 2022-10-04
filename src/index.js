
const Moment = require("moment");
const Parser = require("cheerio");
const Fetcher = require("axios");
const j2cp = require("json2csv").Parser;
const fs = require("fs");
const path = require('path');
const config = require(path.resolve(__dirname, "config" ));
const ErrorMan = require(path.resolve(__dirname, "errorman" ));
const scrape_amazon = require(path.resolve(__dirname, "scrape_amazon" )); // will be created as 'Scraper', dynamically as needed




module.exports = function() {



  /* globals */
  var runCntr    = 1;
  var pageCntr   = 0;
  var missCntr   = 0;
  var rejectCntr = 0;
  var rejectTheRestOfTheRun = false;
  var retryArr   = []; // will be filled with rejected ASIN's (error-200 or error-50X on fetch) if any
  var outputPool = [];

  const get_maxRuns         = ()  => (config.maxRuns<1)         ? 1 : config.maxRuns;
  const get_retryDelay_msec = ()  => (config.retryDelay_sec<1)  ? 1 : config.retryDelay_sec*1000;

  const get_delayVariance   = ()  => (config.delayVariance<1)   ? 0 : ((config.delayVariance>100) ? 100 : config.delayVariance);
  const randomizeDelay      = (d) => Math.round(d * ((Math.round(Math.random())) /* 0 or 1 */ ? 1-(Math.random()*(get_delayVariance()/100)) : 1+(Math.random()*(get_delayVariance()/100))) );
  const get_intraDelay_msec = ()  => (config.intraDelay_msec<1) ? 1 : (((get_delayVariance()==0) ? config.intraDelay_msec : randomizeDelay(config.intraDelay_msec)) || 1);
  const get_interDelay_msec = ()  => (config.interDelay_msec<1) ? 1 : (((get_delayVariance()==0) ? config.interDelay_msec : randomizeDelay(config.interDelay_msec)) || 1);

  const writeFileAsHtml = (isProductPage, asin, html) => {
    var fName = `./html/${asin+' - '+((isProductPage)?'P':'S')+' - '+Moment().utc().format("YYYY-MM-DD hh-mm-ss")}.html`;
    try {
      fs.writeFileSync(fName, html);
    } catch(error) {
      console.log("\n");
      ErrorMan(error, config, `{EXCP-writeFile} ${fName}`, "", null);
    }
  }
  // writeFileAsHtml()


  function scrapeThePage (asin, totalAsins, resolve) {

    try {

      var pageOutput = {asin:asin, title:'', scrapeTime:Moment().utc().format("YYYY-MM-DD hh:mm:ss:SSS"), run:runCntr, upc:'', reviews:'', answers:'', bsRank:'', bsCat:'',
                        price:'', condition:'', seller:'', sellerId:'', shipping:'', ratings:'', opinion:'', trace:''};

      const makeProductUrl = (asin) => (config.urlProduct + asin);
      const makeOffersUrl  = (asin) => (config.urlOffers_pfx + asin + config.urlOffers_sfx);

      /* Function START */

      console.log(`<${++pageCntr}/${totalAsins}>  ${asin}${(rejectTheRestOfTheRun)?('  '+config.str_TrafficControl):'\n'}`);
      if (rejectTheRestOfTheRun) {
        rejectCntr++;
        retryArr.push(asin);
        resolve(null);
        return;
      }

      /* fetch from url of the product page */
      if (config.debugMode==2) console.log(`DEBUG [asin:${asin}] fetching product page ..\n`);
      Fetcher.get( makeProductUrl(asin), {headers:config.headerFetch} )

      .then((pResp) => {

        if (config.debugMode==3) console.log(`DEBUG [asin:${asin}] product page fetch response =>`, pResp.data, "\n");
        if (config.htmlProductExport==2) writeFileAsHtml(/*isProductPage*/true, asin, pResp.data);

        /* parse response as dom */
        $ = Parser.load(pResp.data);
        if (config.debugMode==4) console.log(`DEBUG [asin:${asin}] product page DOM =>`, $("*"), "\n");

        /* creat a scraper and fill up the product part of 'pageOutput' */
        const Scraper = new scrape_amazon(config, asin);
        Scraper.scrape_Product($, pageOutput);

        /* no need to fetch offers if we couldnt find 'title' or product is scraped as 'Currently unavailable' or has a business account login box */
        if ((pageOutput.title==config.str_unknown) || pageOutput.trace.includes('pass-'+config.str_unavailable) || pageOutput.trace.includes('pass-'+config.str_needsLogin)) {
          if (pageOutput.title==config.str_unknown) {
            if (config.htmlProductExport==1) writeFileAsHtml(/*isProductPage*/true, asin, pResp.data);
          } else {
            let extract = (pageOutput.trace.includes('pass-'+config.str_unavailable)) ? config.str_unavailable : config.str_needsLogin;
            pageOutput.seller = extract;
            if ((pageOutput.trace==('pass-'+config.str_unavailable)) || (pageOutput.trace==('pass-'+config.str_needsLogin))) pageOutput.trace = "";
          }
          if (config.debugMode>0) console.log('   ... fetched product, skipping offers ...\n');
          resolve({...pageOutput});
          return;
        }

        var intraDelay = get_intraDelay_msec();
        if ((intraDelay>1)&&(config.debugMode>0)) console.log(`   ... fetched product, pausing ${intraDelay} milliseconds for offers ...\n`);
        setTimeout(

          () => {

            /* fetch from url of the sellers page */
            if (config.debugMode==2) console.log(`DEBUG [asin:${asin}] fetching offers page ..\n`);
            Fetcher.get( makeOffersUrl(asin), {headers:config.headerFetch} )

            .then((oResp) => {

              if (config.debugMode==3) console.log(`DEBUG [asin:${asin}] offers page fetch response =>`, oResp.data, "\n");
              if (config.htmlOffersExport==2) writeFileAsHtml(/*isProductPage*/false, asin, oResp.data);

              /* parse response as dom */
              $ = Parser.load(oResp.data);
              if (config.debugMode==4) console.log(`DEBUG [asin:${asin}] offers page DOM =>`, $("*"), "\n");

              /* scrape and fill up the seller information */
              Scraper.scrape_PinnedOffer($, pageOutput);
              if (pageOutput.seller==config.str_noSellers) {
                if (config.htmlOffersExport==1) writeFileAsHtml(/*isProductPage*/false, asin, oResp.data);
              }

              /* that's it for this ASIN */
              resolve({...pageOutput});

            }) // Fetcher.get( makeOffersUrl .. ).then((oResp) => {

            .catch((error) => {

               let errCode  = ErrorMan(error, config, '{EXCP-fetchOffer}', asin, pageOutput);
               let rejected = ((errCode==200) || ((errCode>=500)&&(errCode<=599)));
               if (errCode<999) { // not exceptions
                 if (errCode==404) missCntr++;
                 pageOutput.seller = (errCode==404) ? config.str_Error404 : `${(rejected)?'RETRY ':''}[ERROR-${errCode}]`;
               }
               if (rejected) {
                 rejectCntr++;
                 pageOutput = null;
                 retryArr.push(asin);
                 rejectTheRestOfTheRun = config.skipTheRestIfReject;
               }
               resolve((pageOutput)?{...pageOutput}:null);

            });

          },
          intraDelay
        );

      }) // Fetcher.get( makeProductUrl .. ).then((pResp) => {

      .catch((error) => {

         let errCode = ErrorMan(error, config, '{EXCP-fetchProduct}', asin, pageOutput);
//if ((runCntr==1)&&(errCode==404)) errCode=503;
         let rejected = ((errCode==200) || ((errCode>=500)&&(errCode<=599)));
         if (errCode<999) { // not exceptions
           if (errCode==404) missCntr++;
           pageOutput.title = (errCode==404) ? config.str_Error404 : `${(rejected)?'RETRY ':''}[ERROR-${errCode}]`;
         }
         if (rejected) {
           rejectCntr++;
           pageOutput = null;
           retryArr.push(asin);
           rejectTheRestOfTheRun = config.skipTheRestIfReject;
         }
         resolve((pageOutput)?{...pageOutput}:null);

      });

    }
    catch(excp) {
      ErrorMan(excp, config, '{EXCP-scrapeThePage}', asin, pageOutput);
      resolve({...pageOutput});
    }

  }
  // scrapeThePage()





  async function doTheRun (asinArr) {

    if (!asinArr.length) {
      if (runCntr==1) console.log("Nothing to check for !\n");
      return;
    }

    pageCntr   = 0;
    missCntr   = 0;
    rejectCntr = 0;
    retryArr   = [];
    rejectTheRestOfTheRun = false;

    const runOutput = [];
    var    runStart = Moment();

    console.log(`\n\n## RUN-${runCntr} of max ${get_maxRuns()} ######################################################################################  >> \n`);
    if (asinArr[0].toLowerCase().includes('test')) {
      asinArr = (asinArr[0].toLowerCase()=='test') ? [...config.testAsinArr] : [...config.test50AsinArr];
      console.log(`:: Testing ${asinArr.length} ASIN${(asinArr.length>1)?'.s':''} =>`, ((asinArr.length==50) ? '[ .. ]' : asinArr));
    } else {
      console.log(`:: Processing ${asinArr.length} ASIN${(asinArr.length>1)?'.s':''} ...`);
    }
    console.log("\n");

    function pushThePage (pageOutput) {
      if (pageOutput) {
        console.log(`${JSON.stringify(pageOutput)}\n`);
        runOutput.push({...pageOutput});
      }
    }

    function queueThePage(asin, totalAsins, delay) {
      return ( new Promise(resolve => {
                 var dly = delay;
                 if ((dly>1)&&(config.debugMode>0)) console.log(`   ... pausing ${dly} milliseconds for next product ...\n`); else dly=1;
                 setTimeout(() => scrapeThePage(asin, totalAsins, resolve), dly);
             }));
    }

    const starterPromise = Promise.resolve(null);
    await asinArr.reduce(
      (p, asin) => p.then(() => queueThePage(asin, asinArr.length, ((rejectTheRestOfTheRun||(pageCntr==0))?1:get_interDelay_msec())).then(pushThePage)),
      starterPromise
    );
    outputPool.push(...runOutput);

    const chkTrail0 = (s) => (s.endsWith('.0')) ? s.split('.0')[0]: s;
    let gap = ((config.interDelay_msec<0) ? 0 : config.interDelay_msec) + ((config.intraDelay_msec<0) ? 0 : config.intraDelay_msec);
    if (gap>=60000) {gap=chkTrail0((gap/60000).toFixed(1))+' minute'} else if (gap>=10000) {gap=chkTrail0((gap/1000).toFixed(1))+' second'} else if (gap>0) gap=gap+' millisecond'; else gap='';
    var runTime = Moment().unix() - runStart.unix();
    let run = runTime;
         if (run>=3600) run = chkTrail0((run/3600).toFixed(1)) + ' hour'+((run>1)?'s':'');
    else if (run>=60)   run = chkTrail0((run/60).toFixed(1)) + ' minute'+((run>1)?'s':'');
    else if (run>0)     run = run + ' second'+((run>1)?'s':'');
    else                run = 'less than a second';
    console.log(`\n### AMAZON-SCRAPER® run${(get_maxRuns()>1)?('-'+runCntr+' (max:'+get_maxRuns()+')'):''} with ${pageCntr+'/'+asinArr.length} page`+((asinArr.length>1)?'s':'')+' ' +
                `${(missCntr)?('('+missCntr+' miss) '):''}` +
                `${(rejectCntr)?('('+rejectCntr+' reject) '):''}` +
                `${(gap)?('& '+gap+' '+((get_delayVariance()>0)?('(±'+get_delayVariance()+'% randomized) '):'')+'gaps '):''}has completed in ${run}\n\n`);

    var finalize = true;

    if (retryArr.length) {
      if (runCntr < get_maxRuns()) {
        finalize = false;
        runCntr++;
        console.log(`\n   ... shall continue with ${retryArr.length} rejected ASIN${(retryArr.length>1)?'s':''} ` +
                    `${(config.retryDelay_sec>0)?('in '+config.retryDelay_sec+' second'+((config.retryDelay_sec>1)?'s':'')+' '):''}..\n`);
        setTimeout(() => doTheRun([...retryArr]), get_retryDelay_msec());
      } else {
        console.log(`\n!! Max run count of ${get_maxRuns()} is reached with the following ASINs left over :`);
        console.log("  ", retryArr, "\n");
        /* add left over asin.s */
        retryArr.forEach(retryAsin => outputPool.push({asin:retryAsin, title:config.str_rejected, scrapeTime:'', run:get_maxRuns()}));
        retryArr = [];
      }
    }

    if (finalize) {
      if (config.fileExport) {
        if (outputPool.length>0) {
//console.log("DEBUG outputPool =>", outputPool, '\n');
          const parser = new j2cp();
          const csv = parser.parse(outputPool);
          try {
            var sessionFilename = Moment().utc().format("YYYY-MM-DD hh-mm-ss");
            fs.writeFileSync(`./output/${sessionFilename}.csv`, csv);
            console.log(`\n:: AMAZON-SCRAPER® session saved as 'output/${sessionFilename}.csv' with ${outputPool.length} item${(outputPool.length>1)?'s':''}\n\n`);
          } catch(error) {
            console.log("\n");
            ErrorMan(error, config, '{EXCP-wrapTheRun/fileExport}', "", null);
          }
        } else {
          console.log(`\n:: Nothing to save !\n`);
        }
      }
    }

  }
  // doTheRun()








  /* -- INITIALIZE -- */

  const readline = require('readline').createInterface({
    input:  process.stdin,
    output: process.stdout,
  });

  readline.question(
    `\n\n>>>  AMAZON-SCRAPER®  >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>  version:${config.moduleVersion}  auth:${config.moduleAuthor}\n\n\n` +
    `:: Enter ASINs seperated by comma/space (or enter 'test' or 'test50') : `,

    (inputStr) => {
      var input = inputStr.trim();
      if (input.includes(',')) {
        input = input.replace(/ /g, '');
      } else if ((input.includes('\r'))||(input.includes('\n'))) {
        input = input.replace(/ /g, '');
        input = input.replace(/\r\n|\r|\n/g, ',');
        while (input.includes(',,')) input.replace(',,', ',');
      } else if (input.includes(' ')) {
        while (input.includes('  ')) input.replace('  ', ' ');
        input = input.replace(/ /g, ',');
        while (input.includes(',,')) input.replace(',,', ',');
      }
      var asinArr = input.split(',');
      setTimeout(() => doTheRun(asinArr), 314);
      readline.close();
    }
  );

}
// module.exports()
