$(function () {

    const
        {dialog} = require('electron').remote,
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
        // // Check if "Wheit" (Light) theme is selected
        // if ('Bläk' == config.get('theme')) {
        //     $('head link#styleSheet').attr('href', 'css/example_dark.css');
        // }

        // $('.header.row.navi').html(loadTemplate('cmdBox', {}));

        // $('footer').prepend('<img src="img/logo.png" height="24px"/> ' + pjson.productName + ' ' + pjson.version + ' - ');

        initContent()

        // // Setup buttons
        // var cmdBox = $('.cmdBoxNavi');

        // cmdBox.find('[data-toggle=config]').on('click', function () {
        //     showConfig();
        // });

        // cmdBox.find('[data-toggle=reload]').on('click', function () {
        //     //reload();
        //     initContent(loadTemplate('alert', {type:'info', message:'Reload finished.'}));
        // });

        // cmdBox.find('[data-toggle=theme]').on('click', function () {
        //     var e = $('head link#styleSheet');

        //     if (e.attr('href').indexOf('dark') > 0) {
        //         e.attr('href', 'css/example.css');
        //     } else {
        //         e.attr('href', 'css/example_dark.css');
        //     }
        // });

        // const lines = [{id: 1, date: new Date(), isStart: true,  problem: "asdasf"},
        //     {id: 1, date: new Date(), isStart: true, problem: "asdasf"},
        //     {id: 1, date: new Date(), isStart: true,  problem: "asdasf"}];
        // fillTable(lines)
    }

    /**
     * Load a ejs template.
     *
     * @param name
     * @param object
     *
     * @returns {String}
     */
    function loadTemplate(name, object) {
        var tpl = fs.readFileSync(__dirname + '/partials/' + name + '.ejs');
        return ejs.render(tpl.toString(), object);
    }

    function initContent(message) {
        $('#header').html('<h2><img src="img/logo.png" height="70px"/> ' + pjson.productName + ' <code>' + pjson.version + '</code></h2>');
        $('#content').html(loadTemplate('alert', {type:'info', message:'Hey there&hellip;'}));
        initDropDowns();
        if (message) {
            $('#console').html(message);
        }
    }

    /**
     * Show the configuration.
     */
    // function showConfig() {
    //     $('#header').html('<h3><img src="img/logo.png" height="70px"/> Configuration</h3>');
    //     $('#content').html(loadTemplate('config', {o:config}));
    //     $('#console').html('');

    //     $('#btnSaveConfig').on('click', function () {
    //         saveConfig();
    //     });

    //     $('#cfgTheme').on('change', function () {
    //         var e = $('head link#styleSheet');

    //         if ('Bläk' == $(this).val()) {
    //             e.attr('href', 'css/example_dark.css');
    //         } else {
    //             e.attr('href', 'css/example.css');
    //         }
    //     });
    // }

    /**
     * Save the configuration.
     */
    // function saveConfig() {
    //     var examplePath = $('#cfgExample').val(),
    //         theme = $('#cfgTheme').val(),
    //         debug = $('#cfgDebug').is(':checked') ? true : false;

    //     if (false == fs.existsSync(examplePath)) {
    //         dialog.showErrorBox('Invalid Path', 'The example directory path is invalid');
    //         return;
    //     }

    //     config.set('examplePath', examplePath);
    //     config.set('debug', debug);
    //     config.set('theme', theme);

    //     initContent(loadTemplate('alert', {type:'info', message:'Config saved.'}));
    // }

    // file select     
    const selectDirBtn = document.getElementById('select-file')
    
    selectDirBtn.addEventListener('click', function (event) {
      ipc.send('open-file-dialog')
    })
    
    ipc.on('selected-directory', function (event, path) {
      document.getElementById('selected-file').innerHTML = `You selected: ${path}`
    })

    function initDropDowns(){
        const year = 2017;// TODO change back 
        const tillYear = 2050;
        var options = "";
        for(var y=year; y<=tillYear; y++){
        options += "<option>"+ y +"</option>";
        }
        document.getElementById("year").innerHTML = options;

        const month = 11;
        const tillMonth = 12;
        options = "";
        for(let m=month; m<=tillMonth; m++){
        options += "<option>"+ m +"</option>";
        }
        document.getElementById("month").innerHTML = options;
    }

    // TODO send data after parsing the file 
    function fillTable(lines){
        const table = document.getElementById("error-line-table");
        
        for(let l of lines){
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

    function emptyTable(){
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
