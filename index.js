var path = require('path');
var SerialPort = require('serialport');
const Readline = SerialPort.parsers.Readline;
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var serverPort = process.env.PORT || 3000;
var mysql = require('mysql');
var opn = require('opn');
var excel = require('excel4node');
var config = require('./config/settings');
var moment = require('moment');

var connection = mysql.createConnection({
    host: config.host,
    user: config.db_user,
    password: config.db_password,
    database: config.db_name
});

var dbBusRecords = null;

connection.connect(function(err) {
    if (err) {
        console.error('Error while connecting to the database: ' + err.stack);
        return;
    }
    
    console.log('connected to the database');
    opn('http://localhost:' + serverPort);

    io.on('connection', (socket) => {
        console.log('connection with client stablished');

        getRecords().then(results => {
            results.forEach(obj => {
                socket.emit('new data', obj);
            });
        });

        parser.on('data', (stream) => {
            var record = formatJson(stream);
            connection.query('INSERT INTO record SET ?', record, function(error, results, fields) {
                if (error)
                    throw error;
            });
            socket.emit('new data', record);
        });
    });
});


//     Fecha:06/09/2016*Hora:1108*Lat:-17,359545*Long:-66,173783*TPasaj:03*PBaja:02*PSube:05
//     Fecha:06/09/2016*Hora:1108*Lat:-17,359785*Long:-66,173189*TPasaj:03*PBaja:02*PSube:05
//     Fecha:06/09/2016*Hora:1108*Lat:-17,360100*Long:-66,172507*TPasaj:03*PBaja:02*PSube:05
//     Fecha:06/09/2016*Hora:1108*Lat:-17,360534*Long:-66,172689*TPasaj:03*PBaja:02*PSube:05
//     Fecha:06/09/2016*Hora:1108*Lat:-17,360979*Long:-66,172837*TPasaj:03*PBaja:02*PSube:05
//     Fecha:06/09/2016*Hora:1108*Lat:-17,361847*Long:-66,173144*TPasaj:03*PBaja:02*PSube:05
//     Fecha:06/09/2016*Hora:1108*Lat:-17,362547*Long:-66,173748*TPasaj:03*PBaja:02*PSube:05
//     Fecha:06/09/2016*Hora:1108*Lat:-17,363420*Long:-66,174027*TPasaj:03*PBaja:02*PSube:05
//     Fecha:06/09/2016*Hora:1108*Lat:-17,364114*Long:-66,174618*TPasaj:03*PBaja:02*PSube:05
//     Fecha:06/09/2016*Hora:1108*Lat:-17,364874*Long:-66,175061*TPasaj:03*PBaja:02*PSube:05
//     Fecha:06/09/2016*Hora:1108*Lat:-17,365769*Long:-66,175259*TPasaj:03*PBaja:02*PSube:05


// __dirname resolves to the project folder
app.use(express.static(path.join(__dirname, 'public')));

// Use a `\r\n` as a line terminator
const parser = new Readline({
    delimiter: '\r\n'
});

const port = new SerialPort(config.serial_port, {
    baudRate: 9600,
});

port.pipe(parser);

port.on('open', (error) => {
    if (error)
        throw error;

    console.log('the port %s is open now', config.serial_port);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/excel', (req, res) => {
    // res.sendFile(path.join(__dirname, 'index.html'));
    var workbook = new excel.Workbook({
        'sheetFormat': {
            'baseColWidth': 200,
            'defaultColWidth': 200,
        }
    });

    var worksheet = workbook.addWorksheet('Sheet 1');

    var basicStyle = workbook.createStyle({
        font: {
            size: 12
        }
    });

    var stringStyle = workbook.createStyle({
        font: {
            size: 12,
            bold: true,
        },
        alignment: {
            wrapText: true,
            horizontal: 'center',
            vertical: 'center',
        },
    });

    worksheet.cell(1,1).string('Nro. Placa').style(stringStyle);
    worksheet.cell(1,2).string('Latitud').style(stringStyle);
    worksheet.cell(1,3).string('Longitud').style(stringStyle);
    worksheet.cell(1,4).string('Personas Suben').style(stringStyle);
    worksheet.cell(1,5).string('Personas Bajan').style(stringStyle);
    worksheet.cell(1,6).string('Cantidad Inicial de Personas').style(stringStyle);
    worksheet.cell(1,7).string('Fecha').style(stringStyle);
    worksheet.cell(1,8).string('Hora').style(stringStyle);

    connection.query('SELECT * FROM `record`', function(error, results, fields) {
        if (error) {
            console.error('Error in query');
            return;
        }

        for (let i = 0; i < results.length; i++) {

            var obj = results[i];

            worksheet.cell(i + 2, 1).string(obj['plate']).style(basicStyle);
            worksheet.cell(i + 2, 2).number(obj['latitude']).style(basicStyle);
            worksheet.cell(i + 2, 3).number(obj['longitude']).style(basicStyle);
            worksheet.cell(i + 2, 4).number(obj['persons_up']).style(basicStyle);
            worksheet.cell(i + 2, 5).number(obj['persons_down']).style(basicStyle);
            worksheet.cell(i + 2, 6).number(obj['initial_persons']).style(basicStyle);
            worksheet.cell(i + 2, 7).date(new Date(obj['date'])).style({ numberFormat: 'dd-mm-yyyy', alignment: { horizontal: 'center' }});
            worksheet.cell(i + 2, 8).string(obj['time']).style(basicStyle);
        }

        var fileName = 'reporte_' + Date.now() + '_' + moment(new Date()).format('DD-MM-YYYY') + '.xlsx';

        workbook.write(fileName, function(err, stats) {
            if (err) {
                console.error('Error al generar el excel ', err);
                return;
            }

            var file = path.join(__dirname, fileName);
            res.download(file);
        });
    });
});

server.listen(serverPort, function() {
    console.log('Server listening at localhost:%d', serverPort);
});

function formatJson(stream)
{
    var strArr = stream.split('*');
    var streamJson = {};

    streamJson.plate = '2609HAL';
    streamJson.date = new Date(strArr[0].substring(strArr[0].indexOf(':') + 1));
    var time = strArr[1].substring(strArr[1].indexOf(':') + 1);
    streamJson.time = time.substring(0, 2) + ':' + time.substring(2, time.length);
    streamJson.latitude = parseFloat((strArr[2].substring(strArr[2].indexOf(':') + 1)).replace(',', '.'));
    streamJson.longitude = parseFloat((strArr[3].substring(strArr[3].indexOf(':') + 1)).replace(',', '.'));
    streamJson.initial_persons = strArr[4].substring(strArr[4].indexOf(':') + 1);
    streamJson.persons_down = strArr[5].substring(strArr[5].indexOf(':') + 1);
    streamJson.persons_up = strArr[6].substring(strArr[6].indexOf(':') + 1);

    return streamJson;
}

function getRecords() {
    return new Promise((resolve, reject) => {
        connection.query('SELECT * FROM `record`', function(error, results, fields) {
            if (error)
                reject(error);

            resolve(results);
        });
    });
}