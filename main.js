"use strict";

const
    electron = require('electron'),
    fs = require('fs'),
    // Module to control application life.
    app = electron.app,
    jetpack = require('fs-jetpack'),
    path = require('path'),
    moment = require('moment'),
    ipc = require('electron').ipcMain,
    dialog = require('electron').dialog,
    Config = require('electron-config'),
    config = new Config(),
    papaparse = require('papaparse'),
    // electronInstaller = require('electron-winstaller'),
    // Module to create native browser window.
    BrowserWindow = electron.BrowserWindow

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow() {
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

    // mainWindow.webContents.openDevTools();

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


function parseLines(file) {
    let lines = file.split("\n");
    let parsedLines = [];
    for (let line of lines) {
        if (line.trim()) {
            // dont include empty lines 
            parsedLines.push(parseLine(line));
        }
    }
    return parsedLines;
}

// 0 means start of shift, 1 is shift end

const ShiftStart = true;
const ShiftEnd = false;
function parseLine(line) {
    // date format: "YYYY-MM-DD hh:mm:ss"
    let arr = line.trim().split(/[\s,;\t]+/);   // tabs or spaces 

    if (parseInt(arr[0]) == NaN || parseInt(arr[3]) == NaN || arr.length != 7) {
        dialog.showErrorBox("Something is wrong with the file", "Did you edit the file?\nMake sure it's in the same format as the other lines");
    }
    // let x = moment(`${arr[1]} ${arr[2]}`);
    // console.log(x.toString())
    // console.log(x.format("YYYY-MM-DD HH:mm:ss"))
    return {
        id: arr[0],
        date: moment(`${arr[1]} ${arr[2]}`),
        start: arr[4] == 0 ? ShiftStart : ShiftEnd
    }
}

ipc.on('generate-file', function (event, data) {
    generateMappingByYearMonth(data.year, data.month);
})

function generateMappingByYearMonth(year, month) {
    // shift that starts at end of month and ends at begining of month is added to the new month
    month--;
    const subset = parsedLines.filter(e => e.date.month() == month && e.date.year() == year);

    if (subset.length == 0) {
        // todo send error message to renderer
        dialog.showErrorBox("No entries on that month", "");
        return;
    }

    /*
    get the day before, remove all the shifts that ended before the new day 
    attach them to the start of the lines 
    */
    const lineDateCopy = subset[0].date.clone();
    const lastDayOfMonth = lineDateCopy.subtract(1, 'months').endOf('month');

    // get all shifts on that day 
    const shiftsInLastDayOfMonth = parsedLines.filter(e =>
        e.date.month() == lastDayOfMonth.month() &&
        e.date.year() == lastDayOfMonth.year() &&
        e.date.date() == lastDayOfMonth.date()
    );

    cleanShiftsFromLastDay(shiftsInLastDayOfMonth);
    const fullSubset = shiftsInLastDayOfMonth.concat(subset);
    calculateTimes(fullSubset);
}

function cleanShiftsFromLastDay(lines) {
    const idsInTime = [...new Set(lines.map(item => item.id))];
    const elementsToDelete = [];

    for (const id of idsInTime) {
        let lookingForEndShift = false;
        let shiftStartLine = null;

        for (const line of lines) {
            if (line.id == id) {
                if (line.start && !lookingForEndShift) {
                    lookingForEndShift = true;
                    shiftStartLine = line;
                }
                else if (!line.start && !lookingForEndShift) {
                    // found an end time of shift without a start time 
                    elementsToDelete.push(line);
                }
                else if (!line.start && lookingForEndShift) {
                    lookingForEndShift = false;
                    elementsToDelete.push(line, shiftStartLine);
                }
            }
        }
    }

    for (let element of elementsToDelete) {
        const index = lines.indexOf(element);
        if (index !== -1) {
            lines.splice(index, 1);
        }
    }
}

const ENDBEFORESTART = `shift ended before it started`;
const WITHOUTEND = `shift started but didn't end`;

function calculateTimes(lines) {
    const idsInTime = [...new Set(lines.map(item => item.id))];
    const idHoursMap = generateIdHoursMap(idsInTime);
    const errorLines = [];

    // console.log(idsInTime, idHoursMap);

    for (const id of idsInTime) {
        let lookingForEndShift = false;
        let shiftStartLine = null;
        let lastLine = null;

        for (const line of lines) {
            lastLine = line;
            if (line.id == id) {
                if (line.start && !lookingForEndShift) {
                    lookingForEndShift = true;
                    shiftStartLine = line;
                }
                else if (!line.start && !lookingForEndShift) {
                    // found an end time of shift without a start time 
                    // console.log(ENDBEFORESTART, line);
                    errorLines.push(lineToErrorDTO(line, ENDBEFORESTART));
                }
                else if (!line.start && lookingForEndShift) {
                    lookingForEndShift = false;
                    const diffHours = moment.duration(line.date.diff(shiftStartLine.date)).asHours();
                    fillHoursPerShift(idHoursMap.get(id), diffHours);
                }
            }
        }

        if (lookingForEndShift) {
            // theres a start of shift without an end 
            // console.log(WITHOUTEND, shiftStartLine);
            errorLines.push(lineToErrorDTO(shiftStartLine, WITHOUTEND));
            // console.log('\n\n', errorLines)
        }
    }

    // console.log(errorLines);
    mainWindow.webContents.send('error-lines', errorLines);
    saveDataInFile(idHoursMap, lines[lines.length - 1].date.format("YYYY-MM"));
}

function lineToErrorDTO(line, problem) {
    const DTO = {
        problem: problem,
        date: line.date.format("YYYY-MM-DD HH:mm:ss"),
        id: line.id,
        start: line.start
    }

    return DTO;
}

// save data as csv file in the same folder as the source with file name year-month
function saveDataInFile(idHoursMap, dateString) {
    const header = 'ID, Name, Shifts, Total Hours, upto 8, 8-10, 10-12, 12+\n'
    const employeeIdNameMap = config.get("employeeIdNameMap");
    // console.log(employeeIdNameMap)
    const splitStream = [dateString.concat('\n'), header];
    for (let e of idHoursMap) {
        if (e) {
            const tentativeName = employeeIdNameMap.find(elem => elem.id == e[0]);
            const name = tentativeName ? tentativeName.name : '';

            // console.log(name, tentativeName, e[0]);

            splitStream.push(`${e[0]}, ${name}, ${e[1].shiftCount}, ${e[1].totalHours}, ${e[1].h8}, ${e[1].h8_10}, ${e[1].h10_12}, ${e[1].h12} \n`)
        }
    }

    const stream = splitStream.join('');
    const dirPath = path.dirname(saveFilePath);
    const newFilePath = dirPath.concat(`\\${dateString} Employee Hours.csv`);
    // console.log(newFilePath);
    jetpack.write(newFilePath, stream);
}

function fillHoursPerShift(employeeHourSum, shiftHours) {
    employeeHourSum.totalHours += shiftHours;

    let remainder = shiftHours - 12;
    remainder = remainder > 0 ? remainder : 0;
    employeeHourSum.h12 += remainder;
    shiftHours -= remainder;

    remainder = shiftHours - 10;
    remainder = remainder > 0 ? remainder : 0;
    employeeHourSum.h10_12 += remainder;
    shiftHours -= remainder;

    remainder = shiftHours - 8;
    remainder = remainder > 0 ? remainder : 0;
    employeeHourSum.h8_10 += remainder;
    shiftHours -= remainder;

    employeeHourSum.h8 += shiftHours > 0 ? shiftHours : 0;

    employeeHourSum.shiftCount++;
}

function generateIdHoursMap(idsInTime) {
    return new Map(idsInTime.map((i) => [i, {
        id: i,
        totalHours: 0,
        h8: 0,
        h8_10: 0,
        h10_12: 0,
        h12: 0,
        shiftCount: 0,
    }]));
}

let parsedLines;
let saveFilePath;
function handleFileSelected(filePath) {
    let file = jetpack.read(filePath[0]);
    parsedLines = parseLines(file);
    saveFilePath = filePath[0];
}

ipc.on('open-file-dialog', function (event) {
    dialog.showOpenDialog({
        properties: ['openFile']
    }, function (files) {
        if (files) {
            handleFileSelected(files)
        }
    })
})

/*
example of a file data:
name,id
asdasd, 1
weqrew, 2
xcvxcv, 5
*/
function handleEmployeeIdFile(filePath) {
    const data = jetpack.read(filePath[0]).replace(/ /g, '');
    const parsedData = papaparse.parse(data, {
        header: true,
        dynamicTyping: true
    })

    config.set("employeeIdNameMap", parsedData.data);
}

ipc.on('employee-id-file', (e) => {
    dialog.showOpenDialog({
        properties: ['openFile']
    }, function (files) {
        if (files) {
            handleEmployeeIdFile(files)
        }
    })
})