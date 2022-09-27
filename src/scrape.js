const moment = require("moment");
const cheerio = require("cheerio");
const axios = require("axios");
const j2cp = require("json2csv").Parser;
const fs = require("fs");
const path = require('path');
const config = require(path.resolve(__dirname, "config" ));



module.exports = function() {

  var pageCntr = 0;
  var missCntr = 0;

  async function scrapePage (asin, totalAsins, resolve=null, reject=null) {

    var pageIndex = ++pageCntr;
    var $, errCode, objOffer;
    var objProduct = {asin:'', title:'', scrapeTime:'', answers:'', bsRate:''};
    if (config.singleRecord) {
      objProduct = {...objProduct, ...{price:'', condition:'', seller:'', sellerId:'', shipping:'', ratings:'', rate:'', trace:''}};
    } else {
      objProduct = {...objProduct, ...{trace:''}};
      objOffer   = (config.asinInOffer) ? {productAsin:''} : {};
      objOffer   = {...objOffer, ...{buyBox:'', price:'', condition:'',  seller:'',  sellerId:'', shipping:'', ratings:'', rate:''}};
    }

    const output   = [];

    /* output format per page  ==>  (config.singleRecord) ?

                                       [ {objProduct} ]

                                    else

                                       [
                                         {objProduct},
                                         {objOffer},
                                         ... <- more {objOffer} as necessary
                                       ]
    */

    const showLogIndex = (outObj, processIndex, totAsins) => console.log('<'+processIndex+'/'+totAsins+'>\n\n', outObj, '\n');

    const handleErrors  = (error, logStr, obj=null) => {
      if (error.response) {
        /* The request was made and the server responded with a status code that falls out of the range of 2xx */
        if (config.debugMode) {
          if (config.debugMode>1) {
            console.log(`!! ${logStr} [${asin}] error.response.data =>`,    error.response.data);
            console.log(`!! ${logStr} [${asin}] error.response.headers =>`, error.response.headers);
          }
          console.log(`!! ${logStr} [${asin}] error.response.status =>`, error.response.status);
        }
        errCode = error.response.status;
      } else if (error.request) {
        /* The request was made but no response was received.
           `error.request` is an instance of XMLHttpRequest in the browser and an instance of http.ClientRequest in node.js */
        if (config.debugMode) console.log(`!! ${logStr} [${asin}] error.request =>`, ((config.debugMode>1) ? error.request : "error=200"));
        errCode = 200;
      } else {
        /* Something happened in setting up the request that triggered an Error */
        const createRandomSwear = () => {
          var roll = Math.floor(Math.random()*8); // roll = 0..7
          switch (roll) {
            case 0 : return 'ALLAH KAHRETMESiN EMi ..';
            case 1 : return 'YAPMA BE YAAA !';
            case 2 : return 'BU NE Ki SiMDi ?';
            case 3 : return 'BASLIYACAM SiMDi AMA ..';
            case 4 : return 'HOPPALAAAA !';
            case 5 : return 'ABiCiM NEREDEN CIKTI BU HATA ?';
            case 6 : return 'BANA HATA DiYE GELMEYiN KARDESiM ..';
            case 7 : return 'DE Ki; HATASIZ KUL OLMAZ ..';
          }
        }
        if (config.beSpiritual) console.log('\n!! '+createRandomSwear+'\n');
        if ((config.debugMode>1)&&(error.stack)) console.log(`!! ${logStr} [${asin}] error.stack =>`,   error.stack);
                                            else console.log(`!! ${logStr} [${asin}] error.message =>`, error.message);
        console.log('');
        if (obj) {
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
          obj.trace = (obj.trace) ? (obj.trace+' [:] '+err) : err;
        }
        errCode = 999;
      }
      if ((config.debugMode>1)&&(error.config)) console.log(`!! ${logStr} [${asin}] error.config =>`, error.config);
    }
    // handleErrors()

    try {

      const makePageUrl   = (asin) => `https://www.amazon.com/dp/${asin}`;
      const makeOffersUrl = (asin) => `https://www.amazon.com/gp/aod/ajax/?asin=${asin}&m=&smid=&sourcecustomerorglistid=&sourcecustomerorglistasin=&sr=8-5&pc=dp`;

      const numerize      = (num, asInt) => {
        if ((!num)&&(num!==0)) return num;
        let n = num.replace('(','').replace(')','').replace(/,/g,'').trim();
        if (isNaN(n)) return n;
        n = (asInt) ? parseInt(n) : parseFloat(n);
        return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      }

      const scrapeThing = (el, section, component) => (el) ? el.find(((section)?(section+' '):'') + component) : $(((section)?(section+' '):'') + component);
      // scrapeThing()

      const scrapeProductTitle = (el, obj) => {
        let o = scrapeThing(el, '', '#title_feature_div #productTitle');
        obj.title = (o.length) ? $(o[0]).text().trim() : "???";
        if (!config.logsRealtime) console.log(`[${asin}] title =>`, obj.title);
      }
      // scrapeProductTitle()

      const scrapeProductAnswers = (el, obj) => {
        let o = scrapeThing(el, '', '#askATFLink');
        if (o.length) {
          o = $(o[0]).text().trim().split(' ')[0];
          obj.answers = (config.proc_pAnswers) ? numerize(o, true) : o;
        }
      }
      // scrapeProductAnswers()

      const scrapeProductBSR = (el, obj) => {
        let o = scrapeThing(el, '', '#prodDetails th:contains("Best Sellers Rank") ~ td span span');
        if (o.length) o.each(function() {
          let s = $(this).text().split(' (')[0];
          obj.bsRate = (obj.bsRate) ? (obj.bsRate+' | '+s) : s;
        });
      }
      // scrapeProductBSR()

      const scrapeOfferPrice = (el, obj, pinned) => {
        let o = scrapeThing(el, ((pinned)?'#aod-price-0':'#aod-offer-price'), '.a-offscreen');
        obj.price = (o.length) ? $(o[0]).text().trim() : "";
      }
      // scrapeOfferPrice()

      const scrapeOfferCondition = (el, obj) => {
       let o = scrapeThing(el, '#aod-offer-heading', 'h5');
       obj.condition = (o.length) ? $(o[0]).text().trim().replace("\n","") : "";
       while (obj.condition && obj.condition.includes('  ')) { obj.condition = obj.condition.replace("  "," ");}
      }
      // scrapeOfferCondition()

      const scrapeOfferSellerAndId = (el, obj) => {
        let sellerId = '';
        let seller   = scrapeThing(el, '#aod-offer-soldBy', 'a');
        if (seller.length) {
          /* if the seller is not 'amazon.com' then <href> is provided */
          sellerId = $(seller[0]).attr("href");
          if (sellerId) {
            if (sellerId.includes('seller=')) {
              sellerId = sellerId.split("seller=");
              sellerId = sellerId[1].split("&");
              sellerId = sellerId[0];
            } else {
              sellerId = "AMAZON";
            }
          } else {
            sellerId = "?";
          }
          seller = $(seller[0]).text().trim();
        } else {
          /* if here then the seller should be 'amazon.com' in <span> */
          seller = scrapeThing(el, '#aod-offer-soldBy', 'span.a-color-base');
          if (seller.length) {
            sellerId = "AMAZON";
            seller   = $(seller[0]).text().trim();
          } else {
            /* if here then we couldnt find a seller record */
            seller   = config.str_noSellers;
          }
        }
        obj.seller   = seller;
        obj.sellerId = sellerId;
      }
      // scrapeOfferSellerAndId()

      const scrapeOfferShipping = (el, obj) => {
        if ((obj.seller)&&(obj.seller!='?')&&(obj.seller!=config.str_noSellers)) {
          let o = scrapeThing(el, '#aod-offer-shipsFrom', 'a');
          if (!o.length) 
              o = scrapeThing(el, '#aod-offer-shipsFrom', 'span.a-color-base');
          let s = obj.seller.toLowerCase();
          obj.shipping = (o.length) ? ((($(o[0]).text().trim()==obj.seller)&&(!(s.includes('amazon'))))?'FBM':'FBA') : "?";
        }
      }
      // scrapeOfferShipping()

      const scrapeOfferRatingsAndRate = (el, obj, pinned) => {
        if (obj.sellerId!='AMAZON') {
          let o = scrapeThing(el, '#aod-offer-seller-rating > span > span', '');
          if (o.length) {
            o = $(o[0]).text().trim();
            if (o=='Just launched') {
              obj.ratings = o;
            } else {
              o = o.split(' ratings');
              obj.ratings = (config.proc_oRatings) ? numerize(o[0], true) : o[0].replace("(","");
              o = (o.length>1) ? o[1].trim() : '';
              if (o) {
                if (config.proc_oRates) { // process offer rate as numeric
                  o = o.replace(")","").split(" ");
                  obj.rate = ((o[1]==='positive')?'':'-') + o[0];
                } else { // keep offer rate as is
                  obj.rate = o.replace(")","");
                }
              }
            }
          }
        }
      }
      // scrapeOfferRatingsAndRate()

      const scrapeOffers = (pinned=false) => {
        if (config.singleRecord && (!pinned)) return; // skip offer records other than the recommended if (config.singleRecord)
        let items = scrapeThing(null, '', ((pinned)?'#aod-pinned-offer':'#aod-offer'));
        if (items.length) items.each(function() {
          if (config.singleRecord) {
            scrapeOfferPrice(          $(this), objProduct, pinned);
            scrapeOfferCondition(      $(this), objProduct);
            scrapeOfferSellerAndId(    $(this), objProduct);
            scrapeOfferShipping(       $(this), objProduct);
            scrapeOfferRatingsAndRate( $(this), objProduct, pinned);
          } else {
            var obj = {...objOffer};
            obj.buyBox = (pinned) ? "Y" : "";
            if (config.asinInOffer) obj.productAsin = asin;
            scrapeOfferPrice(          $(this), obj, pinned);
            scrapeOfferCondition(      $(this), obj);
            scrapeOfferSellerAndId(    $(this), obj);
            scrapeOfferShipping(       $(this), obj);
            scrapeOfferRatingsAndRate( $(this), obj, pinned);
            output.push({...obj});
          }

        });
      }
      // scrapeOffers()


     /////////////////////////////////////////////////////////////////////////////////////////////////////////////////


      /* let's do this */

      objProduct.asin       = asin;
      objProduct.scrapeTime = moment().utc().format("YYYY-MM-DD hh:mm:ss:SSS");

      /* fetch from url of the main page */
      axios.get(
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
        $ = cheerio.load(pResp.data);
        if (config.debugMode==3) console.log(`[${asin}] main page ==>`, $);

        /* fill up the main part (objProduct) */
        scrapeProductTitle(   null, objProduct);
        scrapeProductAnswers( null, objProduct);
        scrapeProductBSR(     null, objProduct);
        if (!config.singleRecord) output.push({...objProduct});

        /* fetch from url of the sellers page */

        axios.get(
          makeOffersUrl(asin),
          {
            headers : {
              'Host'   : "www.amazon.com",
              'Accept' : "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
              'Pragma' : "no-cache",
              'TE'     : "trailers",
              'Upgrade-Insecure-Requests' : 1,
              'Author' : "NMYdoc630819",
              'User-Agent' : "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:105.0) Gecko/20100101 Firefox/105.0"
            }
          }
        )
        .then((oResp) => {

          if (config.debugMode==3) console.log(`[${asin}] sellers page fetch response =>`, oResp);

          /* parse response as dom */
          $ = cheerio.load(oResp.data);
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
           handleErrors(error, '{EXCP-offer}', output[0]);
           if (errCode<999) {
             if (config.singleRecord) {
               output[0].seller = (errCode==404) ? config.str_Error404 : `[ERROR-${errCode}]`;
             } else {
               let obj = {...objOffer};
               obj.seller = (errCode==404) ? config.str_Error404 : `[ERROR-${errCode}]`;
               if (config.asinInOffer) obj.productAsin = asin;
               output.push({...obj});
             }
           }
           if (config.logsRealtime) showLogIndex(output, pageIndex, totalAsins);
           if (resolve) resolve(output);
        });

      })
      .catch(function (error) {
         if (!output.length) output.push({...objProduct});
         handleErrors(error, '{EXCP-product}', output[0]);
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
      handleErrors(excp, '{EXCP}', output[0]);
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
    var sessionMoment   = moment();
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

      if (asinArr[0]=='test') {
        //asinArr = ['404-IS-BAD','B01GDJ2BH6','B07H4VWNNR','B08L4SLBFN','B009QM9WSY','B00AMGUZ70'];
        asinArr = ['B01GDJ2BH6'];
        console.log(`:: ${(config.beSpiritual)?'INSALLAH ':''}Testing ${asinArr.length} ASIN${(asinArr.length>1)?'.s':''} =>`, asinArr);
      } else {
        console.log(`:: ${(config.beSpiritual)?'INSALLAH ':''}Processing ${asinArr.length} ASIN${(asinArr.length>1)?'.s':''} ...`);
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
        let run = moment().unix() - sessionMoment.unix();
        if (run>=3600) {run=chkTrail0((run/3600).toFixed(1))+' hours'} else if (run>=60) {run=chkTrail0((run/60).toFixed(1))+' minutes'} else run=run+' seconds';
        console.log(`\n:: ${(config.beSpiritual)?'YARABBI SUKUR :: ':''}` +
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

        Promise.all(promises).then(output => wrapUp(output)).catch(error => handleErrors(error, true));

      }

    } else {
      console.log("Nothing to check for !");
    }
    readline.close();
  });


}
// module.exports()
