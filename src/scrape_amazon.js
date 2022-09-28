
class scrape_amazon {

  constructor (config, asin) {
    this.config = config;
    this.asin   = asin;
  }

  numerize (num, asNumeric) {
    if ((!num)&&(num!==0)) return num;
    let n = (num+'').trim().replace(/ /g,'').replace('#','').replace('(','').replace(')','').replace(/,/g,'');
    if (isNaN(n)) return n;
    n = (asNumeric) ? parseInt(n) : parseFloat(n);
    return (this.config.numeric_use1000s) ? n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : n;
  }

  scrapeThing ($, el, section, component) {
    return (el) ? el.find(((section)?(section+' '):'') + component) : $(((section)?(section+' '):'') + component);
  }
  // scrapeThing()

  scrapeProduct_Title ($, obj) {
    let o = this.scrapeThing($, null, '', '#title_feature_div #productTitle');
    obj.title = (o.length) ? $(o[0]).text().trim() : "???";
    if (!this.config.logsRealtime) console.log(`[${this.asin}] title =>`, obj.title);
  }
  // scrapeProduct_Title()

  scrapeProduct_Reviews ($, obj) {
    let o = this.scrapeThing($, null, '', '#acrCustomerReviewLink');
    if (o.length) {
      o = $(o[0]).text().trim().split(' ')[0];
      obj.reviews = (this.config.numeric_pReviews) ? this.numerize(o, true) : o;
    }
  }
  // scrapeProduct_Reviews()

  scrapeProduct_Answers ($, obj) {
    let o = this.scrapeThing($, null, '', '#askATFLink');
    if (o.length) {
      o = $(o[0]).text().trim().split(' ')[0];
      obj.answers = (this.config.numeric_pAnswers) ? this.numerize(o, true) : o;
    }
  }
  // scrapeProduct_Answers()

  scrapeProduct_bsRankAndCat ($, obj) {
    let o = this.scrapeThing($, null, '', '#prodDetails th:contains("Best Sellers Rank") ~ td span span');
    if (!o.length)
        o = this.scrapeThing($, null, '', '#detailBulletsWrapper_feature_div ul li span:contains("Best Sellers Rank")');
    if (o.length) {
      o = $(o[0]).text().replace(/\n/g,'').split(' (')[0].split(' in ');
      if (o[0].includes(':')) o[0] = o[0].split(':')[1].trim();
      obj.bsRank = (this.config.numeric_pBSrank) ? this.numerize(o[0], true) : o[0];
      obj.bsCat  = o[1];
    };
  }
  // scrapeProduct_bsRankAndCat()

  scrapeProduct_UPC ($, obj) {
    let o = this.scrapeThing($, null, '', '#prodDetails th:contains("UPC") ~ td span span');
    if (!o.length)
        o = this.scrapeThing($, null, '', '#detailBulletsWrapper_feature_div ul li span:contains("UPC")');
    if (o.length) {
      o = $(o[0]).text().replace(/\n/g,'').trim();
      if (o.includes(':')) o = o.split(':')[1];
      obj.upc = o.replace(/[^a-z0-9]/gi, '');
    };
  }
  // scrapeProduct_UPC()

  scrapeOffer_Price ($, el, obj, pinned) {
    let o = this.scrapeThing($, el, ((pinned)?'#aod-price-0':'#aod-offer-price'), '.a-offscreen');
    obj.price = (o.length) ? $(o[0]).text().trim() : "";
  }
  // scrapeOffer_Price()

  scrapeOffer_Condition ($, el, obj) {
   let o = this.scrapeThing($, el, '#aod-offer-heading', 'h5');
   obj.condition = (o.length) ? $(o[0]).text().trim().replace("\n","") : "";
   while (obj.condition && obj.condition.includes('  ')) { obj.condition = obj.condition.replace("  "," ");}
  }
  // scrapeOffer_Condition()

  scrapeOffer_SellerAndSellerId ($, el, obj) {
    let sellerId = '';
    let seller   = this.scrapeThing($, el, '#aod-offer-soldBy', 'a');
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
      seller = this.scrapeThing($, el, '#aod-offer-soldBy', 'span.a-color-base');
      if (seller.length) {
        sellerId = "AMAZON";
        seller   = $(seller[0]).text().trim();
      } else {
        /* if here then we couldnt find a seller record */
        seller   = this.config.str_noSellers;
      }
    }
    obj.seller   = seller;
    obj.sellerId = sellerId;
  }
  // scrapeOffer_SellerAndSellerId()

  scrapeOffer_Shipping ($, el, obj) {
    if ((obj.seller)&&(obj.seller!='?')&&(obj.seller!=this.config.str_noSellers)) {
      let o = this.scrapeThing($, el, '#aod-offer-shipsFrom', 'a');
      if (!o.length)
          o = this.scrapeThing($, el, '#aod-offer-shipsFrom', 'span.a-color-base');
      let s = obj.seller.toLowerCase();
      obj.shipping = (o.length) ? ((($(o[0]).text().trim()==obj.seller)&&(!(s.includes('amazon'))))?'FBM':'FBA') : "?";
    }
  }
  // scrapeOffer_Shipping()

  scrapeOffer_RatingsAndOpinion ($, el, obj) {
    if (obj.sellerId!='AMAZON') {
      let o = this.scrapeThing($, el, '#aod-offer-seller-rating > span > span', '');
      if (o.length) {
        o = $(o[0]).text().trim();
        if (o=='Just launched') {
          obj.ratings = '';
          obj.opinion = o;
        } else {
          o = o.split(' ratings');
          obj.ratings = (this.config.numeric_sRatings) ? this.numerize(o[0], true) : o[0].replace("(","");
          o = (o.length>1) ? o[1].trim() : '';
          if (o) {
            if (this.config.numeric_sOpinion) { // process offer rate as numeric
              o = o.replace(")","").split(" ");
              obj.opinion = ((o[1]==='positive')?'+':'-') + o[0];
            } else { // keep offer rate as is
              obj.opinion = o.replace(")","");
            }
          }
        }
      }
    }
  }
  // scrapeOffer_RatingsAndOpinion()

}
// class scrape_amazon{}

module.exports = scrape_amazon;
