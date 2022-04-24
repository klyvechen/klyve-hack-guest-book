import 'regenerator-runtime/runtime';
import React, { useState, useEffect } from 'react';
import Big from 'big.js';
import Form from './components/Form';
import SignIn from './components/SignIn';
import Messages from './components/Messages';
import { providers, utils } from "near-api-js";


const SUGGESTED_DONATION = '0';
const BOATLOAD_OF_GAS = Big(3).times(10 ** 13).toFixed();


const syncAccountState = (currentAccountId, newAccounts, setAccountId) => {
  if (!newAccounts.length) {
    localStorage.removeItem("accountId");
    setAccountId(null);
    return;
  }

  const validAccountId = currentAccountId && newAccounts.some((x) => x.accountId === currentAccountId);
  const newAccountId = validAccountId ? currentAccountId : newAccounts[0].accountId;

  localStorage.setItem("accountId", newAccountId);
  setAccountId(newAccountId);
};

const initAccountId = async (selector, setAccountId) => {
  const accounts = await selector.getAccounts();
  if (accounts.length < 1) {
    return;
  }
  const initAccountId = accounts[0]['accountId'];
  if (initAccountId) {
    setAccountId(initAccountId);
  }
};

const queryMessageAndSet = (selector, setMessages) =>{
  const provider = new providers.JsonRpcProvider({
    url: selector.network.nodeUrl,
  });

  provider.query({
    request_type: "call_function",
    account_id: selector.getContractId(),
    method_name: "getMessages",
    args_base64: "",
    finality: "optimistic",
  })
  .then((res) => {
    msgsToSet = [];
    msgs = JSON.parse(Buffer.from(res.result).toString());
    msgs.map((v, i)=>{
      msgsToSet = [...msgsToSet, v];
    });
    setMessages(msgsToSet);
  });
}

const App = ({ selector }) => {
  const [ messages, setMessages] = useState([]);
  // const [selector, setSelector] = useState(null);
  const [accountId, setAccountId] = useState(null);
  const [amount, setAmount] = useState(1);
  
  // balance await walletConnection.account().state()
  window.a = selector;

  // set the account
  useEffect(() => {
    if (!selector) {
      return;
    }
    console.log("accountId", accountId)
    initAccountId(selector, setAccountId);
    
    // syncAccountState(accountId, e.accounts, setAccounts, setAccountId);
    const subscription = selector.on("accountsChanged", (e) => {
      syncAccountState(accountId, e.accounts, setAccountId);
    });

    return () => subscription.remove();
  }, [selector, accountId]);

  // show the message
  useEffect(() => {
    // TODO: don't just fetch once; subscribe!
    queryMessageAndSet(selector, setMessages);
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();

    const { fieldset, message, donation } = e.target.elements;

    fieldset.disabled = true;

    // TODO: optimistically update page with new message,
    // update blockchain data in background
    // add uuid to each message, so we know which one is already known

    selector.signAndSendTransaction({
      signerId: accountId,
      actions: [
        {
          type: "FunctionCall",
          params: {
            methodName: "addMessage",
            args: { text: message.value },
            gas: BOATLOAD_OF_GAS,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            deposit: (donation.value * 1000000000000000000000000).toLocaleString('fullwide', { useGrouping: false }),
          },
        },
      ],
    })
    .catch((err) => {
      alert("Failed to add message");
      console.log("Failed to add message");
      throw err;
    })
    .then(() => {
      queryMessageAndSet(selector, setMessages);
      message.value = "";
      donation.value = SUGGESTED_DONATION;
      fieldset.disabled = false;
      message.focus();
    })
    .catch((err) => {
      console.error(err);
      fieldset.disabled = false;
    });
  };

  const signIn = () => {
    selector.show()
  };

  const signOut = () => {
    selector.signOut().catch((err) => {
      console.log("Failed to sign out");
    });
  };

  return (
    <main>
      <header>
        <h1>NEAR Guest Book</h1>
        { accountId
          ? <button onClick={signOut}>Log out</button>
          : <button onClick={signIn}>Log in</button>
        }
      </header>
      { accountId
        ? <Form onSubmit={onSubmit} accountId={accountId} balance={(10000 ** 24)} />
        : <SignIn/>
      }
      { !!accountId && !!messages.length && <Messages messages={messages}/> }
    </main>
  );
};

export default App;
