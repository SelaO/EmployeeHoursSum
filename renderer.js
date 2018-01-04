$(function () {

    const
        { dialog } = require('electron').remote,
        Conf = require('conf'),
        config = new Conf(),
        fs = require('fs'),
        path = require('path'),
        ejs = require('ejs'),
        pjson = require('./package.json'),
        moment = require('moment'),
        ipc = require('electron').ipcRenderer

    setup()

    function setup() {
        initContent()
    }

    function initContent(message) {
        $('#header').html('<h2><img src="img/logo.png" height="70px"/> ' + pjson.productName + ' <code>' + pjson.version + '</code></h2>');
        initDropDowns();
        if (message) {
            $('#console').html(message);
        }
    }

    // file select     
    document.getElementById('select-file').addEventListener('click', function (event) {
        ipc.send('open-file-dialog')
    })

    document.getElementById('employee-id-file').addEventListener('click', function (event) {
        ipc.send('employee-id-file')
    })

    function initDropDowns() {
        const year = 2015;// TODO change back 
        const tillYear = 2050;
        var options = "";
        for (var y = year; y <= tillYear; y++) {
            options += "<option>" + y + "</option>";
        }
        document.getElementById("year").innerHTML = options;

        const month = 1;
        const tillMonth = 12;
        options = "";
        for (let m = month; m <= tillMonth; m++) {
            options += "<option>" + m + "</option>";
        }
        document.getElementById("month").innerHTML = options;
    }

    // TODO send data after parsing the file 
    function fillTable(lines) {
        const table = document.getElementById("error-line-table");

        for (let l of lines) {
            const row = table.insertRow(1);
            const cell0 = row.insertCell(0);
            const cell1 = row.insertCell(1);
            const cell2 = row.insertCell(2);
            const cell3 = row.insertCell(3);
            const cell4 = row.insertCell(4);
            cell1.innerHTML = l.id;
            cell2.innerHTML = l.date;
            cell3.innerHTML = l.start ? 1 : 0;
            cell4.innerHTML = l.problem;

            const checkbox = document.createElement("INPUT");
            checkbox.type = "checkbox";
            cell0.appendChild(checkbox);
        }
    }

    function emptyTable() {
        const table = document.getElementById("error-line-table");
        const tableHeaderRowCount = 1;
        const rowCount = table.rows.length;
        for (let i = tableHeaderRowCount; i < rowCount; i++) {
            table.deleteRow(tableHeaderRowCount);
        }
    }

    const selectDateBtn = document.getElementById('generate-file')
    selectDateBtn.addEventListener('click', function (event) {
        ipc.send('generate-file', {
            year: document.getElementById("year").value,
            month: document.getElementById("month").value
        })
    })

    ipc.on('error-lines', function (event, data) {
        // clean the table 
        emptyTable();
        console.log("DATA", data);
        fillTable(data);
    })
});
