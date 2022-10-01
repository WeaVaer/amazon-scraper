library selection :
-------------------
make http requests => [Axios]* / Node Fetch / Got / SuperAgent / HTTP (standard library)
parse results      => [Cheerio]* / Puppeteer



command line options :
----------------------

"npm init" => installs node_modules

"npm start" => runs the nodelett



[NOT-FOUND]
[NO-SELLERS]
[UNAVAILABLE]
[NEEDS-LOGIN]


TO-DO :
-------
- chk 1022 ASIN list, proof
- what to do for pages that have color, size etc selection ?
  sometimes seller info for this page becomes available only after selection
  sometimes page comes as selected but then maybe we need another color, size ??

  ex.s :
  url for a page with size selected and item available :
  https://www.amazon.com/dp/B07212JC27/ref=sspa_dk_detail_7?pd_rd_i=B072JWSP3B&pd_rd_w=3Ikjq&content-id=amzn1.sym.88097cb9-5064-44ef-891b-abfacbc1c44b&pf_rd_p=88097cb9-5064-44ef-891b-abfacbc1c44b&pf_rd_r=DQPGD3JCM0ME0H7AK4H7&pd_rd_wg=HvL8n&pd_rd_r=fe41cc9e-582e-4b5c-a49e-17af19ba2dfb&s=apparel&sp_csd=d2lkZ2V0TmFtZT1zcF9kZXRhaWw&spLa=ZW5jcnlwdGVkUXVhbGlmaWVyPUE2WFoyNTNYOUpMRU0mZW5jcnlwdGVkSWQ9QTA5NzcyNjAxNUMxT1ZNV0xZVDBMJmVuY3J5cHRlZEFkSWQ9QTAyOTc2OTRISUIzRjVLQ1RBNiZ3aWRnZXROYW1lPXNwX2RldGFpbCZhY3Rpb249Y2xpY2tSZWRpcmVjdCZkb05vdExvZ0NsaWNrPXRydWU&th=1&psc=1
  same page with something unavailable size selected
  https://www.amazon.com/dp/B07212HVPP/ref=sspa_dk_detail_7?pd_rd_i=B072JWSP3B&pd_rd_w=3Ikjq&content-id=amzn1.sym.88097cb9-5064-44ef-891b-abfacbc1c44b&pf_rd_p=88097cb9-5064-44ef-891b-abfacbc1c44b&pf_rd_r=DQPGD3JCM0ME0H7AK4H7&pd_rd_wg=HvL8n&pd_rd_r=fe41cc9e-582e-4b5c-a49e-17af19ba2dfb&s=apparel&sp_csd=d2lkZ2V0TmFtZT1zcF9kZXRhaWw&spLa=ZW5jcnlwdGVkUXVhbGlmaWVyPUE2WFoyNTNYOUpMRU0mZW5jcnlwdGVkSWQ9QTA5NzcyNjAxNUMxT1ZNV0xZVDBMJmVuY3J5cHRlZEFkSWQ9QTAyOTc2OTRISUIzRjVLQ1RBNiZ3aWRnZXROYW1lPXNwX2RldGFpbCZhY3Rpb249Y2xpY2tSZWRpcmVjdCZkb05vdExvZ0NsaWNrPXRydWU&th=1
