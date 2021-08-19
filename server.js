var HelperFunctions = require('./HelperFunctions');
var nodemailer = require('nodemailer');
var express = require('express');
var http = require('http');
var Busboy = require('busboy');
var path = require('path');
var fs = require('fs');
const WebSocketServer = require('websocket').server;
var app = express();

// set the port of our application
// process.env.PORT lets the port be set by Heroku
var port = process.env.PORT || 5000;

// set the view engine to ejs
app.set('view engine', 'ejs');

// make express look in the public directory for assets (css/js/img)
app.use(express.static(__dirname + '/public'));


// set the home page route
app.get('/', function(req, res) {

	// ejs render automatically looks in the views folder
	res.render('index');
});

app.post('/', function (req, res) {
    var busboy = new Busboy({ headers: req.headers });
    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {

      var saveTo = path.join(__dirname, 'uploads/' + filename);
      file.pipe(fs.createWriteStream(saveTo), {end: false});
    });

		busboy.on('finish', function() {
			res.writeHead(204, {'Connection': 'close'});
			res.end();
		});

    return req.pipe(busboy);
});


const server = http.createServer(app);
server.listen(port);
const wsServer = new WebSocketServer({httpServer: server});
console.log('Server listening on port: ' + port);
wsServer.on('request', function(request) {
	const connection = request.accept(null, request.origin);
	connection.on('message', function (message) {
		// HelperFunctions.AddToGoogleSheets();
		if (message.utf8Data.substring(0, 5) == 'phone') {
			PhoneNumber = message.utf8Data.substring(5);
			HelperFunctions.sendVerification(PhoneNumber, connection);
		}
		else if (message.utf8Data.substring(0,5) == 'verif') {
			code = message.utf8Data.substring(5, 11);
			request_id = message.utf8Data.substring(11);
			HelperFunctions.verifyCode(request_id, code, connection);
		}
		else if (message.utf8Data.substring(0, 5) == 'parse') {
			PhoneNumber = message.utf8Data.substring(5,15);
			parsedData = message.utf8Data.substring(15);
			HelperFunctions.AddToGoogleSheets(PhoneNumber, parsedData, connection);
		}
		else if (message.utf8Data.substring(0,5) == 'email') {
			PhoneNumber = message.utf8Data.substring(5,15);
			UserEmail = message.utf8Data.substring(15);
			HelperFunctions.SendEmail(PhoneNumber, UserEmail, connection);
		}
		else if (message.utf8Data.substring(0,5) == 'files') {
			PhoneNumber = message.utf8Data.substring(5,15);
			files = message.utf8Data.substring(15);
			if (fs.readdirSync('uploads').length != 0) {
				HelperFunctions.OCR(PhoneNumber, files, connection);
			}
			else {
				connection.sendUTF("empty");
			}
		}
	});
});
