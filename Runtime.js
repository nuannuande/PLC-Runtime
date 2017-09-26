var IP=require("./Component/GetIp")();
const fs=require("fs");
var {logger}=require('./Component/log');
var args = process.argv;
var configure=require('./config.json');
IP=configure.IP||IP;
var DName="D"+IP.substring(IP.lastIndexOf('.')+1,IP.length);
var Device={Name:DName,IP:IP,varsport:Number(args[2])||11100,ControlPort:Number(args[3])||11101,CsWs:Number(args[4])||11102,UdpBoard:11103,secret:"19911120"}
logger.info(Device);
var childp;//子线程名称
var DeviceList=[Device];//同一网段设备列表
var {encrypt}=require('./Component/cp');//加密 aes192
var {decrypt}=require('./Component/cp');//解密


const dgram = require('dgram');		
const varsport = dgram.createSocket('udp4');

var varslist={};
varsport.on('message',function(mes,info){
	var mes=mes.toString();
	mes=decrypt(mes,Device.secret);
	if(mes===false){
		logger.error("Udp data lost");
		return;
	}
	var res=mes.toString().split('/||/');
	if(res[0]=="var"){
		varslist[res[1]]=JSON.parse(res[2]);
		childp.send(varslist);
	}
	if(res[0]=="varlist"){
		clearTimeout(vartime);
		var vartime=setTimeout(()=>{
		varslist=JSON.parse(res[1]);
		childp.send(varslist);	
		},1000);//启动FBDL时可以向fbdl校对数据
	}
});

varsport.bind(Device.varsport);//收集变量,格式   var/||/D123/||/{"var1":"1","var2":"2"};



const boardport = dgram.createSocket('udp4');
boardport.on('message', function(mes, info) {
			var res = mes.toString().split('/||/');
			if(res[0] == "device") {
				var obj = JSON.parse(res[1]);
				var flag = false;
				if(DeviceList.length == 0) {
					DeviceList.push(obj);
				} else {
					DeviceList.forEach(function(value, index) {
						if(value.IP == obj.IP) {
							DeviceList[index] = obj;
							flag = true;
						}

					})
					if(!flag) {
						DeviceList.push(obj);
					}

				}
				//console.log(DeviceList);
			}
		});



boardport.bind(Device.UdpBoard);//广播发现设备格式 device/||/Device JSONString

//10秒定时发送设备信息
setInterval(UpdBoard,5000,new Buffer("device/||/"+JSON.stringify(Device)),Device.UdpBoard);
setInterval(()=>{
	DeviceList=[];
},30000);//30秒清除一次Devlist
function UpdBoard(message,port){
	var boardclient=dgram.createSocket('udp4');
	boardclient.bind(()=>{
	boardclient.setBroadcast(true);
});
//var message=new Buffer("device||"+JSON.stringify(Device));
var ipduan=Device.IP;
ipduan=ipduan.substring(0,ipduan.lastIndexOf("."));
boardclient.send(message, port, ipduan+".255", (err) => {
boardclient.close();
});
}

var ws=require('nodejs-websocket');
var csWs=ws.createServer(function(conn){
	conn.send("连接成功");
	conn.on('error',function (err){
		conn.close();
	})
	conn.on("text",function(data){
	console.log(data);
	
	})
}).listen(Device.CsWs)

function broadcast(ws,msg) {
    ws.connections.forEach(function (conn) {
        conn.sendText(msg);
    })
};//广播运行数据

process.stdin.on('data',function(chunk){
	
//	var mess="sda "+chunk.toString();
//	broadcast(csWs,mess);
//	console.log('send:'+chunk.toString());
   // exec();
});

process.on('message',(mes)=>{
	
})

var fork=require('child_process').fork;

function exec(){
	if(childp){
			childp.kill();
	}
	childp=fork('exec.js',{stdio:['pipe','pipe','pipe','ipc']});
	childp.on('error',function(err){
		err="运行出错"+err;
	broadcast(csWs,err);
})

childp.on("message",(mes)=>{

	var result=mes.split('/||/');//收到子线程的信息
	if(result[0]=="data")
	{
		var message="var/||/"+Device.Name+"/||/"+result[1];
		
		message=encrypt(message,Device.secret);
		UpdBoard(message,Device.varsport);//暴露变量为全局变量
	}
	if(result[0]=="websocket"){
		var message="var/||/"+Device.Name+"/||/"+result[1];
		broadcast(csWs,message);
	}
	else if(result[0]=="error")
	{
		
	}
});
var wsflag=false;
childp.stdout.on('data',(mes)=>{
	mes="子线程:"+mes;
	if(wsflag){
		return;
	}
	clearTimeout(timeout);
	var timeout=setTimeout(()=>{
	broadcast(csWs,mes);
	wsflag=false;
	},1000)
	wsflag=true;
	
})
childp.stdout.on('error',(err)=>{
	err="子线程报错:"+err;
	broadcast(csWs,err);
})

}


var express=require('express');
var app=express();
var bodyParser = require('body-parser');
app.use(express.static('public'));
app.set('view engine','ejs');
app.use(bodyParser());
var router=require('express').Router();

router.get('/',(req,res)=>{
	res.render("index",{devlist:DeviceList,varslist:varslist});
})
router.post('/run',(req,res)=>{
	
	exec();
	res.end('Process Start');
});
router.post('/stop',(req,res)=>{
	childp.kill();
	res.end('Process Kill');
});
router.get('/code',(req,res)=>{
	//res.header("Access-Control-Allow-Origin", "*");//支持post与get跨域访问
	var code=fs.readFileSync('exec.js','utf-8');
	code=code.substring(code.indexOf("//<%")+4,code.indexOf("//%>"));
	var FBcode=fs.readFileSync('FB.js','utf-8');

	res.render('code',{code:code,FB:FBcode,devlist:DeviceList,device:Device});
});
router.post('/savecode',(req,res)=>{
	res.header("Access-Control-Allow-Origin", "*");
	let name=req.body.name;
	let code=req.body.code;	
	if(name=="APP"){
		var oldcode=fs.readFileSync('exec.js','utf-8');
		 code=oldcode.replace(/(\/\/<%)([\d\D]*)(\/\/%>)/,`$1 ${code} $3`);
		fs.writeFileSync('exec.js',code);
		res.end('APP Save');
		exec();
	}
	if(name=="FB"){
		fs.writeFileSync('FB.js',code);
		res.end('FBList Save');
	}

})
app.use(router);
app.listen(Device.ControlPort)//调试编程界面 
exec();
