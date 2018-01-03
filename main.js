"use strict";

const
    electron = require('electron'),
    Conf = require('conf'),
    config = new Conf(),
    fs = require('fs'),
    // Module to control application life.
    app = electron.app,
    jetpack = require('fs-jetpack'),
    moment = require('moment'),
    ipc = require('electron').ipcMain,
    dialog = require('electron').dialog,
    // Module to create native browser window.
    BrowserWindow = electron.BrowserWindow

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow() {
    // var bgColor = ('Wheit' == config.get('theme')) ? '#ffffff' : '#1e1e1e'

    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        backgroundColor: 'white',
        icon: 'img/logo.png'
    })

    mainWindow.setMenu(null);

    // and load the index.html of the app.
    mainWindow.loadURL(`file://${__dirname}/index.html`)
    
    mainWindow.webContents.openDevTools();

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
    }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

/*
line{
    id: 0,
    date: Date,
    start: 1/0
}

employee{
    id: 0,
    name: ""
}
*/

function parseLines(file){
    let lines = file.split("\n");
    let parsedLines = [];
    for(let line of lines){
        if(line.trim()){
            // dont include empty lines 
            parsedLines.push(parseLine(line));  
        }
    }
    return parsedLines;
}

function parseLine(line){
    // moment.format("YYYY-MM-DD HH:MM:SS");
    let arr = line.trim().split(/[\s,;\t]+/);   // tabs or spaces 

    if(parseInt(arr[0]) == NaN || parseInt(arr[3]) == NaN){
        throw "something is wrong with the file, did you edit the file?"
    }
// console.log(`${arr[1]} ${arr[2]}`);
    return {
        id: arr[0],
        date: moment(`${arr[1]} ${arr[2]}`),
        start: arr[4] == 1 ? true : false
    }
}

let parsedLines;
function handleFileSelected(filePath){
    let file = jetpack.read(filePath[0])
    parsedLines = parseLines(file);
    generateMappingByYearMonth()
}

ipc.on('generate-file', function (event, data) {
    generateMappingByYearMonth(data.year, data.month);
})

function generateMappingByYearMonth(year, month){
    // shift that starts at end of month and ends at begining of month is added to the new month
    month--;
    const subset = parsedLines.filter(e => e.date.month() == month && e.date.year() == year);
    console.log("===========================");
    console.log(subset);

    
    // TODO handle overlapping between months 
    /*
    get the day before, remove all the shifts that ended before the new day 
    attach them to the start of the lines 
    */
    // get previous day of first month and then remove shifts that ended on that day and include the rest in the list
    
    // find previous month
    const prevMonth = (month + 12 - 1) % 12;
    let prevYear = year;
    if(prevMonth == 11){
        prevYear--;
    }
    console.log(parsedLines);
    const lastDayOfMonth = moment(`${prevYear}-${prevMonth}`).daysInMonth();
    // get all shifts on that day 
    const shiftsInLastDayOfMonth = parsedLines.filter(e => {
        const b = e.date.month() == prevMonth && 
        e.date.year() == prevYear && 
        e.date.day() == lastDayOfMonth;
        // console.log(b, e.date.year(), e.date.month(), e.date.day());
        return b;
    }
    );
    
    console.log(prevYear, prevMonth, lastDayOfMonth, shiftsInLastDayOfMonth);
    cleanShiftsFromLastDay(shiftsInLastDayOfMonth);

    calculateTimes(subset);
}

function cleanShiftsFromLastDay(lines){
    const idsInTime =  [...new Set(lines.map(item => item.id))]; 
    const elementsToDelete = [];
    
    for(const id of idsInTime){
        let lookingForEndShift = false;
        let shiftStartLine = null;
        
        for(const line of lines){
            if(line.id == id){
                if(line.start && !lookingForEndShift){
                    lookingForEndShift = true;
                    shiftStartLine = line;
                }
                else if(!line.start && !lookingForEndShift){
                    // found an end time of shift without a start time 
                    elementsToDelete.push(line);
                }
                else if(!line.start && lookingForEndShift){
                    lookingForEndShift = false;
                    elementsToDelete.push(line, shiftStartLine);
                }
            }
        }
    }

    console.log("before", lines);
    for(let element of elementsToDelete){
        const index = array.indexOf(element);
        
        if (index !== -1) {
            lines.splice(index, 1);
        }
    }
    console.log("after", lines);

}

const ENDBEFORESTART = `shift ended before it started`;
const WITHOUTEND = `shift started but didn't end`;

function calculateTimes(lines){
    const idsInTime =  [...new Set(lines.map(item => item.id))]; 
    const idHoursMap = generateIdHoursMap(idsInTime);
    const errorLines = [];
    
    console.log(idsInTime,idHoursMap);

    for(const id of idsInTime){
        let lookingForEndShift = false;
        let shiftStartLine = null;
        let lastLine = null;

        for(const line of lines){
            lastLine = line;
            if(line.id == id){
                if(line.start && !lookingForEndShift){
                    lookingForEndShift = true;
                    shiftStartLine = line;
                }
                else if(!line.start && !lookingForEndShift){
                    // found an end time of shift without a start time 
                    console.log(`shift ended before it started line:`, line);
                    errorLines.push({problem: ENDBEFORESTART, date: line.date.format("YYYY-MM-DD HH:MM:SS"), id: line.id, start: line.start});
                }
                else if(!line.start && lookingForEndShift){
                    lookingForEndShift = false;
                    const diffHours = moment.duration(line.date.diff(shiftStartLine.date)).asHours();
                    fillHoursPerShift(idHoursMap.get(id), diffHours);
                }
            }
        }

        if(lookingForEndShift){
            // theres a start of shift without an end 
            console.log(`theres a start of shift without an end:`, shiftStartLine);
            errorLines.push(Object.assign({problem: WITHOUTEND, }, lastLine));
        }
    }

    console.log(errorLines);
    mainWindow.webContents.send('error-lines', errorLines);
}

// todo save data as csv file in the same folder as the source with file name year-month

function fillHoursPerShift(employeeHourSum, shiftHours) {
    employeeHourSum.totalHours += shiftHours;

    let remainder = shiftHours - 12;
    employeeHourSum.h12 += remainder;
    shiftHours -= remainder;

    remainder = shiftHours - 10;
    employeeHourSum.h10_12 += remainder;
    shiftHours -= remainder;

    remainder = shiftHours - 8;
    employeeHourSum.h8_10 += remainder;
    shiftHours -= remainder;

    employeeHourSum.h8 += shiftHours;
}

function generateIdHoursMap(idsInTime) {
    return new Map(idsInTime.map((i) => [i, {
        id: i,
        totalHours: 0,
        h8: 0,
        h8_10: 0,
        h10_12: 0,
        h12: 0,
    }]));
}

ipc.on('open-file-dialog', function (event) {
  dialog.showOpenDialog({
    properties: ['openFile']
  }, function (files) {
    if (files) {
        event.sender.send('select-file', files)
        handleFileSelected(files)
    }
  })
})

