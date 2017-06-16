/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";



// you have to require the utils module and call adapter function
var utils =    require(__dirname + '/lib/utils'); // Get common adapter utils
var ZoneMinder = require(__dirname + '/zoneminder');
var Zone = new ZoneMinder();

// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.template.0
var adapter = utils.adapter('zoneminder');

var IntervalObj;

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', function (callback) {

    clearInterval(IntervalObj);
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
    adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
});

// is called if a subscribed state changes
adapter.on('stateChange', function (id, state) {
    // Warning, state can be null if it was deleted
//    adapter.log.info('stateChange ' + id + ' ' + JSON.stringify(state));

    // you can use the ack flag to detect if it is status (true) or command (false)
    if (!state.ack) {
        adapter.getObject(id, function (err, obj) {
            if (obj & obj.common.write) {
                var Monitor = id.replace('.' + obj.common.name, '');
                adapter.getState(Monitor+'.Id',function (err, state2) {
                    if (state) {
                        Zone.Send(obj.common.name,state.val,state2.val);
                    }
                });
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
    adapter.log.info('config host: ' + adapter.config.host);
    adapter.log.info('config user: ' + adapter.config.user);
    adapter.log.info('config pass: ' + adapter.config.password);


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

    function intervalFunc () {
        if (!Zone.isConnected) {
            Zone.Login(adapter.config.host,adapter.config.user,adapter.config.password, function(Result){
                adapter.setState("Connected", {val: Result, ack: true});
                if (!Result)
                    adapter.log.error(Zone.getError());
                else {
                    if (!Zone.RequestVersion(function () {
                            adapter.setState("ZoneMinder_api_version", {val: Zone.API_Version(), ack: true});
                            adapter.setState("ZoneMinder_version", {val: Zone.Version(), ack: true});
                        }))
                        adapter.log.error(Zone.getError());
                    }
                });
        }
         else  {
            Zone.RequestMonitorsList(AddMonitor);
        }
    }

    IntervalObj = setInterval(intervalFunc, adapter.config.polling);


function AddMonitor(Mon) {

    adapter.setObjectNotExists('Monitors.'+Mon.Name, {
        type: 'device',
        common: {
            name: Mon.Name,
            type: typeof attrValue ,
            role: 'indicator'
        },
        native: {}
    });

    for (var key in Mon) {
        var attrName = key;
        var attrValue = Mon[key];

        adapter.setObjectNotExists('Monitors.'+Mon.Name+"."+attrName, {
            type: 'state',
            common: {
                name: attrName,
                type: typeof attrValue ,
                role: 'indicator'
            },
            native: {}
        });

        adapter.setState('Monitors.'+Mon.Name+"."+attrName, {val: attrValue, ack: true});
    }
}


    // in this template all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');

    // examples for the checkPassword/checkGroup functions
    adapter.checkPassword('admin', 'iobroker', function (res) {
        console.log('check user admin pw ioboker: ' + res);
    });

    adapter.checkGroup('admin', 'admin', function (res) {
        console.log('check group user admin group admin: ' + res);
    });



}
