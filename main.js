const usb = require('usb');
const request = require('request');
const Events = require("node:events");
const { setTimeout } = require('node:timers/promises');

class Emitter extends Events {}

class HID {

  device;
  iface;
  bus;

  constructor(vid, pid) {

    this.bus = new Emitter();

    this.device = usb.findByIds(vid, pid); // Replace vid and pid with your throttle's vendor and product IDs

    if (!this.device) {
      console.error('Device not found');
      process.exit(1);
    }
    
    // Open the throttle
    this.device.open();
    this.iface = this.device.interfaces[0];
    this.iface.claim();
    
    // Listen for data
    this.iface.endpoint(0x81).startPoll(1, 64);
    this.iface.endpoint(0x81).on('data', data => {

      var bindata = new Array(data.toString().length)

      var out = "";

      for (let i=0; i<data.length; i++) {

        var buffer = "";
        var zeros = "";

        buffer+=dec2bin(data[i]);

        if(buffer.toString().length<8) {
          for(var j=0;j<(8-buffer.toString().length);j++) {
            zeros+="0";
          }
          
          buffer = zeros + buffer;
        }

        bindata[i] = buffer;
        out+=buffer;
        out+=" ";
      }

      // console.log(bindata)
      this.bus.emit("bindata", bindata);
      this.bus.emit("rawdata", data);
      this.bus.emit("readabledata", out);
    });

    this.iface.endpoint(0x81).on('error', error => {
      console.error('Error:', error);
    });

    // Clean up on SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      this.device.close();
      console.log('Closed USB connection');
      process.exit(0);
    });
  }
}



function send(path, value) {
  const url = 'http://127.0.0.1:80';

  // Specify your custom header
  const options = {
    url: url,
    headers: {
      'path': path,
      'value': value
    }
  };

  // Send the request
  request(options, function (error, response, body) {
    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Response:', body);
    }
  });
}

function nasal(command) {
  const url = 'http://127.0.0.1:80';

  // Specify your custom header
  const options = {
    url: url,
    headers: {
      'nasal': command
    }
  };

  // Send the request
  request(options, function (error, response, body) {
    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Response:', body);
    }
  });
}

function dec2bin(dec) {
  return (dec >>> 0).toString(2);
}



throttle = new HID(0x0738, 0xA221);

const state = {
  busy: "busy",
  idle: "idle"
}


var controls = {
  rthrottle: 0.0,
  lthrottle: 0.0,
  flaps: state.idle,
  gear: state.idle
}




throttle.bus.on("readabledata", (data) => {
  console.log(data);
});

throttle.bus.on("bindata", (data) => {


  // Left throttle


  var buffer = "";
  buffer = data[1][6] + data[1][7] + data[0]
  buffer = parseInt(buffer, 2)
  buffer = 1023.0 - buffer
  buffer = buffer / 1023.0

  controls.lthrottle = buffer;


  // Flaps



  if (data[3][3]=='1') {
    // console.log("Clicked to up, state now " + controls.flaps)
    if(controls.flaps==state.idle) {
      nasal("controls.flapsDown(1)");
      controls.flaps==state.busy;
      // console.log("Sent for up, state now " + controls.flaps)
    }
  }

  if (data[3][3]=='0') {
    // console.log("Setting for busy (up), state now " + controls.flaps)
    if(controls.flaps==state.busy) {
      controls.flaps==state.idle;
      // console.log("Set for busy, state now " + controls.flaps)
    }
  }



  if(data[3][4]=='1') {
    // console.log("Clicked to down, state now " + controls.flaps)
    if(controls.flaps==state.idle) {
      nasal("controls.flapsDown(-1)");
      controls.flaps==state.busy;
      // console.log("Sent for down, state now " + controls.flaps)
    }
  }

  if(data[3][4]=='0') {
    // console.log("Setting for busy (down), state now " + controls.flaps)
    if(controls.flaps==state.busy) {
      controls.flaps==state.idle;
      // console.log("Set for busy (down), state now " + controls.flaps)
    }
  }




  // Gear


  if (data[3][5]=='1') {
    if(controls.gear==state.idle) {
      send('/controls/gear/gear-down', "true")
      controls.gear==state.busy;
    }
  }

  if (data[3][5]=='0') {
    if(controls.gear==state.busy) {
      controls.gear==state.idle;
    }
  }


  if(data[3][6]=='1') {
    if(controls.gear==state.idle) {
      send('/controls/gear/gear-down', "false")
      controls.gear==state.busy;
    }
  }

  if(data[3][6]=='0') {
    if(controls.gear==state.busy) {
      controls.gear==state.idle;
    }
  }

});

setInterval(() => {
  // console.log(controls.lthrottle);
  send('/controls/engines/engine[0]/throttle', controls.lthrottle)
  setTimeout(100,send('/controls/engines/engine[1]/throttle', controls.lthrottle));
}, 200);


// // Find your throttle
// const throttle = usb.findByIds(0x0738, 0xa221); // Replace vid and pid with your throttle's vendor and product IDs

// if (!throttle) {
//   console.error('throttle not found');
//   process.exit(1);
// }

// // Open the throttle
// throttle.open();
// const ifacethrottle = throttle.interfaces[0];
// ifacethrottle.claim();

// // Listen for data
// ifacethrottle.endpoint(0x81).startPoll(1, 64); // Change endpoint address if necessary
// ifacethrottle.endpoint(0x81).on('data', data => {
//   var throttle = data[0]/255.0

//   // var aileron = data[1]

//   // aileron = aileron-127.5;
//   // aileron = 2*aileron;

//   // aileron = aileron/255.0


//   // throttle = throttle-127.5;
//   // throttle = 2*throttle;

//   // send('/controls/engines/engine[1]/throttle', throttle)
//   // send('/controls/flight/aileron', aileron)
//   // console.log(data[0]);
//   var out = "";
//   var bindata = new Array(data.toString().length)

//   for (let i=0; i<data.length; i++) {

//     var buffer = "";
//     var zeros = "";

//     buffer+=dec2bin(data[i]);

//     if(buffer.toString().length<8) {
//       for(var j=0;j<(8-buffer.toString().length);j++) {
//         zeros+="0";
//       }
      
//       buffer = zeros + buffer;
//     }

//     bindata[i] = buffer;

//     out+=buffer;
//     out+=' ';
//   }

//   throttle = bindata[1][6] + bindata[1][7] + bindata[0]

//   throttle = parseInt(throttle, 2)
  
  
//   throttle = 1023.0 - throttle

//   throttle = throttle / 1023.0

//   console.log(throttle)

//   send('/controls/engines/engine[1]/throttle', throttle)
//   send('/controls/engines/engine[0]/throttle', throttle)

//   // console.log(bindata);

// });

// // Handle error
// ifacethrottle.endpoint(0x81).on('error', error => {
//   console.error('Error:', error);
// });


// // Clean up on SIGINT (Ctrl+C)
// process.on('SIGINT', () => {
//   throttle.close();
//   console.log('Closed USB connection');
//   process.exit(0);
// });

