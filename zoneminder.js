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

var Error = "";

module.exports = ZoneMinder;

function ZoneMinder() {

    var LoggedIn = false;

    this._Version;
    this._API_Version;
    this.isConnected = false;


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
            result(id, JSON.parse(data).status);
        });
    }

    this.RequestVersion = function (result) {
        return this.API_Request('/api/host/getVersion.json', function (data) {
            var fbResponse = JSON.parse(data);
            _Version = fbResponse.version;
            _API_Version = fbResponse.apiversion;
            result();
        });
    }

    this.RequestMonitorsList = function (result) {
        return this.API_Request('/api/monitors.json', function (data) {
            //console.log("STATUS:" + response.statusCode);
            //console.log("  DATA:" + data);
            var fbResponse = JSON.parse(data);
            for (var i = 0; i < fbResponse.monitors.length; i++) {
                result(fbResponse.monitors[i].Monitor);
            }

        });
    }


this.Login = function (Host, User, Pass, Done) {
    Host_Url = Host;
    Username = User;
    Password = Pass;

    Error = "";

    var url = require( "url" );

    parsedurl = url.parse( Host);

    var Callback = function (data) {
        this.isConnected= !(data.indexOf("var failed = true;") !== -1);
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

this.Send = function(id,value, monitorID) {

    var post_data = "Monitor["+id+"]="+value;

    var http = require( "http" );
    var options = {
        hostname: parsedurl.hostname,
        port: ( parsedurl.port || 80 ), // 80 by default
        path: parsedurl.path+'/api/monitors/'+monitorID+'.json',
        method: 'POST',
        headers: {
            'User-Agent': 'iobroker.zoneminder',
            'Referer': 'localhost',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': CookieAllInOne
        }
    };

    var post_req = http.request(options, function(res) {
        console.log('Status: ' + res.statusCode);
        console.log('Headers: ' + JSON.stringify(res.headers));
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
}