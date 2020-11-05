function videoRecordingUsingSignalingServer(props) {
  // variables
  let roomName;
  let userName;
  let appName;
  let participants = {};
  let currentRtcPeer;

  let socket = props.socket;

  let proctoringData = document.getElementById("proctoring-data");
  appName = proctoringData.dataset.appName;
  roomName = props.event.toString();
  userName = props.user.toString();
  if (roomName && userName) {
    let message = {
      event: "joinRoom",
      roomName,
      userName,
      appName,
    };

    sendMessage(message);
  }

  socket.on("signaling-message", (message) => {
    console.log("Message arrived", message);

    switch (message.event) {
      // case "newParticipantArrived":
      //   receiveVideo(message.userId, message.userName);
      //   break;
      case "existingParticipants":
        onExistingParticipants(message.userId, message.existingUsers);
        break;
      case "receiveVideoAnswer":
        onReceiveVideoAnswer(message.senderId, message.sdpAnswer);
        break;
      case "candidate":
        addIceCandidate(message.userId, message.candidate);
        break;
    }
  });

  function sendMessage(message) {
    console.log("sending " + message.event + " message to server");
    socket.emit("signaling-message", message);
  }

  
  // function stopRecordingAndRestart() {
  //   let message = {
  //     event: "stopRecordingAndRestart",
  //     appName,
  //   };
  //   sendMessage(message);
  //   currentRtcPeer.dispose();
  // }

  window.onbeforeunload = function () {
    currentRtcPeer.dispose();
    socket.disconnect();
  };

  function receiveVideo(userIdWs, userNameWs) {
    // if (userNameWs === userName && !userNameWs.startsWith("proctor-")) return;
    if (!userName.startsWith("proctor-") && !userNameWs.startsWith("proctor-"))
      return;
    let video = document.createElement("video");
    let div = document.createElement("div");
    div.className = "videoContainer";
    div.id = `participant-video-${userIdWs}-${userNameWs}`;
    let name = document.createElement("div");
    video.id = userIdWs;
    video.autoplay = true;
    name.appendChild(document.createTextNode(userNameWs));
    div.appendChild(video);
    div.appendChild(name);
    // divMeetingRoom.appendChild(div);

    const onOffer = (_err, offer, _wp) => {
      console.log("On Offer");
      let message = {
        event: "receiveVideoFrom",
        userId: user.id,
        roomName: roomName,
        sdpOffer: offer,
      };
      sendMessage(message);
    };

    // send Icecandidate
    const onIceCandidate = (candidate, wp) => {
      console.log("sending ice candidates");
      var message = {
        event: "candidate",
        userId: user.id,
        roomName: roomName,
        candidate: candidate,
      };
      sendMessage(message);
    };

    let user = {
      id: userIdWs,
      userName: userNameWs,
      video: video,
      rtcPeer: null,
    };

    participants[user.id] = user;

    let options = {
      remoteVideo: video,
      onicecandidate: onIceCandidate,
    };

    // This is for receving candidates
    user.rtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(
      options,
      function (err) {
        if (err) {
          return console.error(err);
        }
        this.generateOffer(onOffer);
      }
    );
  }

  function onExistingParticipants(userIdWs, existingUsers) {
    let video = document.createElement("video");
    video.id = userIdWs;
    video.autoplay = true;

    let user = {
      id: userIdWs,
      userName: userName,
      video: video,
      rtcPeer: null,
    };

    participants[user.id] = user;

    let constraints = {
      audio: true,
      video: {
        mandatory: {
          maxWidth: 320,
          maxFrameRate: 15,
          minFrameRate: 5,
        },
      },
    };

    const onOffer = (_err, offer, _wp) => {
      console.log("On Offer");
      let message = {
        event: "receiveVideoFrom",
        userId: user.id,
        roomName: roomName,
        sdpOffer: offer,
      };
      console.log(message);
      sendMessage(message);
    };

    // send Icecandidate
    const onIceCandidate = (candidate, wp) => {
      console.log("sending ice candidates");
      var message = {
        event: "candidate",
        userId: user.id,
        roomName: roomName,
        candidate: candidate,
      };
      sendMessage(message);
    };

    let options = {
      localVideo: video,
      mediaConstraints: constraints,
      onicecandidate: onIceCandidate,
    };

    // This is for sending candidate
    user.rtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(
      options,
      function (err) {
        if (err) {
          return console.error(err);
        }
        this.generateOffer(onOffer);
      }
    );

    existingUsers.forEach(function (element) {
      receiveVideo(element.id, element.name);
    });

    currentRtcPeer = user.rtcPeer;

    // setInterval(() => {
    //   stopRecordingAndRestart();
    // }, 10*1000);
  }

  function onReceiveVideoAnswer(senderId, sdpAnswer) {
    participants[senderId].rtcPeer.processAnswer(sdpAnswer);
  }

  function addIceCandidate(userId, candidate) {
    participants[userId].rtcPeer.addIceCandidate(candidate);
  }
};