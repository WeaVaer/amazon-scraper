
const config = {

  interDelay       : 3142,   // 0 -> all processes run simultaneously (this might cause rejections),  N -> processes run sequentially with N milliseconds in between
  fileExport       : true,   // true -> exports page(s) output as csv file to 'output' directory
  logsRealtime     : true,   // page(s) output is displayed on console :  true -> seperately for each page,  false -> at the end of session if (!fileExport)
  singleRecord     : true,   // false -> include all sellers of the product in a tree view output format (product and seller info on seperate lines),
                             //  true -> include only recommended seller of the product in single line output format (product and seller info on the same line)
  addAsinToOffers  : true,   // true -> add 'asin' field to the start of the offer fields in the output if (!singleRecord)
  numeric_pReviews : true,   // false -> scrape 'objProduct.reviews' as is,  true -> numerize 'objProduct.reviews'
  numeric_pAnswers : true,   // false -> scrape 'objProduct.answers' as is,  true -> numerize 'objProduct.answers'
  numeric_pBSrank  : true,   // false -> scrape 'objProduct.bsRank'  as is,  true -> numerize 'objProduct.bsRank'
  numeric_sRatings : true,   // false -> scrape 'objOffer.ratings'   as is,  true -> numerize 'objOffer.ratings'
  numeric_sOpinion : true,   // false -> scrape 'objOffer.opinion'   as is,  true -> numerize 'objOffer.opinion'
  numeric_use1000s : false,  // use thousands seperator while numerizing  or  not

  beEmotional      : false,  // true -> use emotinal language in the console logs on errors

  debugMode        : 0,      // console output : 0 -> none, 1 -> brief, 2 -> verbose, 3 -> diagnostics

  urlProduct       : "https://www.amazon.com/dp/",
  urlOffers_pfx    : "https://www.amazon.com/gp/aod/ajax/?asin=",
  urlOffers_sfx    : "&m=&smid=&sourcecustomerorglistid=&sourcecustomerorglistasin=&sr=8-5&pc=dp",

  language         : "TR",   // oneOf ['EN', 'TR']
  str_GODWILL_EN   : "GOD WILLING",
  str_GODWILL_TR   : "iNSALLAH",
  str_GRATITUDE_EN : "THANK GOD",
  str_GRATITUDE_TR : "YARABBi SUKUR",

  str_noSellers    : "[NO-SELLERS]",
  str_Error404     : "[NOT-FOUND]",

  moduleVersion    : '20220927.2044',
  moduleAuthor     : 'NMYdoc630819'

};

module.exports = config;
