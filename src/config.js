
const config = {

  intraDelay_msec  : 3142,   // 0 -> no delay after 'product page fetch' to do 'offers page fetch',   N -> introduce N milliseconds between the two
  interDelay_msec  : 3142,   // 0 -> all processes run simultaneously (this might cause rejections),  N -> processes run sequentially with N milliseconds in between
  retryDelay_sec   :   60,   // delay process for N seconds to retry the rejected fetch requests
  maxRuns          :    4,   // maxRuns = (first run of the asin's) + (N-1 retrials if any)
  fileExport       : true,   // true -> exports page(s) output as csv file to 'output' directory
  logsRealtime     : true,   // page(s) output is displayed on console :  true -> seperately for each page,  false -> at the end of session if (!fileExport)
  singleRecord     : true,   // false -> include all sellers of the product in a tree view output format (product and seller info on seperate lines),
                             //  true -> include only recommended seller of the product in single line output format (product and seller info on the same line)
  addAsinToOffers  : true,   // true -> add 'asin' field to the start of the offer fields in the output if (!singleRecord)
  string_pUPC      : true,   // false -> scrape 'objProduct.upc' as is,      true -> stringify 'objProduct.upc'
  numeric_pReviews : true,   // false -> scrape 'objProduct.reviews' as is,  true -> numerize 'objProduct.reviews'
  numeric_pAnswers : true,   // false -> scrape 'objProduct.answers' as is,  true -> numerize 'objProduct.answers'
  numeric_pBSrank  : true,   // false -> scrape 'objProduct.bsRank'  as is,  true -> numerize 'objProduct.bsRank'
  numeric_sRatings : true,   // false -> scrape 'objOffer.ratings'   as is,  true -> numerize 'objOffer.ratings'
  numeric_sOpinion : true,   // false -> scrape 'objOffer.opinion'   as is,  true -> numerize 'objOffer.opinion'
  numeric_use1000s : false,  // use thousands seperator while numerizing  or  not

  beEmotional      : false,  // true -> use emotinal language in the console logs on errors

  debugMode        : 1,      // console output : 0 -> none, 1 -> brief, 2 -> verbose, 3 -> diagnostics
  testAsinArr      : ['404-IS-BAD','B01GDJ2BH6','B07H4VWNNR','B08L4SLBFN','B009QM9WSY','B00AMGUZ70','B000BI3M60','B00JWSFQW8','B001QJ54W8'],
  //testAsinArr      : ['404-IS-BAD'],
  //testAsinArr      : ['B00JWSFQW8'],

  urlProduct       : "https://www.amazon.com/dp/",
  urlOffers_pfx    : "https://www.amazon.com/gp/aod/ajax/?asin=",
  urlOffers_sfx    : "&m=&smid=&sourcecustomerorglistid=&sourcecustomerorglistasin=&sr=8-5&pc=dp",
  headerFetch      : {
                       'Host'   : "www.amazon.com",
                       'Accept' : "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                       'Pragma' : "no-cache",
                       'TE'     : "trailers",
                       'Author' : "NMYdoc630819",
                       'Referer': "https://google.com",
                       'Upgrade-Insecure-Requests' : 1,
                       'User-Agent' : "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:105.0) Gecko/20100101 Firefox/105.0"
                     },

  language         : "TR",   // oneOf ['EN', 'TR']
  str_GODWILL_EN   : "GOD WILLING",
  str_GODWILL_TR   : "iNSALLAH",
  str_GRATITUDE_EN : "THANK GOD",
  str_GRATITUDE_TR : "YARABBi SUKUR",
  str_UNFORTUNE_EN : "UNFORTUNATELY",
  str_UNFORTUNE_TR : "MAALESEF",

  str_noSellers    : "[NO-SELLERS]",
  str_unavailable  : "[UNAVAILABLE]",
  str_Error404     : "[NOT-FOUND]",
  str_rejected     : "[REJECTED]",

  moduleVersion    : '20220929.0700',
  moduleAuthor     : 'NMYdoc630819'

};

module.exports = config;
