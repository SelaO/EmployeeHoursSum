# Sum Employee Hours Electron App

Input is a file with data on employee shifts, like this:

```
        5	2017-11-08 07:54:43	1	0	0	0
        1	2017-11-08 12:30:45	1	0	0	0
        5	2017-11-08 16:56:25	1	1	0	0
        6	2017-11-08 17:03:12	1	1	0	0
        6	2017-11-09 07:28:41	1	0	0	0
        5	2017-11-09 08:15:30	1	0	0	0
```

The app let's the user choose year and month and sum the times of the shifts whilst finding errors in them.
It outputs a CSV file for easy excel use. 

It's also possible to choose an id-name map file, it will save that information so it can be done once.

example of this file's data:
```
name,id
Alice, 1
Bob, 2
```

## Installation

    yarn install
    yarn start
    
Using electromon is reccomended as well: 

    npm i -g electromon
    electromon .

## Screens

![screen](https://i.imgur.com/u9vPXv0.png)
