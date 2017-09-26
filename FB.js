exports.exportvar=function(value){
	try{
	value=JSON.stringify(value);
		process.send("data/||/"+value);//以/||/为分隔符号
		return null;
	}
	catch(e){
		return e;
	}
	//<%使用方式exportvar(json value)%>//
}

exports.websocketVar=function(value){
	try{
	value=JSON.stringify(value);
		process.send("websocket/||/"+value);
		return null;
	}
	catch(e){
		return e;
	}
	//<%websocketVar(json value)以json的格式WebSocket广播发送数据>//
}

