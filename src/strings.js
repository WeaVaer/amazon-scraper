
const strings = {

  language         : "TR",   // oneOf ['EN', 'TR']
  str_GODWILL_EN   : "GOD WILLING",
  str_GODWILL_TR   : "iNSALLAH",
  str_GRATITUDE_EN : "THANK GOD",
  str_GRATITUDE_TR : "YARABBi SUKUR",
  str_UNFORTUNE_EN : "UNFORTUNATELY",
  str_UNFORTUNE_TR : "MAALESEF",

  str_Error404     : "[NOT-FOUND]",   // product pages that does not exist (error-404)
  str_unavailable  : "[UNAVAILABLE]", // product pages that has "Currently unavailaale" tag
  str_needsLogin   : "[NEEDS-LOGIN]", // product pages that has a business account login applet
  str_noSellers    : "[NO-SELLERS]",  // product pages that does not have the offers (sellers) information
  str_rejected     : "[REJECTED]",    // asin.s that gets error-503 (traffic) or error-200 (noResponse) will be retried later

};

module.exports = strings;
