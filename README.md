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

- do recall last inputted asin list (hint : write the latest asin list to a file)

- do partial writes at the end of each run (maybe at the end of each page fetch?) when exporting to a file

- what to do for pages that have color, size etc selection ?
  sometimes seller info for this page becomes available only after selection
  sometimes page comes as selected but then maybe we need another color, size ??

  ex.s :
  url for a page with size selected and item available :
  https://www.amazon.com/dp/B07212JC27/ref=sspa_dk_detail_7?pd_rd_i=B072JWSP3B&pd_rd_w=3Ikjq&content-id=amzn1.sym.88097cb9-5064-44ef-891b-abfacbc1c44b&pf_rd_p=88097cb9-5064-44ef-891b-abfacbc1c44b&pf_rd_r=DQPGD3JCM0ME0H7AK4H7&pd_rd_wg=HvL8n&pd_rd_r=fe41cc9e-582e-4b5c-a49e-17af19ba2dfb&s=apparel&sp_csd=d2lkZ2V0TmFtZT1zcF9kZXRhaWw&spLa=ZW5jcnlwdGVkUXVhbGlmaWVyPUE2WFoyNTNYOUpMRU0mZW5jcnlwdGVkSWQ9QTA5NzcyNjAxNUMxT1ZNV0xZVDBMJmVuY3J5cHRlZEFkSWQ9QTAyOTc2OTRISUIzRjVLQ1RBNiZ3aWRnZXROYW1lPXNwX2RldGFpbCZhY3Rpb249Y2xpY2tSZWRpcmVjdCZkb05vdExvZ0NsaWNrPXRydWU&th=1&psc=1
  same page with something unavailable size selected
  https://www.amazon.com/dp/B07212HVPP/ref=sspa_dk_detail_7?pd_rd_i=B072JWSP3B&pd_rd_w=3Ikjq&content-id=amzn1.sym.88097cb9-5064-44ef-891b-abfacbc1c44b&pf_rd_p=88097cb9-5064-44ef-891b-abfacbc1c44b&pf_rd_r=DQPGD3JCM0ME0H7AK4H7&pd_rd_wg=HvL8n&pd_rd_r=fe41cc9e-582e-4b5c-a49e-17af19ba2dfb&s=apparel&sp_csd=d2lkZ2V0TmFtZT1zcF9kZXRhaWw&spLa=ZW5jcnlwdGVkUXVhbGlmaWVyPUE2WFoyNTNYOUpMRU0mZW5jcnlwdGVkSWQ9QTA5NzcyNjAxNUMxT1ZNV0xZVDBMJmVuY3J5cHRlZEFkSWQ9QTAyOTc2OTRISUIzRjVLQ1RBNiZ3aWRnZXROYW1lPXNwX2RldGFpbCZhY3Rpb249Y2xpY2tSZWRpcmVjdCZkb05vdExvZ0NsaWNrPXRydWU&th=1





[
  {
    "label": "Medical Content", "value": "Medical Content", "children": [
      {"label": "Mood Disorders", "value": "Mood Disorders"},
      {"label": "Personality Disorders", "value": "Personality Disorders"},
      {"label": "Other Medical Content", "value": "Other Medical Content"}
    ]
  },
  {
    "label": "Tools", "value": "Tools", "children": [
      {"label": "Class-A", "value": "Class-A"},
      {"label": "Class-B", "value": "Class-B"}
    ]
  },
  {
    "label": "Widgets", "value": "Widgets", "children": [
      {
        "label": "Notifications", "value": "Notifications", "children": [
          {"label": "E-mail Notifications", "value": "E-mail Notifications"},
          {"label": "SMS Notifications", "value": "SMS Notifications"},
          {"label": "Push Notifications", "value": "Push Notifications"}
        ]
      },
      {
        "label": "Alerts", "value": "Alerts", "children": [
          {"label": "Personal Alerts", "value": "Personal Alerts"},
          {"label": "Therapist Alerts", "value": "Therapist Alerts"},
          {"label": "Operational Alerts", "value": "Operational Alerts"},
          {"label": "Admin Alerts", "value": "Admin Alerts"}
        ]
      }
    ]
  }
]




[
  {"label": "Type-A", "value": "Type-A"},
  {"label": "Type-B", "value": "Type-B"},
  {"label": "Type-C", "value": "Type-C"}
]
[
  {"label": "Type-1", "value": "Type-1"},
  {"label": "Type-2", "value": "Type-2"},
  {"label": "Type-3", "value": "Type-3"}
]
