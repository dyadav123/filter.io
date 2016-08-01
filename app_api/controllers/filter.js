
// Declare depencencies
var mongoose = require('mongoose');
var Transaction = mongoose.model('transaction');
var TransactionRows = mongoose.model('transactionRows');
var TransactionRowData = mongoose.model('transactionRowData');
var config = require('config');
var Client = require('node-rest-client').Client;

var retOutputObj;
var FilterSchema = mongoose.model('transactionFilter');

var dataType = {
  STRING: "String",
  NUMBER : "Number",
  DECIMAL: "Decimal",
  DATE : "Date"
};

// Create JsonResponse
var sendJSONresponse = function(res, status, content) {
  res.status(status);
  res.json(content);
};

var response;
//mongoose module for creating ingestion scheme
module.exports.filtersExecute = function(req, res) {
console.log('Called filter service');
  var filter =
    {
      partner_type : req.body.partner_type,
      partner_code : req.body.partner_code,
      createdOn : req.body.createdOn,
      rows : req.body.rows,
      client: req.body.client,
      verMajor : req.body.majVer,
      verMinor : req.body.minVer
    };

    response = res;
    filterData(filter);
  //  sendJSONresponse(response, 201, transaction);
};

// perform data matching and extract on the data from the file
var filterData = function(filter)
{
  var token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJfaWQiOiI1NzhlN2ViZTE1MzdlNDFhMjQzYzNhOWMiLCJlbWFpbCI6ImR5YWRhdkBmdXNpb25zZXZlbi5jb20iLCJuYW1lIjoiZHlhZGF2IiwiZXhwIjoxNDcwMTU0ODQ1LCJpYXQiOjE0Njk1NTAwNDV9.8KRbFW6zJCQIneePYfHwKkFZvpMNKG1ZlpeBPbAYcKk";
  var contract = {};
  var partner;
  var colArray = [];
  var filterArray = [];
  var staticArray = [];
  var partnerCode;
  var partnerType
  var source;
  var contractConfig = config.get('contractConfig');

  commonGet(contractConfig.uri +
    '?client.code=' + filter.client +
    '&version.major=' + filter.verMajor +
    '&version.minor=' + filter.verMinor, token, function(res)
    {
      contract = res[0]; // since the returned object is a collection, we need to extract the 1st element
    //  console.log('contract ' + contract);
      partnerType = filter.partner_type;


      if(partnerType == "FPA")
      {
         source = partnerCode = filter.partner_code;
      }
      else
      {
        source = filter.partner_code;
      }

      partner = contract.partner.find(x=> x.code == source);

      if(partner != undefined)
      {
            // extract column information from contract
            partner.mapping.fields.forEach(function(field)
            {
              if(field.partner_field == "")
              {
                var staticRowData = new TransactionRowData();
                staticRowData.partnerField = "";
                staticRowData.value = field.value;
                staticArray.push(staticRowData);
              }
              else
                colArray.push(field.partner_field.toLowerCase());
            });

            // extract filter information from contract
            partner.filter.forEach(function(filter)
            {
              var filterSchema = new FilterSchema();
              filterSchema.columnName = filter.name;
              filterSchema.columnValues = "";
              filter.value.forEach(function(value)
              {
                filterSchema.columnValues += value + "|";
              });
              filterSchema.columnIndex = -1;
              filterArray.push(filterSchema);
            });
        }


        // perform filtering on the transaction
        var invalidRow = false;
        var newRows = [];

        console.log('colArray ' + colArray.length);
        filter.rows.forEach(function(rows)
        {
          var rowKey = rows.rowKey;
          var newRowData = [];
          rows.rowData.forEach(function(rowData)
          {
            // check for partnerField against colArray
            if(colArray.indexOf(rowData.partnerField.toLowerCase()) > -1)
            {
              if(rowData.partnerField == "Site Name" && partnerType == "TPA")
              {
                console.log('source ' + source);
                var corrSiteName = contract.partner.find(x=> x.code == source).filter.find(y=> y.name == "Site Name").value.find(z=> z == rowData.value);
                if(corrSiteName != undefined)
                {
                  contract.partner.forEach(function(partner)
                  {
                    var tag = partner.alias.find(x=> x == corrSiteName);
                    if(tag != undefined)
                      partnerCode = tag.code;
                  });
                }
              }
              else {
                var filterItem = filterArray.find(x => x.columnName.toLowerCase() == rowData.partnerField.toLowerCase());
                if(filterItem != undefined)
                {
                  var filterValues = filterItem.columnValues.split('|').forEach(function(filterValue)
                  {
                     if(filterValue != rowData.value)
                     {
                        console.log('filter ' + filterValue);
                        console.log('rawData ' + rowData.value);

                        invalidRow = true;
                     }
                  });
                }
              }

              newRowData.push(rowData);
            }

          });

            staticArray.forEach(function(staticInfo)
            {
              newRowData.push(staticInfo);
            });

            var rowInfo = new TransactionRows();
            rowInfo.rowKey = rows.rowKey;
            rowInfo.rowData = newRowData;
            newRows.push(rowInfo);

        });

        var transaction = new Transaction();
        console.log(filter.client);
        if(!invalidRow)
        transaction.rows = newRows;
        transaction.partner_type = partnerType;
        transaction.partner_code = partnerCode;
        transaction.client = filter.client;
        transaction.majVer = filter.verMajor;
        transaction.minVer = filter.verMinor;
        console.log(transaction);
        sendJSONresponse(response, 201, transaction);
    });

}

var commonGet = function(endpoint, token, callback)
{
  var client = new Client();

  // set content-type header and data as json in args parameter
  var args = {
      headers: { "Content-Type": "application/json" }
  };

  if (token != null)
    args.headers.Authorization = "Bearer " + token;

  client.get(endpoint, args, function (data, response) {
      callback(data);
  });
}
