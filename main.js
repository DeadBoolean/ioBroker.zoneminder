/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";



// you have to require the utils module and call adapter function
var utils = require('@iobroker/adapter-core'); // Get common adapter utils
var ZoneMinder = require(__dirname + '/zoneminder');
var Zone = new ZoneMinder();


var StateStrings = ['idle','prealarm','alarm','alert','tape'];


// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.template.0
var adapter = utils.Adapter('zoneminder');

var UpdateMonitorsObj;
var UpdateMonitorsStateObj = null;

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', function (callback) {

    clearInterval(UpdateMonitorsObj);
    clearInterval(UpdateMonitorsStateObj);

    Zone.Connected = false;
    try {
        adapter.log.info('cleaned everything up...');
        callback();
    } catch (e) {
        callback();
    }
});

// is called if a subscribed object changes
adapter.on('objectChange', function (id, obj) {
    // Warning, obj can be null if it was deleted

    if (obj == null) {
        id = id.replace(adapter.name+'.'+adapter.instance+'.Monitors.','');
        var index = Zone.Monitors().GetIndexByMonitorName(id);
        if (index > -1)
            Zone.Monitors().Delete(index);
    }
});

// is called if a subscribed state changes
adapter.on('stateChange', function (id, state) {
    // Warning, state can be null if it was deleted

    if (state && !state.ack) {
        adapter.getObject(id, function (err, obj) {
            if (obj) {
                switch (obj.common.statetyp) {
                    case "alarm" :
                        Zone.ForceAlarm  (obj.common.parentMonZMId, state.val);
                        break;
                    case "monitor" :
                        Zone.Send_MonitorState (obj.common.name,state.val,obj.common.parentMonZMId);
                        break;
                    case "zone" :
                        Zone.Send_ZoneState (obj.common.name,state.val,obj.common.parentZoneZMId);
                        break;
                }


            }
        });
    }
});

// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
adapter.on('message', function (obj) {
    if (typeof obj == 'object' && obj.message) {
        if (obj.command == 'send') {
            // e.g. send email or pushover or whatever
            console.log('send command');
            // Send response in callback if required
            if (obj.callback) adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
        }
    }
});

// is called when databases are connected and adapter received configuration.
// start here!
adapter.on('ready', function () {
    main();
});

function main() {

    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // adapter.config:

    var LocalMonitorNames = [];
    var LocalMonitorObjects = [];
    var LocalMonitorIDs = [];

    adapter.setObject('Connected', {
        type: 'state',
        common: {
            name: 'Connected',
            type: 'string',
            role: 'indicator',
            write: false
        },
        native: {}
    });
    adapter.setState('Connected', {val: false, ack: true});

    adapter.setObject('ZoneMinder_version', {
        type: 'state',
        common: {
            name: 'ZoneMinder Version',
            type: 'string',
            role: 'indicator',
            write: false
        },
        native: {}
    });

    adapter.setObject('ZoneMinder_api_version', {
        type: 'state',
        common: {
            name: 'ZoneMinder API-Version',
            type: 'string',
            role: 'indicator',
            write: false
        },
        native: {}
    });

    function UpdateMonitors () {
        if (!Zone.isConnected) {
            console.log('Connecting...');
            Zone.Login(adapter.config.host.replace(/\/$/, ''),adapter.config.user,adapter.config.password, function(Result){
                adapter.setState("Connected", {val: Result, ack: true});
                console.log(Result);
                if (!Result)
                    adapter.log.error(Zone.getError());
                else {
                    if (!Zone.RequestVersion(function () {
                            adapter.setState("ZoneMinder_api_version", {val: Zone.API_Version(), ack: true});
                            adapter.setState("ZoneMinder_version", {val: Zone.Version(), ack: true});
                            Zone.RequestMonitorsList(onMonitorStateChange, onMonitorUpdateDone);
                        }))
                        adapter.log.error(Zone.getError());
                    }
                });
        }
        else {
            Zone.RequestMonitorsList(onMonitorStateChange,onMonitorUpdateDone);
        }
    }

    function UpdateMonitorsStates () {
        try {
            for (var i = 0; i < Zone.Monitors().Count(); i++)
                Zone.RequestMonitorState(Zone.Monitors().Get(i).Id, UpdateState);
        }
        catch (err) {
            console.log(err);
        }
    }


    UpdateMonitorsObj = setInterval(UpdateMonitors, adapter.config.pollingMon * 1000 * 60);
    UpdateMonitorsStateObj = setInterval(UpdateMonitorsStates, adapter.config.pollingMonState * 1000);

    UpdateMonitors(); // Initial

    function UpdateState(id,state) {


        try {
            var Obj = Zone.Monitors().GetByZoneMinderID(id);

            if (Obj.Enabled == 1) {
                adapter.setState('Monitors.'+Obj.Name + '.Alarm.AlarmState', StateStrings[state],true);
            }
            else {
                adapter.setState('Monitors.'+Obj.Name + '.Alarm.AlarmState', "Monitor disabled",true);
            }


        }
        catch (err) {
            console.log(err);
        }


    }

    function onZoneChange(Mon, Zone, key, value, initial) {

        adapter.setObjectNotExists('Monitors.' + Mon.Name + '.Zones.Zone_'+Zone.Id, {
            type: 'channel',
            common: {
                name: Zone.Name,
                type: 'string',
                role: 'indicator',
                write : true
            },
            native: {}
        });

        adapter.setObjectNotExists('Monitors.' + Mon.Name + '.Zones.Zone_'+Zone.Id+'.'+key, {
            type: 'state',
            common: {
                name: key,
                type: typeof value,
                role: 'indicator',
                write : 'true',
                parentZoneMonId : 'Monitors.' + Mon.Name,
                parentZoneZMId : Zone['Id'],
                statetyp : "zone"
            },
            native: {}
        });

        adapter.setState('Monitors.' + Mon.Name + '.Zones.Zone_'+Zone.Id+'.'+key,value,true);

    }

    function onMonitorUpdateDone() {
        Zone.RequestZones(onZoneChange);
    }

    function onMonitorStateChange(Mon, key, value,initial) {

        adapter.setObjectNotExists('Monitors.' + Mon.Name, {
            type: 'device',
            common: {
                name: Mon.Name,
                type: 'string',
                role: 'indicator',
                MonID : Mon['Id'],
                write : false
            },
            native: {}
        });


        adapter.setObjectNotExists('Monitors.' + Mon.Name + '.AccessUrl', {
            type: 'state',
            common: {
                name: 'url',
                type: 'string',
                role: 'indicator',
                write: false
            },
            native: {}
        });

        var S = adapter.config.host.replace(/\/$/, '')+'/cgi-bin/nph-zms?mode=jpeg&scale=100&maxfps=30&buffer=1000&monitor='+Mon.Id+'&user='+adapter.config.user+'&pass='+adapter.config.password;

        adapter.setState('Monitors.' + Mon.Name + '.AccessUrl', {val: S, ack: true});

        adapter.setObjectNotExists('Monitors.' + Mon.Name + '.Zones', {
            type: 'channel',
            common: {
                name: 'Stati',
                type: 'string',
                role: 'indicator',
                write : false
            },
            native: {}
        });

        /*
        adapter.setObjectNotExists('Monitors.' + Mon.Name + '.States', {
            type: 'channel',
            common: {
                name: 'Stati',
                type: 'string',
                role: 'indicator',
                write : false
            },
            native: {}
        });

        adapter.setObjectNotExists('Monitors.' + Mon.Name + '.States.State', {
            type: 'state',
            common: {
                name: 'Status',
                type: 'integer',
                role: 'indicator',
                write: false
            },
            native: {}
        });
        adapter.setState('Monitors.' + Mon.Name + '.States.State', {val: '', ack: true});
        */
        adapter.setObjectNotExists('Monitors.' + Mon.Name + '.Alarm', {
            type: 'channel',
            common: {
                name: 'Alarm',
                type: 'string',
                role: 'indicator'
            },
            native: {}
        });

        adapter.setObjectNotExists('Monitors.' + Mon.Name + '.Alarm.Force', {
            type: 'state',
            common: {
                name: 'Alarm erzwingen',
                type: 'boolean',
                role: 'state',
                parentMonId : 'Monitors.' + Mon.Name,
                parentMonZMId : Mon['Id'],
                statetyp : "alarm"
            },
            native: {}
        });

        adapter.setObjectNotExists('Monitors.' + Mon.Name + '.Alarm.AlarmState', {
            type: 'state',
            common: {
                name: 'Status',
                type: 'integer',
                role: 'indicator',
                write: false
            },
            native: {}
        });
        adapter.setState('Monitors.' + Mon.Name + '.Alarm.AlarmState', {val: '', ack: true});


        adapter.setObjectNotExists('Monitors.'+Mon.Name+"."+key, {
            type: 'state',
            common: {
                name: key,
                type: typeof value ,
                role: 'indicator',
                parentMonId : 'Monitors.' + Mon.Name,
                parentMonZMId : Mon['Id'],
                statetyp : "monitor"
            },
            native: {}
        });


        if (initial)
            adapter.getState('Monitors.'+Mon.Name+"."+key,function (err, state) {
            if (!err)
                if ((state == null) || (state.val != value))
                {
                    adapter.setState('Monitors.'+Mon.Name+"."+key, {val: value, ack: true});
                }
            })
        else
            adapter.setState('Monitors.'+Mon.Name+"."+key, {val: value, ack: true});
    }


    adapter.subscribeStates('*');
    adapter.subscribeObjects('*');

}
