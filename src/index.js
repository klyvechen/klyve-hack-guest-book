import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import App from './App';

import NearWalletSelector from "@near-wallet-selector/core";
import { setupNearWallet } from "@near-wallet-selector/near-wallet";
import { setupSender } from "@near-wallet-selector/sender";
import senderIconUrl from "@near-wallet-selector/sender/assets/sender-icon.png";
import nearWalletIconUrl from "@near-wallet-selector/near-wallet/assets/near-wallet-icon.png";

// Initializing contract
async function initContract() {

  const selector = await NearWalletSelector.init({
    network: "testnet",
    contractId: "guest-book.klyve-hack.testnet",
    wallets: [
      setupNearWallet({
        iconUrl: nearWalletIconUrl
      }),
      setupSender({
        iconUrl: senderIconUrl
      }),
    ],
  })

  return { selector };
}

window.nearInitPromise = initContract().then(
  ({ selector }) => {
    window.a = selector;
    return ReactDOM.render(
      <App selector={selector} />,
      document.getElementById('root')
    );
  }
);
