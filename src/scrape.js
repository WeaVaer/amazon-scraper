const moment = require("moment");
const cheerio = require("cheerio");
const axios = require("axios");
const j2cp = require("json2csv").Parser;
const fs = require("fs");


module.exports = function() {

  const fileExport = true;  // true -> exports output as csv file to 'output' directory
  const iDelay     = 3141;  // 0 -> all processes run simultaneously; N -> processes run sequentially with N milliseconds in between
  const realTime   = true;  // true -> output is displayed seperately for each process
  const DBG        = 0;     // 0 -> none, 1 -> brief, 2 -> verbose, 3 -> diagnostics

  async function scrapePage (asin, resolve=null, reject=null) {

    var errCode = 0;

    const makePageUrl    = (asin) => `https://www.amazon.com/dp/${asin}`;
    const makeSellersUrl = (asin) => `https://www.amazon.com/gp/aod/ajax/?asin=${asin}&m=&smid=&sourcecustomerorglistid=&sourcecustomerorglistasin=&sr=8-5&pc=dp`;

    const handleErrors = (error, isExcp=false) => {
      if (error.response) {
        /* The request was made and the server responded with a status code that falls out of the range of 2xx */
        if (DBG) {
          if (DBG>1) {
            console.log(`[${asin}] error.response.data =>`,    error.response.data);
            console.log(`[${asin}] error.response.headers =>`, error.response.headers);
          }
          console.log(`[${asin}] error.response.status =>`,  error.response.status);
        }
        errCode = error.response.status;
      } else if (error.request) {
        /* The request was made but no response was received
           `error.request` is an instance of XMLHttpRequest in the browser and an instance of http.ClientRequest in node.js */
        if (DBG) console.log(`[${asin}] error.request =>`, ((DBG>1) ? error.request : "error=200"));
        errCode = 200;
      } else {
        /* Something happened in setting up the request that triggered an Error */
        if ((isExcp||(DBG>1))&&(error.stack)) console.log(`[${asin}] error.stack =>`, error.stack);
                                         else console.log(`[${asin}] error.message =>`, error.message);
        errCode = 999;
      }
      if (isExcp && error.config) console.log(`[${asin}] error.config =>`, error.config);
    }
    // handleErrors()

    try {

      var $, resp;
      var objProduct = {scrapeTime:0, asin:'', title:'', pRatings:'', bsRate:'', answers:''};
      var objOffer   = {buyBox:'', condition:'', price:'', seller:'', sellerId:'', shipping:'', ratings:'', rate:''};
      const output   = [];
      /* output format : [
                          {scrapeTime, asin, title, pRatings, bsRate, answers},                     <= objProduct
                          {buyBox, condition, price, seller, sellerId, shipping, ratings, rate},    <= objOffer
                          ...                                                                       <= more objOffer ...
                        ]
      */

      const scrapeThing = (el, section, component) => (el) ? el.find(((section)?(section+' '):'') + component) : $(((section)?(section+' '):'') + component);
      // scrapeThing()

      /* -- main object parts (product) -- */

      const scrapeProductTitle = (el, obj) => {
        let o = scrapeThing(el, '#title_feature_div', '#productTitle');
        obj.title = (o.length) ? $(o[0]).text().trim() : "NOT FOUND";
        if (!realTime) console.log(`[${asin}] title =>`, obj.title);
      }
      // scrapeProductTitle()

      const scrapeProductRatings = (el, obj) => {
        let o = scrapeThing(el, '', '#productRatings');
        obj.pRatings = (o.length) ? $(o[0]).text().trim() : "";
      }
      // scrapeProductRatings()

      const scrapeProductBSR = (el, obj) => {
        let o = scrapeThing(el, '', '#productBsr');
        obj.bsRate = (o.length) ? $(o[0]).text().trim() : "";
      }
      // scrapeProductBSR()

      const scrapeProductAnswers = (el, obj) => {
        let o = scrapeThing(el, '', '#productAnswers');
        obj.answers = (o.length) ? $(o[0]).text().trim() : "";
      }
      // scrapeProductAnswers()

      /* -- seller object parts (offers) -- */

      const scrapeOfferCondition = (el, obj, pinned) => {
       let o = scrapeThing(el, '', 'h5');
       obj.condition = (o.length) ? $(o[0]).text().trim().replace("\n","") : "";
       while (obj.condition && obj.condition.includes('  ')) { obj.condition = obj.condition.replace("  "," ");}
      }
      // scrapeOfferCondition()

      const scrapeOfferPrice = (el, obj, pinned) => {
        let o = scrapeThing(el, ((pinned)?'#aod-price-0':'#aod-offer-price'), '.a-offscreen');
        obj.price = (o.length) ? $(o[0]).text().trim() : "";
      }
      // scrapeOfferPrice()

      const scrapeOfferSellerAndId = (el, obj, pinned) => {
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
              sellerId = "AMZ";
            }
          } else {
            sellerId = "?";
          }
          seller = $(seller[0]).text().trim();
        } else {
          /* if here then the seller should be 'amazon.com' in <span> */
          seller = scrapeThing(el, '#aod-offer-soldBy', 'span.a-color-base');
          if (seller.length) {
            sellerId = '0'; // amazon.com
            seller   = $(seller[0]).text().trim();
          } else {
            sellerId = "?";
            seller   = "?";
          }
        }
        obj.seller   = seller;
        obj.sellerId = sellerId;
      }
      // scrapeOfferSellerAndId()

      const scrapeOfferShipping = (el, obj, pinned) => {
        let o = scrapeThing(el, '', '.XXX');
        obj.shipping = (o.length) ? ((($(o[0]).text().trim()==obj.seller)&&(obj.seller.toLowerCase().excludes('amazon')))?'FBM':'FBA') : "?";
      }
      // scrapeOfferShipping()

      const scrapeOfferRatings = (el, obj, pinned) => {
        let o = scrapeThing(el, '', '.XXX');
        obj.ratings = (o.length) ? $(o[0]).text().trim() : "";
      }
      // scrapeOfferRatings()

      const scrapeOfferRate = (el, obj, pinned) => {
        let o = scrapeThing(el, '', '.XXX');
        obj.rate = (o.length) ? $(o[0]).text().trim() : "";
      }
      // scrapeOfferRate()

      const scrapeOffers = (pinned=false) => {
        let items = scrapeThing(null, '', ((pinned)?'#aod-pinned-offer':'#aod-offer'));
        if (items.length) items.each(function() {
          let obj = {...objOffer};
          obj.buyBox = (pinned) ? "Y" : "";
          scrapeOfferPrice(       $(this), obj, pinned);
          scrapeOfferCondition(   $(this), obj);
          scrapeOfferSellerAndId( $(this), obj);
          scrapeOfferShipping(    $(this), obj);
          scrapeOfferRatings(     $(this), obj);
          scrapeOfferRate(        $(this), obj);
          output.push({...obj});
        });
      }
      // scrapeOffers()


     /////////////////////////////////////////////////////////////////////////////////////////////////////////////////


      /* let's do this */

      objProduct.asin       = asin;
      objProduct.scrapeTime = moment().utc().format("YYYY-MM-DD hh:mm:ss:SSS");

      /* fetch from url of the main page */
      errCode = 0;
      resp = await axios.get(
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
      .catch(function (error) {
        handleErrors(error);
      });
      if (errCode) {
        objProduct.title = (errCode==404) ? "NOT FOUND" : ("ERROR:"+errCode);
        if (!realTime) console.log(`[${asin}] title =>`, objProduct.title);
        output.push({...objProduct});
        if (realTime) console.log(output, '\n');
        if (resolve) resolve(output);
        return;
      } else {
        if (DBG==3) console.log(`[${asin}] main page fetch response =>`, resp);
      }

      /* parse response as dom */
      $ = cheerio.load(resp.data);
      if (DBG==3) console.log(`[${asin}] main page ==>`, $);

      /* fill up the main part (objProduct) */
      scrapeProductTitle(   null, objProduct);
      scrapeProductRatings( null, objProduct);
      scrapeProductBSR(     null, objProduct);
      scrapeProductAnswers( null, objProduct);
      output.push({...objProduct});

      /* fetch from url of the sellers page */

      errCode = 0;
      resp = await axios.get(
        makeSellersUrl(asin),
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
      .catch(function (error) {
        handleErrors(error);
      });
      if (errCode) {
        obj = {...objOffer};
        obj.seller = (errCode==404) ? "NOT FOUND" : ("ERROR : "+errCode);
        output.push({...obj});
        if (realTime) console.log(output, '\n');
        if (resolve) resolve(output);
        return;
      } else {
        if (DBG==3) console.log(`[${asin}] sellers page fetch response =>`, resp);
      }

      /* parse response as dom */
      $ = cheerio.load(resp.data);
      if (DBG==3) console.log(`[${asin}] sellers page ==>`, $);

      /* scrape and fill up the seller information (might be multiple objOffer's ) */
      scrapeOffers(true);  // first get the recommended offer on top
      scrapeOffers(false); // then get the rest of the offers

      /* that's it for this ASIN */
      if (resolve) resolve(output);
      if (realTime) console.log(output, '\n');
      return;

    }
    catch(excp) {
      handleErrors(excp, true);
    }

  }
  // scrapePage()








  /* -- INITIALIZE -- */

  const readline = require('readline').createInterface({
    input:  process.stdin,
    output: process.stdout,
  });

  readline.question(`Enter ASINs seperated by comma (or enter 'test') : `, (ids) => {

    console.log(" ");
    var sessionMoment   = moment();
    var sessionFilename = sessionMoment.utc().format("YYYY-MM-DD_hh-mm-ss-SSS");

    var idsx = ids.trim().replace(/ /g, '');
    var asinArr = idsx.split(',');

    if ((asinArr.length>0)&&(asinArr[0])) {

      if (asinArr[0]=='test') {
        asinArr = ['B01GDJ2BH6','B07H4VWNNR','B08L4SLBFN','4040404040'];
        console.log(":: TESTING ::   id.s =>", asinArr);
      }
      console.log(" ");

      const promises = [];
      var   prmsCntr = 0;
      asinArr.forEach(thisAsin => {
        promises.push(new Promise((resolve, reject) => {setTimeout(function(){scrapePage(thisAsin, resolve, reject)},((iDelay*prmsCntr)+1))}));
        prmsCntr++;
      });

      const wrapUp = (data) => {
        if (fileExport) {
          const parser = new j2cp();
          const csv = parser.parse(data);
          try {
            fs.writeFileSync(`./output/${sessionFilename}.csv`, csv);
          } catch(error) {
            console.log(" ");
            if ((DBG>1)&&(error.stack)) console.log(`[file] error.stack =>`, error.stack);
                                   else console.log(`[file] error.message =>`, error.message);
          }
        } else if (!realTime) {
          console.log("\n:: OUTPUT =>");
          console.log(data);
          console.log(" ");
        }
        console.log(`:: Scraping session ${(fileExport)?`saved as 'output/${sessionFilename}.csv' `:''}with ${data.length} items ${(iDelay)?('& '+(iDelay+1)+' msec. gaps '):''}has completed in ${moment().unix()-sessionMoment.unix()} seconds\n`);
        console.log(" ");
      }
      // wrapUp()

      if (iDelay) {

        const output = [];
        async function executeSequential () {
          let processPromises = async () => {
            for (let promise of promises) {
              try {
                const out = await promise;
                output.push([...out]);
              } catch(error) {
                if ((DBG>1)&&(error.stack)) console.log(`[main] error.stack =>`, error.stack);
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
