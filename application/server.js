// 1. 모듈포함
// 1.1 객체생성
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const static = require('serve-static');

const fs = require('fs');
const path = require('path');

const FabricCAServices = require('fabric-ca-client');
const { FileSystemWallet, Gateway, X509WalletMixin} = require('fabric-network');

const ccpPath = path.resolve(__dirname, 'connection.json');
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);

// 2. 서버설정
const PORT = 3000;
const HOST = "0.0.0.0";

app.use(express.static(path.join(__dirname,'views')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// 3. HTML 라우팅
// 3.1 / GET
app.get('/', (request,response)=>{
  response.sendFile(__dirname+"/views/index.html");
});

app.get('/create.html', (request,response)=>{
  response.sendFile(__dirname+"/views/create.html");
});

app.get('/query.html', (request,response)=>{
  response.sendFile(__dirname+"/views/query.html");
});

// 4. REST api 라우팅
// 4.1 /asset POST
app.post('/asset', async(request, response)=>{
  // 어플리케이션 요청문서에서 파라미터 꺼내기 ( POST method에서는 body에서 꺼냄 )
  try{
      const key   = request.body.key;
      const value = request.body.value;
      const userid = request.body.userid;

      console.log('/asset-post-'+key+'-'+value);
      // 인증서작업 -> user1
      const walletPath = path.join(process.cwd(), 'wallet') // ~/dev/first-project/application/wallet
      const wallet = new FileSystemWallet(walletPath);
      console.log(`Wallet path: ${walletPath}`);
      const userExists = await wallet.exists(userid);
      if(!userExists) {
        console.log(`An identity for the user does nto exist in the wallet`);
        console.log('Run the registerUser.js application before retrying');
        // 클라이언트에서 인증서에 관한 안내 HTML을 보내줘야 함
        var resultjson = '{"result":"failed","msg":"An identity for the user does not exist in the wallet"}';
        response.json(JSON.parse(resultjson));
        //response.status(401).sendFile(__dirname + '/unauth.html');
        return;
      }
      const gateway = new Gateway();
      await gateway.connect(ccp, { wallet, identity: userid , discovery: { enabled: false } });
      // 채널 연결
      const network = await gateway.getNetwork('mychannel');
      // 체인코드 연결
      const contract = network.getContract('simpleasset');
      // 트랜젝션처리
      await contract.submitTransaction('set', key, value);
      console.log('Transaction has been submitted');
      // 게이트웨이연결 해제
      await gateway.disconnect();
      // 결과 클라이언트에 전송
      // result.html수정 
      //const resultPath = path.join(process.cwd(), 'result.html')
      //var resultHTML = fs.readFileSync(resultPath, 'utf8');
      //resultHTML = resultHTML.replace("<div></div>", "<div><p>Transaction has been submitted</p></div>");
      var resultjson = `{"result":"success","msg":"Transaction has been submitted : ${key} - ${value}"}`;
      response.status(200).json(JSON.parse(resultjson));
  } catch (error) {
      console.log('Error in /asset POST routing:',error.toString());
      console.log(`Error in /asset POST routing: ${error}`);
      var resultjson = '{"result":"failed","msg":"Error in /asset GET routing"}';
      response.json(JSON.parse(resultjson));
  }
});
// 4.2 /asset GET
app.get('/asset', async(request, response)=>{
  const key = request.query.key;
  const userid = request.query.userid;
  const mode = request.query.mode; // get or history

  const walletPath = path.join(process.cwd(), 'wallet');
  const wallet = new FileSystemWallet(walletPath);
  console.log(`Wallet path: ${walletPath}`);

  const userExists = await wallet.exists(userid);
  if (!userExists) {
      console.log('An identity for the user does not exist in the wallet');
      console.log('Run the registerUser.js application before retrying');
      //response.status(401).sendFile(__dirname + '/views/unauth.html');
      var resultjson = '{"result":"failed", "msg":"An identity for the admin user already exists in the wallet"}';
      response.json(JSON.parse(resultjson));
      return;
  }

  const gateway = new Gateway();
  await gateway.connect(ccp, { wallet, identity: userid, discovery: { enabled: false } });
  const network = await gateway.getNetwork('mychannel');
  const contract = network.getContract('simpleasset');
  
  var cc_func_name = mode;

  const txresult = await contract.evaluateTransaction(cc_func_name, key);
  console.log(`Transaction has been evaluated, result is: ${txresult}`);

  await gateway.disconnect();
  //if (txresult == "") {
    //console.log(key + 'is not available. Please check your key!');
    //response.status(401).sendFile(__dirname + '/views/unauth.html');
    //const resultPath = path.join(process.cwd(), '/views/result.html')
    //var resultHTML = fs.readFileSync(resultPath, 'utf8');
    //resultHTML = resultHTML.replace("<div></div>", `<div><p>Transaction has been evaluated: ${txresult}</p></div>`);
  var resultjson = `{"result":"success", "msg":${txresult.toString()}}`;
  response.status(200).json(JSON.parse(resultjson));
});

app.post('/admin', async(req, res)=>{
  const adminid = req.body.adminid;
  const adminpasswd = req.body.passwd;

  console.log(adminid, adminpasswd);

  try {
    // 3. ca 접속
    const caURL = ccp.certificateAuthorities['ca.example.com'].url;
    console.log(caURL);
    const ca = new FabricCAServices(caURL);

    // 4. wallet에서 기존 admin 확인
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = new FileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);
    const adminExists = await wallet.exists(adminid);
    if(adminExists){
      console.log('An identity for the admin user "admin" already exists in the wallet');

      var result = '{"result":"failed", "msg":"An identity for the admin user already exists in the wallet"}';
      res.json(JSON.parse(result));
      return;
    }
    
    // 5. admin 등록
    const enrollment = await ca.enroll({enrollmentID: adminid, enrollmentSecret: adminpasswd});
    const identity = X509WalletMixin.createIdentity('Org1MSP', enrollment.certificate, enrollment.key.toBytes());
    wallet.import(adminid, identity);
    console.log('Successfully enrolled admin user and imported it into the wallet');
    var result = '{"result":"success", "msg":"Successfully enrolled admin user admin and imported it into the wallet"}';
    res.status(200).json(JSON.parse(result));

    // 6. 인증서 발급
  } catch (error) {
    console.error(`Failed to enroll admin user "admin" : ${error}`);
    var result = '{"result":"failed", "msg":"Failed to enroll admin user in try/catch}';
    res.json(JSON.parse(result));
  }
});

// 6. /user POST 라우팅 userid - userid, userrole - role
// 응답 {"result":"success" or "failed","msg":""}
app.post('/user', async(req, res)=>{
  const userid = req.body.userid;
  const userrole = req.body.role;
  console.log(userid, userrole);

  try {

    // 3. wallet에서 user1, admin검사
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = new FileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    const userExists = await wallet.exists(userid);
    if(userExists){
      console.log('An identity for the user already exists in the wallet');
      var result = '{"result":"failed", "msg":"An identity for the user already exists in the wallet"}';
      res.json(JSON.parse(result));      
      return;
    }
    const adminExists = await wallet.exists('admin');
    if(!adminExists){
      console.log('An identity for the admin user does not exist in the wallet');
      return;
    }
    
    // 4. 게이트웨이에 연결 -> admin identity 가져오기
    const gateway = new Gateway();
    await gateway.connect(ccp, { wallet, identity:'admin', discovery: { enabled:false }});
    const ca = gateway.getClient().getCertificateAuthority();
    const adminIdentity = gateway.getCurrentIdentity();
    
    // 5. register -> enroll -> import
    const secret = await ca.register({affiliation:'org1.department1', enrollmentID: userid, role: userrole}, adminIdentity);
    const enrollment = await ca.enroll({enrollmentID: userid, enrollmentSecret: secret});
    const userIdentity = X509WalletMixin.createIdentity('Org1MSP', enrollment.certificate, enrollment.key.toBytes());
    wallet.import(userid, userIdentity);
    console.log('Successfully registered and enrolled admin user and imported it into the wallet');
    var result = '{"result":"success", "msg":"Successfully registered and enrolled user and imported it into the wallet"}';
    res.status(200).json(JSON.parse(result));

  } catch (error) {
    console.error(`Failed to register user : ${error}`);
    var result = '{"result":"failed", "msg":"Failed to enroll user in try/catch}'
    res.json(JSON.parse(result));
  }
});
app.post('/tx', async(request, response)=>{
  try {
    const fromkey = request.body.fromkey;
    const tokey = request.body.tokey;
    const amount = request.body.amount;
    const userid = request.body.userid;

    console.log('/tx-post-'+fromkey+'-'+tokey+'-'+amount+'-'+userid);
    
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = new FileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);
    const userExists = await wallet.exists(userid);
    if(!userExists){
      console.log('An identity for the user does not exist in the wallet');
        
      var res_str = '{"result":"failed", "msg":"An identity for the user exist in the wallet"}';
      response.json(JSON.parse(res_str));
      return;
    }
      
    const gateway = new Gateway();
    await gateway.connect(ccp, { wallet, identity:userid, discovery: { enabled:false }});
    const network = await gateway.getNetwork('mychannel');
    const contract = network.getContract('simpleasset');
    await contract.submitTransaction('transfer', fromkey, tokey, amount);
    console.log('Transaction has been submitted');
    await gateway.disconnect();
      
    var res_str = `{"result":"success", "msg":"Transaction has been submitted", "amount":"From ${fromkey} to ${tokey}, ${amount} is transferred"}`;
    response.status(200).json(JSON.parse(res_str));
  
      // 6. 인증서 발급
  } catch (error) {
    console.log('Error in /tx POST routing: ', error.toString());
    var res_str = '{"result":"failed", "msg":"Error in /tx POST routing"}';
    response.json(JSON.parse(res_str));
  }
});
  // 5. 서버 시작
app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);

