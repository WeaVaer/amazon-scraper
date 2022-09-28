const Moment = require("moment");
const Parser = require("cheerio");
const Fetcher = require("axios");
const j2cp = require("json2csv").Parser;
const fs = require("fs");
const path = require('path');
const config = require(path.resolve(__dirname, "config" ));
const scrape_amazon = require(path.resolve(__dirname, "scrape_amazon" ));
const ErrorMan = require(path.resolve(__dirname, "errorman" ));



module.exports = function() {

  var pageCntr = 0;
  var missCntr = 0;

  async function scrapePage (asin, totalAsins, resolve=null, reject=null) {

    var pageIndex = ++pageCntr;

    var $, objOffer;

    const output   = [];

    /* output format per page  ==>  (config.singleRecord) ?

                                       [ {objProduct} + {objOffer} of recommended offer ]

                                    else

                                       [
                                         {objProduct},
                                         {objOffer},
                                         ... <- more {objOffer} as necessary
                                       ]
    */

    try {

      const makePageUrl   = (asin) => (config.urlProduct + asin);
      const makeOffersUrl = (asin) => (config.urlOffers_pfx + asin + config.urlOffers_sfx);

      const showLogIndex  = (outObj, processIndex, totAsins) => console.log('<'+processIndex+'/'+totAsins+'>\n\n', outObj, '\n');

      const scrapeOffers  = (pinned=false) => {
        if (config.singleRecord && (!pinned)) return; // skip offer records other than the recommended if (config.singleRecord)
        let items = Scraper.scrapeThing($, null, '', ((pinned)?'#aod-pinned-offer':'#aod-offer'));
        if (items.length) items.each(function() {
          if (config.singleRecord) {
            Scraper.scrapeOffer_Price             ($, $(this), objProduct, pinned);
            Scraper.scrapeOffer_Condition         ($, $(this), objProduct);
            Scraper.scrapeOffer_SellerAndSellerId ($, $(this), objProduct);
            Scraper.scrapeOffer_Shipping          ($, $(this), objProduct);
            Scraper.scrapeOffer_RatingsAndOpinion ($, $(this), objProduct);
          } else {
            var obj = {...objOffer};
            obj.buyBox = (pinned) ? "Y" : "";
            if (config.addAsinToOffers) obj.productAsin = asin;
            Scraper.scrapeOffer_Price             ($, $(this), obj, pinned);
            Scraper.scrapeOffer_Condition         ($, $(this), obj);
            Scraper.scrapeOffer_SellerAndSellerId ($, $(this), obj);
            Scraper.scrapeOffer_Shipping          ($, $(this), obj);
            Scraper.scrapeOffer_RatingsAndOpinion ($, $(this), obj);
            output.push({...obj});
          }

        });
      }
      // scrapeOffers()


/// LET'S DO THIS ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

      /* create the scraper */

      const Scraper = new scrape_amazon(config, asin);

      /* setup the output object templates and initialize */

      var objProduct = {asin:'', title:'', scrapeTime:'', upc:'', reviews:'', answers:'', bsRank:'', bsCat:''};
      if (config.singleRecord) {
        objProduct = {...objProduct, ...{price:'', condition:'', seller:'', sellerId:'', shipping:'', ratings:'', opinion:'', trace:''}};
      } else {
        objProduct = {...objProduct, ...{trace:''}};
        objOffer   = (config.addAsinToOffers) ? {productAsin:''} : {};
        objOffer   = {...objOffer, ...{buyBox:'', price:'', condition:'',  seller:'',  sellerId:'', shipping:'', ratings:'', opinion:''}};
      }
      objProduct.asin       = asin;
      objProduct.scrapeTime = Moment().utc().format("YYYY-MM-DD hh:mm:ss:SSS");

      /* fetch from url of the main page */
      Fetcher.get(
        makePageUrl(asin),
        {
          headers: {
            'Host'   : "www.amazon.com",
            'Accept' : "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            'Pragma' : "no-cache",
            'TE'     : "trailers",
            'Upgrade-Insecure-Requests' : 1,
            'User-Agent' : "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:105.0) Gecko/20100101 Firefox/105.0"
          }
        }
      )
      .then((pResp) => {

        if (config.debugMode==3) console.log(`[${asin}] product page fetch response =>`, pResp);

        /* parse response as dom */
        $ = Parser.load(pResp.data);
        if (config.debugMode==3) console.log(`[${asin}] main page ==>`, $);

        /* fill up the main part (objProduct) */
        Scraper.scrapeProduct_Title        ($, objProduct);
        Scraper.scrapeProduct_Reviews      ($, objProduct);
        Scraper.scrapeProduct_Answers      ($, objProduct);
        Scraper.scrapeProduct_bsRankAndCat ($, objProduct);
        Scraper.scrapeProduct_UPC          ($, objProduct);
        if (!config.singleRecord) output.push({...objProduct});

        /* fetch from url of the sellers page */

        Fetcher.get(
          makeOffersUrl(asin),
          {
            headers : {
              'Host'   : "www.amazon.com",
              'Accept' : "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
              'Pragma' : "no-cache",
              'TE'     : "trailers",
              'Author' : "NMYdoc630819",
              'Referer': config.str_OfferRefererUrl + asin,
              'Upgrade-Insecure-Requests' : 1,
              'User-Agent' : "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:105.0) Gecko/20100101 Firefox/105.0"
            }
          }
        )
        .then((oResp) => {

          if (config.debugMode==3) console.log(`[${asin}] sellers page fetch response =>`, oResp);

          /* parse response as dom */
          $ = Parser.load(oResp.data);
          if (config.debugMode==3) console.log(`[${asin}] sellers page ==>`, $);

          /* scrape and fill up the seller information */
          scrapeOffers(true);  // first get the recommended offer on top
          if (!config.singleRecord) scrapeOffers(false); // then get the rest of the offers

          /* that's it for this ASIN */
          if (!output.length) output.push({...objProduct});
          if (config.logsRealtime) showLogIndex(output, pageIndex, totalAsins);
          if (resolve) resolve(output);

        })
        .catch(function (error) {
           if (!output.length) output.push({...objProduct});
           let errCode = ErrorMan(error, config, '{EXCP-offer}', asin, output[0]);
           if (errCode<999) {
             if (config.singleRecord) {
               output[0].seller = (errCode==404) ? config.str_Error404 : `[ERROR-${errCode}]`;
             } else {
               let obj = {...objOffer};
               obj.seller = (errCode==404) ? config.str_Error404 : `[ERROR-${errCode}]`;
               if (config.addAsinToOffers) obj.productAsin = asin;
               output.push({...obj});
             }
           }
           if (config.logsRealtime) showLogIndex(output, pageIndex, totalAsins);
           if (resolve) resolve(output);
        });

      })
      .catch(function (error) {
         if (!output.length) output.push({...objProduct});
         let errCode = ErrorMan(error, config, '{EXCP-product}', asin, output[0]);
         if (errCode<999) {
           missCntr++;
           output[0].title = (errCode==404) ? config.str_Error404 : `[ERROR-${errCode}]`;
         }
         if (config.logsRealtime) showLogIndex(output, pageIndex, totalAsins);
         if (resolve) resolve(output);
      });

    }
    catch(excp) {
      if (!output.length) output.push({...objProduct});
      ErrorMan(excp, config, '{EXCP-scrapePage}', asin, output[0]);
      if (config.logsRealtime) showLogIndex(output, pageIndex, totalAsins);
      if (resolve) resolve(output);
    }

  }
  // scrapePage()








  /* -- INITIALIZE -- */

  const readline = require('readline').createInterface({
    input:  process.stdin,
    output: process.stdout,
  });

  readline.question(`\n\n>>>  AMAZON-SCRAPER®  >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>  version:${config.moduleVersion}  auth:${config.moduleAuthor}\n\n\n` +
                    `:: Enter ASINs seperated by comma/space (or enter 'test') : `,
  (ids) => {

    console.log("\n");
    var sessionMoment   = Moment();
    var sessionFilename = sessionMoment.utc().format("YYYY-MM-DD_hh-mm-ss");

    var idsx = ids.trim();
    if (idsx.includes(',')) {
      idsx = idsx.replace(/ /g, '');
    } else if ((idsx.includes('\r'))||(idsx.includes('\n'))) {
      idsx = idsx.replace(/ /g, '');
      idsx = idsx.replace(/\r\n|\r|\n/g, ',');
      while (idsx.includes(',,')) idsx.replace(',,', ',');
    } else if (idsx.includes(' ')) {
      while (idsx.includes('  ')) idsx.replace('  ', ' ');
      idsx = idsx.replace(/ /g, ',');
      while (idsx.includes(',,')) idsx.replace(',,', ',');
    }
    var asinArr = idsx.split(',');

    if ((asinArr.length)&&(asinArr[0])) {

      let greeting = (config.beEmotional) ? (((config.language=='TR')?config.str_GODWILL_TR:config.str_GODWILL_EN)+' ') : '';
      if (asinArr[0]=='test') {
        asinArr = ['404-IS-BAD','B01GDJ2BH6','B07H4VWNNR','B08L4SLBFN','B009QM9WSY','B00AMGUZ70','B000BI3M60'];
        console.log(`:: ${greeting}Testing ${asinArr.length} ASIN${(asinArr.length>1)?'.s':''} =>`, asinArr);
      } else {
        console.log(`:: ${greeting}Processing ${asinArr.length} ASIN${(asinArr.length>1)?'.s':''} ...`);
      }
      console.log("\n");

      const promises = [];
      var   prmsCntr = 0;
      asinArr.forEach(thisAsin => {
        promises.push(new Promise((resolve, reject) => {
          setTimeout(() => {
            scrapePage(thisAsin, asinArr.length, resolve, reject)
          },
          ((config.interDelay*prmsCntr)?(config.interDelay*prmsCntr):314))
        }));
        prmsCntr++;
      });

      const wrapUp = (data) => {
        if (config.fileExport) {
          const parser = new j2cp();
          const csv = parser.parse(data);
          try {
            fs.writeFileSync(`./output/${sessionFilename}.csv`, csv);
          } catch(error) {
            console.log("\n");
            if ((config.debugMode>1)&&(error.stack)) console.log(`[file] error.stack =>`,   error.stack);
                                                else console.log(`[file] error.message =>`, error.message);
          }
        } else if (!config.logsRealtime) {
          console.log("\n:: OUTPUT =>\n");
          console.log(data);
          console.log("\n");
        }
        const chkTrail0 = (s) => (s.endsWith('.0')) ? s.split('.0')[0]: s;
        let gap = (config.interDelay) ? config.interDelay : 0;
        if (gap>=60000) {gap=chkTrail0((gap/60000).toFixed(1))+' minute'} else if (gap>=10000) {gap=chkTrail0((gap/1000).toFixed(1))+' second'} else if (gap>0) gap=gap+' millisecond';
        let run = Moment().unix() - sessionMoment.unix();
        if (run>=3600) {run=chkTrail0((run/3600).toFixed(1))+' hours'} else if (run>=60) {run=chkTrail0((run/60).toFixed(1))+' minutes'} else run=run+' seconds';
        console.log(`\n:: ${(config.beEmotional)?(((config.language=='TR')?config.str_GRATITUDE_TR:config.str_GRATITUDE_EN)+' :: '):''}` +
                    `AMAZON-SCRAPER® session ${(config.fileExport)?`saved as 'output/${sessionFilename}.csv' `:''}with ${pageCntr+'/'+asinArr.length} page`+((asinArr.length>1)?'s':'')+' ' +
                    `${(missCntr)?('('+missCntr+' miss) '):''}` +
                    `${(config.interDelay)?('& '+gap+' gaps '):''}has completed in ${run}\n`);
      }
      // wrapUp()

      if (config.interDelay) {

        const output = [];
        async function executeSequential () {
          let processPromises = async () => {
            for (let promise of promises) {
              try {
                const out = await promise;
                output.push(...out);
              } catch(error) {
                if ((config.debugMode>1)&&(error.stack)) console.log(`[main] error.stack =>`,   error.stack);
                                                    else console.log(`[main] error.message =>`, error.message);
              }
            }
          }
          await processPromises();
          wrapUp(output);
        }
        executeSequential();

      } else {

        Promise.all(promises).then(output => wrapUp(output)).catch(error => ErrorMan(error, config, '{EXCP-main/promiseAll}', asin, null));

      }

    } else {
      console.log("Nothing to check for !");
    }
    readline.close();
  });


}
// module.exports()
