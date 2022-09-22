const moment = require("moment");
const cheerio = require("cheerio");
const axios = require("axios");
const j2cp = require("json2csv").Parser;
const fs = require("fs");

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout,
});

const getItemUrl = (itemId) => `https://www.amazon.com/dp/${itemId}`;
//const getAltsUrl = (itemId) => `https://www.amazon.com/gp/aod/ajax/ref=dp_aod_ALL_mbc?asin=${itemId}&m=&qid=1618419581&smid=&sourcecustomerorglistid=&sourcecustomerorglistitemid=&sr=8-5&pc=dp`;
const getAltsUrl = (itemId) => `https://www.amazon.com/gp/aod/ajax/?asin=${itemId}&m=&smid=&sourcecustomerorglistid=&sourcecustomerorglistitemid=&sr=8-5&pc=dp`;

var idArr = []; // array of ASINs to chk




async function getData (itemId) {

  try {

    var errCode, slctr, subSlctr, gotcha, resp, title, scraped, price, seller, sellerId, cond;
    const output = [];

    const getSellerAndSellerId = (el, slctr="") => {
      let slc = (slctr) ? (slctr+" ") : "";
      seller = el.find(slc+"a"); // if the seller is not 'amazon.com' then a href is provided
      if (seller.length) {
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
        // if here then the seller should be 'amazon.com'
        seller = el.find(slc+"span.a-color-base");
        if (seller.length) {
          sellerId = '0'; // amazon.com
          seller   = $(seller[0]).text().trim();
        } else {
          sellerId = "?";
          seller   = "?";
        }
      }
    }
    // getSellerAndSellerId

    const handleErrors = (error, isExcp=false) => {
      if (error.response) {
        // The request was made and the server responded with a status code that falls out of the range of 2xx
        if (isExcp) {
          console.log("error.response.data =>", error.response.data);
          console.log("error.response.status =>", error.response.status);
          console.log("error.response.headers =>", error.response.headers);
        }
        errCode = error.response.status;
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of http.ClientRequest in node.js
        if (isExcp) {
          console.log("error.request =>", error.request);
        }
        errCode = 200;
      } else {
        // Something happened in setting up the request that triggered an Error
        if (isExcp) {
          console.log("error.message =>", error.message);
        }
        errCode = 999;
      }
      if (isExcp) {
        console.log("error.config =>", error.config);
      }
    }
    // handleErrors


    scraped = moment().utc().format("YYYY-MM-DD hh:mm:ss");
    //console.log("time ==>", scrapeTime.format('MMMM Do YYYY, h:mm:ss a')+" UTC");

    //console.log("id ====>", `[${itemId}]`);

    //console.log("url ===>", getItemUrl(itemId));
    errCode = 0;
    resp = await axios.get(
      getItemUrl(itemId),
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
      title = (errCode==404) ? "NOT FOUND" : ("ERROR : "+errCode);
      output.push({scraped, itemId, title});
      console.log(output);
      return;
    } else {
      //console.log("resp =>", resp);
    }

    var $ = cheerio.load(resp.data);
    //console.log("page ==>", $);

    slctr = "#title_feature_div #productTitle";
    title = $(slctr);
    gotcha = (title.length>0);
    title = (gotcha) ? $(title[0]).text().trim() : "NOT FOUND";
    //console.log("title =>", title);
    output.push({scraped, itemId, title});

    if (gotcha) {

      slctr = "#olpLinkWidget_feature_div";
      var altsWidget = $(slctr);
      if (!altsWidget.length) { // !! it seems that for pages where the applet is not showing, we can still access it; thus execution never comes here

        // no sellers applet, get price from main page
        slctr = "#corePriceDisplay_desktop_feature_div .a-price.priceToPay";
        price = $(slctr);
        if (price.length<1) {
          price = "section not found ["+slctr+"]";
        } else {
          subSlctr = ".a-offscreen";
          price = $(price[0]).find(subSlctr);
          price = (price.length<1) ? ("not found [("+slctr+")[0] "+subSlctr+"]") : $(price[0]).text();
        }
        getSellerAndSellerId($("#bylineInfo_feature_div"));
        cond = "main";
        output.push({cond, price, seller, sellerId});

      } else {

        // get sellers and prices from the applet page
        errCode = 0;
        resp = await axios.get(
          getAltsUrl(itemId),
          {
            headers : {
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
          cond = "";
          price = "";
          seller = (errCode==404) ? "NOT FOUND" : ("ERROR : "+errCode);
          sellerId = "";
          output.push({cond, price, seller, sellerId});
          console.log(output);
          return;
        } else {
          //console.log("resp =>", resp);
        }

        $ = cheerio.load(resp.data);
        //console.log("page ==>", $);

        // first get the pinned offer
        var items = $("#aod-pinned-offer");
        if (items.length) {
          price  = $(items[0]).find("#aod-price-0 .a-offscreen").text() || "$?";
          getSellerAndSellerId($(items[0]), "#aod-offer-soldBy");
          cond = "pinned";
          output.push({cond, price, seller, sellerId});
        }

        // then get the rest of the offers
        items = $("#aod-offer");
        if (items.length) {
          items.each(function(){
            price  = $(this).find("#aod-offer-price .a-offscreen").text() || "$?";
            getSellerAndSellerId($(this), "#aod-offer-soldBy");
            cond = ($(this).find("h5").text().trim() || "cond?").replace("\n","");
            while (cond && cond.includes("  ")) { cond = cond.replace("  "," ");}
            output.push({cond, price, seller, sellerId});
          });
        }

      } // if (!altsWidget.length) { .. } else ..

      console.log(output);
      const parser = new j2cp();
      const csv = parser.parse(output);
      fs.writeFileSync(`./output/${itemId}.csv`, csv);

    } // if (gotcha) { ..

  }
  catch(excp) {
    handleErrors(excp, true);
  }

}
// getData()


// initialize

readline.question(`Enter itemId's seperated by comma (or enter 'test') : `, (ids) => {
  console.log(" ");
  idArr = ids.split(',');
  if ((idArr.length>0)&&(idArr[0])) {
    if (idArr[0]=='test') {
      idArr = ['B01GDJ2BH6','B07H4VWNNR','B08L4SLBFN','4040404040'];
      console.log("# TESTING #   id.s =>", idArr, "\n");
    }
    idArr.forEach(el => getData(el));
  } else {
   console.log("Nothing to check for !");
  }
  readline.close();
});
