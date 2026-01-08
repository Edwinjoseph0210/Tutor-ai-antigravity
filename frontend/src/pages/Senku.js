import React from 'react';

// Senku - Original Web Interface
// Displays the original Senku UI (HTML/CSS/JS) in an iframe
// The original interface is served by Flask at /senku-ui

const Senku = () => {
  const iframeStyle = {
    width: '100%',
    height: '100vh',
    border: 'none',
    minHeight: '100vh'
  };

  return (
    <div style={{ padding: 0, margin: 0, height: '100vh' }}>
      <iframe
        title="Senku - Autonomous AI Teacher"
        src="http://localhost:5001/senku-ui"
        style={iframeStyle}
      />
    </div>
  );
};

export default Senku;
