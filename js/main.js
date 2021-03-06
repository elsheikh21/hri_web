// Adding responses to increase the conversation fluidity
let responses = [
  "I am glad this makes you feel happy", // 0
  "I am happy for you", // 1
  "I am happy too", // 2
  "I am sorry that burdens you", // 3
  "I am sorry for you", // 4
  "I feel like there is something more you might want to add", // 5
  "I can hear that this does not make you happy", // 6
  "I love that you are excited", // 7
  "Very exciting!", // 8 
  "That's OK" // 9
];

let happy_responses_indicies = [0, 1, 2];
let sad_responses_indicies = [3, 4, 5, 6];
let neutral_responses_indicies = [9];
let excited_responses_indicies = [7, 8];

let questions;
let qIdx = 0;

let waveFlag = true;

var interview_logging = {
  "questions": []
};

//---------------------------------------------------------------------------------- Start Interview popup

$(document).ready(function () {
  readTextFile('./assets/questions_simplified.txt');

  setTimeout(function () { unfade($('#cookie-banner')[0]); }, 1000);
});

$('#cookie-banner-close').click(function () {
  fade($('#cookie-banner')[0]);
  unfade($('#main')[0]);

  // start the interview
  setTimeout(function () {
    robotSay(questions[qIdx], waveFlag, function () {
      qIdx++;
      setTimeout(function () {
        robotSay(questions[qIdx], waveFlag, function () {
          qIdx++;
          setTimeout(function () {
            robotSay(questions[qIdx], waveFlag, function () {
              qIdx++;
              waveFlag = false;
              setTimeout(function () { robotSay(questions[qIdx], waveFlag); }, 500);
            });
          }, 500);
        });
      }, 500);
    });
  }, 100);
});

$('#btnSkip').click(function () {
  qIdx++;
  setTimeout(function () { robotSay(questions[qIdx], waveFlag); }, 1000);

  // Check if interview questions are over, then stringify and print the logged data
  if (questions.length == qIdx) {
    var logging_string = ''
    var logged_questions = interview_logging['questions'];
    for (var key = 0; key < logged_questions.length; key++) {
      logging_string = logging_string.concat(`Question #${(key + 1)}:${logged_questions[key]["Pepper_Question"]}\n`,
        `Answer:${logged_questions[key]["User_Answer"]}\n`,
        `User Emotion:${logged_questions[key]["Emotion"]}\n`,
        '\n');
    }

    saveTextAsFile(logging_string);
    // Show the "End Interview" popup and hide the rest
    fade($('#main')[0]);
    unfade($('#ending-banner')[0]);
  }
});

//---------------------------------------------------------------------------------- Question Speech2Text

$('#commandSayBtn').click(function () {
  var msg = $('#fname').val();
  if (msg == "") {
    msg = 'Please enter some text';
  }
  // Add robot questions here
  $('#robot_question').html(msg);
  const utt = new SpeechSynthesisUtterance(msg);
  // Prevent garbage collection of utt object
  console.log(utt);

  speechSynthesis.cancel();
  speechSynthesis.speak(utt);
});

//---------------------------------------------------------------------------------- Audio Recording & Downloading

let audioIN = { audio: true };
//  audio is true, for recording

// Access the permission for use the microphone
// 'then()' method returns a Promise
navigator.mediaDevices.getUserMedia(audioIN).then(function (mediaStreamObj) {
  // Connect the media stream to the first audio element
  //returns the recorded audio via 'audio' tag
  let audio = document.querySelector('audio');

  // 'srcObject' is a property which takes the media object. This is supported in the newer browsers
  if ("srcObject" in audio) {
    audio.srcObject = mediaStreamObj;
  } else {   // Old version
    audio.src = window.URL.createObjectURL(mediaStreamObj);
  }

  // 2nd audio tag for play the audio
  let playAudio = document.getElementById('adioPlay');

  // This is the main thing to record the audio 'MediaRecorder' API
  let mediaRecorder = new MediaRecorder(mediaStreamObj);
  // Pass the audio stream

  // start record event
  $('#btnStart').click(function () {
    $('#btnStart').html("Recording...");
    $('#btnStop').prop('disabled', false);
    mediaRecorder.start();
    recognition.start();
  });

  // stop record event
  $('#btnStop').click(function () {
    mediaRecorder.stop();
    $('#btnStart').html("Start Recording");
    $('#btnStop').prop('disabled', true);
  });

  // If audio data available then push
  // it to the chunk array
  mediaRecorder.ondataavailable = function (ev) {
    dataArray.push(ev.data);
  }

  // Chunk array to store the audio data
  let dataArray = [];

  // Convert the audio data in to blob
  // after stopping the recording
  mediaRecorder.onstop = function (ev) {

    // blob of type mp3
    let audioData = new Blob(dataArray, { 'type': 'audio/mp3;' });

    // After fill up the chunk array make it empty
    dataArray = [];

    // to download audio file when done
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";

    // Creating audio url with reference of created blob named 'audioData'
    let audioSrc = window.URL.createObjectURL(audioData);
    a.href = audioSrc;
    a.download = `answerToQuestion${qIdx.toString()}.mp3`;
    a.click();
    window.URL.revokeObjectURL(audioSrc);

    // Pass the audio url to the 2nd video tag
    playAudio.src = audioSrc;

    // call emotion recognition api
    $.ajax({
      url: 'http://localhost:5001/emotion',
      data: { file_name: `answerToQuestion${qIdx.toString()}.mp3` },
      success: function (response) {
        $('#emotion-area').html(response);
        // Robot's response to that
        let randomResponseIdx;

        switch (response) {
          case 'sad':
            randomResponseIdx = sad_responses_indicies.sample();
            break;
          case 'happy':
            randomResponseIdx = happy_responses_indicies.sample();
            break;
          case 'excited':
            randomResponseIdx = excited_responses_indicies.sample();
            break;
          default:
            randomResponseIdx = neutral_responses_indicies.sample();
        }

        setTimeout(function () {
          robotSay(responses[randomResponseIdx], null, function () {
            // proceed through questions when user finishes recording previous answer
            qIdx++;
            setTimeout(function () { robotSay(questions[qIdx], waveFlag); }, 1000);
          });
        }, 100);
      }
    });
  }
})
  // If any error occurs then handles the error
  .catch(function (err) {
    console.log(err.name, err.message);
  });

//---------------------------------------------------------------------------------- Audio Recognition & Text2Speech
// Logs the question, user's answer, and the API response

// Check  speech-to-text API supported or not?
try {
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recognition = new SpeechRecognition();
} catch (e) {
  alert('Speech Recongition is not supported on this browser');
}

// Define some event handlers listening to changes in the API
recognition.onstart = function () {
  $('#instructions').html('Voice recognition activated.<br/>Try speaking into the microphone.');
}

recognition.onspeechend = function () {
  $('#instructions').html('Voice recognition turned off.');
}

recognition.onerror = function (event) {
  if (event.error == 'no-speech') {
    $('#instructions').html('No speech was detected. Try again.');
  };
}

recognition.onresult = function (event) {
  // event is a SpeechRecognitionEvent object.
  // It holds all the lines we have captured so far.
  // We only need the current one.
  var current = event.resultIndex;

  // Get a transcript of what was said.
  var transcript = event.results[current][0].transcript;

  // Add the current transcript to the contents of our Note.
  noteTextarea.innerText = transcript;
  interview_logging['questions'].push({
    "Pepper_Question": $('#robot_question').html().trim(),
    "User_Answer": $('#noteTextarea').html().trim(),
    "Emotion": $('#emotion-area').html().trim()
  });
  
  // Check if interview questions are over, then stringify and print the logged data
  if (questions.length == qIdx) {
    var logging_string = ''
    var logged_questions = interview_logging['questions'];
    for (var key = 0; key < logged_questions.length; key++) {
      logging_string = logging_string.concat(`Question #${(key + 1)}:${logged_questions[key]["Pepper_Question"]}\n`,
        `Answer:${logged_questions[key]["User_Answer"]}\n`,
        `User Emotion:${logged_questions[key]["Emotion"]}\n`,
        '\n');
    }

    saveTextAsFile(logging_string);
    // Show the "End Interview" popup and hide the rest
    fade($('#main')[0]);
    unfade($('#ending-banner')[0]);
  }

}

//---------------------------------------------------------------------------------- Video preview

navigator.mediaDevices.getUserMedia({ video: true }).then(mediaStream => {
  const video = document.getElementById('video-cam');
  video.srcObject = mediaStream;
  video.onloadedmetadata = (e) => {
    video.play();
  };
}).catch(err => {
  console.log('Video is not working');
});
