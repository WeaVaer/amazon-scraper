
const strings = {

  language         : "TR",   // oneOf ['EN', 'TR']
  str_GODWILL_EN   : "GOD WILLING",
  str_GODWILL_TR   : "iNSALLAH",
  str_GRATITUDE_EN : "THANK GOD",
  str_GRATITUDE_TR : "YARABBi SUKUR",
  str_UNFORTUNE_EN : "UNFORTUNATELY",
  str_UNFORTUNE_TR : "MAALESEF",

  str_unknown      : "[UNKNOWN]",     // product page which is missing the 'title'              {written in 'title'}
  str_Error404     : "[NOT-FOUND]",   // product page that does not exist (error-404)           {written in 'title'}
  str_unavailable  : "[UNAVAILABLE]", // product page that has "Currently unavailaale" tag      {written in 'seller'}
  str_needsLogin   : "[NEEDS-LOGIN]", // product page that has a business account login box     {written in 'seller'}
  str_noSellers    : "[NO-SELLERS]",  // product page that does not have the offers page        {written in 'seller'}

  str_rejected     : "[REJECTED]",    // asin.s that gets error-503 (traffic) or error-200 (noResponse) will be retried later

};

module.exports = strings;
