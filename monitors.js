/**
 * Created by root on 24.06.17.
 */

module.exports = Monitors;

function Monitors() {
    var Zones = require(__dirname + '/zones');
    //var MonitorZones = new Zones();

    var List = [];

    this.Add = function (Mon) {
        //List.push(Mon)
        List.push({ Mon: Mon, State: -1,Zones : new Zones() });
    }

    this.AddOrUpdate = function(Mon, onStateChange) {
        var Res = this.GetIndexByZoneMinderID(Mon.Id);
        if (Res == -1) {
            this.Add(Mon);
            for (var key in Mon)
                onStateChange(Mon,key,Mon[key],true);
        }
        else {
            var ExistingMon = this.Get(Res);
            for (var key in Mon)
                if (Mon[key] != ExistingMon[key])
                    onStateChange(Mon,key,Mon[key],false);
            this.Set(Res,Mon);
        }
    }

    this.Count = function() {
        return List.length;
    }

    this.Get = function(index) {
        return List[index].Mon;
    }

    this.GetState = function(index) {
        return List[index].State;
    }

    this.SetState = function(index,value) {
        List[index].State = value;
    }


    this.Set = function(index, Mon) {
        List[index].Mon = Mon;
    }

    this.Delete = function (index) {
        List.splice(index, 1);
    }

    this.GetByZoneMinderID = function(id) {
        for (var i = 0 ; i < List.length ; i++)
            if (List[i].Mon.Id == id )
                return List[i].Mon;
        return null;
    }

    this.GetZonesByZoneMinderID = function(id) {
        for (var i = 0 ; i < List.length ; i++)
            if (List[i].Mon.Id == id )
                return List[i].Zones;
        return null;
    }

    this.GetIndexByZoneMinderID = function(id) {
        for (var i = 0 ; i < List.length ; i++)
            if (List[i].Mon.Id == id )
                return i;
        return -1;
    }

    this.GetIndexByMonitorName = function(MonitorName) {
        for (var i = 0 ; i < List.length ; i++)
            if (List[i].Mon.Name == MonitorName )
                return i;
        return -1;
    }

}



