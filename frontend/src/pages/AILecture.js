import React from 'react';

// AI Lecture - Direct Autonomous Teaching Interface
// Loads the autonomous teaching system immediately without any setup screens

const AILecture = () => {
  const iframeStyle = {
    width: '100%',
    height: '100vh',
    border: 'none',
    display: 'block'
  };

  return (
    <div style={{ padding: 0, margin: 0, height: '100vh', overflow: 'hidden' }}>
      <iframe
        title="Autonomous Teaching Interface"
        src="http://localhost:5001/senku-ui"
        style={iframeStyle}
        allow="camera; microphone"
      />
    </div>
  );
};

export default AILecture;
