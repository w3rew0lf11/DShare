import React from 'react';
import logo from './logo.svg';
import './App.css';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { apiResponse: "" };
  }

  callAPI() {
    fetch("http://localhost:9000/testAPI")  // ✅ Fixed API URL
      .then(res => res.text())
      .then(res => this.setState({ apiResponse: res }))
      .catch(err => console.error("Error fetching API:", err));
  }

  componentWillMount() {  // ✅ Use componentDidMount instead of componentWillMount
    this.callAPI();
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
        </header>
        <p>{this.state.apiResponse}</p>
      </div>
    );
  }
}

export default App;
