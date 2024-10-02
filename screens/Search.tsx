import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons'; // Using Feather icons for better UI
import Modal from 'react-native-modal';
import io from 'socket.io-client';

const Search = ({ route }:any) => {
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null); // State to track selected user
  const [message, setMessage] = useState(''); // Message state
  const [isModalVisible, setModalVisible] = useState(false); // State to control modal visibility
  const [chatRooms, setChatRooms] = useState(['chatroom2@example.com']); // Replace with your actual chatrooms list
  const [sentRequests, setSentRequests] = useState(['user3@example.com']); // Track requests that have been sent

  const { email } = route.params;

  const socket = io('http://192.168.1.104:4000');

    useEffect(() => {
        socket.on('messageSent', (data) => {
        console.log('Message sent to receiver:', data);
        });

        return () => {
        socket.off('messageSent');
        };
    }, []);
  
    // Fetch sent requests on component mount
    useEffect(() => {
        const fetchSentRequests = async () => {
          try {
            const response = await fetch(`http://192.168.1.104:3000/api/requests?email=${email}`);
            const data = await response.json();
            setSentRequests(data.outReq); // Assuming the server responds with the outReq array
          } catch (error) {
            console.error('Error fetching sent requests:', error);
          }
        };
    
        fetchSentRequests();
      }, [email]);

    console.log(sentRequests);

  // Function to fetch suggestions from the database
  const fetchSuggestions = async (query: any) => {
    console.log(query)
    try {
      if (query.length > 0) {
        const response = await fetch(`http://192.168.1.104:3000/api/user?email=${query}`);
        const data = await response.json();
        setSuggestions(data.slice(0, 10)); // Limit to 10 suggestions
        console.log(suggestions);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  // Update suggestions whenever the search text changes
  useEffect(() => {
    fetchSuggestions(searchText);
  }, [searchText]);

  // Function to handle when a user is selected from the dropdown
  const handleUserSelect = (user: any) => {
    console.log('Selected user:', user); // Check if this logs when you select a user
    if (!chatRooms.includes(user.email)) {
      setSelectedUser(user);
      setModalVisible(true); // Show the modal if the user is not in the chatrooms list
    } else {
      console.log('User is already in chat rooms');
    }
  };

  // Function to handle sending the message
  const handleSendMessage = () => {
    console.log(`Sending message to ${selectedUser?.email}: ${message}`);
    if (selectedUser && message) {
      const data = {
        receiver: selectedUser?.email, // The email of the selected user
        sender: email, // The current user's email
        message, // The message content
      };
      // Emit message to the server
      socket.emit('sendRequest', data);
      setSentRequests((prevreq):any => [...prevreq, data.receiver])
      // Clear the message input
      setMessage('');
    }
    setModalVisible(false); // Close the modal after sending the message
  };

  // Function to render suggestion items
  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.suggestionItem} onPress={() => handleUserSelect(item)} activeOpacity={0.7} disabled={sentRequests.includes(item?.email)}>
      <View style={styles.suggestionContent}>
        <Feather name="user" size={24} color="#333" style={styles.icon} />
        <View style={styles.suggestionTextContainer}>
          <Text style={styles.suggestionName}>{`${item.firstName} ${item.lastName}`}</Text>
          <Text style={styles.suggestionEmail}>{item.email}</Text>
        </View>
        {/* Show clock icon if the request has been sent */}
        {sentRequests.includes(item.email) && (
          <MaterialIcons name="access-time" size={24} color="#888" style={styles.clockIcon} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Search for Users</Text>
        <View style={styles.inputContainer}>
          <Feather name="search" size={20} color="#888" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Search by email..."
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        {suggestions.length > 0 && searchText.length > 0 && (
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.email}
            renderItem={renderItem}
            style={styles.suggestionList}
          />
        )}

        {/* Modal for sending a message */}
        <Modal isVisible={isModalVisible} onBackdropPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Send Message to {selectedUser?.firstName} {selectedUser?.lastName}</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Write a message..."
              value={message}
              onChangeText={setMessage}
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
              <MaterialIcons name="send" size={24} color="white" />
              <Text style={styles.sendButtonText}>Send Request</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#333',
  },
  suggestionList: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  suggestionTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  suggestionEmail: {
    fontSize: 14,
    color: '#888',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  clockIcon: {
    marginLeft: 'auto',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  messageInput: {
    width: '100%',
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
  },
  sendButtonText: {
    color: 'white',
    marginLeft: 10,
  },
});

export default Search;
