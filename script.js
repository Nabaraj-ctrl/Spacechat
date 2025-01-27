// Firebase Initialization
const firebaseConfig = {
    apiKey: "AIzaSyAJpPhStyCrfoCzZA3IFEfgeKGvFhwBFY4", 
    authDomain: "videocallapp-db28b.firebaseapp.com", 
    databaseURL: "https://videocallapp-db28b-default-rtdb.firebaseio.com", 
    projectId: "videocallapp-db28b", 
    storageBucket: "videocallapp-db28b.firebasestorage.app", 
    messagingSenderId: "58881070031", 
    appId: "1:58881070031:web:1ec92e835e65406d80b8ba", 
    measurementId: "G-GDPM3LCY42" 
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

// Global Variables
let currentUser = '';
let mediaRecorder;
let audioChunks = [];

// Login Function
function login() {
    const usernameInput = document.getElementById('username').value.trim();
    if (usernameInput) {
        currentUser = usernameInput;
        document.getElementById('loginModal').classList.add('hidden');
        document.getElementById('chatInterface').classList.remove('hidden');
        document.getElementById('currentUser').textContent = `Logged in as: ${usernameInput}`;

        // Notify other users
        db.collection('messages').add({
            text: `${usernameInput} joined the chat`,
            sender: 'System',
            type: 'notification',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Load messages in real-time
        loadMessages();
    } else {
        alert("Please enter a username to join the chat.");
    }
}

// Send Message Function
function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const messageText = messageInput.value.trim();
    if (messageText) {
        db.collection('messages').add({
            text: messageText,
            sender: currentUser,
            type: 'message',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        messageInput.value = ''; // Clear the input field
    }
}

// Voice Message Function
async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = []; // Clear previous chunks
    mediaRecorder.ondataavailable = event => {
        audioChunks.push(event.data);
    };
    mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        sendVoiceMessage(audioBlob); // Send the blob instead of the URL
    };
    mediaRecorder.start();
}

function stopRecording() {
    mediaRecorder.stop();
}

// Send Voice Message
function sendVoiceMessage(audioBlob) {
    const storageRef = storage.ref(`voiceMessages/${currentUser}_${Date.now()}.wav`);
    storageRef.put(audioBlob).then(() => {
        storageRef.getDownloadURL().then((audioUrl) => {
            db.collection('messages').add({
                audioUrl: audioUrl,
                sender: currentUser,
                type: 'audio',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
    });
}

// Load Messages Function (Real-Time)
function loadMessages() {
    const messageArea = document.getElementById('messageArea');
    db.collection('messages')
        .orderBy('timestamp')
        .onSnapshot((snapshot) => {
            messageArea.innerHTML = ''; // Clear the chat area
            snapshot.forEach((doc) => {
                const message = doc.data();
                const messageElement = document.createElement('div');

                if (message.type === 'notification') {
                    // Display system notifications
                    messageElement.classList.add('message', 'notification');
                    messageElement.innerHTML = `<em>${message.text}</em>`;
                } else if (message.type === 'audio') {
                    // Display voice messages
                    messageElement.classList.add('message', message.sender === currentUser ? 'sent' : 'received');
                    messageElement.innerHTML = `
                        <strong>${message.sender}:</strong> 
                        <audio controls>
                            <source src="${message.audioUrl}" type="audio/wav">
                            Your browser does not support the audio element.
                        </audio>
                    `;
                } else {
                    // Display text and handle links
                    messageElement.classList.add('message', message.sender === currentUser ? 'sent' : 'received');
                    messageElement.innerHTML = `
                        <strong>${message.sender}:</strong> ${message.text}
                    `;
                    // Additional link handling code...
                }

                messageArea.appendChild(messageElement);
            });

            // Scroll to the bottom of the chat area
            messageArea.scrollTop = messageArea.scrollHeight;
        });
}

// React to Messages
function reactToMessage(messageId, emoji) {
    db.collection('messages').doc(messageId).update({
        reactions: firebase.firestore.FieldValue.arrayUnion({
            emoji: emoji,
            user: currentUser
        })
    });
}

// Send Image/Video/Link
function sendMedia() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,video/*,audio/*';
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        const storageRef = storage.ref(`media/${file.name}`);
        const uploadTask = storageRef.put(file);
        
        uploadTask.on('state_changed', null, error => {
            console.log(error);
        }, () => {
            uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                db.collection('messages').add({
                    mediaUrl: downloadURL,
                    sender: currentUser,
                    type: 'media',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
        });
    };
    fileInput.click();
}

// Set Wallpaper Function (From URL or Local Image)
function setWallpaper() {
    const wallpaperInput = document.createElement('input');
    wallpaperInput.type = 'file';
    wallpaperInput.accept = 'image/*';
    wallpaperInput.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = function () {
            document.body.style.backgroundImage = `url(${reader.result})`;
        };
        reader.readAsDataURL(file);
    };
    wallpaperInput.click();
}

// Set Wallpaper from URL
function setWallpaperFromUrl(url) {
    document.body.style.backgroundImage = `url(${url})`;
}

// Embed YouTube Video Function
function embedYouTubeVideo(url) {
    const videoContainer = document.querySelector('.youtube-video');
    videoUrl = url;

    // Create iframe for YouTube embed
    const youtubeId = url.split('v=')[1]?.split('&')[0] || url.split('.be/')[1];
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&fs=1`;  // Add autoplay and fullscreen query params
    iframe.width = '100%';
    iframe.height = '315';  // Adjust the height as needed
    iframe.allow = 'autoplay; fullscreen';  // Enable autoplay and fullscreen permissions
    iframe.frameBorder = '0';
    iframe.allowFullscreen = true;  // Allow fullscreen mode

    // Clear any existing content and add the new iframe
    videoContainer.innerHTML = '';  // Clear existing content
    videoContainer.appendChild(iframe);  // Append new iframe
}

// Refresh (Clear All Chat) Function
function clearChat() {
    db.collection('messages').get().then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
            doc.ref.delete(); // Delete each message
        });
    });

    // After clearing the chat, we reset the UI
    document.getElementById('messageArea').innerHTML = ''; // Clear the chat UI
}

// Add event listener to the refresh (clear chat) button
document.getElementById('refreshButton').addEventListener('click', clearChat);
