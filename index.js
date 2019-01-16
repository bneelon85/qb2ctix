const QuickBase = require('quickbase')
const fs = require('fs')
const rp = require('request-promise')

require('dotenv').config()

const quickbase = new QuickBase({
  realm: 'rds',
  appToken: process.env.QB_APP_TOKEN,
  userToken: process.env.QB_USER_TOKEN
})

quickbase
  .api('API_DoQuery', {
    dbid: 'bigrk6igh',
    clist: '2.6.69.70.71.72.73.74.155',
    query: "{'2'.GTE.'" + (Date.now() - 60000) + "'}"
  })
  .then(result => {
    let modDateData = fs.readFileSync('companiesModDate.json')
    let recentModDate = JSON.parse(modDateData).mod_date
    // console.log(recentModDate)
    // console.log(result.table.original.mod_date)
    if (result.table.original.mod_date <= recentModDate) {
      let logMessage = (JSON.stringify({
        message: 'No change @ ' + Date(Date.now()) + '!'
      }) + '\n')
      // console.log(logMessage)
      fs.appendFileSync('companiesLog.json', logMessage)
    } else {
      fs.appendFileSync(
        'companiesLog.json',
        JSON.stringify({
          message: 'Updated/Inserted @ ' + Date(Date.now()) + '!'
        }) + '\n'
      )
      fs.writeFileSync(
        'companiesModDate.json',
        JSON.stringify({
          mod_date: result.table.original.mod_date
        })
      )
      console.log(result.table)
      result.table.records.forEach(element => {
        if (element['155']) {
          var options = {
            method: 'POST',
            url:
              'https://cogsprod.cleargistix.com/api/ExtCompany_Api_CreateCompany',
            headers: {
              'cache-control': 'no-cache',
              'Content-Type': 'application/x-www-form-urlencoded',
              token: process.env.CTIX_HEADER_TOKEN
            },
            form: {
              CompanyJsonString: {
                Name: element['6'],
                IsActive: 'true',
                CompanyId: element['155'],
                AddressInfo: [{ State: element['74'] }]
              }
            }
          }
          rp(options)
            .then(function (parsedBody) {
              parsedBody = JSON.parse(parsedBody)
              console.log(parsedBody['json'])
            })
            .catch(function (err) {
              console.log(err)
            })
        } else {
          var options2 = {
            method: 'POST',
            url:
              'https://cogsprod.cleargistix.com/api/ExtCompany_Api_CreateCompany',
            headers: {
              'cache-control': 'no-cache',
              'Content-Type': 'application/x-www-form-urlencoded',
              token: process.env.CTIX_HEADER_TOKEN
            },
            form: {
              CompanyJsonString: {
                Name: element['6'],
                IsActive: 'true',
                AddressInfo: [{ State: element['74'] }]
              }
            }
          }
          rp(options2)
            .then(function (parsedBody) {
              var ctixID = JSON.parse(parsedBody)['json']
              console.log(ctixID)
              quickbase.api('API_EditRecord', {
                dbid: 'bigrk6igh',
                rid: element.rid,
                fields: [{ fid: 155, value: ctixID }]
              })
            })
            .catch(function (err) {
              console.log(err)
            })
        }
      })
    }
  })
