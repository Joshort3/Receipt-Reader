/* ------------------------------------------------------------------------------------------ */
/* ----------------------------- CREDENTIALS + REQUIRED MODULES ----------------------------- */
/* ------------------------------------------------------------------------------------------ */

// NODEMAILER API CREDENTIALS & MODULES
var nodemailer = require('nodemailer');

// GOOGLE VISION API CREDENTIALS & MODULES
const fs = require('fs');
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();

// GOOGLE DRIVE + SHEETS API CREDENTIALS & MODULES
const { google } = require('googleapis');
const credentials = require('./credentials.json');
const scopes = ['https://www.googleapis.com/auth/drive'];
const auth = new google.auth.JWT(
	credentials.client_email, null,
	credentials.private_key, scopes
	);
const drive = google.drive({ version: "v3", auth });
const sheets = google.sheets({ version: 'v4', auth });
const { GoogleSpreadsheet } = require('google-spreadsheet');

//UNCOMMENT LATER
const Nexmo = require('nexmo');
const nexmo = new Nexmo({
  apiKey: '84a58de8', // 0bafe696
  apiSecret: '6bHH3cWyKfX4zvhM', // bdBgyXhsvmw2Uhy6
});
// This file holds all functions used for processing in order to keep a clean server.js file.

/* ---------------------------------------------------------------------------- */
/* ----------------------------- HELPER FUNCTIONS ----------------------------- */
/* ---------------------------------------------------------------------------- */

exports.sendVerification = function (phoneNumber, connection) {
	nexmo.verify.request({
	  number: '1' + phoneNumber,
	  brand: 'rr-receipt-reader',
	  code_length: '6',
		workflow_id: '6',
		pin_expiry: '60'
	}, (err, result) => {
		connection.sendUTF(result.status == '0' ? result.request_id : '0');
	});
	// DELETE LATER
	// connection.sendUTF('1');
}

exports.verifyCode = function (request_id, code, connection) {
	nexmo.verify.check({
	  request_id: request_id,
	  code: code
	}, (err, result) => {
		connection.sendUTF(result.status);
	});
	// DELETE LATER
	// connection.sendUTF('0');
}

exports.OCR = async function (UserPhoneNumber, message, connection) {
    var file_names = message.split(" ");
    var file_size = file_names[0];
    file_names = file_names.splice(1);
    var i;
    var str = '';
    var parsed_data = '';
    var arrayofReceipts = [];
    for (i = 0; i < file_size; i++) {
        if (i > 0) {str += 'NEW_RECPT';}
        file_loc = 'uploads/' + file_names[i];
        const [result] = await client.textDetection(file_loc);
        const texts = result.textAnnotations;
        texts.forEach(text => str += (text.description + '\n'));
        fs.unlink(file_loc, (err) => {});
    }
		arrayofReceipts = HEB_parser(str);
		// COMMENT BACK ONCE GOOGLE SHEETS WORKS
		//await AddToGoogleSheets(UserPhoneNumber, arrayofReceipts);
    for(var i = 0; i < arrayofReceipts.length; i++) {
			if (i != 0) {parsed_data += '<br>';}
        for(var j = 0; j < arrayofReceipts[i].length; j++){
					parsed_data += arrayofReceipts[i][j];
          if(j != arrayofReceipts[i].length -1) {parsed_data += ' ';}
        }
    }
    connection.sendUTF(parsed_data);
}

function HEB_parser(str) {
    var str2 = '';
    var str4 = str;
    var t = 0;
    var i = 0;
    var date = '';
    var cost = '0.0';
    var cardnum = '';
    var receipts = [];
    var receiptInfo = [];
    if(str.includes('NEW_RECPT')) {
            str = str.substring(0,str.search('NEW_RECPT'));
    }
    while(str.charAt(i) != ' ' && str.charAt(i) != '\n' && str.charAt(i) != '\r'){
        i++;
    }
    if (str.substring(0,i).length > 15)
        receiptInfo.push('could not find');
    else{
         receiptInfo.push(str.substring(0,i));
         str2 = str.substring(0,i) + '<br>';
    }
    for(i; i<str.length; i++){
        if((str.charAt(i) >= '0' && str.charAt(i) <= '9') && (str.charAt(i+1) >= '0' && str.charAt(i+1) <= '9')){
            if((str.charAt(i+2) == '-' || str.charAt(i+2) == '/') && (str.charAt(i+3) >= '0' && str.charAt(i+3) <= '9')){
                if((str.charAt(i+4) >= '0' && str.charAt(i+4) <= '9') && (str.charAt(i+5) == '-' || str.charAt(i+5) == '/')){
                    if((str.charAt(i+6) >= '0' && str.charAt(i+6) <= '9') && (str.charAt(i+7) >= '0' && str.charAt(i+7) <= '9')){
                        if(!(str.charAt(i+8) >= '0' && str.charAt(i+8)<= '9')){
                            if(date == ''){
                                date =  str.substring(i, i+8);
                            }
                            else if(date.substring(6,8) > str.substring(i+6, i+8)){
                                date =  str.substring(i, i+8);
                            }
                            else if(date.substring(0,2) > str.substring(i, i+2)){
                                date =  str.substring(i, i+8);
                            }
                            else if(date.substring(3,5) > str.substring(i+3, i+5)){
                                date =  str.substring(i, i+8);
                            }
                        }
                    }
                }
            }
        }
        if((str.charAt(i) == '*' || str.charAt(i) == 'X' || str.charAt(i) == 'x' ) && (str.charAt(i+1) >= '0' && str.charAt(i+1) <= '9')){
            if((str.charAt(i+2) >= '0' && str.charAt(i+2) <= '9') && (str.charAt(i+3) >= '0' && str.charAt(i+3) <= '9')){
                if((str.charAt(i+4) >= '0' && str.charAt(i+4) <= '9') && str.charAt(i+5) == '\n'){
                    cardnum = str.substring(i+1,i+5);
                    //return cardnum;
                }
            }
        }
        else if((str.charAt(i) == '*' || str.charAt(i) == 'X' || str.charAt(i) == 'x')  && str.charAt(i+1) == ' '){
            if((str.charAt(i+2) >= '0' && str.charAt(i+2) <= '9') && (str.charAt(i+3) >= '0' && str.charAt(i+3) <= '9')){
                if((str.charAt(i+4) >= '0' && str.charAt(i+4) <= '9') && (str.charAt(i+5) >= '0' && str.charAt(i+5) <= '9')){
                    if(str.charAt(i+6) == ' ' || str.charAt(i+6) == '\n' || str.charAt(i+6) == '\t' )
                        cardnum = str.substring(i+2,i+6)
                }
            }
        }
        if(str.charAt(i) == '.' && i+3 < str.length){
            //console.log('First if: ');
            if(!isNaN(str.charAt(i+1)) && !isNaN(str.charAt(i+2))){
                //console.log('Seconf if: ');
                var j = i-1;
                while (j != -1 && !isNaN(str.charAt(j)) && str.charAt(j) != '\n' && str.charAt(j) != '\s'){
                    //console.log(str.charAt(j));
                    j--;
                }
                //console.log('After While: ');
                //console.log('cost: ' + cost);
                //console.log('str cost: ' + str.substring(j+1,i+3));
                if(cost.substring(0,cost.indexOf('.')).length<str.substring(j+1,i).length||(cost.substring(0,cost.indexOf('.')).length==str.substring(j+1,i).length&&cost.substring(0,cost.indexOf('.')).localeCompare(str.substring(j+1,i)) < 0)){
                    //console.log('1 '+str.substring(j+1,i));
                    cost= str.substring(j+1,i+3).replace(' ','');
                }
                else if (cost.substring(0,cost.indexOf('.')).localeCompare(str.substring(j+1,i)) == 0){
                    //console.log('2 '+str.substring(i+1,i+3));
                    if(cost.substring(cost.indexOf('.')+1).localeCompare(str.substring(i+1,i+3)) < 0){
                        //console.log('3 '+str.substring(i+1,i+3));
                        cost = str.substring(j+1,i+3).replace(' ','');
                    }
                }
            }
        }
    }
    //console.log('Final Cost: ' + cost);
    if(date == '')
        date = 'NA';
    receiptInfo.push(date);
    str2 += 'Date, ' + date + '<br>';



    /*if(str.includes('Subtotal') || str.includes('SUBTOTAL')){
        var loc = 0;
        if(str.includes('Subtotal'))
            loc = str.search('Subtotal');
        else
            loc = str.search('SUBTOTAL');
        str = str.substring(loc + 9, str.length);
    }
    //return str;
    if(str.includes('Total') || str.includes('TOTAL')) {
        if(str.includes('Total'))
            i = str.search('Total');
        else
            i = str.search('TOTAL');
        var j = 0;
        var foundPoint = 0;
        var cost = '';
        //return str2;
        while(t == 0){
            //return str2;
            if((str.charAt(i) >= '0' && str.charAt(i) <= '9'))
            {
                if(!(str.charAt(i+1) >= '0' && str.charAt(i+1) <= '9')){
                    cost += str.charAt(i) + '.' + str.charAt(i+2) + str.charAt(i+3);
                    //return cost;
                    t = 1;
                }
                else {
                    cost += str.charAt(i);
                }
            }
            i++;
        }
        receiptInfo.push(cost);
        str2 += 'Total Sale, ' + cost;
    }*/
    i = 0;
    receiptInfo.push(cost);
    str2 += '<br>' + 'cost, ' + cost;
    if(cardnum != '') {
        if (cardnum.length == 4){
            receiptInfo.push(cardnum);
            str2 += '<br>' + 'Card, ' + cardnum;
        }
        else{
            receiptInfo.push('NA');
        }
    }
    else {
        receiptInfo.push('NA');
    }
    //receipts.push(receiptInfo);
    if(str4.includes('NEW_RECPT')) {
        //return str.substring(str.search('NEW_RECPT')+9);

        receipts = HEB_parser(str4.substring(str4.search('NEW_RECPT')+9));

    }
    receipts.push(receiptInfo);
    return receipts;
}

function GetDate(){
	var today = new Date();
	var dd = String(today.getDate()).padStart(2, '0');
	var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
	var yyyy = today.getFullYear();
	today = mm + '/' + dd + '/' + yyyy;
	return today;
}
async function GetFileId(UserPhoneNumber){
	const res = await drive.files.list({fields: 'files(name, id)',});
	files = res.data.files;
	for (i=0; i < files.length; i++) {
		if (files[i].name == UserPhoneNumber){
			var FileId = files[i].id;
			return FileId;
		}
	}
	return '0';
}
async function CreateNewGoogleSheet(UserPhoneNumber) {
	let GoogleSheet = await sheets.spreadsheets.create({
		resource: {
			properties: {
			title: UserPhoneNumber,
			}
		}
	});
	return GoogleSheet.data.spreadsheetId;
}
async function UploadToGoogleDrive(SheetsId){
	await drive.files.update({
		fileId: SheetsId,
		addParents: '120McFBRcKsfCUmsRtEqHLp3prCQYjrBO',
		fields: 'id, parents'
	});
}
async function TransferOwernship(SheetsId) {
	await drive.permissions.create({
		fileId: SheetsId,
		transferOwnership: 'true',
		resource: {
			role: 'owner',
			type: 'user',
			emailAddress: 'rr.receipt.reader@gmail.com',
		},
	});
}

async function GiveReaderAccess(UserEmail, SheetsId) {
	await drive.permissions.create({
		fileId: SheetsId,
		resource: {
			role: 'reader',
			type: 'user',
			emailAddress: UserEmail,
		},
	});
}

async function GetShareableLink(SheetsId){
	const webViewLink = await drive.files.get({
		fileId: SheetsId,
		fields: 'webViewLink'
	}).then(response => response.data.webViewLink);
	return webViewLink;
}

exports.AddToGoogleSheets = async function (UserPhoneNumber, StringOfReceipts, connection) {
	ArrayOfReceipts = StringOfReceipts.split("<br>");
	for (var i = 0; i < ArrayOfReceipts.length; i++) {
		ArrayOfReceipts[i] = ArrayOfReceipts[i].split(",,,");
	}
	SheetsId = await GetFileId(UserPhoneNumber);

	try {
		// If the user doesn't have a Google Sheet
		if (SheetsId == '0'){
			console.log('Making a new sheet...');
			// Create a new Google sheet
			SheetsId = await CreateNewGoogleSheet(UserPhoneNumber)
			TransferOwernship(SheetsId);

			console.log('Uploading to google drive...');
			// Add to rr.receipt.reader@gmail.com 'receipt' folder
			UploadToGoogleDrive(SheetsId);

			console.log('Authenticating ownership...');
			// Document Authentication
			const doc = new GoogleSpreadsheet(String(SheetsId));
			await doc.useServiceAccountAuth(require('./credentials.json'));
			await doc.loadInfo();

			console.log('Initialize first worksheet...');
			// Initialize first worksheet
			const NewSheet = doc.sheetsByIndex[0];
			await NewSheet.updateProperties({ title: GetDate() });
			await NewSheet.setHeaderRow(['Store', 'Date', 'Total', 'Last_Four_Digits_Of_Credit_Card']);
		}
		// If the user already has a Google Sheet
		else {
			console.log('Continuing a sheets...');
			// Document Authentication
			const doc = new GoogleSpreadsheet(String(SheetsId));
			await doc.useServiceAccountAuth(require('./credentials.json'));
			await doc.loadInfo();

			// If the User is appending to a document on the same day, don't create another Google Sheet.
			const LastSheet = doc.sheetsByIndex[doc.sheetCount-1];
			if (LastSheet.title != GetDate()){
				const NewSheet = await doc.addSheet({ title: GetDate() });
				await NewSheet.setHeaderRow(['Store', 'Date', 'Total', 'Last_Four_Digits_Of_Credit_Card']);
			}
		}
		// Document Authentication
		const doc = new GoogleSpreadsheet(String(SheetsId));
		await doc.useServiceAccountAuth(require('./credentials.json'));
		await doc.loadInfo();

		const Sheet = doc.sheetsByIndex[doc.sheetsByIndex.length-1];
		console.log('Adding data...');
		for (var i = 0; i < ArrayOfReceipts.length; i++){
			await Sheet.addRows([
				{ Store: String(ArrayOfReceipts[i][0]), Date: String(ArrayOfReceipts[i][1]), Total: String(ArrayOfReceipts[i][2]), Last_Four_Digits_Of_Credit_Card: String(ArrayOfReceipts[i][3])}
			]);
		}
		console.log('Finished!');
		connection.sendUTF("Received");
	}
	catch(err) {
		console.log(err);
	}
}

exports.SendEmail = async function (UserPhoneNumber, UserEmail, connection) {
	var unirest = require("unirest");
	var req = unirest("GET", "https://apilayer-mailboxlayer-v1.p.rapidapi.com/check");

	console.log('Getting File Id...');
	SheetsId = await GetFileId(UserPhoneNumber);
	console.log('Giving permissions to user');
	GiveReaderAccess(UserEmail, SheetsId);
	console.log('Getting shareable link...');
	var ShareableLink = await GetShareableLink(SheetsId);

	console.log('Emailing link to user...');
	req.query({
		"smtp": "1",
		"catch_all": "0",
		"email": UserEmail,
		"access_key": "559fc9dc4d67031be5864514d6ff2d3d"
	});

	req.headers({
		"x-rapidapi-host": "apilayer-mailboxlayer-v1.p.rapidapi.com",
		"x-rapidapi-key": "e61bec1277msh01890b659153acfp18e483jsn149a8bbc6c24"
	});


	req.end(function (res) {
		if (res.error) throw new Error(res.error);
		if (res.body.format_valid == '1'){
			// UNCOMMENT OUT LATER

			var transporter = nodemailer.createTransport({
				service: 'gmail',
				auth: {
					user: 'rr.receipt.reader@gmail.com',
					pass: 'CSCE315Lightfoot'
				}
			});

			var mailOptions = {
				from: 'rr.receipt.reader@gmail.com',
				to: UserEmail,
				subject: 'Link to Google Sheet',
				html: 'Howdy!<br><br>Click <a href= ' + String(ShareableLink)+ '>here</a> to go to your Google Sheet!<br><br>rr-receipt-reader<br>'
			};

			transporter.sendMail(mailOptions, function(error, info){
				connection.sendUTF(error ? 'Fail' : 'Sent');
			})
			// connection.sendUTF('Sent'); // DELETE LATER
		}
		else {
			connection.sendUTF('Fail');
			// connection.sendUTF('Sent'); // DELETE LATER
		}
	});
	console.log('Email Sent!');
}

/* ----------------------------------------------------------------------------------------------------------------- */
/* ----------------------------- ADDITIONAL GOOGLE DRIVE + SHEETS API HELPER FUNCTIONS ----------------------------- */
/* ----------------------------------------------------------------------------------------------------------------- */

async function GetFilesAndAttributes(){
	let res = await new Promise((resolve, reject) => {
	drive.files.list({
		fields: 'files(name, id, permissions, permissionIds)',
		orderBy: 'createdTime desc'
	}, function (err, res) {
		if (err) {
		reject(err);
		}
		resolve(res);
	});
	});
	console.log("----------------------------------------------------- ")
	console.log("------------------ FILE ATTRIBUTES ------------------ ")
	console.log("----------------------------------------------------- ")
	// console.log("------------------ RES.DATA ------------------ ")
	// console.log(res.data);
	// console.log("------------------ RES.DATA.FILES ------------------ ")
	// console.log(res.data.files);
	// console.log("------------------ RES.DATA.FILES LISTED ------------------ ")
	files = res.data.files;
	for (i=0; i < files.length; i++) {
		console.log(files[i].name);
		console.log(files[i].id);
		console.log(files[i].permissions);
		// console.log(files[i].permissionIds);
	}


}

async function GetAllAccessibleFiles(){
	await drive.files.list({}, (err, res) => {
		if (err) throw err;
		const files = res.data.files;
		if (files.length) {
			console.log("------------------------------------------------------ ")
			console.log("------------------ ACCESSIBLE FILES ------------------ ")
			console.log("------------------------------------------------------ ")
			files.map((file) => {
			console.log(file);
		});
		} else {
			console.log("------------------------------------------------------ ")
			console.log("------------------ ACCESSIBLE FILES ------------------ ")
			console.log("------------------------------------------------------ ")
			console.log('No files found');
		}
		});
}
async function DeleteFile (FileId){
	await drive.files.delete({fileId: FileId });
}
async function RemoveAccessToFile (PermissionId) {
	await drive.permissions.delete({
		fileId: SheetsId,
		permissionId: PermissionId,
	});
}
