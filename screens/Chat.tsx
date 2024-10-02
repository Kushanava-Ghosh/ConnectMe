import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, Image, TouchableOpacity, SafeAreaView, Platform, StatusBar, Alert } from 'react-native';
import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; // Importing icons
import io from 'socket.io-client'; // Import Socket.IO
import * as ImagePicker from 'expo-image-picker';

const socket = io('http://192.168.1.104:4000');

const Chat = ({ route }:any) => {
  const [messages, setMessages] = useState([]);  // State to hold messages
  const [inputText, setInputText] = useState('');
  const [message, setMessage] = useState('');

  // Access chatId from route params
  const { chatId, chatName, email} = route.params;

  // Request permissions for the camera and media library
  const requestPermissions = async () => {
  const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
  const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
  if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
    Alert.alert('Permission needed', 'We need camera and media library permissions to proceed.');
    return false;
  }
    return true;
  };

  // Fetch messages when chatId changes
  useEffect(() => {

    socket.emit('joinRoom', chatId);

    const fetchMessages = async () => {
      try {
        const response = await fetch(`http://192.168.1.104:3000/api/messages?chatId=${chatId}`);
        const data = await response.json();
        console.log(data.messages);
        setMessages(data.messages);  // Assuming the API returns an array of messages
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };
    
    fetchMessages();

    // Listen for new messages
    socket.on('receiveMessage', (message) => {
      setMessages((prevMessages):any => [...prevMessages, message]);
    });

    // Clean up the socket connection when the component unmounts
    return () => {
      socket.off('receiveMessage');
    };
  }, [chatId]);

  const renderMessageItem = ({ item }: any) => {
    const isSender = item.sender !== chatName;  // Assuming 'user1@example.com' is the sender's email
    return (
      <View
        style={[
          styles.messageContainer,
          isSender ? styles.senderMessage : styles.receiverMessage,
        ]}
      >
        {/* Display the message text */}
        {/* {item.type === 'text' && <Text style={styles.messageText}>{item.message}</Text>} */}
        <Text style={styles.messageText}>{item.message}</Text>
        {item.type === 'image' && <Image source={{ uri: item.message}} style={styles.media} />}
        {item.type === 'video' && <Image source={{ uri: item.message}} style={styles.media} />}
  
        {/* Format and display the timestamp */}
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  const handleSendMedia = async (type: 'image' | 'video') => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    let result;
    if (type === 'image') {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });
    } else if (type === 'video') {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });
    }

    if (!result.canceled && result.assets) {
      const formData = new FormData();
      formData.append('file', {
        uri: result.assets[0].uri,
        name: result.assets[0].fileName || (type === 'image' ? 'media.jpg' : 'media.mp4'),
        type: result.assets[0].type || (type === 'image' ? 'image/jpeg' : 'video/mp4'),
      });
      formData.append('chatId', chatId);
      formData.append('sender', email);
      formData.append('type', type);

      try {
        const response = await fetch('http://192.168.1.104:3000/api/upload', {
          method: 'POST',
          body: formData,
          headers: {
            // 'Content-Type': 'multipart/form-data',
          },
        });

        const mediaMessage = await response.json();
        console.log(mediaMessage);
        // Emit media message to the server
        socket.emit('sendMessage', { chatId, message: mediaMessage });
        setMessages((prevMessages) => [...prevMessages, mediaMessage]);
      } catch (error) {
        console.error('Error uploading media:', error);
      }
    }
  };
  
  const handleSendMessage = async () => {
    if (inputText) {
      // Logic to send the message (to be implemented)
      console.log('Sending message:', inputText);
      if (inputText.trim() === "") {
        return; // Don't send empty messages
      }
    
      // Construct the new message
      const newMessage = {
        sender: email,  // Replace with the actual sender's email/ID
        message: inputText,
        timestamp: new Date().toISOString(),  // Current timestamp in ISO format
      };
    
      // Construct the data to send
      // const messageData = {
      //   ChatRoomID: chatId,  // Replace with the actual chatroom ID
      //   message: newMessage,
      // };
      

      // try {
      //   // Send the data to the backend
      //   const response = await fetch('http://192.168.1.104:3000/api/messages', {
      //     method: 'POST',
      //     headers: {
      //       'Content-Type': 'application/json',
      //     },
      //     body: JSON.stringify(messageData),
      //   });
    
      //   if (response.ok) {
      //     const updatedChatroom = await response.json();
    
      //     // Update the local state with the new message
      //     setMessages((prevMessages) => [...prevMessages, newMessage]);
    
      //     // Clear the input field
      //     setInputText("");
      //   } else {
      //     console.error('Failed to send message');
      //   }
      // } catch (error) {
      //   console.error('Error:', error);
      // }

      socket.emit('sendMessage', { chatId, message: newMessage });

      setInputText('');  // Clear the input
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
    <View style={styles.container}>
      {/* Navbar */}
      <View style={styles.navbar}>
        <Image
          source={{ uri: 'https://notjustdev-dummy.s3.us-east-2.amazonaws.com/avatars/elon.png' }}
          style={styles.navProfilePic}
        />
        <Text style={styles.navName}>{chatName}</Text>
        <TouchableOpacity>
          <Ionicons name="call" size={24} color="black" style={styles.navIcon} />
        </TouchableOpacity>
        <TouchableOpacity>
          <MaterialCommunityIcons name="video" size={24} color="black" style={styles.navIcon} />
        </TouchableOpacity>
      </View>

      {/* Message area */}
      <FlatList
        data={messages}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderMessageItem}
        style={styles.messageArea}
        contentContainerStyle={{ paddingBottom: 20 }}  // Ensure spacing for the input
      />

      {/* Text Input Area */}
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.emojiButton}>
          <FontAwesome name="smile-o" size={24} color="gray" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.img} onPress={() => handleSendMedia('image')}>
          <FontAwesome name="image" size={24} color="gray" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.vid} onPress={() => handleSendMedia('video')}>
          <FontAwesome name="video-camera" size={24} color="gray" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
          <Ionicons name="send" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,  // Ensures SafeArea works on Android too
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  navProfilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  navName: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  navIcon: {
    marginLeft: 15,
  },
  messageArea: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  messageContainer: {
    marginVertical: 5,
    padding: 10,
    borderRadius: 10,
    maxWidth: '80%',
  },
  senderMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
  },
  receiverMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderColor: '#ddd',
    borderWidth: 1,
  },
  messageText: {
    fontSize: 16,
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
    alignSelf: 'flex-end',
    marginTop: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  emojiButton: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 20,
  },
  media: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginVertical: 5,
  },
  img: {
    marginRight: 10,
  },
  vid: {
    marginRight: 10,
  },
});

export default Chat;