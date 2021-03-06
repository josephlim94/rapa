
var isRecording = false;
var encode = true;
var audio_stream = null;
var audio_processor = null;
var media_handler = null;

var audio_record = null;

$(function() {
//var wsh = new WebSocket( 'ws://' + window.location.href.split( '/' )[2] + '/ws' );

//function onWsMessage( msg ){ console.log(msg); }

//wsh.onmessage = onWsMessage;
//var ap = new OpusEncoderProcessor( wsh );
//var mh = new MediaHandler( ap );
getInputDeviceList();
getOutputDeviceList();
});

function getInputDeviceList() {
    $.getJSON("get_input_device_list", (data, status) => {
        device_list = $("#input-source-device #device-list")[0];
        for (i = device_list.options.length - 1; i >= 0; i--) {
            device_list.remove(i);
        }
        for (var index in data) {
            if (data.hasOwnProperty(index)) {
                var new_option = $("<option>")[0];
                new_option.value = data[index].name;
                new_option.innerText = data[index].name;
                device_list.append(new_option);
            }
        }
    })
}

function getOutputDeviceList() {
    $.getJSON("get_output_device_list", (data, status) => {
        device_list = $("#output-source-device #device-list")[0];
        for (i = device_list.options.length - 1; i >= 0; i--) {
            device_list.remove(i);
        }
        for (var index in data) {
            if (data.hasOwnProperty(index)) {
                var new_option = $("<option>")[0];
                new_option.value = data[index].name;
                new_option.innerText = data[index].name;
                device_list.append(new_option);
            }
        }
    })
}

function sendSettings()
{
    if( document.getElementById( "encode" ).checked )
    {
        encode = 1;
    } else {
        encode = 0;
    }

    var rate = String( mh.context.sampleRate / ap.downSample );
    var opusRate = String( ap.opusRate );
    var opusFrameDur = String( ap.opusFrameDur )

    var msg = "m:" + [ rate, encode, opusRate, opusFrameDur ].join( "," );
    console.log( msg );
    wsh.send( msg );
}

function startRecord()
{
    document.getElementById( "record").innerHTML = "Stop";
    document.getElementById( "encode" ).disabled = true;
    audio_processor = new OpusEncoderProcessor( audio_stream );
    media_handler = new MediaHandler( audio_processor );
    media_handler.context.resume(); // needs an await?
    //sendSettings();
    isRecording = true;
    console.log( 'started recording' );
}

function stopRecord()
{
    isRecording  = false;
    document.getElementById( "record").innerHTML = "Record";
    document.getElementById( "encode" ).disabled = false;
    media_handler.context.close();
    console.log( 'ended recording' );
}

function toggleRecord()
{
    if( isRecording ) {
        audio_stream.close();
        audio_stream = null;
    } else {
        //audio_stream = new WebSocket( 'ws://' + window.location.href.split( '/' )[2] + '/ws' );
        audio_stream = new WebSocket( 'ws://192.168.0.104:8000/ws/speaker/audioplayback/' );
        audio_stream.onopen = startRecord;
        audio_stream.onclose = stopRecord;
    }
}

function recordLocal() {
    audio_stream = new WebSocket( 'ws://192.168.0.104:8000/ws/speaker/audioplayback/' );
    audio_record = new WebSocket( 'ws://localhost:8000/ws/speaker/audiorecord/' );
    audio_record.onmessage = function (message) {
        audio_stream.send(message.data);
    }
    // Close the other socket when one closes
    audio_record.onclose = function () {
        if ((audio_stream.readyState == WebSocket.OPEN)
            || (audio_stream.readyState == WebSocket.CONNECTING)) {
            audio_stream.close();
        }
    }
    audio_stream.onclose = function () {
        if ((audio_stream.readyState == WebSocket.OPEN)
            || (audio_stream.readyState == WebSocket.CONNECTING)) {
            audio_record.close();
        }
    }
    // Same for error
    audio_record.onerror = function () {
        if ((audio_stream.readyState == WebSocket.OPEN)
            || (audio_stream.readyState == WebSocket.CONNECTING)) {
            audio_stream.close();
        }
    }
    audio_stream.onerror = function () {
        if ((audio_stream.readyState == WebSocket.OPEN)
            || (audio_stream.readyState == WebSocket.CONNECTING)) {
            audio_record.close();
        }
    }
}

function stopLocalRecord() {
    audio_stream.close();
    audio_record.close();
}

function connectOutputSourceWebsocket() {
    if (audio_stream) {
        audio_stream.close();
    }
    audio_stream = new WebSocket( 'ws://localhost:8000/ws/speaker/audioplayback/' );
}

function outputSourceStartPlayback() {
    if (audio_stream) {
        console.log("Sending Configuration");
        configuration = {
            "opus-encoded": $("#panel-output-source #encode")[0].checked,
            "number-of-output-channel": Number($("#panel-output-source #number-of-channel")[0].value),
            "channel-width": Number($("#panel-output-source #channel-width")[0].value),
            "sample-rate": Number($("#panel-output-source #sample-rate")[0].value),
            "chunk-frame-length": Number($("#panel-output-source #frame-length")[0].value),
            "encoder-sample-rate": Number($("#panel-output-source #encoder-sample-rate")[0].value),
        };
        console.log(configuration);
        audio_stream.send("config:" + JSON.stringify(configuration));
        console.log("Starting playback");
        audio_stream.send("output-open:");
    }
}

function outputSourceStopPlayback() {
    if (audio_stream) {
        console.log("Stopping playback");
        audio_stream.send("output-close:");
    }
}

function connectInputSourceWebsocket() {
    if (audio_record) {
        audio_record.close();
    }
    audio_record = new WebSocket( 'ws://localhost:8000/ws/speaker/audiorecord/' );
    audio_record.onmessage = function (message) {
        if (audio_stream && (audio_stream.readyState == WebSocket.OPEN)) {
            audio_stream.send(message.data);
        }
    }
}

function inputSourceStartRecord() {
    if (audio_record) {
        console.log("Sending Input Source Configuration");
        configuration = {
            "opus-encoded": $("#panel-input-source #encode")[0].checked,
            "number-of-input-channel": Number($("#panel-input-source #number-of-channel")[0].value),
            "sample-rate": Number($("#panel-input-source #sample-rate")[0].value),
            "chunk-frame-length": Number($("#panel-input-source #frame-length")[0].value),
            "encoder-sample-rate": Number($("#panel-input-source #encoder-sample-rate")[0].value),
        };
        console.log(configuration);
        audio_record.send("config:" + JSON.stringify(configuration));
        console.log("Starting record");
        audio_record.send("input-open:");
    }
}

function inputSourceStopRecord() {
    if (audio_record) {
        console.log("Stopping record");
        audio_record.send("input-close:");
    }
}