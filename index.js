const express = require("express");
const TronWeb = require("tronweb");
const app = express();
app.use(express.json());
const router = express.Router();
// Add headers
app.use(function (req, res, next) {
  // Website you wish to allow to connect
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );

  // Request headers you wish to allow
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader("Access-Control-Allow-Credentials", true);

  // Pass to next layer of middleware
  next();
});

app.get("/", (req, res) => {
  res.json({ message: "ok" });
});

/* Error handler middleware */
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error(err.message, err.stack);
  res.status(statusCode).json({ message: err.message });
  return;
});

const tronWeb = new TronWeb({
  // fullHost: 'https://api.shasta.trongrid.io', //testnet
  fullHost: "https://api.trongrid.io", //mainnet
  headers: { "TRON-PRO-API-KEY": "6432c721-bc2d-4c41-906f-b10809fc0356" },
  privateKey:
    "ceef8af1967a9e630a17e6b95fd4318b57530ff6333f47f0b8d4fa85c6138384", //mainnet
  // privateKey: '6344e5bce5084e360c8f1217fbe1f59fbee4b284d497b28f4c8dab0fbcaecbb0' //testnet
});

app.get("/addr", async (req, res) => {
  try {
    var status = "success";
    var addr = await tronWeb.createAccount();
    var privateKey = addr.privateKey;
    var address = addr.address.base58;
    var hexAddress = addr.address.hex;
    res.json({ status, privateKey, address, hexAddress });
  } catch (err) {
    var status = "error";
    var msg = err.message;
    res.json({ status, msg });
  }
});

app.get("/verify/:id", async (req, res) => {
  try {
    var status = "success";
    var valid = await tronWeb.isAddress(req.params.id);
    res.json({ status, valid });
  } catch (err) {
    var status = "error";
    var msg = err.message;
    res.json({ status, msg });
  }
});

app.get("/balance/:id", async (req, res) => {
  const address = req.params.id;
  try {
    var status = "success";
    var bal = await tronWeb.trx.getBalance(address);
    var balance = bal / 1000000;
    // var isad = await tronWeb.isAddress();
    // var def = await tronWeb.defaultAddress;
    // var unconfirmed = await tronWeb.trx.getUnconfirmedBalance(address);
    res.json({ status, balance });
  } catch (err) {
    var status = "error";
    var msg = err.message;
    res.json({ status, msg });
  }
});

/**
{
    "to": "TENdmS9QrvLo4QZSAEcbi7omENEcuXbVc3",
    "from": "TMk9TrNuotSFo7cLp4d2bJEKwrFGWtY8Yz",
    "pkey": "6344e5bce5084e360c8f1217fbe1f59fbee4b284d497b28f4c8dab0fbcaecbb0",
    "amount": 104
}
*/
app.post("/trx", async (req, res) => {
  try {
    var status = "success";
    // var trx = await tronWeb.trx.sendTransaction(req.body.to,req.body.amount*1000000,req.body.pkey);
    // var trxhash = trx.transaction.txID;
    // res.json({status,trxhash})

    //Creates an unsigned TRX transfer transaction
    tradeobj = await tronWeb.transactionBuilder.sendTrx(
      req.body.to,
      req.body.amount * 1000000,
      req.body.from
    );
    const signedtxn = await tronWeb.trx.sign(tradeobj, req.body.pkey);
    const receipt = await tronWeb.trx.sendRawTransaction(signedtxn);
    var trxhash = receipt.transaction.txID;
    res.json({ trxhash });
  } catch (err) {
    console.log(err);
    var status = "error";
    var msg = err.message;
    res.json({ status, msg });
  }
});

app.get("/usdt_balance/:id", async (req, res) => {
  const address = req.params.id;
  const trc20ContractAddress = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"; //USDT contract address
  try {
    let contract = await tronWeb.contract().at(trc20ContractAddress);
    // let contract = await tronWeb.contract(usdt_abi.abi,trc20ContractAddress);
    //Use call to execute a pure or view smart contract method.
    // These methods do not modify the blockchain, do not cost anything to execute and are also not broadcasted to the network.
    var result = await contract.balanceOf(address).call();
    var nnn = JSON.parse(result);
    var balance = nnn / 1000000;
    var status = "success";
    // tronWeb.toDecimal('0x15') you can also use this to convert hexadecimal
    // console.log('result: ', result);
    res.json({ status, balance });
  } catch (error) {
    res.json({ error });
  }
});

async function main(fromAddress, addr, amt, pkey) {
  const CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"; // USDT
  const ACCOUNT = addr;
  let { transaction, result } =
    await tronWeb.transactionBuilder.triggerSmartContract(
      tronWeb.address.toHex(CONTRACT),
      "transfer(address,uint256)",
      {
        feeLimit: 100000000,
        callValue: 0,
      },
      [
        {
          type: "address",
          value: ACCOUNT,
        },
        {
          type: "uint256",
          value: amt,
        },
      ],
      tronWeb.address.toHex(fromAddress)
    );
  if (!result.result) {
    console.error("error:", result);
    return;
  }
  console.log("transaction =>", JSON.stringify(transaction, null, 2));

  const signature = await tronWeb.trx.sign(transaction.raw_data_hex, pkey);
  console.log("Signature:", signature);
  // transaction["signature"] = [signature];

  const broadcast = await tronWeb.trx.sendRawTransaction(signature);
  console.log("result:", broadcast);

  const { message } = broadcast;
  if (message) {
    console.log("Error:", Buffer.from(message, "hex").toString());
  }
}

/**
{
    "to": "TGHrPAzuyYzRSnoFHTxfHxbU88QfgMserN",
    "from": "TYMeRbU7uufimxrbsfv8BmaZGCDGNeTXRU",
    "pkey": "1659147431813C8F29332DD8431E51CC48D3E72392139A2A74F02DA8B21E75F0",
    "amount": 2
}
*/
app.post("/send_usdt", async (req, res) => {
  try {
    var status = "success";
    var d = req.body;
    transfer(d.from, d.to, d.amount, d.pkey)
      .then((data) => {
        res.json({ status, txID: data });
      })
      .catch((err) => {
        res.json({ status: "error", msg: err });
      });
  } catch (err) {
    console.log(err);
    var status = "error";
    var msg = err.message;
    res.json({ status, msg });
  }
});
const transfer = async function (
  fromAddress,
  toAddress,
  amount,
  privateKey,
  remark = "trading"
) {
  const contractAddress = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
  const parameter = [
    { type: "address", value: toAddress },
    { type: "uint256", value: amount * 1000000 },
  ];
  const transaction = await tronWeb.transactionBuilder.triggerSmartContract(
    tronWeb.address.toHex(contractAddress),
    "transfer(address,uint256)",
    { feeLimit: 100000000, callValue: 0 },
    parameter,
    tronWeb.address.toHex(fromAddress)
  );
  transaction.transaction.data = remark;
  let signedTx = await tronWeb.trx.sign(transaction.transaction, privateKey);
  await tronWeb.trx.sendRawTransaction(signedTx);
  return signedTx.txID;
};

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

// {"status":"success","privateKey":"1659147431813C8F29332DD8431E51CC48D3E72392139A2A74F02DA8B21E75F0","address":"TYMeRbU7uufimxrbsfv8BmaZGCDGNeTXRU","hexAddress":"41F59123F6C504CA2F589C136333DF4B12DFA307E8"}

// {"status":"success","privateKey":"8A4841E3B9F72A1E4A7EEF26F63A45DB54582F414A35ACFC66DB6D6F0530AA47","address":"TGHrPAzuyYzRSnoFHTxfHxbU88QfgMserN","hexAddress":"41455772430ABB7AE42A08175B4B92C8670408FCFF"}
