var express = require('express'),
	app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var formidable = require('formidable');
var fs = require('fs');

var uploadDir;
var allusers = [];
var allClients = [];
var allroomNos = [];
var temp = [];
var allrooms = []; //roomnames
var fs = require('fs');
var load = 1;
var firsttime = 1;


app.post('/upload', function (req, res, next) {
	var form = new formidable.IncomingForm();
	var cRoom = -1;
	var username = "";
	var timeD = new Date().getTime();

	uploadDir = __dirname + '/public/uploads/';
	form.multiples = false;
	form.keepExtensions = true;
	form.uploadDir = uploadDir;
	form.on('fileBegin', function (name, file) {
		file.path = uploadDir + timeD + file.name;
	})
	form.parse(req, (err, fields, files) => {
		if (err) return res.status(500).json({
			error: err
		});
		res.status(200).json({
			uploaded: true
		});
	});
	form.on('field', function (name, value) {
		if (name == "room")
			cRoom = value;
		if (name == "username")
			username = value;
	});
	form.on('file', function (name, file) {
		console.log('Uploaded ' + timeD + file.name + ' from room ' + allrooms[cRoom] + '(' + cRoom + ')');
		//<!--(roomNO)~(operation-first char)(username)#(data)-->
		io.emit('pic', cRoom + '~3' + username + '#uploads/' + timeD + file.name);
	});
});

app.get('/', function (req, res) {
	load = !(req.query.noload);
	res.sendFile(__dirname + '/public/index.html');
});

app.use(express.static(__dirname + '/public'));

io.on('connection', function (socket) {
	if (firsttime && load) {
		firsttime = 0;
		loadArrayfromFile();
	}
	allClients.push(socket);
	socket.on('chat message', function (msg) {
		io.emit('chat message', msg);
		var x = msg.search('~');
		var y = msg.search('#');
		var trM = msg.substring(0, x);
		var userX = msg.substring(x + 2, y);
		if (msg.substring(x + 1, x + 2) == '1') { ////
			allusers.push(userX);
			allroomNos.push(trM);
			console.log(userX + ' joined room ' + allrooms[trM]);
			temp = [];
			for (var j = 0; j < allroomNos.length; j++)
				if (allroomNos[j] == trM)
					temp.push(allusers[j]);
			console.log('Users live on room ' + allrooms[trM] + ': [' + temp + ']');
			console.log('TOTAL USERS: ' + allClients.length);
			temp.push(trM);
			io.emit('allusers', temp);
		}
	});
	socket.on('disconnect', function () {
		var i = allClients.indexOf(socket);
		if (i >= 0) {
			io.emit('chat message', allroomNos[i] + '~2' + allusers[i] + '#');
			console.log(allusers[i] + ' left the room ' + allrooms[allroomNos[i]]);
			var ctemp = allroomNos[i];
			allClients.splice(i, 1);
			allusers.splice(i, 1);
			allroomNos.splice(i, 1);
			temp = [];
			for (var j = 0; j < allroomNos.length; j++)
				if (allroomNos[j] == ctemp)
					temp.push(allusers[j]);
			console.log('Users live on room ' + allrooms[ctemp] + ': [' + temp + ']');
			console.log('TOTAL USERS: ' + allClients.length);
			temp.push(ctemp);
			io.emit('allusers', temp);
		}
	});
	socket.on('roomlist', function (msg) {
		io.emit('roomlist', allrooms);
	});
	socket.on('addroom', function (msg) {
		allrooms.push(msg);
		io.emit('addroom', allrooms.length + '. ' + msg);
		console.log('Room created: ' + msg + '(' + allrooms.length + ')');
		updateRoomList();
	});
});

http.listen(port, function () {
	console.log('Listening on *:' + port);
});

function updateRoomList() {
	var file = fs.createWriteStream('room.txt');
	file.on('error', function (err) {
		console.log('Error writing to file: ' + err);
	});
	for (var i = 0; i < allrooms.length; i++)
		if (i == 0)
			file.write(allrooms[i]);
		else
			file.write("," + allrooms[i]);
	file.end();
}

function loadArrayfromFile() {
	try {
		var data = fs.readFileSync('room.txt', 'utf8');
		if (data.trim() != "")
			allrooms = data.split(",");
		else
			allrooms = [];
		console.log("Rooms loaded. No. of rooms: " + allrooms.length);
	} catch (e) {
		console.log('Error reading from file');
	}
}