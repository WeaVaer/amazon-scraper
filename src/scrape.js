const moment = require("moment");
const cheerio = require("cheerio");
const axios = require("axios");
const j2cp = require("json2csv").Parser;
const fs = require("fs");


module.exports = function() {

  const fileExport = true;  // true -> exports output as csv file to 'output' directory
  const iDelay     = 1400;//3142;  // 0 -> all processes run simultaneously; N -> processes run sequentially with N milliseconds in between
  const realTime   = true;  // true -> output is displayed seperately for each process
  const DBG        = 0;     // 0 -> none, 1 -> brief, 2 -> verbose, 3 -> diagnostics
  const mdVersion  = '20220925.0430';

  async function scrapePage (asin, resolve=null, reject=null) {

    var errCode = 0;

    var $, resp;
    var objProduct = {asin:'',   title:'', scrapeTime:'', answers:'', bsRate:''};
    var objOffer   = {buyBox:'', price:'', condition:'',  seller:'',  sellerId:'', shipping:'', ratings:'', rate:''};
    const output   = [];
    /* output format : [
                        {asin, title, scrapeTime, answers, bsRate},                               <= objProduct
                        {buyBox, price, condition, seller, sellerId, shipping, ratings, rate},    <= objOffer
                        ...                                                                       <= more objOffer ...
                       ]
    */
    const makePageUrl   = (asin) => `https://www.amazon.com/dp/${asin}`;
    const makeOffersUrl = (asin) => `https://www.amazon.com/gp/aod/ajax/?asin=${asin}&m=&smid=&sourcecustomerorglistid=&sourcecustomerorglistasin=&sr=8-5&pc=dp`;

    const numerize      = (num) => (num) ? parseInt(num.replace("(","").replace(")","").replace(/,/g,"").trim()) : '';

    const handleErrors  = (error, isExcp=false) => {
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
        /* The request was made but no response was received.
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

      const scrapeThing = (el, section, component) => (el) ? el.find(((section)?(section+' '):'') + component) : $(((section)?(section+' '):'') + component);
      // scrapeThing()

      /* -- main object parts (product) -- */

      const scrapeProductTitle = (el, obj) => {
        let o = scrapeThing(el, '', '#title_feature_div #productTitle');
        obj.title = (o.length) ? $(o[0]).text().trim() : "NOT FOUND";
        if (!realTime) console.log(`[${asin}] title =>`, obj.title);
      }
      // scrapeProductTitle()

      const scrapeProductAnswers = (el, obj) => {
        let o = scrapeThing(el, '', '#askATFLink');
        obj.answers = (o.length) ? numerize($(o[0]).text()) : "";
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


      /* -- seller object parts (offers) -- */

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
            sellerId = "?";
            seller   = "?";
          }
        }
        obj.seller   = seller;
        obj.sellerId = sellerId;
      }
      // scrapeOfferSellerAndId()

      const scrapeOfferShipping = (el, obj) => {
        let o = scrapeThing(el, '#aod-offer-shipsFrom', 'a');
        if (!o.length) o = scrapeThing(el, '#aod-offer-shipsFrom', 'span.a-color-base');
        let s = (obj.seller || "").toLowerCase();
        obj.shipping = (o.length) ? ((($(o[0]).text().trim()==s)&&(s.excludes('amazon')))?'FBM':'FBA') : "?";
      }
      // scrapeOfferShipping()

      const scrapeOfferRatingsAndRate = (el, obj, pinned) => {
        if (obj.sellerId!='AMAZON') {
          let o = (pinned) ? scrapeThing(el, '', '#aod-asin-reviews-count-title')    // '35 ratings'
                           : scrapeThing(el, '#aod-offer-seller-rating > span > span', ''); // '(35 ratings)<br>65% positive over last 12 months'
          if (o.length) {

            o = $(o[0]).text().split(' ratings');
            obj.ratings = numerize(o[0]);
            o = (o.length>1) ? o[1].trim() : '';
            if (o) {
              o = o.replace(")","").split(" ");
              obj.rate = ((o[1]==='positive')?'':'-') + o[0];
            }
          }
        }
      }
      // scrapeOfferRatings()

      const scrapeOfferRate = (el, obj) => {
        let o = scrapeThing(el, '', '.XXX');
        obj.rate = (o.length) ? $(o[0]).text().trim() : "";
      }
      // scrapeOfferRate()

      const scrapeOffers = (pinned=false) => {
        let items = scrapeThing(null, '', ((pinned)?'#aod-pinned-offer':'#aod-offer'));
        if (items.length) items.each(function() {
          let obj = {...objOffer};
          obj.buyBox = (pinned) ? "Y" : "";
          scrapeOfferPrice(          $(this), obj, pinned);
          scrapeOfferCondition(      $(this), obj);
          scrapeOfferSellerAndId(    $(this), obj);
          scrapeOfferShipping(       $(this), obj);
          scrapeOfferRatingsAndRate( $(this), obj, pinned);
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
      scrapeProductAnswers( null, objProduct);
      scrapeProductBSR(     null, objProduct);
      output.push({...objProduct});

      /* fetch from url of the sellers page */

      errCode = 0;
      resp = await axios.get(
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

  readline.question(`AMAZON-SCRAPER v.${mdVersion} by NMYdoc630819\n\n:: Enter ASINs seperated by comma (or enter 'test') : `, (ids) => {

    console.log(" ");
    var sessionMoment   = moment();
    var sessionFilename = sessionMoment.utc().format("YYYY-MM-DD_hh-mm-ss-SSS");

    var idsx = ids.trim().replace(/ /g, '');
    var asinArr = idsx.split(',');

    if ((asinArr.length)&&(asinArr[0])) {

      if (asinArr[0]=='test') {
        asinArr = ['B01GDJ2BH6','B07H4VWNNR','B08L4SLBFN','404-IS-BAD'];
        console.log(":: TESTING ASIN.s =>", asinArr);
      }
      console.log(" ");

      const promises = [];
      var   prmsCntr = 0;
      asinArr.forEach(thisAsin => {
        promises.push(new Promise((resolve, reject) => {setTimeout(function(){scrapePage(thisAsin, resolve, reject)},((iDelay*prmsCntr)?(iDelay*prmsCntr):314))}));
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
          console.log("\n:: OUTPUT =>\n");
          console.log(data);
          console.log(" ");
        }
        let gap = (iDelay) ? iDelay : 0;
        if (gap>=60000) {gap=(gap/60000)+' minute'} else if (gap>=1000) {gap=(gap/1000)+' second'} else if (gap>0) gap=gap+' millisecond';
        let run = moment().unix() - sessionMoment.unix();
        if (run>=3600) {run=(run/3600)+' hours'} else if (run>=60) {run=(run/60)+' minutes'} else run=run+' seconds';
        console.log(`\n:: Amazon-Scraping session ${(fileExport)?`saved as 'output/${sessionFilename}.csv' `:''}with ${data.length} items `+
                    `${(iDelay)?('& '+gap+' gaps '):''}has completed in ${run}\n`);
      }
      // wrapUp()

      if (iDelay) {

        const output = [];
        async function executeSequential () {
          let processPromises = async () => {
            for (let promise of promises) {
              try {
                const out = await promise;
                output.push(...out);
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
