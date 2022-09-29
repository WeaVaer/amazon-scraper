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
  var runCntr  = 1;
  var pageCntr = 0;
  var missCntr = 0;
  var rjctCntr = 0;
  var retryArr = []; // will be filled with rejected ASIN's (error-200 or error-50X on fetch) if any
  var dataPool = [];

  const get_intraDelay_msec = () => (config.intraDelay_msec<1) ? 1 : config.intraDelay_msec;
  const get_interDelay_msec = () => (config.interDelay_msec<0) ? 0 : config.interDelay_msec;
  const get_maxRuns         = () => (config.maxRuns<1)         ? 1 : config.maxRuns;
  const get_retryDelay_sec  = () => (config.retryDelay_sec<0)  ? 0 : config.retryDelay_sec;


  async function scrapeThePage (asin, totalAsins, resolve=null, reject=null) {

    var pageIndex = ++pageCntr;

    var $ = null;

    var objOffer = {}; // will be created dynamically below if (!singleRecord)

    var pageOutput   = []; // will ve filled with scraped info and submitted in the format below;

    /* page output format ==>  (singleRecord) ?

                                  [ {objProduct} + {objOffer} of recommended offer ]

                               else

                                  [
                                    {objProduct},
                                    {objOffer},
                                    ...,  <- more {objOffer} as necessary
                                    ...
                                  ]
    */

    try {

      const makeProductUrl   = (asin) => (config.urlProduct + asin);
      const makeOffersUrl = (asin) => (config.urlOffers_pfx + asin + config.urlOffers_sfx);

      const showLogIndex  = (outObj, processIndex, totAsins) => console.log('<'+processIndex+'/'+totAsins+'>\n\n', outObj, '\n');

      /* create the scraper */

      const Scraper = new scrape_amazon(config, asin);

      /* setup the page output object templates and initialize */

      var objProduct = {asin:asin, title:'', scrapeTime:Moment().utc().format("YYYY-MM-DD hh:mm:ss:SSS"), run:runCntr, upc:'', reviews:'', answers:'', bsRank:'', bsCat:''};
      if (config.singleRecord) {
        objProduct = {...objProduct, ...{price:'', condition:'', seller:'', sellerId:'', shipping:'', ratings:'', opinion:'', trace:''}};
      } else {
        objProduct = {...objProduct, ...{trace:''}};
        objOffer   = (config.addAsinToOffers) ? {productAsin:''} : {};
        objOffer   = {...objOffer, ...{buyBox:'', price:'', condition:'',  seller:'',  sellerId:'', shipping:'', ratings:'', opinion:''}};
      }

      /* fetch from url of the product page */
      if (config.debugMode==2) console.log(`[${asin}] fetching product page ..\n`);
      Fetcher.get( makeProductUrl(asin), {headers:config.headerFetch} )

      .then((pResp) => {

        if (config.debugMode==3) console.log(`[${asin}] product page fetch response =>`, pResp);

        /* parse response as dom */
        $ = Parser.load(pResp.data);
        if (config.debugMode==3) console.log(`[${asin}] product page ==>`, $);

        /* fill up the main part (objProduct) */
        Scraper.scrape_Product($, objProduct);
        if (objProduct.trace==config.str_unavailable) {
          // no need to fetch offers if product is scraped as 'unavailable'
          if (config.singleRecord) objProduct.seller = objProduct.trace; else objOffer.seller = objProduct.trace;
          objProduct.trace = "";
          if (pageOutput.length==0) pageOutput.push({...objProduct});
          if (!config.singleRecord) pageOutput.push({...objOffer});
          if (config.logsRealtime) showLogIndex(pageOutput, pageIndex, totalAsins);
          if (resolve) resolve(pageOutput);
          return;
        }

        if (!config.singleRecord) pageOutput.push({...objProduct});

        /* fetch from url of the sellers page */
        if (config.debugMode==2) console.log(`[${asin}] fetching offers page ..\n`);
        setTimeout(
          () => {

          },
          get_intraDelay_msec()
        );

        Fetcher.get( makeOffersUrl(asin), {headers:config.headerFetch} )

        .then((oResp) => {

          if (config.debugMode==3) console.log(`[${asin}] offers page fetch response =>`, oResp);

          /* parse response as dom */
          $ = Parser.load(oResp.data);
          if (config.debugMode==3) console.log(`[${asin}] offers page ==>`, $);

          /* scrape and fill up the seller information */
          Scraper.scrape_Offers  ($, config, objProduct, objOffer, pageOutput, /*pinned*/true); // first get the recommended offer on top
          if (!config.singleRecord)
            Scraper.scrape_Offers($, config, objProduct, objOffer, pageOutput, /*pinned*/false); // then get the rest of the offers

          /* that's it for this ASIN */
          if (pageOutput.length==0) pageOutput.push({...objProduct});
          if (config.logsRealtime) showLogIndex(pageOutput, pageIndex, totalAsins);
          if (resolve) resolve(pageOutput);

        })

        .catch(function (error) {

           if (pageOutput.length==0) pageOutput.push({...objProduct});
           let errCode  = ErrorMan(error, config, '{EXCP-fetchOffer}', asin, pageOutput[0]);
           let rejected = ((errCode==200) || ((errCode>=500)&&(errCode<=599)));
           if (errCode<999) { // not exceptions
             if (errCode==404) missCntr++;
             if (config.singleRecord) {
               pageOutput[0].seller = (errCode==404) ? config.str_Error404 : `${(rejected)?'RETRY ':''}[ERROR-${errCode}]`;
             } else {
               let obj = {...objOffer};
               obj.seller = (errCode==404) ? config.str_Error404 : `${(rejected)?'RETRY ':''}[ERROR-${errCode}]`;
               if (config.addAsinToOffers) obj.productAsin = asin;
               pageOutput.push({...obj});
             }
           }
           if (config.logsRealtime) showLogIndex(pageOutput, pageIndex, totalAsins);
           if (rejected) {
             rjctCntr++;
             if (pageOutput.length>0) pageOutput = [];
             retryArr.push(asin);
           }
           if (resolve) resolve(pageOutput);

        });

      })

      .catch(function (error) {

         if (pageOutput.length==0) pageOutput.push({...objProduct});
         let errCode = ErrorMan(error, config, '{EXCP-fetchProduct}', asin, pageOutput[0]);
//if (errCode==404) errCode=503;
         let rejected = ((errCode==200) || ((errCode>=500)&&(errCode<=599)));
         if (errCode<999) { // not exceptions
           if (errCode==404) missCntr++;
           pageOutput[0].title = (errCode==404) ? config.str_Error404 : `${(rejected)?'RETRY ':''}[ERROR-${errCode}]`;
         }
         if (config.logsRealtime) showLogIndex(pageOutput, pageIndex, totalAsins);
         if (rejected) {
           rjctCntr++;
           if (pageOutput.length>0) pageOutput = [];
           retryArr.push(asin);
         }
         if (resolve) resolve(pageOutput);

      });

    }
    catch(excp) {
      if (pageOutput.length==0) pageOutput.push({...objProduct});
      ErrorMan(excp, config, '{EXCP-scrapeThePage}', asin, pageOutput[0]);
      if (config.logsRealtime) showLogIndex(pageOutput, pageIndex, totalAsins);
      if (resolve) resolve(pageOutput);
    }

  }
  // scrapeThePage()










  const Execute = (asinArr) => {

    const wrapUp = (data) => {

//console.log(`\nWRAPUP data [${data.length}] =>`, data);

      dataPool.push(...data.filter(d => (d)));

//console.log(`WRAPUP dataPool [${dataPool.length}] =>`, dataPool, "\n");

      const chkTrail0 = (s) => (s.endsWith('.0')) ? s.split('.0')[0]: s;
      let gap = get_interDelay_msec();
      if (gap>=60000) {gap=chkTrail0((gap/60000).toFixed(1))+' minute'} else if (gap>=10000) {gap=chkTrail0((gap/1000).toFixed(1))+' second'} else if (gap>0) gap=gap+' millisecond'; else gap='';
      var runTime = Moment().unix() - sessionMoment.unix();
      let run = runTime;
           if (run>=3600) run = chkTrail0((run/3600).toFixed(1)) + ' hour'+((run>1)?'s':'');
      else if (run>=60)   run = chkTrail0((run/60).toFixed(1)) + ' minute'+((run>1)?'s':'');
      else if (run>0)     run = run + ' second'+((run>1)?'s':'');
      else                run = 'less than a second';
      console.log(`\n## ${(config.beEmotional)?(((config.language=='TR')?config.str_GRATITUDE_TR:config.str_GRATITUDE_EN)+' :: '):''}` +
                  `AMAZON-SCRAPER® run${(get_maxRuns()>1)?('-'+runCntr+' (max '+get_maxRuns()+')'):''} with ${pageCntr+'/'+asinArr.length} page`+((asinArr.length>1)?'s':'')+' ' +
                  `${(missCntr)?('('+missCntr+' miss) '):''}` +
                  `${(rjctCntr)?('('+rjctCntr+' reject) '):''}` +
                  `${(gap)?('& '+gap+' gaps '):''}has completed in ${run}\n\n`);

      var finalize = true;

      if (retryArr.length) {
        if (runCntr < get_maxRuns()) {
          finalize = false;
          runCntr++;
          console.log('.. shall continue with rejected ASIN.s ..\n');
          setTimeout(
            () => {
              var arr = [...retryArr];
              retryArr = [];
              Execute(arr);
            },
            ((runTime>=get_retryDelay_sec()) ? 314 : Math.max(314,(get_retryDelay_sec()-runTime)*1000) )
          );
        } else {
          console.log(`\n!! Max run count of ${get_maxRuns()} is reached with the following ASINs left over :`);
          console.log("  ", retryArr, "\n");
          /* add left over asin.s */
          retryArr.forEach(retryAsin => dataPool.push({asin:retryAsin, title:config.str_rejected, scrapeTime:'', run:get_maxRuns()}));
          retryArr = [];
        }
      }

      if (finalize) {
        if (config.fileExport) {
          if (dataPool.length>0) {
            const parser = new j2cp();
            const csv = parser.parse(dataPool);
            try {
              var sessionFilename = Moment().utc().format("YYYY-MM-DD_hh-mm-ss");
              fs.writeFileSync(`./output/${sessionFilename}.csv`, csv);
              console.log(`\n:: ${(config.beEmotional)?(((config.language=='TR')?config.str_GRATITUDE_TR:config.str_GRATITUDE_EN)+' :: '):''}` +
                          `AMAZON-SCRAPER® session saved as 'output/${sessionFilename}.csv' with ${dataPool.length} item${(dataPool.length>1)?'s':''}\n`);
            } catch(error) {
              console.log("\n");
              ErrorMan(error, config, '{EXCP-wrapUp/fileExport}', "", null);
            }
          } else {
            console.log(`\n:: ${(config.beEmotional)?(((config.language=='TR')?config.str_UNFORTUNE_TR:config.str_UNFORTUNE_EN)+' :: '):''}Nothing to save !\n`);
          }
        } else if (!config.logsRealtime) {
          console.log("\n:: OUTPUT =>\n");
          console.log(dataPool);
          console.log("\n");
        }
      }

    }
    // wrapUp()

    console.log(`\n\n## RUN-${runCntr} of max ${get_maxRuns()} ######################################################################################  >> \n`);
    var sessionMoment = Moment();

    if (!asinArr.length) {
      console.log("Nothing to check for !\n");
      return;
    }

    let greeting = (config.beEmotional) ? (((config.language=='TR')?config.str_GODWILL_TR:config.str_GODWILL_EN)+' ') : '';
    if (asinArr[0]=='test') {
      asinArr = [...config.testAsinArr];
      console.log(`:: ${greeting}Testing ${asinArr.length} ASIN${(asinArr.length>1)?'.s':''} =>`, asinArr);
    } else {
      console.log(`:: ${greeting}Processing ${asinArr.length} ASIN${(asinArr.length>1)?'.s':''} ...`);
    }
    console.log("\n");

    /* Put each page task into seperate promises in an array */
    const promises = [];
    var   prmsCntr = 0;
    pageCntr = 0;
    missCntr = 0;
    rjctCntr = 0;
    asinArr.forEach(thisAsin => {
      promises.push(new Promise((resolve, reject) => {
        setTimeout(
          () => scrapeThePage(thisAsin, asinArr.length, resolve, reject),
          (((get_interDelay_msec()<1) ? 1 : get_interDelay_msec()) * prmsCntr) + 1
        );
      }));
      prmsCntr++;
    });

    if (get_interDelay_msec()>0) {

      async function executeSequential () {
        var runOutput = [];
        const processPromises = async () => {
          for (let promise of promises) {
            try {
              const out = await promise;
              runOutput.push(...out);
            } catch(error) {
              ErrorMan(error, config, '{EXCP-executeSequential}', "", null);
            }
          }
        }
        await processPromises(runOutput);
        wrapUp(runOutput);
      }

      executeSequential();

    } else {

      Promise.all(promises).then(runOutput => wrapUp(runOutput)).catch(error => ErrorMan(error, config, '{EXCP-Execute/promiseAll}', "", null));

    }

  }
  // Execute()








  /* -- INITIALIZE -- */

  const readline = require('readline').createInterface({
    input:  process.stdin,
    output: process.stdout,
  });

  readline.question(

    `\n\n>>>  AMAZON-SCRAPER®  >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>  version:${config.moduleVersion}  auth:${config.moduleAuthor}\n\n\n` +
    `:: Enter ASINs seperated by comma/space (or enter 'test') : `,

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
      setTimeout(() => Execute(asinArr), 314);
      readline.close();
    }

  );

}
// module.exports()
