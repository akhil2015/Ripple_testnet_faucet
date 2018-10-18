import React, { Component } from 'react';
import './App.css';
import { fundingWallet } from './ripple';
class App extends Component {
  constructor(props){
    super(props);
    this.state = {
      address: '',
      isTransactionSuccess: false,
      message: ''
    }
  }
  submitAddress = () => {
    console.log(this.state.address)
    fundingWallet(this)
    this.setState({
      isTransactionSuccess: true
    })
  }
  changeAddress = (e) => {
    this.setState({
      address: e.target.value,
      message: ''
    });
    // console.log(e.target.value)
  }
  render() {
    return (
      <div className="App">
        <h1>RIPPLE TESTNET FAUCET</h1>
        <input value={this.state.address} onChange={(e) => this.changeAddress(e)} type="text" />
        <button disabled={this.state.isTransactionSuccess} onClick={this.submitAddress}>Receive</button>    
        {
          this.state.message
        }  
      </div>
    );
  }
}

export default App;
