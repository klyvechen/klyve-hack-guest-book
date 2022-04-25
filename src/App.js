import 'regenerator-runtime/runtime';
import React, { useState, useEffect } from 'react';
import Big from 'big.js';
import Form from './components/Form';
import SignIn from './components/SignIn';
import Messages from './components/Messages';
import { providers, utils } from "near-api-js";


const SUGGESTED_DONATION = '0';
const BOATLOAD_OF_GAS = Big(3).times(10 ** 13).toFixed();

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
  const [accountId, setAccountId] = useState(null);
  
  // show the message
  useEffect(() => {
    initAccountId(selector, setAccountId)
    // TODO: don't just fetch once; subscribe!
    queryMessageAndSet(selector, setMessages);
  }, [accountId]);

  const signIn = async () => {
    selector.show()
  };

  const signOut = async () => {
    await selector.signOut().catch((err) => {
      console.log("Failed to sign out");
    });
    let newAccounts = await selector.getAccounts();
    setAccountId(newAccounts.length > 0 ? newAccounts[0]['accountId'] : null);
  };

  selector.on("connect", () => {
    console.log("connect");n
  });

  selector.on("signIn", () => {
    console.log("User signed in!");
    initAccountId(selector, setAccountId)
  });

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
