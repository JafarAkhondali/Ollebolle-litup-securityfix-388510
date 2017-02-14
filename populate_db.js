var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('receivers.db');
var check;

var populate_receiver_brand_protocol = true;
var populate_receiver_protocol_model = true;

/*** receiver_brand_protocol  |   Keeps connection between brand/make and tellstick protocol ***/
if (populate_receiver_brand_protocol) {
    db.serialize(function() {

        db.run("CREATE TABLE if not exists receiver_brand_protocol (brand TEXT, protocol TEXT)");
        var stmt = db.prepare("INSERT INTO receiver_brand_protocol VALUES (?, ?)");

        // arctech
        stmt.run("Arctech", "arctech");
        stmt.run("Nexa", "arctech");
        stmt.run("Proove", "arctech");
        stmt.run("Byebye Standby", "arctech");
        stmt.run("Chacon", "arctech");
        stmt.run("CoCo Technologies", "arctech");
        stmt.run("HomeEasy", "arctech");
        stmt.run("Intertechno", "arctech");
        stmt.run("Kappa", "arctech");
        stmt.run("KlikAanKlikUit", "arctech");
        stmt.run("Rusta 1", "arctech");

        // brateck
        stmt.run("Brateck", "brateck");
        stmt.run("Roxcore", "brateck");

        //everflourish
        stmt.run("Everflourish (selflearning)", "everflourish");
        stmt.run("Clas Ohlson (selflearning)", "everflourish");
        stmt.run("GAO (selflearning)", "everflourish");

        // fuhaote
        stmt.run("Fuhaote", "fuhaote");
        stmt.run("HQ", "fuhaote");
        stmt.run("Rusta 2", "fuhaote");

        // hasta
        stmt.run("Hasta", "hasta");
        stmt.run("Blinds (Hasta)", "hasta");

        // ikea
        stmt.run("IKEA", "ikea");

        // kangtai  //Tellstick NET only. Exclude for now.
        //stmt.run("Kangtai", "kangtai");
        //stmt.run("Clas Ohlson, 36-8836", "kangtai");

        // risingsun
        stmt.run("risingsun", "risingsun");
        stmt.run("Conrad (selflearning)", "risingsun");
        stmt.run("Clas Ohlson (codeswitch)", "risingsun");
        stmt.run("GAO (codeswitch)", "risingsun");
        stmt.run("Kjell & Company (codeswitch)", "risingsun");
        stmt.run("Otio (selflearning)", "risingsun");

        // sartano
        stmt.run("Sartano", "sartano");
        stmt.run("Alpha", "sartano");
        stmt.run("Brennenstuhl", "sartano");
        stmt.run("Elro", "sartano");

        // silvanchip
        stmt.run("Silvanchip", "silvanchip");
        stmt.run("Ecosavers", "silvanchip");
        stmt.run("KingPin - KP100", "silvanchip");

        // upm
        stmt.run("UPM", "upm");

        // waveman
        stmt.run("Waveman", "waveman");

        // x10
        stmt.run("X10", "x10");

        // yidong
        stmt.run("Yidong", "yidong");
        stmt.run("Goobay", "yidong");

        stmt.finalize();
    });
}

/*** receiver_protocol_model  |   Keeps connection between protocol and available models ***/
if (populate_receiver_protocol_model) {
    
    db.serialize(function() {
        
        db.run("CREATE TABLE if not exists receiver_protocol_model (protocol TEXT, model TEXT, modelPretty TEXT, configType TEXT)");
        var stmt = db.prepare("INSERT INTO receiver_protocol_model VALUES (?, ?, ?, ?)");

        // arctech
        stmt.run("arctech", "codeswitch", "Codeswitch", "codeswitch");
        stmt.run("arctech", "bell", "Bell", "");
        stmt.run("arctech", "selflearning-switch", "Selflearning switch", "learn");
        stmt.run("arctech", "selflearning-dimmer", "Selflearning dimmer", "learn");
        
        // brateck
        stmt.run("bratech", "all", "All", "");
        
        //everflourish
        stmt.run("everflourish", "all", "All", "");
        
        // fuhaote
        stmt.run("fuhaote", "all", "All", "codeswitch");
        
        // hasta
        stmt.run("hasta", "all", "All", "");
        
        // ikea
        stmt.run("ikea", "all", "All", "");
        
        // kangtai
        //stmt.run("kangtai", "all", "All"); //Tellstick NET only. Exclude for now.
        
        // risingsun
        stmt.run("risingsun", "codeswitch", "Codeswitch", "houseunit");
        stmt.run("risingsun", "selflearning", "Selflearning", "learn");
        
        // sartano
        stmt.run("sartano", "all", "All", "");
        
        // silvanchip
        stmt.run("silvanchip", "ecosavers", "Ecosavers", "");
        stmt.run("silvanchip", "kp100", "KP100", "");
        
        // upm
        stmt.run("upm", "all", "All", "");
        
        // waveman
        stmt.run("waveman", "all", "All", "");
        
        // x10
        stmt.run("x10", "all", "All", "");
        
        // yidong
        stmt.run("yidong", "all", "All", "");
        
        stmt.finalize();
    });
}

db.close();