/**
 * Created by root on 12.06.17.
 */

var Host_Url = "";
var Username = "";
var Password = "";
var cookies;
var http_options;
var parsedurl;
var setcookie;
var CookieAllInOne = "";
var http = require( "http" );


var Zones = require(__dirname + '/zones');



var Error = "";

module.exports = ZoneMinder;

function ZoneMinder() {

    var LoggedIn = false;

    this._Version;
    this._API_Version;
    this.isConnected = false;

    var Monitors = require(__dirname + '/monitors');
    Monitors = new Monitors();

    this.Monitors = function () {
        return Monitors;
    }


    this.API_Request = function(URL,Callback) {
        Error = "";
        if (!this.isConnected)
            {
                Error = "Can't request "+URL+". Not connected...";
                return false;
            }
        else try {
            http_options.path = parsedurl.path + URL;
            http_options.headers = {
                'User-Agent': 'iobroker.zoneminder',
                'Referer': 'localhost',
                'Cookie': CookieAllInOne
            }
            var request = http.request(
                http_options,
                function (response) {
                    var data = "";
                    response.on(
                        "data",
                        function (chunk) {
                            data += chunk;
                        }
                    );
                    response.on(
                        "end",
                        function () {
                            var fbResponse = JSON.parse(data);
                            if (fbResponse.success == false) {
                                Error = fbResponse.data.message;
                                LoggedIn = false;
                            }
                            Callback(data);
                        }
                    );
                }
            );
            request.on(
                "error",
                function (err) {
                    LoggedIn = false;
                    Error = 'Error on connect:' + err;
                    console.error("ERROR:" + err);
                }
            );
            request.end();
            return true;
        }
        catch (err) {
            console.log(err);
        }

    }

    this.RequestMonitorState = function(id,result) {
        return this.API_Request('/api/monitors/alarm/id:'+id+'/command:status.json', function (data) {
            var fbResponse = JSON.parse(data);
            var Index = this.Monitors().GetIndexByZoneMinderID(id);
            var ActState = JSON.parse(data).status;
            if (this.Monitors().GetState(Index) != ActState) {
                this.Monitors().SetState(Index, ActState);
                result(id, ActState);
            }

        }.bind(this));
    }

    this.RequestVersion = function (result) {
        return this.API_Request('/api/host/getVersion.json', function (data) {
            var fbResponse = JSON.parse(data);
            _Version = fbResponse.version;
            _API_Version = fbResponse.apiversion;
            result();
        });
    }

    this.RequestZones = function (onZoneChange) {
        return this.API_Request('/api/zones.json', function (data) {
        //console.log("STATUS:" + response.statusCode);
        //console.log("  DATA:" + data);
            var fbResponse = JSON.parse(data);
            for (var i = 0; i < fbResponse.zones.length; i++) {
                var Zones = this.Monitors().GetZonesByZoneMinderID(fbResponse.zones[i].Zone.MonitorId);
                if (Zones)
                    Zones.AddOrUpdate(fbResponse.zones[i].Zone, function (key, value) {
                        if (onZoneChange)
                            onZoneChange(this.Monitors().GetByZoneMinderID(fbResponse.zones[i].Zone.MonitorId), fbResponse.zones[i].Zone, key, value);

                        //this.MonitorZones.AddOrUpdate(fbResponse.zones[i].Zone);
                        //result(fbResponse.zones[i].Zone);
                    }.bind(this));
            }
        }.bind(this));
    }

    this.ForceAlarm = function (MonZMId, value, result) {
        var OnOffStr = 'off';
        if (value)
            OnOffStr = 'on';
        return this.API_Request('/api/monitors/alarm/id:'+MonZMId+'/command:'+OnOffStr +'.json', function (data) {
            if (result) result();
        });
    }


    this.RequestMonitorsList = function (onStateChange, onDone) {

        return this.API_Request('/api/monitors.json', function (data) {
            //console.log("  DATA:" + data);
            var fbResponse = JSON.parse(data);
            for (var i = 0; i < fbResponse.monitors.length; i++) {
                Monitors.AddOrUpdate(fbResponse.monitors[i].Monitor,onStateChange);
                //result(fbResponse.monitors[i].Monitor);
                if (onDone)
                    onDone();
            }

        }.bind(this));
    }

    this.Login = function (Host, User, Pass, Done) {
        Host_Url = Host;
        Username = User;
        Password = Pass;

        Error = "";

        var url = require( "url" );

        parsedurl = url.parse(Host);
        var Callback = function (data) {
            this.isConnected = !(data.indexOf("var failed = true;") !== -1);
            if (!this.isConnected)
                Error = "Login failed! Check username/password";
            Done(this.isConnected);
        }.bind(this);

        var Callback_Error = function (err) {
            this.isConnected = false;
            Error = "Error at Login:" + err;
            Done(this.isConnected);
        }.bind(this);

        http_options = {
            hostname: parsedurl.hostname,
            port: ( parsedurl.port || 80 ), // 80 by default
            method: 'GET',
            path: parsedurl.path+'/index.php?username='+Username+'&password='+Password+'&action=login&view=console',
            headers: { },
        };

        var request = http.request(
            http_options,
            function ( response ) {
                setcookie = response.headers["set-cookie"];
                if ( setcookie ) {
                    setcookie.forEach(
                        function ( cookiestr ) {
                            CookieAllInOne = CookieAllInOne + cookiestr +';';
                        }
                    );
                }

                var data = "";
                response.on(
                    "data",
                    function ( chunk ) {
                        data += chunk;
                    }
                );


                response.on(
                    "end",function () {Callback(data);});

            }
        );

        request.on(
            "error",
            Callback_Error
        );
        request.end();
    }

    this.Version = function () {
        return _Version;
    }

    this.API_Version = function () {
        return _API_Version;
    }

    this.getError = function () {
            return Error;
    }



    this.Send = function(id,value, monitorID, url,keyword) {

        var post_data = keyword+"["+id+"]="+value;

        var http = require( "http" );
        var options = {
            hostname: parsedurl.hostname,
            port: ( parsedurl.port || 80 ), // 80 by default
            path: parsedurl.path+'/api/'+url,
            method: 'POST',
            headers: {
                'User-Agent': 'iobroker.zoneminder',
                'Referer': 'localhost',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': CookieAllInOne
            }
        };

        var post_req = http.request(options, function(res) {
            //console.log('Status: ' + res.statusCode);
            //console.log('Headers: ' + JSON.stringify(res.headers));
            res.setEncoding('utf8');

            res.on('data', function (chunk) {
                console.log('Response: ' + chunk);
            });

        });

        post_req.on('error', function(e) {
            console.log('problem with request: ' + e.message);
        });


        post_req.write(post_data);
        post_req.end();

        console.log(post_data);
    }


    this.Send_MonitorState = function(id,value, monitorID) {
        this.Send(id,value, monitorID,'monitors/'+monitorID+'.json','Monitor');
    }


    this.Send_ZoneState = function (id,value, monitorID) {
        this.Send(id,value, monitorID,'zones/'+monitorID+'.json','Zone');
    }
}