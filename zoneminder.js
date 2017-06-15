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



module.exports = ZoneMinder;

function ZoneMinder() {

    this._Version;
    this._API_Version;


    this.API_Request = function(URL,Callback) {
        http_options.path = parsedurl.path+URL;
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
                        Callback(data);
                    }
                );
            }
        );
        request.on(
            "error",
            function (err) {
                console.error("ERROR:" + err);
            }
        );
        request.end();
    }

    this.RequestVersion = function (result) {
        this.API_Request('/api/host/getVersion.json', function (data) {
            var fbResponse = JSON.parse(data);
            _Version = fbResponse.version;
            _API_Version = fbResponse.apiversion;
            result(fbResponse.version,fbResponse.apiversion);
        });
    }

    this.RequestMonitorsList = function (result) {
        this.API_Request('/api/monitors.json', function (data) {
            //console.log("STATUS:" + response.statusCode);
            //console.log("  DATA:" + data);
            var fbResponse = JSON.parse(data);
            for (var i = 0; i < fbResponse.monitors.length; i++) {
                result(fbResponse.monitors[i].Monitor);
            }

        });
    }

    this.RequestStates = function (result) {
        this.API_Request('/api/states.json', function (data) {
            //console.log("STATUS:" + response.statusCode);
            //console.log("  DATA:" + data);
            var fbResponse = JSON.parse(data);
            for (var i = 0; i < fbResponse.monitors.length; i++) {
                result(fbResponse.monitors[i].Monitor);
            }

        });
    }


    /*
    curl -XGET  http://server/zm/api/states.json # returns list of run states
        curl -XPOST  http://server/zm/api/states/change/restart.json #restarts ZM
        curl -XPOST  http://server/zm/api/states/change/stop.json #Stops ZM
        curl -XPOST  http://server/zm/api/states/change/start.json #Starts ZM
    */

this.Login = function (Host, User, Pass, AutoRetInfo, Done) {
    Host_Url = Host;
    Username = User;
    Password = Pass;

    var url = require( "url" );

    parsedurl = url.parse( Host);

    http_options = {
        hostname: parsedurl.hostname,
        port: ( parsedurl.port || 80 ), // 80 by default
        method: 'GET',
        path: parsedurl.path+'/index.php?username='+Username+'&password='+Password+'&action=login&view=console',
        headers: { },
    };

    var CallBack = function(){
        this.RequestVersion(Done);
    }.bind(this);

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
                function ( chunk ) { data += chunk; }
            );

            if (AutoRetInfo)
                response.on(
                    "end",CallBack
                );
            else {
                response.on(
                    "end",
                    Done
                );

            }
        }
    );

    request.on(
        "error",
        function( err ) {
            console.error( "ERROR:" + err );
        }
    );
    request.end();
}

this.Version = function () {
    return _Version;
}

this.API_Version = function () {
    return _API_Version;
}






this.Send = function(id,value, monitorID) {
//    curl -XPOST http://server/zm/api/monitors/1.json -d "Monitor[Function]=Modect&Monitor[Enabled]=1"
    monitorID = 9;
    var post_data = "Monitor["+id+"]="+value;
    //var post_data = 'Monitor[Enabled]=1';
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