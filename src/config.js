
const config = {

  interDelay_msec     :  3142,  // 0 -> ,  N -> processes run sequentially with N milliseconds in between
  intraDelay_msec     :  1358,  // 0 -> no delay after 'product page fetch' to do 'offers page fetch',     N -> introduce N milliseconds of delay between the product and offers pages
  delayVariance       :    20,  // 0 -> no variance for 'intraDelay_msec' & 'interDelay_msec' during run,  N (max:100) -> introduce random variance (-N% .. +N%) for each page fetch
  skipTheRestIfReject :  true,  // true -> reject the rest of the ASIN input list after receiving error-503
  retryDelay_sec      :   180,  // pause process for N seconds to retry the rejected fetch requests
  maxRuns             :     9,  // maxRuns = (first run of the asin's) + (N-1 retrials if any)
  fileExport          :  true,  // true -> exports the collection of page outputs as csv file to 'output' directory at the end of all runs
  htmlProductExport   :     1,  // exports each product page output as a seperate html file to 'html' directory tagged as 'P'    0 -> never, 1 -> on selector's error, 2 -> always
  htmlOffersExport    :     1,  // exports each offers  page output as a seperate html file to 'html' directory tagged as 'O'    0 -> never, 1 -> on selector's error, 2 -> always
  string_pUPC         :  true,  // false -> scrape 'objProduct.upc' as is,      true -> stringify 'objProduct.upc'
  numeric_pReviews    :  true,  // false -> scrape 'objProduct.reviews' as is,  true -> numerize 'objProduct.reviews'
  numeric_pAnswers    :  true,  // false -> scrape 'objProduct.answers' as is,  true -> numerize 'objProduct.answers'
  numeric_pBSrank     :  true,  // false -> scrape 'objProduct.bsRank'  as is,  true -> numerize 'objProduct.bsRank'
  numeric_sRatings    :  true,  // false -> scrape 'objOffer.ratings'   as is,  true -> numerize 'objOffer.ratings'
  numeric_sOpinion    :  true,  // false -> scrape 'objOffer.opinion'   as is,  true -> numerize 'objOffer.opinion'
  numeric_use1000s    : false,  // use thousands seperator while numerizing  or  not

  debugMode           : 1,      // console output : 0 -> none, 1 -> brief, 2 -> verbose, 3 -> log fetch response, 4 -> log parsed dom

  //testAsinArr        : ['404-IS-BAD','B01GDJ2BH6','B07H4VWNNR','B08L4SLBFN','B009QM9WSY','B00AMGUZ70','B000BI3M60','B00JWSFQW8','B001QJ54W8','B00GFGBAVQ','B0036CNYWK'],
  testAsinArr         : ['B01GDJ2BH6','B07H4VWNNR','B08L4SLBFN','B009QM9WSY','404-IS-BAD','B00JWSFQW8','B001QJ54W8','B00GFGBAVQ','B0036CNYWK'],

  test50AsinArr       : [`B076CRWMBD`,`B00AMGUZ70`,`B00ZVV33XY`,`B01KNILLTM`,`B009VKHI3M`,`B0036CNYWK`,`B01N4S998D`,`B00OBR0QMK`,`B01HDZ4TZG`,`B017ODOUJM`,
                         `B01EYT6TB6`,`B0093J2GM4`,`B001ANS184`,`B06XNP8J4R`,`B00Q5EELFK`,`B006HSREVC`,`B01LMOR7DA`,`B000BI3M60`,`B0732J99GX`,`B0170PGQRI`,
                         `B008BOX5MC`,`B00DW54URO`,`B00266ZSJO`,`B005OOOA4E`,`B00GFGBAVQ`,`B00Z79QBY8`,`B0017U3PZ4`,`B00G9DCNFM`,`B003MX07I2`,`B016SSUI36`,
                         `B01BL49QQM`,`B002NS6ZRY`,`B00V92KMMY`,`B01AVKC5LU`,`B001ANP0T2`,`B00FUO2X06`,`B00FC4A14O`,`B002CTALLA`,`B00HQH55QO`,`B00D7BXU88`,
                         `B011WDV12Y`,`B009QM9WSY`,`B000W68DHE`,`B00BUOLO6Y`,`B00Q0RO7I8`,`B00E4MP3WA`,`B00XWCCSVW`,`B000TVRK44`,`B007AZ3A9Q`,`B003U44842`],

  urlProduct          : "https://www.amazon.com/dp/",
  urlOffers_pfx       : "https://www.amazon.com/gp/aod/ajax/?asin=",
  urlOffers_sfx       : "&m=&smid=&sourcecustomerorglistid=&sourcecustomerorglistasin=&sr=8-5&pc=dp",
  headerFetch         : {
                          'Host'   : "www.amazon.com",
                          'Accept' : "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                          'Pragma' : "no-cache",
                          'TE'     : "trailers",
                          'Author' : "NMYdoc630819",
                          'Referer': "https://google.com",
                          'Upgrade-Insecure-Requests' : 1,
                          'User-Agent' : "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:105.0) Gecko/20100101 Firefox/105.0"
                        },

  str_unknown         : "[UNKNOWN]",     // product page which is missing the 'title'              {written in 'title'}
  str_Error404        : "[NOT-FOUND]",   // product page that does not exist (error-404)           {written in 'title'}
  str_unavailable     : "[UNAVAILABLE]", // product page that has "Currently unavailaale" tag      {written in 'seller'}
  str_needsLogin      : "[NEEDS-LOGIN]", // product page that has a business account login box     {written in 'seller'}
  str_noSellers       : "[NO-SELLERS]",  // product page that does not have the offers page        {written in 'seller'}
  str_rejected        : "[REJECTED]",    // asin.s that gets error-503 (traffic) or error-200 (noResponse) will be retried later
  str_TrafficControl  : "[TRAFFIC-CONTROL]",

  moduleVersion       : '20221004.0400',
  moduleAuthor        : 'NMYdoc630819'

};

module.exports = config;
