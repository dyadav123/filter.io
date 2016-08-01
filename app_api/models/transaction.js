var mongoose = require('mongoose');

var dataSource = new mongoose.Schema({
  name: String,
  adapter: String,
  _type: String,
  host: String,
  user: String,
  password: String,
  database: String,
  port: Number,
  _get: String,
  _set: String,
  key: [String],
  tkey:[[String]],
});

var rowData = new mongoose.Schema({
  partnerField: String,
  f7Field: String,
  value: String,
  type:
  {
    type: String,
    enum : ['String', 'Number', 'Currency', 'Double', 'Date', 'Boolean'],
    default : 'String'
  }
});

var rows = new mongoose.Schema({
  rowKey: String,
  rowData: [rowData],
});

var transactionSchema = new mongoose.Schema({

  partner_type : String,
  partner_code : String,
  createdOn: {type: Date, "default": Date.now},
  rows: [rows],
  reference: [dataSource],
  client: String,
  majVer : String,
  minVer : String
});

var filterSchema = new mongoose.Schema({
    columnName : String,
    columnValues : String,
    columnIndex : Number
});

mongoose.model('transaction', transactionSchema);
mongoose.model('transactionRows', rows);
mongoose.model('transactionRowData', rowData);
mongoose.model('transactionFilter', filterSchema);
