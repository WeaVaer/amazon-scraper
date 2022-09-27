
const config = {

  interDelay    : 3142,   // 0 -> all processes run simultaneously (this might cause rejections),  N -> processes run sequentially with N milliseconds in between
  fileExport    : true,   // true -> exports page(s) output as csv file to 'output' directory
  logsRealtime  : true,   // page(s) output is displayed on console :  true -> seperately for each page,  false -> at the end of session if (!fileExport)
  singleRecord  : true,   // false -> include all sellers of the product in a tree view output format (product and seller info on seperate lines),
                          //  true -> include only recommended seller of the product in single line output format (product and seller info on the same line)
  asinInOffer   : true,   // true -> add 'asin' field to the start of the offer fields in the output if (!singleRecord)
  proc_pAnswers : true,   // false -> show 'productAnswers' as is,  true -> numerize 'productAnswers'
  proc_oRatings : true,   // false -> show 'offerRatings' as is,    true -> numerize 'offerRatings'
  proc_oRates   : false,  // false -> show 'offerRates' as is,      true -> numerize 'offerRates'

  beSpiritual   : false,  // true -> use spiritual language in the console logs

  debugMode     : 0,      // console output : 0 -> none, 1 -> brief, 2 -> verbose, 3 -> diagnostics

  str_noSellers : "[NO-SELLERS]",
  str_Error404  : "[NOT-FOUND]",
  moduleVersion : '20220927.0249',
  moduleAuthor  : 'NMYdoc630819'

};

module.exports = config;
