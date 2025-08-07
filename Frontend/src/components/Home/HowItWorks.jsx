import React from 'react';

const HowDShareWorks = () => {
  const steps = [
    {
      icon: '🔐',
      title: "1. MetaMask Login",
      description: "Authenticate securely with your Web3 wallet."
    },
    {
      icon: '📤',
      title: "2. File Upload",
      description: "Files are uploaded from the user securely."
    },
    {
      icon: '🗂️',
      title: "3. IPFS Storage",
      description: "Files are split, hashed, and stored on IPFS nodes."
    },
    {
      icon: '📜',
      title: "4. Blockchain Verification",
      description: "CID stored and verified via Ethereum smart contract."
    },
    {
      icon: '📥',
      title: "5. File Download",
      description: "Files are retrieved using the blockchain-stored CID."
    },
    {
      icon: '💬',
      title: "6. Secure Chat",
      description: "Communicate in real-time with moderation."
    },
    {
      icon: '🛡️',
      title: "7. Admin Panel",
      description: "Admin dashboard for oversight and controls."
    },
    {
      icon: '👥',
      title: "8. User Management",
      description: "Manage users, access levels, and roles."
    },
    {
      icon: '📊',
      title: "9. Performance Monitoring",
      description: "Track system performance, storage, and traffic."
    }
  ];

  return (
    <section id="how-it-works" style={styles.section}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.subtitleContainer}>
            <span style={styles.subtitle}>HOW IT WORKS</span>
          </div>
          <h2 style={styles.title}>D-Share <span style={styles.highlight}>Workflow</span></h2>
        </div>

        <div style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <div key={index} style={styles.step}>
              <div style={styles.stepIconContainer}>
                <span style={styles.stepIcon}>{step.icon}</span>
              </div>
              <h3 style={styles.stepTitle}>{step.title}</h3>
              <p style={styles.stepDescription}>{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const styles = {
  section: {
    backgroundColor: '#0f172a',
    padding: '60px 0',
    color: '#fff',
  },
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '0 20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  subtitleContainer: {
    marginBottom: '12px',
  },
  subtitle: {
    color: '#3b82f6',
    fontSize: '14px',
    fontWeight: '600',
    letterSpacing: '2px',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: '36px',
    marginBottom: '16px',
    fontWeight: '700',
    background: 'linear-gradient(90deg, #ffffff, #e2e8f0)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  highlight: {
    background: 'linear-gradient(90deg, #3b82f6, #93c5fd)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  stepsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '24px',
  },
  step: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    padding: '25px 20px',
    borderRadius: '12px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    textAlign: 'center',
    transition: 'transform 0.3s ease, border-color 0.3s ease',
    cursor: 'default',
  },
  stepIconContainer: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    margin: '0 auto 15px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(59, 130, 246, 0.3)',
  },
  stepIcon: {
    fontSize: '28px',
  },
  stepTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '10px',
    color: '#f8fafc',
  },
  stepDescription: {
    color: '#cbd5e1',
    fontSize: '14px',
    lineHeight: '1.5',
  },
};

export default HowDShareWorks;
