require('dotenv').config();
var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 5000));

var pg = require('pg').native;

var allowCrossDomainRequests = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
}
app.use('*', allowCrossDomainRequests);

app.get('/', function (req, res) {
  res.send('Hello World');
});

app.get('/lat/:lat/long/:long', function (req, res) {
  var lat = parseFloat(req.params.lat);
  var long = parseFloat(req.params.long);

  pg.connect(process.env.PG_CONSTRING, function(err, client, done) {
    var handleError = function(err) {
      // no error occurred, continue with the request
      if(!err) return false;
      // An error occurred, remove the client from the connection pool.
      if(client){
        done(client);
      }
      console.error(err.stack);
      res.writeHead(500, {'content-type': 'text/plain'});
      res.end('An error occurred ', err);
      return true;
    };
    if(handleError(err)) return;

    var sql = "SELECT elect_div " +
            "FROM ced2016 " +
            "WHERE ST_INTERSECTS(geom, ST_POINT($1,$2));";

    query = client.query(sql, [long, lat])
    query.on('error', handleError);
    // query.on('row', function(row, result) {
      // result object is broken using pg-native
      // Thankfully it does rollup all rows into the result passed to end
      // result.addRow(row);
    // });
    query.on('end', function(result) {
      console.log(result.rows.length + ' rows were received');
      done();
      if (result.rowCount !== 0 && result.rows[0] && result.rows[0].elect_div) {
        return res.send(result.rows[0].elect_div);
      } else {
        res.writeHead(500, {'content-type': 'text/plain'});
        return res.end('No result found, check the address');
      }
    });
  });
})

app.listen(app.get('port'), function () {
  console.log('Electorate Finder is running on port ', app.get('port'));
});
