/**
 * Created by root on 23.06.17.
 */



function Zones() {

    var ZonesList = [];

    this.indexOf = function(Zone) {
        for (var i = 0; i< ZonesList.length; i++)
            if (ZonesList[i].Id == Zone.Id)
                return i;
        return -1;
    }

    this.Add = function (Zone) {
        return ZonesList.push(Zone);
    }

    this.AddOrUpdate = function(Zone, onZoneChange) {
        if (this.indexOf(Zone) > -1) {
            var LocZone = ZonesList[this.indexOf(Zone)];
            for (var key in Zone)
                if (LocZone[key] != Zone[key])
                    onZoneChange(key, Zone[key])
            ZonesList[this.indexOf(Zone)] = Zone;
        }
        else {
            this.Add(Zone);
            if (onZoneChange)
                for (var key in Zone)
                    onZoneChange(key, Zone[key])
        }



    }



}

module.exports = Zones;