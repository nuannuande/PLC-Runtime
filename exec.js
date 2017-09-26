var InputVars;
process.on('message', (mes) => {
InputVars=mes;
  console.log(InputVars);
});
var FB =require('./FB');//调用的FB库
var cycle=setInterval(main,5);

//<%    
//写在main中的函数以5毫秒的周期运行
function main(){

}

function test(){

}     //%>
