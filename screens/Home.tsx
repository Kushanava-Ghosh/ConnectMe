import { useRoute } from '@react-navigation/native';
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Image, Button, SafeAreaView, Platform, StatusBar } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import io from 'socket.io-client';

const socket = io('http://192.168.1.104:4000');


const ChatItem = ({ chat, onPress }: any) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.chatContainer}>
      <Image source={{ uri: chat.profilePic }} style={styles.profilePic} />
      <View style={styles.chatDetails}>
        <Text style={styles.chatName}>{chat.username}</Text>
        <Text style={styles.chatMessage}>
          {chat.lastMessage.length > 25 ? chat.lastMessage.substring(0, 25) + '...' : chat.lastMessage}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// ChatRooms Component
const ChatRooms = ({ navigation, email }: any) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  socket.emit('joinRoom', email);
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const response = await fetch(`http://192.168.1.104:3000/api/chats?email=${email}`); // Replace with actual API endpoint
        const data = await response.json();
        const chatData = data.contacts.map((contact: any) => ({
          id: contact.chatroomId,
          username: contact.email, // Or fetch and display the username instead
          profilePic: 'https://notjustdev-dummy.s3.us-east-2.amazonaws.com/avatars/elon.png', // Placeholder for profile pic
          lastMessage: 'Hey, how are you?', // Placeholder for last message
        }));
        setChats(chatData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching chat data:', error);
        setLoading(false);
      }
    };
    // Listen for real-time incoming chats
    socket.on('receiveChatRoom', (request: any) => {
        console.log(request);
        setChats((prevChats):any => [...prevChats, request]);
    });

    fetchChats();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading chats...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={chats}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ChatItem
          chat={item}
          onPress={() => navigation.navigate('Chat', { chatId: item.id, chatName: item.username, email})}
        />
      )}
    />
  );
};

// RequestList Component
const RequestList = ({ email }: any) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  socket.emit('joinRoom', email);
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await fetch(`http://192.168.1.104:3000/api/request?email=${email}`); // Replace with actual API endpoint
        const data = await response.json();
        console.log(data.inReq);
        setRequests(data.inReq);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching request data:', error);
        setLoading(false);
      }
    };

      // Listen for real-time incoming requests
      socket.on('receiveRequest', (request: any) => {
        console.log(request);
        setRequests((prevRequests):any => [...prevRequests, request]);
      });
  
      fetchRequests();
  
      // Clean up the socket connection
      return () => {
        socket.disconnect();
      };
    }, [email]);

    const handleAccept = async (sender: string, receiver: string, requestId: string) => {
        // Logic to accept request
        console.log('Accepted request of user:', sender);
        // Sort the emails alphabetically and create the chatRoomID by concatenating them with a dash
        const participants = [sender, receiver].sort(); // Sort the emails
        const ChatRoomID = `${participants[0]}-${participants[1]}`;

        // Emit to the server to create a new chat room with the generated chatRoomID
        socket.emit('sendChatRoom', {
            ChatRoomID,
            participants,
        });

        try {
            // Send request to the backend to remove the accepted request and create a chat room
            const response = await fetch(`http://192.168.1.104:3000/api/accept`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ sender, receiver }),
            });
        
            if (response.ok) {
              // If the backend update is successful, remove the request from the frontend
              console.log("hey",requests)
              setRequests((prevRequests) =>
                prevRequests.filter((request: any) => request.sender !== sender)
              );
              console.log(`Chat room created with ID: ${ChatRoomID} for ${participants.join(', ')}`);
            } else {
              console.error('Failed to accept the request');
            }
          } catch (error) {
            console.error('Error accepting the request:', error);
          }
      };
      
      const handleReject = (requestId: string) => {
        // Logic to reject request
        console.log('Rejected request with ID:', requestId);
        setRequests((prevRequests) =>
          prevRequests.filter((request: any) => request.id !== requestId)
        );
      };

    if (loading) {
        return (
          <View style={styles.loadingContainer}>
            <Text>Loading requests...</Text>
          </View>
        );
      }
    

  return (
    // <View style={styles.loadingContainer}>
    //   <Text>No requests at the moment.</Text>
    // </View>
    <FlatList
      data={requests}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.requestContainer}>
          <Text style={styles.requestText}>
            {item.sender} sent a message: {item.message}
          </Text>
          <Text style={styles.timestamp}>Timestamp: {item.timestamp}</Text>
          <View style={styles.buttonContainer}>
            <Button
              title="Accept"
              onPress={() => handleAccept(item.sender, email, item.id)}
              color="green"
            />
            <Button
              title="Reject"
              onPress={() => handleReject(item.id)}
              color="red"
            />
          </View>
        </View>
      )}
    />
  );
};

const Home = ({ navigation }: any) => {
  const route = useRoute();
  const { Email }: any = route.params; // Getting the email passed from route

  const handleLogout = () => {
    // Handle logout logic here
    console.log('Logging out...');
    navigation.navigate('Login');
  };

  // Tab Navigator
  const Tab = createBottomTabNavigator();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Navbar */}
        <View style={styles.navbar}>
          <Image
            source={{ uri: 'https://notjustdev-dummy.s3.us-east-2.amazonaws.com/avatars/vadim.png' }} // Replace with user's profile picture
            style={styles.navProfilePic}
          />
          <Text style={styles.navTitle}>ConnectMe</Text>
          <Button title="Logout" onPress={handleLogout} />
        </View>

        {/* Bottom Tab Navigation */}
        <NavigationContainer independent={true}>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ color, size }) => {
                let iconName;
                if (route.name === 'Chats') {
                  iconName = 'chatbubbles';
                } else if (route.name === 'Requests') {
                  iconName = 'list';
                }
                return <Ionicons name={iconName} size={size} color={color} />;
              },
              headerShown: false, // Hides the screen headers
              tabBarStyle: {
                position: 'absolute',
                elevation: 0,
              },
            })}
            tabBarOptions={{
              activeTintColor: '#007AFF',
              inactiveTintColor: 'gray',
            }}
          >
            <Tab.Screen name="Chats">
              {() => <ChatRooms navigation={navigation} email={Email} />}
            </Tab.Screen>
            <Tab.Screen name="Requests">
              {() => <RequestList email={Email} />}
            </Tab.Screen>
          </Tab.Navigator>
        </NavigationContainer>

        {/* Search Button */}
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => navigation.navigate('Search', {email: Email})}
        >
          <Ionicons name="search" size={30} color="#fff" />
        </TouchableOpacity>
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
    padding: 10,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginBottom: 10,
  },
  navProfilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  navTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  chatContainer: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  chatDetails: {
    justifyContent: 'center',
  },
  chatName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  chatMessage: {
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButton: {
    position: 'absolute',
    bottom: 65, // Ensures the button is above the bottom tab bar
    right: 20,
    backgroundColor: '#007AFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestContainer: {
    padding: 10,
    marginVertical: 5,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  requestText: {
    fontSize: 16,
    marginBottom: 5,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});

export default Home;