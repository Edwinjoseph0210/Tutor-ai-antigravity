
import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

// Get backend URL based on environment
const getBackendUrl = () => {
    const hostname = window.location.hostname;

    // If running on localhost or local network IP
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
        // Return your specific LAN IP - CRITICAL for multi-device testing
        return 'http://10.172.77.183:5001';
    }

    // Production URL (fallback)
    return 'https://tutor-ai-backend.onrender.com';
};

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    // State for real-time data
    const [liveLectures, setLiveLectures] = useState([]);
    const [scheduledLectures, setScheduledLectures] = useState([]);

    useEffect(() => {
        const backendUrl = getBackendUrl();
        console.log(`Connecting to socket at: ${backendUrl}`);

        const newSocket = io(backendUrl, {
            transports: ['websocket', 'polling'],
            withCredentials: true,
            autoConnect: true
        });

        newSocket.on('connect', () => {
            console.log('Socket connected:', newSocket.id);
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
        });

        // ============================================
        // REAL-TIME LISTENERS
        // ============================================

        // 1. Lecture Started
        newSocket.on('lecture_started', (data) => {
            console.log('⚡ Lecture Started Event:', data);
            // Append to live lectures list
            setLiveLectures(prev => {
                // Avoid duplicates
                if (prev.find(l => l.id === data.id)) return prev;
                return [data, ...prev];
            });

            // Play notification sound if browser allows
            try {
                const audio = new Audio('/notification.mp3');
                audio.play().catch(e => console.log('Audio play blocked:', e));
            } catch (e) { }
        });

        // 2. Lecture Scheduled
        newSocket.on('lecture_scheduled', (data) => {
            console.log('📅 Lecture Scheduled Event:', data);
            setScheduledLectures(prev => [data, ...prev]);
        });

        // 3. Lecture Ended
        newSocket.on('lecture_ended', (data) => {
            console.log('🏁 Lecture Ended Event:', data);
            setLiveLectures(prev => prev.filter(l => l.id !== data.id));
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    const joinClassRoom = (classId, sectionId) => {
        if (socket && isConnected) {
            const roomName = `class_${classId}_${sectionId || 'A'}`;
            socket.emit('join', { room: roomName });
            console.log(`Joined room: ${roomName}`);
        }
    };

    return (
        <SocketContext.Provider value={{
            socket,
            connected: isConnected,
            joinClassRoom,
            liveLectures,
            scheduledLectures
        }}>
            {children}
        </SocketContext.Provider>
    );
};
