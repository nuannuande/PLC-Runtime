var os=require('os');
var network = os.networkInterfaces();
module.exports=exports=GetIP;
function GetIP(){
let index=0;
let ip;
for(var net in network){
  	if(index==0){
  	ip=network[net];
  	index+=1;
  	}
  }
 for(var i=0;i<ip.length;i++){
 	if(ip[i].family=="IPv4"){
 		return ip[i].address;
 	}
 	
 }
}