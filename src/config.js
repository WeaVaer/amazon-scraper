
const config = {

  fileExport    : true,   // true -> exports output as csv file to 'output' directory
  interDelay    : 3142,   // 0 -> all processes run simultaneously (this might cause rejections),  N -> processes run sequentially with N milliseconds in between
  singleRecord  : true,   // false -> include all sellers,          true -> include only recommended seller
  debugMode     : 0,      // console output : 0 -> none, 1 -> brief, 2 -> verbose, 3 -> diagnostics
  logsRealtime  : true,   // data output is displayed on console : true -> seperately for each process,  false -> at the end of session if (!fileExport)
  proc_pAnswers : true,   // false -> show 'productAnswers' as is,  true -> numerize 'productAnswers'
  proc_oRatings : true,   // false -> show 'offerRatings' as is,    true -> numerize 'offerRatings'
  proc_oRates   : false,   // false -> show 'offerRates' as is,      true -> numerize 'offerRates'
  asinInOffer   : true,   // true -> add 'asin' to the offer objects in output if (!singleRecord)

  beSpiritual   : false,  // true -> use spiritual language in the console logs

  str_noSellers : "[NO-SELLERS]",

  moduleVersion : '20220926.1347',
  moduleAuthor  : 'NMYdoc630819'

};

module.exports = config;
