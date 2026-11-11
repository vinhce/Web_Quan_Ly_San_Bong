/**
 * Minified by jsDelivr using Terser v5.37.0.
 * Original file: /npm/qrcode-generator@1.4.4/qrcode.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
var qrcode=function(){var t=function(t,r){var e=t,n=g[r],o=null,i=0,a=null,u=[],f={},c=function(t,r){o=function(t){for(var r=new Array(t),e=0;e<t;e+=1){r[e]=new Array(t);for(var n=0;n<t;n+=1)r[e][n]=null}return r}(i=4*e+17),l(0,0),l(i-7,0),l(0,i-7),s(),h(),d(t,r),e>=7&&v(t),null==a&&(a=p(e,n,u)),w(a,r)},l=function(t,r){for(var e=-1;e<=7;e+=1)if(!(t+e<=-1||i<=t+e))for(var n=-1;n<=7;n+=1)r+n<=-1||i<=r+n||(o[t+e][r+n]=0<=e&&e<=6&&(0==n||6==n)||0<=n&&n<=6&&(0==e||6==e)||2<=e&&e<=4&&2<=n&&n<=4)},h=function(){for(var t=8;t<i-8;t+=1)null==o[t][6]&&(o[t][6]=t%2==0);for(var r=8;r<i-8;r+=1)null==o[6][r]&&(o[6][r]=r%2==0)},s=function(){for(var t=B.getPatternPosition(e),r=0;r<t.length;r+=1)for(var n=0;n<t.length;n+=1){var i=t[r],a=t[n];if(null==o[i][a])for(var u=-2;u<=2;u+=1)for(var f=-2;f<=2;f+=1)o[i+u][a+f]=-2==u||2==u||-2==f||2==f||0==u&&0==f}},v=function(t){for(var r=B.getBCHTypeNumber(e),n=0;n<18;n+=1){var a=!t&&1==(r>>n&1);o[Math.floor(n/3)][n%3+i-8-3]=a}for(n=0;n<18;n+=1){a=!t&&1==(r>>n&1);o[n%3+i-8-3][Math.floor(n/3)]=a}},d=function(t,r){for(var e=n<<3|r,a=B.getBCHTypeInfo(e),u=0;u<15;u+=1){var f=!t&&1==(a>>u&1);u<6?o[u][8]=f:u<8?o[u+1][8]=f:o[i-15+u][8]=f}for(u=0;u<15;u+=1){f=!t&&1==(a>>u&1);u<8?o[8][i-u-1]=f:u<9?o[8][15-u-1+1]=f:o[8][15-u-1]=f}o[i-8][8]=!t},w=function(t,r){for(var e=-1,n=i-1,a=7,u=0,f=B.getMaskFunction(r),c=i-1;c>0;c-=2)for(6==c&&(c-=1);;){for(var g=0;g<2;g+=1)if(null==o[n][c-g]){var l=!1;u<t.length&&(l=1==(t[u]>>>a&1)),f(n,c-g)&&(l=!l),o[n][c-g]=l,-1==(a-=1)&&(u+=1,a=7)}if((n+=e)<0||i<=n){n-=e,e=-e;break}}},p=function(t,r,e){for(var n=A.getRSBlocks(t,r),o=b(),i=0;i<e.length;i+=1){var a=e[i];o.put(a.getMode(),4),o.put(a.getLength(),B.getLengthInBits(a.getMode(),t)),a.write(o)}var u=0;for(i=0;i<n.length;i+=1)u+=n[i].dataCount;if(o.getLengthInBits()>8*u)throw"code length overflow. ("+o.getLengthInBits()+">"+8*u+")";for(o.getLengthInBits()+4<=8*u&&o.put(0,4);o.getLengthInBits()%8!=0;)o.putBit(!1);for(;!(o.getLengthInBits()>=8*u||(o.put(236,8),o.getLengthInBits()>=8*u));)o.put(17,8);return function(t,r){for(var e=0,n=0,o=0,i=new Array(r.length),a=new Array(r.length),u=0;u<r.length;u+=1){var f=r[u].dataCount,c=r[u].totalCount-f;n=Math.max(n,f),o=Math.max(o,c),i[u]=new Array(f);for(var g=0;g<i[u].length;g+=1)i[u][g]=255&t.getBuffer()[g+e];e+=f;var l=B.getErrorCorrectPolynomial(c),h=k(i[u],l.getLength()-1).mod(l);for(a[u]=new Array(l.getLength()-1),g=0;g<a[u].length;g+=1){var s=g+h.getLength()-a[u].length;a[u][g]=s>=0?h.getAt(s):0}}var v=0;for(g=0;g<r.length;g+=1)v+=r[g].totalCount;var d=new Array(v),w=0;for(g=0;g<n;g+=1)for(u=0;u<r.length;u+=1)g<i[u].length&&(d[w]=i[u][g],w+=1);for(g=0;g<o;g+=1)for(u=0;u<r.length;u+=1)g<a[u].length&&(d[w]=a[u][g],w+=1);return d}(o,n)};f.addData=function(t,r){var e=null;switch(r=r||"Byte"){case"Numeric":e=M(t);break;case"Alphanumeric":e=x(t);break;case"Byte":e=m(t);break;case"Kanji":e=L(t);break;default:throw"mode:"+r}u.push(e),a=null},f.isDark=function(t,r){if(t<0||i<=t||r<0||i<=r)throw t+","+r;return o[t][r]},f.getModuleCount=function(){return i},f.make=function(){if(e<1){for(var t=1;t<40;t++){for(var r=A.getRSBlocks(t,n),o=b(),i=0;i<u.length;i++){var a=u[i];o.put(a.getMode(),4),o.put(a.getLength(),B.getLengthInBits(a.getMode(),t)),a.write(o)}var g=0;for(i=0;i<r.length;i++)g+=r[i].dataCount;if(o.getLengthInBits()<=8*g)break}e=t}c(!1,function(){for(var t=0,r=0,e=0;e<8;e+=1){c(!0,e);var n=B.getLostPoint(f);(0==e||t>n)&&(t=n,r=e)}return r}())},f.createTableTag=function(t,r){t=t||2;var e="";e+='<table style="',e+=" border-width: 0px; border-style: none;",e+=" border-collapse: collapse;",e+=" padding: 0px; margin: "+(r=void 0===r?4*t:r)+"px;",e+='">',e+="<tbody>";for(var n=0;n<f.getModuleCount();n+=1){e+="<tr>";for(var o=0;o<f.getModuleCount();o+=1)e+='<td style="',e+=" border-width: 0px; border-style: none;",e+=" border-collapse: collapse;",e+=" padding: 0px; margin: 0px;",e+=" width: "+t+"px;",e+=" height: "+t+"px;",e+=" background-color: ",e+=f.isDark(n,o)?"#000000":"#ffffff",e+=";",e+='"/>';e+="</tr>"}return e+="</tbody>",e+="</table>"},f.createSvgTag=function(t,r,e,n){var o={};"object"==typeof arguments[0]&&(t=(o=arguments[0]).cellSize,r=o.margin,e=o.alt,n=o.title),t=t||2,r=void 0===r?4*t:r,(e="string"==typeof e?{text:e}:e||{}).text=e.text||null,e.id=e.text?e.id||"qrcode-description":null,(n="string"==typeof n?{text:n}:n||{}).text=n.text||null,n.id=n.text?n.id||"qrcode-title":null;var i,a,u,c,g=f.getModuleCount()*t+2*r,l="";for(c="l"+t+",0 0,"+t+" -"+t+",0 0,-"+t+"z ",l+='<svg version="1.1" xmlns="http://www.w3.org/2000/svg"',l+=o.scalable?"":' width="'+g+'px" height="'+g+'px"',l+=' viewBox="0 0 '+g+" "+g+'" ',l+=' preserveAspectRatio="xMinYMin meet"',l+=n.text||e.text?' role="img" aria-labelledby="'+y([n.id,e.id].join(" ").trim())+'"':"",l+=">",l+=n.text?'<title id="'+y(n.id)+'">'+y(n.text)+"</title>":"",l+=e.text?'<description id="'+y(e.id)+'">'+y(e.text)+"</description>":"",l+='<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>',l+='<path d="',a=0;a<f.getModuleCount();a+=1)for(u=a*t+r,i=0;i<f.getModuleCount();i+=1)f.isDark(a,i)&&(l+="M"+(i*t+r)+","+u+c);return l+='" stroke="transparent" fill="black"/>',l+="</svg>"},f.createDataURL=function(t,r){t=t||2,r=void 0===r?4*t:r;var e=f.getModuleCount()*t+2*r,n=r,o=e-r;return I(e,e,(function(r,e){if(n<=r&&r<o&&n<=e&&e<o){var i=Math.floor((r-n)/t),a=Math.floor((e-n)/t);return f.isDark(a,i)?0:1}return 1}))},f.createImgTag=function(t,r,e){t=t||2,r=void 0===r?4*t:r;var n=f.getModuleCount()*t+2*r,o="";return o+="<img",o+=' src="',o+=f.createDataURL(t,r),o+='"',o+=' width="',o+=n,o+='"',o+=' height="',o+=n,o+='"',e&&(o+=' alt="',o+=y(e),o+='"'),o+="/>"};var y=function(t){for(var r="",e=0;e<t.length;e+=1){var n=t.charAt(e);switch(n){case"<":r+="&lt;";break;case">":r+="&gt;";break;case"&":r+="&amp;";break;case'"':r+="&quot;";break;default:r+=n}}return r};return f.createASCII=function(t,r){if((t=t||1)<2)return function(t){t=void 0===t?2:t;var r,e,n,o,i,a=1*f.getModuleCount()+2*t,u=t,c=a-t,g={"██":"█","█ ":"▀"," █":"▄","  ":" "},l={"██":"▀","█ ":"▀"," █":" ","  ":" "},h="";for(r=0;r<a;r+=2){for(n=Math.floor((r-u)/1),o=Math.floor((r+1-u)/1),e=0;e<a;e+=1)i="█",u<=e&&e<c&&u<=r&&r<c&&f.isDark(n,Math.floor((e-u)/1))&&(i=" "),u<=e&&e<c&&u<=r+1&&r+1<c&&f.isDark(o,Math.floor((e-u)/1))?i+=" ":i+="█",h+=t<1&&r+1>=c?l[i]:g[i];h+="\n"}return a%2&&t>0?h.substring(0,h.length-a-1)+Array(a+1).join("▀"):h.substring(0,h.length-1)}(r);t-=1,r=void 0===r?2*t:r;var e,n,o,i,a=f.getModuleCount()*t+2*r,u=r,c=a-r,g=Array(t+1).join("██"),l=Array(t+1).join("  "),h="",s="";for(e=0;e<a;e+=1){for(o=Math.floor((e-u)/t),s="",n=0;n<a;n+=1)i=1,u<=n&&n<c&&u<=e&&e<c&&f.isDark(o,Math.floor((n-u)/t))&&(i=0),s+=i?g:l;for(o=0;o<t;o+=1)h+=s+"\n"}return h.substring(0,h.length-1)},f.renderTo2dContext=function(t,r){r=r||2;for(var e=f.getModuleCount(),n=0;n<e;n++)for(var o=0;o<e;o++)t.fillStyle=f.isDark(n,o)?"black":"white",t.fillRect(n*r,o*r,r,r)},f};t.stringToBytes=(t.stringToBytesFuncs={default:function(t){for(var r=[],e=0;e<t.length;e+=1){var n=t.charCodeAt(e);r.push(255&n)}return r}}).default,t.createStringToBytes=function(t,r){var e=function(){for(var e=S(t),n=function(){var t=e.read();if(-1==t)throw"eof";return t},o=0,i={};;){var a=e.read();if(-1==a)break;var u=n(),f=n()<<8|n();i[String.fromCharCode(a<<8|u)]=f,o+=1}if(o!=r)throw o+" != "+r;return i}(),n="?".charCodeAt(0);return function(t){for(var r=[],o=0;o<t.length;o+=1){var i=t.charCodeAt(o);if(i<128)r.push(i);else{var a=e[t.charAt(o)];"number"==typeof a?(255&a)==a?r.push(a):(r.push(a>>>8),r.push(255&a)):r.push(n)}}return r}};var r,e,n,o,i,a=1,u=2,f=4,c=8,g={L:1,M:0,Q:3,H:2},l=0,h=1,s=2,v=3,d=4,w=5,p=6,y=7,B=(r=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],e=1335,n=7973,i=function(t){for(var r=0;0!=t;)r+=1,t>>>=1;return r},(o={}).getBCHTypeInfo=function(t){for(var r=t<<10;i(r)-i(e)>=0;)r^=e<<i(r)-i(e);return 21522^(t<<10|r)},o.getBCHTypeNumber=function(t){for(var r=t<<12;i(r)-i(n)>=0;)r^=n<<i(r)-i(n);return t<<12|r},o.getPatternPosition=function(t){return r[t-1]},o.getMaskFunction=function(t){switch(t){case l:return function(t,r){return(t+r)%2==0};case h:return function(t,r){return t%2==0};case s:return function(t,r){return r%3==0};case v:return function(t,r){return(t+r)%3==0};case d:return function(t,r){return(Math.floor(t/2)+Math.floor(r/3))%2==0};case w:return function(t,r){return t*r%2+t*r%3==0};case p:return function(t,r){return(t*r%2+t*r%3)%2==0};case y:return function(t,r){return(t*r%3+(t+r)%2)%2==0};default:throw"bad maskPattern:"+t}},o.getErrorCorrectPolynomial=function(t){for(var r=k([1],0),e=0;e<t;e+=1)r=r.multiply(k([1,C.gexp(e)],0));return r},o.getLengthInBits=function(t,r){if(1<=r&&r<10)switch(t){case a:return 10;case u:return 9;case f:case c:return 8;default:throw"mode:"+t}else if(r<27)switch(t){case a:return 12;case u:return 11;case f:return 16;case c:return 10;default:throw"mode:"+t}else{if(!(r<41))throw"type:"+r;switch(t){case a:return 14;case u:return 13;case f:return 16;case c:return 12;default:throw"mode:"+t}}},o.getLostPoint=function(t){for(var r=t.getModuleCount(),e=0,n=0;n<r;n+=1)for(var o=0;o<r;o+=1){for(var i=0,a=t.isDark(n,o),u=-1;u<=1;u+=1)if(!(n+u<0||r<=n+u))for(var f=-1;f<=1;f+=1)o+f<0||r<=o+f||0==u&&0==f||a==t.isDark(n+u,o+f)&&(i+=1);i>5&&(e+=3+i-5)}for(n=0;n<r-1;n+=1)for(o=0;o<r-1;o+=1){var c=0;t.isDark(n,o)&&(c+=1),t.isDark(n+1,o)&&(c+=1),t.isDark(n,o+1)&&(c+=1),t.isDark(n+1,o+1)&&(c+=1),0!=c&&4!=c||(e+=3)}for(n=0;n<r;n+=1)for(o=0;o<r-6;o+=1)t.isDark(n,o)&&!t.isDark(n,o+1)&&t.isDark(n,o+2)&&t.isDark(n,o+3)&&t.isDark(n,o+4)&&!t.isDark(n,o+5)&&t.isDark(n,o+6)&&(e+=40);for(o=0;o<r;o+=1)for(n=0;n<r-6;n+=1)t.isDark(n,o)&&!t.isDark(n+1,o)&&t.isDark(n+2,o)&&t.isDark(n+3,o)&&t.isDark(n+4,o)&&!t.isDark(n+5,o)&&t.isDark(n+6,o)&&(e+=40);var g=0;for(o=0;o<r;o+=1)for(n=0;n<r;n+=1)t.isDark(n,o)&&(g+=1);return e+=Math.abs(100*g/r/r-50)/5*10},o),C=function(){for(var t=new Array(256),r=new Array(256),e=0;e<8;e+=1)t[e]=1<<e;for(e=8;e<256;e+=1)t[e]=t[e-4]^t[e-5]^t[e-6]^t[e-8];for(e=0;e<255;e+=1)r[t[e]]=e;var n={glog:function(t){if(t<1)throw"glog("+t+")";return r[t]},gexp:function(r){for(;r<0;)r+=255;for(;r>=256;)r-=255;return t[r]}};return n}();function k(t,r){if(void 0===t.length)throw t.length+"/"+r;var e=function(){for(var e=0;e<t.length&&0==t[e];)e+=1;for(var n=new Array(t.length-e+r),o=0;o<t.length-e;o+=1)n[o]=t[o+e];return n}(),n={getAt:function(t){return e[t]},getLength:function(){return e.length},multiply:function(t){for(var r=new Array(n.getLength()+t.getLength()-1),e=0;e<n.getLength();e+=1)for(var o=0;o<t.getLength();o+=1)r[e+o]^=C.gexp(C.glog(n.getAt(e))+C.glog(t.getAt(o)));return k(r,0)},mod:function(t){if(n.getLength()-t.getLength()<0)return n;for(var r=C.glog(n.getAt(0))-C.glog(t.getAt(0)),e=new Array(n.getLength()),o=0;o<n.getLength();o+=1)e[o]=n.getAt(o);for(o=0;o<t.getLength();o+=1)e[o]^=C.gexp(C.glog(t.getAt(o))+r);return k(e,0).mod(t)}};return n}var A=function(){var t=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]],r=function(t,r){var e={};return e.totalCount=t,e.dataCount=r,e},e={};return e.getRSBlocks=function(e,n){var o=function(r,e){switch(e){case g.L:return t[4*(r-1)+0];case g.M:return t[4*(r-1)+1];case g.Q:return t[4*(r-1)+2];case g.H:return t[4*(r-1)+3];default:return}}(e,n);if(void 0===o)throw"bad rs block @ typeNumber:"+e+"/errorCorrectionLevel:"+n;for(var i=o.length/3,a=[],u=0;u<i;u+=1)for(var f=o[3*u+0],c=o[3*u+1],l=o[3*u+2],h=0;h<f;h+=1)a.push(r(c,l));return a},e}(),b=function(){var t=[],r=0,e={getBuffer:function(){return t},getAt:function(r){var e=Math.floor(r/8);return 1==(t[e]>>>7-r%8&1)},put:function(t,r){for(var n=0;n<r;n+=1)e.putBit(1==(t>>>r-n-1&1))},getLengthInBits:function(){return r},putBit:function(e){var n=Math.floor(r/8);t.length<=n&&t.push(0),e&&(t[n]|=128>>>r%8),r+=1}};return e},M=function(t){var r=a,e=t,n={getMode:function(){return r},getLength:function(t){return e.length},write:function(t){for(var r=e,n=0;n+2<r.length;)t.put(o(r.substring(n,n+3)),10),n+=3;n<r.length&&(r.length-n==1?t.put(o(r.substring(n,n+1)),4):r.length-n==2&&t.put(o(r.substring(n,n+2)),7))}},o=function(t){for(var r=0,e=0;e<t.length;e+=1)r=10*r+i(t.charAt(e));return r},i=function(t){if("0"<=t&&t<="9")return t.charCodeAt(0)-"0".charCodeAt(0);throw"illegal char :"+t};return n},x=function(t){var r=u,e=t,n={getMode:function(){return r},getLength:function(t){return e.length},write:function(t){for(var r=e,n=0;n+1<r.length;)t.put(45*o(r.charAt(n))+o(r.charAt(n+1)),11),n+=2;n<r.length&&t.put(o(r.charAt(n)),6)}},o=function(t){if("0"<=t&&t<="9")return t.charCodeAt(0)-"0".charCodeAt(0);if("A"<=t&&t<="Z")return t.charCodeAt(0)-"A".charCodeAt(0)+10;switch(t){case" ":return 36;case"$":return 37;case"%":return 38;case"*":return 39;case"+":return 40;case"-":return 41;case".":return 42;case"/":return 43;case":":return 44;default:throw"illegal char :"+t}};return n},m=function(r){var e=f,n=t.stringToBytes(r),o={getMode:function(){return e},getLength:function(t){return n.length},write:function(t){for(var r=0;r<n.length;r+=1)t.put(n[r],8)}};return o},L=function(r){var e=c,n=t.stringToBytesFuncs.SJIS;if(!n)throw"sjis not supported.";!function(){var t=n("友");if(2!=t.length||38726!=(t[0]<<8|t[1]))throw"sjis not supported."}();var o=n(r),i={getMode:function(){return e},getLength:function(t){return~~(o.length/2)},write:function(t){for(var r=o,e=0;e+1<r.length;){var n=(255&r[e])<<8|255&r[e+1];if(33088<=n&&n<=40956)n-=33088;else{if(!(57408<=n&&n<=60351))throw"illegal char at "+(e+1)+"/"+n;n-=49472}n=192*(n>>>8&255)+(255&n),t.put(n,13),e+=2}if(e<r.length)throw"illegal char at "+(e+1)}};return i},D=function(){var t=[],r={writeByte:function(r){t.push(255&r)},writeShort:function(t){r.writeByte(t),r.writeByte(t>>>8)},writeBytes:function(t,e,n){e=e||0,n=n||t.length;for(var o=0;o<n;o+=1)r.writeByte(t[o+e])},writeString:function(t){for(var e=0;e<t.length;e+=1)r.writeByte(t.charCodeAt(e))},toByteArray:function(){return t},toString:function(){var r="";r+="[";for(var e=0;e<t.length;e+=1)e>0&&(r+=","),r+=t[e];return r+="]"}};return r},S=function(t){var r=t,e=0,n=0,o=0,i={read:function(){for(;o<8;){if(e>=r.length){if(0==o)return-1;throw"unexpected end of file./"+o}var t=r.charAt(e);if(e+=1,"="==t)return o=0,-1;t.match(/^\s$/)||(n=n<<6|a(t.charCodeAt(0)),o+=6)}var i=n>>>o-8&255;return o-=8,i}},a=function(t){if(65<=t&&t<=90)return t-65;if(97<=t&&t<=122)return t-97+26;if(48<=t&&t<=57)return t-48+52;if(43==t)return 62;if(47==t)return 63;throw"c:"+t};return i},I=function(t,r,e){for(var n=function(t,r){var e=t,n=r,o=new Array(t*r),i={setPixel:function(t,r,n){o[r*e+t]=n},write:function(t){t.writeString("GIF87a"),t.writeShort(e),t.writeShort(n),t.writeByte(128),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(255),t.writeByte(255),t.writeByte(255),t.writeString(","),t.writeShort(0),t.writeShort(0),t.writeShort(e),t.writeShort(n),t.writeByte(0);var r=a(2);t.writeByte(2);for(var o=0;r.length-o>255;)t.writeByte(255),t.writeBytes(r,o,255),o+=255;t.writeByte(r.length-o),t.writeBytes(r,o,r.length-o),t.writeByte(0),t.writeString(";")}},a=function(t){for(var r=1<<t,e=1+(1<<t),n=t+1,i=u(),a=0;a<r;a+=1)i.add(String.fromCharCode(a));i.add(String.fromCharCode(r)),i.add(String.fromCharCode(e));var f,c,g,l=D(),h=(f=l,c=0,g=0,{write:function(t,r){if(t>>>r!=0)throw"length over";for(;c+r>=8;)f.writeByte(255&(t<<c|g)),r-=8-c,t>>>=8-c,g=0,c=0;g|=t<<c,c+=r},flush:function(){c>0&&f.writeByte(g)}});h.write(r,n);var s=0,v=String.fromCharCode(o[s]);for(s+=1;s<o.length;){var d=String.fromCharCode(o[s]);s+=1,i.contains(v+d)?v+=d:(h.write(i.indexOf(v),n),i.size()<4095&&(i.size()==1<<n&&(n+=1),i.add(v+d)),v=d)}return h.write(i.indexOf(v),n),h.write(e,n),h.flush(),l.toByteArray()},u=function(){var t={},r=0,e={add:function(n){if(e.contains(n))throw"dup key:"+n;t[n]=r,r+=1},size:function(){return r},indexOf:function(r){return t[r]},contains:function(r){return void 0!==t[r]}};return e};return i}(t,r),o=0;o<r;o+=1)for(var i=0;i<t;i+=1)n.setPixel(i,o,e(i,o));var a=D();n.write(a);for(var u=function(){var t=0,r=0,e=0,n="",o={},i=function(t){n+=String.fromCharCode(a(63&t))},a=function(t){if(t<0);else{if(t<26)return 65+t;if(t<52)return t-26+97;if(t<62)return t-52+48;if(62==t)return 43;if(63==t)return 47}throw"n:"+t};return o.writeByte=function(n){for(t=t<<8|255&n,r+=8,e+=1;r>=6;)i(t>>>r-6),r-=6},o.flush=function(){if(r>0&&(i(t<<6-r),t=0,r=0),e%3!=0)for(var o=3-e%3,a=0;a<o;a+=1)n+="="},o.toString=function(){return n},o}(),f=a.toByteArray(),c=0;c<f.length;c+=1)u.writeByte(f[c]);return u.flush(),"data:image/gif;base64,"+u};return t}();qrcode.stringToBytesFuncs["UTF-8"]=function(t){return function(t){for(var r=[],e=0;e<t.length;e++){var n=t.charCodeAt(e);n<128?r.push(n):n<2048?r.push(192|n>>6,128|63&n):n<55296||n>=57344?r.push(224|n>>12,128|n>>6&63,128|63&n):(e++,n=65536+((1023&n)<<10|1023&t.charCodeAt(e)),r.push(240|n>>18,128|n>>12&63,128|n>>6&63,128|63&n))}return r}(t)},function(t){"function"==typeof define&&define.amd?define([],t):"object"==typeof exports&&(module.exports=t())}((function(){return qrcode}));
//# sourceMappingURL=/sm/26b4b0d0b1e283d6b3ec9857ac597d7a60c76ac17be1ef4c965f03086de426bb.map


(function () {
  'use strict';

  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatVND(amount) {
    const num = Number(amount) || 0;
    return num.toLocaleString('vi-VN') + 'đ';
  }

  function formatDateVN(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  function getLocalTodayISO() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  let _csrfMemoryToken = '';

  function getCsrfToken() {
    if (_csrfMemoryToken) return _csrfMemoryToken;
    try {
      const meta = document.querySelector('meta[name="csrf-token"]');
      if (meta && meta.content) {
        _csrfMemoryToken = meta.content.trim();
        return _csrfMemoryToken;
      }
      const st = (sessionStorage.getItem('sb_csrf_token') || '').trim();
      if (st) {
        _csrfMemoryToken = st;
        return _csrfMemoryToken;
      }
      return '';
    } catch (e) {
      return _csrfMemoryToken || '';
    }
  }

  function setCsrfToken(token) {
    if (!token || typeof token !== 'string') return;
    const clean = token.trim();
    if (!clean) return;
    _csrfMemoryToken = clean;
    try {
      sessionStorage.setItem('sb_csrf_token', clean);
      let meta = document.querySelector('meta[name="csrf-token"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'csrf-token';
        document.head && document.head.appendChild(meta);
      }
      meta.content = clean;
    } catch (e) {}
  }

  function clearCsrfToken() {
    _csrfMemoryToken = '';
    try {
      sessionStorage.removeItem('sb_csrf_token');
    } catch (e) {}
  }

  async function ensureCsrfToken(apiBase) {
    const current = getCsrfToken();
    if (current) return current;
    try {
      const base = apiBase !== undefined ? apiBase : (getAppBase() ? getAppBase() + '/' : '');
      const url = `${base}api/auth.php?action=me`;
      const res = await fetch(url, { credentials: 'same-origin' });
      if (res.ok) {
        const json = await res.json();
        if (json && json.csrf_token) {
          setCsrfToken(json.csrf_token);
          return json.csrf_token;
        }
      }
    } catch (e) {}
    return getCsrfToken();
  }

  function getAuthFetchHeaders(extra = {}) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, extra || {});
    const token = getCsrfToken();
    if (token) {
      headers['X-CSRF-Token'] = token;
    }
    return headers;
  }

  async function secureFetch(url, options = {}) {
    await ensureCsrfToken();
    const opts = Object.assign({}, options);
    opts.headers = getAuthFetchHeaders(opts.headers);
    if (!opts.credentials) opts.credentials = 'same-origin';
    const res = await fetch(url, opts);
    const tokenHeader = res.headers ? res.headers.get('X-CSRF-Token') : null;
    if (tokenHeader) {
      setCsrfToken(tokenHeader);
    }
    return res;
  }

  function getAppBase() {
    const pathname = (window.location && typeof window.location.pathname === 'string')
      ? window.location.pathname.replace(/\\/g, '/')
      : '/';
    const match = pathname.match(/^(.*?\/Quan_Ly_San_Bong)/i);
    return match ? match[1] : '';
  }

  function getRelativePath(target) {
    const base = getAppBase();
    const fallback = base ? `${base}/` : '/';
    if (!target || target === 'index.html' || target === '/' || target === '') {
      return fallback;
    }
    const raw = String(target).trim();
    if (/^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/\/)/.test(raw) || raw.includes('\\') || raw.includes('..')) {
      return fallback;
    }
    const cleanTarget = raw
      .replace(/^\.\.\//, '')
      .replace(/^html\//, '')
      .replace(/^\/+/, '')
      .replace(/\.html(?=$|[?#])/, '');
    if (!/^[a-zA-Z0-9_\-\/\.]+(?:\?[a-zA-Z0-9_=&%\-\.]*)?(?:#[a-zA-Z0-9_\-]*)?$/.test(cleanTarget)) {
      return fallback;
    }
    if (cleanTarget === 'portal-admin' || cleanTarget === 'portal-admin/') {
      return base ? `${base}/portal-admin/` : '/portal-admin/';
    }
    return base ? `${base}/${cleanTarget}` : `/${cleanTarget}`;
  }

  const Icons = {
    ball: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/></svg>`,
    calendar: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
    clock: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    mapPin: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
    check: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="20 6 9 17 4 12"/></svg>`,
    copy: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
    grid: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>`,
    list: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>`,
    pitch: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="12" x2="12" y1="5" y2="19"/><circle cx="12" cy="12" r="3"/></svg>`,
    tag: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>`,
    users: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    wallet: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>`,
    chart: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>`,
    settings: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    home: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    user: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    bell: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
    search: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
    filter: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
    phone: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    arrowRight: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
    arrowLeft: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>`,
    download: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`,
    share: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>`
  };

  function renderPitchSVG(variant = 'standard', heightClass = 'h-40') {
    const palettes = {
      standard: { c1: '#15803D', c2: '#16A34A', line: 'rgba(255,255,255,0.85)' },
      deep:     { c1: '#14532D', c2: '#15803D', line: 'rgba(255,255,255,0.8)' },
      bright:   { c1: '#16A34A', c2: '#22C55E', line: 'rgba(255,255,255,0.9)' },
      twin:     { c1: '#065F46', c2: '#059669', line: 'rgba(255,255,255,0.85)' },
      muted:    { c1: '#475569', c2: '#64748B', line: 'rgba(255,255,255,0.55)' },
      hero:     { c1: '#064E3B', c2: '#047857', line: 'rgba(255,255,255,0.22)' }
    };
    const p = palettes[variant] || palettes.standard;
    return `
    <div class="w-full ${heightClass} relative overflow-hidden select-none" style="background:${p.c1}">
      <svg viewBox="0 0 600 320" preserveAspectRatio="xMidYMid slice" class="w-full h-full">
        <rect x="0" y="0" width="60" height="320" fill="${p.c1}"/>
        <rect x="60" y="0" width="60" height="320" fill="${p.c2}"/>
        <rect x="120" y="0" width="60" height="320" fill="${p.c1}"/>
        <rect x="180" y="0" width="60" height="320" fill="${p.c2}"/>
        <rect x="240" y="0" width="60" height="320" fill="${p.c1}"/>
        <rect x="300" y="0" width="60" height="320" fill="${p.c2}"/>
        <rect x="360" y="0" width="60" height="320" fill="${p.c1}"/>
        <rect x="420" y="0" width="60" height="320" fill="${p.c2}"/>
        <rect x="480" y="0" width="60" height="320" fill="${p.c1}"/>
        <rect x="540" y="0" width="60" height="320" fill="${p.c2}"/>
        <rect x="36" y="24" width="528" height="272" rx="4" fill="none" stroke="${p.line}" stroke-width="3"/>
        <line x1="300" y1="24" x2="300" y2="296" stroke="${p.line}" stroke-width="3"/>
        <circle cx="300" cy="160" r="44" fill="none" stroke="${p.line}" stroke-width="3"/>
        <circle cx="300" cy="160" r="4" fill="${p.line}"/>
        <rect x="36" y="84" width="86" height="152" fill="none" stroke="${p.line}" stroke-width="3"/>
        <rect x="36" y="120" width="36" height="80" fill="none" stroke="${p.line}" stroke-width="3"/>
        <rect x="20" y="136" width="16" height="48" fill="none" stroke="${p.line}" stroke-width="2.5"/>
        <path d="M 122 128 A 36 36 0 0 1 122 192" fill="none" stroke="${p.line}" stroke-width="3"/>
        <rect x="478" y="84" width="86" height="152" fill="none" stroke="${p.line}" stroke-width="3"/>
        <rect x="528" y="120" width="36" height="80" fill="none" stroke="${p.line}" stroke-width="3"/>
        <rect x="564" y="136" width="16" height="48" fill="none" stroke="${p.line}" stroke-width="2.5"/>
        <path d="M 478 128 A 36 36 0 0 0 478 192" fill="none" stroke="${p.line}" stroke-width="3"/>
        <path d="M 36 38 A 14 14 0 0 0 50 24" fill="none" stroke="${p.line}" stroke-width="2.5"/>
        <path d="M 550 24 A 14 14 0 0 0 564 38" fill="none" stroke="${p.line}" stroke-width="2.5"/>
        <path d="M 36 282 A 14 14 0 0 1 50 296" fill="none" stroke="${p.line}" stroke-width="2.5"/>
        <path d="M 550 296 A 14 14 0 0 1 564 282" fill="none" stroke="${p.line}" stroke-width="2.5"/>
      </svg>
    </div>`;
  }

  function statusPill(label) {
    let displayLabel = label;
    if (displayLabel === 'Vắng mặt (No-Show)' || String(displayLabel || '').includes('No-Show')) {
      displayLabel = 'Khách chưa đến';
    }
    const map = {
      'Trống': 'bg-white text-[#16A34A] border border-[#16A34A] font-semibold',
      'Giữ chỗ': 'bg-[#FEF3C7] text-[#D97706] border border-[#F59E0B] font-semibold',
      'Chờ duyệt cọc': 'bg-[#FEF3C7] text-[#D97706] border border-[#F59E0B] font-semibold',
      'Chờ thanh toán': 'bg-[#FEF3C7] text-[#D97706] border border-[#F59E0B] font-semibold',
      'Đã xác nhận': 'bg-[#DCFCE7] text-[#16A34A] border border-[#16A34A] font-semibold',
      'Hoạt động': 'bg-[#DCFCE7] text-[#16A34A] border border-[#16A34A] font-semibold',
      'Đang đá': 'bg-[#DBEAFE] text-[#2563EB] border border-[#2563EB] font-semibold',
      'Hoàn thành': 'bg-[#F1F5F9] text-[#475569] border border-[#94A3B8] font-semibold',
      'Đã hủy': 'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] font-semibold',
      'Vắng mặt': 'bg-[#DC2626] text-white border border-[#B91C1C] font-semibold',
      'Vắng mặt (No-Show)': 'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] font-bold',
      'Khách chưa đến': 'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] font-bold',
      'Quá giờ chưa đến': 'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] font-bold',
      'Tịch thu cọc 30%': 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] font-semibold',
      'Đã nhả sân trống': 'bg-[#DCFCE7] text-[#16A34A] border border-[#86EFAC] font-bold',
      'Đã khóa': 'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] font-semibold',
      'Bảo trì': 'hatch-slate border border-[#CBD5E1] text-[#475569] font-semibold'
    };
    const cls = map[displayLabel] || map[label] || 'bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1] font-semibold';
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium whitespace-nowrap ${cls}">${escapeHTML(displayLabel)}</span>`;
  }

  function getVietQRUrl(bankCode, accountNo, amount, memo, accountName) {
    const safeBank = encodeURIComponent(bankCode || 'VCB');
    const safeAcc = encodeURIComponent(accountNo || '0123456789');
    const safeAmount = encodeURIComponent(amount || 0);
    const safeMemo = encodeURIComponent(memo || 'DAT SAN BONG');
    let holder = accountName;
    if (!holder) {
      try {
        const db = window.SanBongApp?.SanBongDB || window.SanBongDB;
        if (db && typeof db.getBankInfo === 'function') {
          const bInfo = db.getBankInfo();
          if (bInfo && bInfo.accountName) holder = bInfo.accountName;
        }
      } catch (e) {}
    }
    const safeName = encodeURIComponent(holder || 'CHU SAN BONG');
    return `https://img.vietqr.io/image/${safeBank}-${safeAcc}-compact2.png?amount=${safeAmount}&addInfo=${safeMemo}&accountName=${safeName}`;
  }

  function renderQRCodeSVG(data, size = 160) {
    let content = String(data || 'SANBONG-PRO');
    // If only size passed as number (legacy call)
    if (typeof data === 'number' && !size) {
      size = data;
      content = 'SANBONG-PRO';
    }
    if (typeof window !== 'undefined' && typeof window.qrcode === 'function') {
      try {
        const qr = window.qrcode(0, 'M');
        qr.addData(content);
        qr.make();
        const count = qr.getModuleCount();
        const cellSize = Math.max(2, Math.floor(size / count));
        return qr.createSvgTag(cellSize, 2);
      } catch (e) {
        console.warn('qrcode generator error:', e);
      }
    }
    const enc = encodeURIComponent(content);
    return `<img src="https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${enc}" alt="QR ${enc}" class="w-full h-full object-contain rounded-lg">`;
  }

  function playScanBeep(success = true) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (success) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1760, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {}
  }

  function downloadTicketQR(bookingCode) {
    if (!bookingCode) return;
    const db = window.SanBongApp?.SanBongDB || window.SanBongDB;
    const b = db ? db.getBookingByCode(bookingCode) : null;
    const customer = b ? b.customerName : 'Khách hàng';
    const pitch = b ? b.pitchName : 'Sân bóng';
    const time = b ? `${formatDateVN(b.date)} · ${b.slotTime}` : '';

    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 620;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 480, 620);

    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, 480, 105);

    ctx.fillStyle = '#16A34A';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('⚽ HỆ THỐNG SÂN BÓNG PRO', 24, 38);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('VÉ ĐIỆN TỬ CHECK-IN NHẬN SÂN', 24, 72);

    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(24, 120, 432, 125);
    ctx.strokeStyle = '#E2E8F0';
    ctx.strokeRect(24, 120, 432, 125);

    ctx.fillStyle = '#64748B';
    ctx.font = '11px sans-serif';
    ctx.fillText('MÃ VÉ ĐIỆN TỬ', 40, 145);
    ctx.fillStyle = '#16A34A';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(bookingCode, 40, 172);

    ctx.fillStyle = '#64748B';
    ctx.font = '11px sans-serif';
    ctx.fillText('SÂN THI ĐẤU', 250, 145);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(pitch.length > 20 ? pitch.slice(0, 18) + '...' : pitch, 250, 170);

    ctx.fillStyle = '#64748B';
    ctx.font = '11px sans-serif';
    ctx.fillText('KHÁCH HÀNG', 40, 205);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(customer, 40, 226);

    ctx.fillStyle = '#64748B';
    ctx.font = '11px sans-serif';
    ctx.fillText('THỜI GIAN', 250, 205);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(time, 250, 226);

    const qrSize = 220;
    const qrX = (480 - qrSize) / 2;
    const qrY = 265;

    if (typeof window.qrcode === 'function') {
      try {
        const qr = window.qrcode(0, 'M');
        qr.addData(bookingCode);
        qr.make();
        const count = qr.getModuleCount();
        const cellSize = qrSize / count;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
        ctx.strokeStyle = '#16A34A';
        ctx.lineWidth = 2;
        ctx.strokeRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);

        for (let r = 0; r < count; r++) {
          for (let c = 0; c < count; c++) {
            ctx.fillStyle = qr.isDark(r, c) ? '#0F172A' : '#FFFFFF';
            ctx.fillRect(qrX + c * cellSize, qrY + r * cellSize, cellSize + 0.5, cellSize + 0.5);
          }
        }
      } catch (e) {}
    }

    ctx.fillStyle = '#475569';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Xuất trình mã QR này tại quầy để nhân viên quét nhận sân & bật đèn.', 240, 525);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '11px sans-serif';
    ctx.fillText('Hotline hỗ trợ: 0352 313 548 · Chúc bạn có trận đấu bùng nổ!', 240, 550);
    ctx.textAlign = 'left';

    try {
      const link = document.createElement('a');
      link.download = `Ve-SanBong-${bookingCode}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      if (window.SanBongApp?.showToast) {
        window.SanBongApp.showToast('✓ Đã tải vé QR điện tử về máy thành công!', 'success');
      }
    } catch (e) {
      console.warn('download error:', e);
    }
  }

  window.SanBongHelpers = {
    escapeHTML,
    formatVND,
    formatDateVN,
    getLocalTodayISO,
    getCsrfToken,
    setCsrfToken,
    clearCsrfToken,
    ensureCsrfToken,
    secureFetch,
    getAuthFetchHeaders,
    getAppBase,
    getRelativePath,
    Icons,
    renderPitchSVG,
    statusPill,
    getVietQRUrl,
    renderQRCodeSVG,
    playScanBeep,
    downloadTicketQR
  };

  window.escapeHTML = escapeHTML;
  window.formatVND = formatVND;
  window.formatDateVN = formatDateVN;
  window.getLocalTodayISO = getLocalTodayISO;
  window.getCsrfToken = getCsrfToken;
  window.setCsrfToken = setCsrfToken;
  window.ensureCsrfToken = ensureCsrfToken;
  window.secureFetch = secureFetch;
  window.getAuthFetchHeaders = getAuthFetchHeaders;
  window.getRelativePath = getRelativePath;

})();



(function () {
  'use strict';

  function getRelativePath(target) {
    if (window.SanBongHelpers && typeof window.SanBongHelpers.getRelativePath === 'function') {
      return window.SanBongHelpers.getRelativePath(target);
    }
    const pathname = window.location.pathname.replace(/\\/g, '/');
    const match = pathname.match(/^(.*?\/Quan_Ly_San_Bong)/i);
    const base = match ? match[1] : '';
    if (!target || target === 'index.html' || target === '/' || target === '') {
      return base ? `${base}/` : '/';
    }
    const cleanTarget = String(target).replace(/^\.\.\//, '').replace(/^html\//, '').replace(/^\//, '').replace(/\.html$/, '');
    if (cleanTarget === 'portal-admin' || cleanTarget === 'portal-admin/') {
      return base ? `${base}/portal-admin/` : '/portal-admin/';
    }
    return base ? `${base}/${cleanTarget}` : `/${cleanTarget}`;
  }

  const STORAGE_KEYS = {
    PITCHES: 'sb_pitches_v2',
    TIME_SLOTS: 'sb_slots_v1',
    SERVICES: 'sb_services_v1',
    VOUCHERS: 'sb_vouchers_v1',
    GOLDEN_HOURS: 'sb_golden_hours_v1',
    MAINTENANCE: 'sb_maintenance_v1',
    USER: 'sb_user_v1',
    BANK: 'sb_bank_v1',
    BOOKINGS: 'sb_bookings_v1',
    PENDING_PAYMENTS: 'sb_pending_payments_v3',
    AUDIT_LOGS: 'sb_audit_logs_v1',
    SHIFTS: 'sb_shifts_v1',
    COUNTER_SALES: 'sb_counter_sales_v1',
    BANK_TRANSACTIONS: 'sb_bank_transactions_v1'
  };

  const DEFAULT_SYSTEM_CONFIG = {
    depositRate: 30,
    hotline: '0352 313 548',
    openHours: '05:30 - 23:00 hàng ngày (kể cả Lễ, Tết)',
    holdMinutes: 15,
    waitlistHoldMinutes: 15,
    refundFullHours: 24,
    refundPartialHours: 4,
    autoCancelEnabled: true,
    matchmakingEnabled: true,
    matchmakingRequireApproval: false
  };

  const SanBongDB = {
    DEFAULT_SYSTEM_CONFIG,
    init() {
      const data = window.SanBongData || {};
      const savedPitches = JSON.parse(localStorage.getItem(STORAGE_KEYS.PITCHES) || '[]');
      if (!localStorage.getItem(STORAGE_KEYS.PITCHES) || savedPitches.length < (data.DEFAULT_PITCHES || []).length) {
        const mergedPitches = [...(data.DEFAULT_PITCHES || [])];
        if (Array.isArray(savedPitches)) {
          savedPitches.forEach(sp => {
            const idx = mergedPitches.findIndex(mp => mp.id === sp.id);
            if (idx >= 0) mergedPitches[idx] = Object.assign({}, mergedPitches[idx], sp);
            else mergedPitches.push(sp);
          });
        }
        localStorage.setItem(STORAGE_KEYS.PITCHES, JSON.stringify(mergedPitches));
      }
      // Ensure weekendPrice exists on all pitches
      try {
        const pList = JSON.parse(localStorage.getItem(STORAGE_KEYS.PITCHES) || '[]');
        let pChanged = false;
        pList.forEach(p => {
          if (!p.weekendPrice || Number(p.weekendPrice) <= 0) {
            p.weekendPrice = p.type === 11 ? 1400000 : (p.type === 7 ? 700000 : 380000);
            pChanged = true;
          }
        });
        if (pChanged) localStorage.setItem(STORAGE_KEYS.PITCHES, JSON.stringify(pList));
      } catch (e) {}

      if (!localStorage.getItem(STORAGE_KEYS.TIME_SLOTS)) {
        localStorage.setItem(STORAGE_KEYS.TIME_SLOTS, JSON.stringify(data.DEFAULT_TIME_SLOTS || []));
      }
      if (!localStorage.getItem(STORAGE_KEYS.SERVICES)) {
        localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(data.DEFAULT_EXTRA_SERVICES || []));
      }
      // Ensure stockQty & minStockWarning exist on all services
      try {
        const sList = JSON.parse(localStorage.getItem(STORAGE_KEYS.SERVICES) || '[]');
        let sChanged = false;
        sList.forEach(s => {
          if (s.stockQty === undefined || s.stockQty === null) {
            s.stockQty = s.id === 'SRV-WATER' ? 42 : (s.id === 'SRV-REVIVE' ? 8 : (s.id === 'SRV-REF' ? 15 : 25));
            sChanged = true;
          }
          if (s.minStockWarning === undefined || s.minStockWarning === null) {
            s.minStockWarning = s.id === 'SRV-REF' ? 2 : 10;
            sChanged = true;
          }
        });
        if (sChanged) localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(sList));
      } catch (e) {}

      if (!localStorage.getItem('sb_active_shift_start')) {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        localStorage.setItem('sb_active_shift_start', `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} 06:00`);
      }

      if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
        const initLogs = [
          {
            id: 1,
            created_at: '2026-11-06 08:15:20',
            actor_name: 'Quản Trị Viên',
            actor_role: 'admin',
            action: 'CHECKIN',
            target_code: 'ASFS260039',
            old_value: 'Trạng thái: Đã xác nhận',
            new_value: 'Trạng thái: Đang đá (Check-in 08:15)',
            ip_address: '127.0.0.1'
          },
          {
            id: 2,
            created_at: '2026-11-06 09:05:11',
            actor_name: 'Nguyễn Văn Bình (Ca 1)',
            actor_role: 'staff',
            action: 'COLLECT_PAYMENT',
            target_code: 'ASFF260038',
            old_value: 'Còn nợ: 210.000đ',
            new_value: 'Thu đủ 210.000đ (Tiền mặt tại quầy)',
            ip_address: '127.0.0.1'
          }
        ];
        localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(initLogs));
      }

      if (!localStorage.getItem(STORAGE_KEYS.SHIFTS)) {
        const initShifts = [
          {
            id: 'CA-261105-02',
            staff_name: 'Nguyễn Văn Bình (Trực sân)',
            staff_username: 'staff1',
            opened_at: '2026-11-05 14:00',
            closed_at: '2026-11-05 22:30',
            cash_declared: 2450000,
            transfer_declared: 1850000,
            actual_cash: 2450000,
            diff_amount: 0,
            status: 'confirmed',
            note: 'Bàn giao đủ tiền mặt cuối ngày cho Quản lý'
          }
        ];
        localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(initShifts));
      }
      if (!localStorage.getItem(STORAGE_KEYS.BANK_TRANSACTIONS)) {
        const nowDate = (window.SanBongData && typeof window.SanBongData.getTodayDateString === 'function')
          ? window.SanBongData.getTodayDateString()
          : new Date().toISOString().slice(0, 10);
        const initBankTx = [
          {
            id: 'TX-SEPAY-901',
            reference_code: 'FT2631100901',
            transaction_date: `${nowDate} 10:15:22`,
            bank_name: 'MBBank',
            content: 'CHUYEN TIEN COC SAN BONG TOI NAY',
            detected_code: '',
            booking_code: '',
            amount_in: 200000,
            expected_amount: 0,
            diff_amount: 0,
            match_status: 'unmatched',
            status: 'pending',
            note: 'Thiếu mã đơn đặt sân trong nội dung chuyển khoản'
          },
          {
            id: 'TX-SEPAY-902',
            reference_code: 'FT2631100902',
            transaction_date: `${nowDate} 11:08:40`,
            bank_name: 'Vietcombank',
            content: 'ASFS982145 coc san',
            detected_code: 'ASFS982145',
            booking_code: 'ASFS982145',
            amount_in: 150000,
            expected_amount: 200000,
            diff_amount: -50000,
            match_status: 'underpaid',
            status: 'pending',
            note: 'Khách chuyển thiếu 50.000đ tiền cọc yêu cầu'
          },
          {
            id: 'TX-SEPAY-903',
            reference_code: 'FT2631100903',
            transaction_date: `${nowDate} 11:45:12`,
            bank_name: 'Techcombank',
            content: 'ASFF110283 thanh toan du',
            detected_code: 'ASFF110283',
            booking_code: 'ASFF110283',
            amount_in: 370000,
            expected_amount: 120000,
            diff_amount: 250000,
            match_status: 'overpaid',
            status: 'pending',
            note: 'Khách chuyển dư +250.000đ (có thể đã chuyển đủ 100%)'
          },
          {
            id: 'TX-SEPAY-900',
            reference_code: 'FT2631100900',
            transaction_date: `${nowDate} 09:30:05`,
            bank_name: 'MBBank',
            content: 'ASFE559072',
            detected_code: 'ASFE559072',
            booking_code: 'ASFE559072',
            amount_in: 500000,
            expected_amount: 500000,
            diff_amount: 0,
            match_status: 'matched',
            status: 'resolved',
            note: 'Tự động đối soát khớp 100% qua SePay Webhook'
          }
        ];
        localStorage.setItem(STORAGE_KEYS.BANK_TRANSACTIONS, JSON.stringify(initBankTx));
      }
      if (!localStorage.getItem(STORAGE_KEYS.VOUCHERS)) {
        localStorage.setItem(STORAGE_KEYS.VOUCHERS, JSON.stringify(data.DEFAULT_VOUCHERS || []));
      } else {
        try {
          const savedVouchers = JSON.parse(localStorage.getItem(STORAGE_KEYS.VOUCHERS) || '[]');
          const defVouchers = data.DEFAULT_VOUCHERS || [];
          if (Array.isArray(savedVouchers) && savedVouchers.length < defVouchers.length) {
            const merged = [...savedVouchers];
            defVouchers.forEach(dv => {
              if (!merged.some(sv => sv.code === dv.code)) {
                merged.push(dv);
              }
            });
            localStorage.setItem(STORAGE_KEYS.VOUCHERS, JSON.stringify(merged));
          }
        } catch (e) {}
      }
      try {
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem('sb_user');
        const sUser = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
        if (sUser && (sUser.username === 'user' || sUser.full_name === 'Trần Minh Hoàng')) {
          sessionStorage.removeItem('sb_current_user');
        }
      } catch (e) {}
      const currentBank = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANK) || '{}');
      if (!localStorage.getItem(STORAGE_KEYS.BANK) || currentBank.accountName === 'NGUYEN VAN HUNG' || currentBank.branch?.includes('Nam Sài Gòn')) {
        localStorage.setItem(STORAGE_KEYS.BANK, JSON.stringify(data.DEFAULT_BANK_INFO || {}));
      }
      if (!localStorage.getItem(STORAGE_KEYS.BOOKINGS)) {
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(data.DEFAULT_BOOKINGS || []));
      }
      if (!localStorage.getItem(STORAGE_KEYS.PENDING_PAYMENTS)) {
        let processed = [];
        try {
          processed = JSON.parse(localStorage.getItem('sb_processed_receipts_v1') || '[]');
          if (!Array.isArray(processed)) processed = [];
        } catch (e) {
          processed = [];
        }
        const defaultPending = [
          { time: '10:12', code: 'ASFS260042', name: 'Trần Minh Hoàng', amt: 306000, bank: 'Vietcombank' },
          { time: '11:05', code: 'ASFS260044', name: 'Phạm Quốc Bảo', amt: 126000, bank: 'Vietcombank' },
          { time: '13:40', code: 'ASFF260045', name: 'Đỗ Thành Long', amt: 90000, bank: 'MB Bank' }
        ].filter(item => !processed.includes(item.code));
        localStorage.setItem(STORAGE_KEYS.PENDING_PAYMENTS, JSON.stringify(defaultPending));
      }

      try {
        const rawPending = localStorage.getItem(STORAGE_KEYS.PENDING_PAYMENTS);
        if (rawPending && rawPending.includes('SB-')) {
          const list = JSON.parse(rawPending);
          if (Array.isArray(list)) {
            const upgraded = list.map(item => {
              if (item.code && item.code.startsWith('SB-')) {
                const pfx = (item.code.includes('0045') || (item.amt && item.amt <= 100000)) ? 'ASFF' : 'ASFS';
                item.code = item.code.replace(/^SB-\d+-?/, pfx + '26');
              }
              return item;
            });
            localStorage.setItem(STORAGE_KEYS.PENDING_PAYMENTS, JSON.stringify(upgraded));
          }
        }
        const rawBookings = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
        if (rawBookings) {
          const bList = JSON.parse(rawBookings);
          if (Array.isArray(bList)) {
            const pitches = this.getPitches();
            let changed = false;
            const upgradedB = bList.map(b => {
              if (b.code && b.code.startsWith('SB-')) {
                const p = pitches.find(pitch => pitch.id === b.pitchId);
                let pfx = 'ASFS';
                if (p?.type === 5 || (b.pitchId && b.pitchId.startsWith('P5'))) pfx = 'ASFF';
                else if (p?.type === 11 || (b.pitchId && b.pitchId.startsWith('P11'))) pfx = 'ASFE';
                b.code = b.code.replace(/^SB-\d+-?/, pfx + '26');
                changed = true;
              }
              if (b.status === 'Vắng mặt (No-Show)' || String(b.status || '').includes('No-Show')) {
                b.status = 'Khách chưa đến';
                changed = true;
              }
              if (b.note && String(b.note).includes('No-Show')) {
                b.note = String(b.note)
                  .replace(/Hủy No-Show do quá 15p/g, 'Quá 15p khách chưa đến')
                  .replace(/No-Show/g, 'Quá 15p khách chưa đến');
                changed = true;
              }
              const tot = Number(b.totalPrice || 0);
              const dep = Number(b.depositAmount || Math.round(tot * 0.3));
              if (b.status === 'Hoàn thành') {
                if (!b.paidRemainingAmount || b.paidRemainingAmount <= 0) {
                  b.paidRemainingAmount = Math.max(0, tot - dep);
                  changed = true;
                }
                if (b.note && String(b.note).includes('phần còn lại 0đ')) {
                  b.note = String(b.note).replace('phần còn lại 0đ', `phần còn lại ${b.paidRemainingAmount.toLocaleString('vi-VN')}đ`);
                  changed = true;
                }
              } else if (b.status !== 'Đã hủy' && b.status !== 'Khách chưa đến' && typeof b.remainingAmount !== 'number') {
                b.remainingAmount = Math.max(0, tot - dep);
                changed = true;
              }
              return b;
            });
            if (changed) {
              localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(upgradedB));
            }
          }
        }
      } catch (e) {}

      this.syncFromServer();
    },

    async syncFromServer() {
      try {
        const res = await fetch(getRelativePath('api/pitches.php?all=1'));
        if (!res.ok) return;
        const jsonRes = await res.json();
        if (jsonRes?.csrf_token && window.SanBongHelpers?.setCsrfToken) {
          window.SanBongHelpers.setCsrfToken(jsonRes.csrf_token);
        }
        if (jsonRes && jsonRes.success && jsonRes.data) {
          const d = jsonRes.data;
          if (Array.isArray(d.pitches) && d.pitches.length > 0) {
            localStorage.setItem(STORAGE_KEYS.PITCHES, JSON.stringify(d.pitches));
          }
          if (Array.isArray(d.timeSlots) && d.timeSlots.length > 0) {
            localStorage.setItem(STORAGE_KEYS.TIME_SLOTS, JSON.stringify(d.timeSlots));
          }
          if (Array.isArray(d.extraServices) && d.extraServices.length > 0) {
            localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(d.extraServices));
          }
          if (Array.isArray(d.vouchers)) {
            localStorage.setItem(STORAGE_KEYS.VOUCHERS, JSON.stringify(d.vouchers));
          }
          if (Array.isArray(d.goldenHourRules)) {
            localStorage.setItem(STORAGE_KEYS.GOLDEN_HOURS, JSON.stringify(d.goldenHourRules));
          }
          if (Array.isArray(d.maintenanceSchedules)) {
            localStorage.setItem(STORAGE_KEYS.MAINTENANCE, JSON.stringify(d.maintenanceSchedules));
          }
          if (d.bankInfo && typeof d.bankInfo === 'object') {
            const b = {
              bankName: d.bankInfo.bankName || d.bankInfo.bank_name || 'Vietcombank',
              bankCode: d.bankInfo.bankCode || d.bankInfo.bank_code || 'VCB',
              accountNo: d.bankInfo.accountNo || d.bankInfo.accountNumber || d.bankInfo.account_no || '0123456789',
              accountNumber: d.bankInfo.accountNumber || d.bankInfo.accountNo || d.bankInfo.account_no || '0123456789',
              accountName: d.bankInfo.accountName || d.bankInfo.account_holder || 'CONG TY CP SAN BONG PRO'
            };
            localStorage.setItem(STORAGE_KEYS.BANK, JSON.stringify(b));
          }
          if (d.settings && typeof d.settings === 'object') {
            const prevCfg = this.getSystemConfig ? this.getSystemConfig() : DEFAULT_SYSTEM_CONFIG;
            const autoRaw = d.settings.autoCancelEnabled ?? d.settings.auto_cancel_enabled;
            const mmEnabledRaw = d.settings.matchmakingEnabled ?? d.settings.matchmaking_enabled;
            const mmApprovalRaw = d.settings.matchmakingRequireApproval ?? d.settings.matchmaking_require_approval;
            const cfg = {
              depositRate: Number(d.settings.depositRate ?? d.settings.deposit_rate ?? prevCfg.depositRate ?? DEFAULT_SYSTEM_CONFIG.depositRate),
              hotline: d.settings.hotline || prevCfg.hotline || DEFAULT_SYSTEM_CONFIG.hotline,
              openHours: d.settings.openHours || d.settings.open_hours || prevCfg.openHours || DEFAULT_SYSTEM_CONFIG.openHours,
              holdMinutes: Number(d.settings.holdMinutes ?? d.settings.hold_minutes ?? prevCfg.holdMinutes ?? DEFAULT_SYSTEM_CONFIG.holdMinutes),
              waitlistHoldMinutes: Number(d.settings.waitlistHoldMinutes ?? d.settings.waitlist_hold_minutes ?? prevCfg.waitlistHoldMinutes ?? DEFAULT_SYSTEM_CONFIG.waitlistHoldMinutes),
              refundFullHours: Number(d.settings.refundFullHours ?? d.settings.refund_full_hours ?? prevCfg.refundFullHours ?? DEFAULT_SYSTEM_CONFIG.refundFullHours),
              refundPartialHours: Number(d.settings.refundPartialHours ?? d.settings.refund_partial_hours ?? prevCfg.refundPartialHours ?? DEFAULT_SYSTEM_CONFIG.refundPartialHours),
              autoCancelEnabled: autoRaw === undefined ? (prevCfg.autoCancelEnabled ?? DEFAULT_SYSTEM_CONFIG.autoCancelEnabled) : (autoRaw === true || autoRaw === 1 || autoRaw === '1' || autoRaw === 'true'),
              matchmakingEnabled: mmEnabledRaw === undefined ? (prevCfg.matchmakingEnabled ?? true) : (mmEnabledRaw === true || mmEnabledRaw === 1 || mmEnabledRaw === '1' || mmEnabledRaw === 'true'),
              matchmakingRequireApproval: mmApprovalRaw === undefined ? (prevCfg.matchmakingRequireApproval ?? false) : (mmApprovalRaw === true || mmApprovalRaw === 1 || mmApprovalRaw === '1' || mmApprovalRaw === 'true'),
              pricingTable: d.settings.pricingTable || prevCfg.pricingTable || null
            };
            localStorage.setItem('sb_system_config', JSON.stringify(cfg));
          }
          window.dispatchEvent(new CustomEvent('sb-data-synced', { detail: d }));
        }
      } catch (e) {}
    },

    getSystemConfig() {
      try {
        const cfg = JSON.parse(localStorage.getItem('sb_system_config') || '{}');
        const autoRaw = cfg.autoCancelEnabled ?? cfg.auto_cancel_enabled;
        const mmEnabledRaw = cfg.matchmakingEnabled ?? cfg.matchmaking_enabled;
        const mmApprovalRaw = cfg.matchmakingRequireApproval ?? cfg.matchmaking_require_approval;
        return {
          depositRate: Number(cfg.depositRate ?? cfg.deposit_rate ?? DEFAULT_SYSTEM_CONFIG.depositRate) || 30,
          hotline: cfg.hotline || DEFAULT_SYSTEM_CONFIG.hotline,
          openHours: cfg.openHours || cfg.open_hours || DEFAULT_SYSTEM_CONFIG.openHours,
          holdMinutes: Math.max(5, Math.min(120, Number(cfg.holdMinutes ?? cfg.hold_minutes ?? DEFAULT_SYSTEM_CONFIG.holdMinutes) || 15)),
          waitlistHoldMinutes: Math.max(5, Math.min(120, Number(cfg.waitlistHoldMinutes ?? cfg.waitlist_hold_minutes ?? DEFAULT_SYSTEM_CONFIG.waitlistHoldMinutes) || 15)),
          refundFullHours: Math.max(1, Math.min(168, Number(cfg.refundFullHours ?? cfg.refund_full_hours ?? DEFAULT_SYSTEM_CONFIG.refundFullHours) || 24)),
          refundPartialHours: Math.max(0, Math.min(48, Number(cfg.refundPartialHours ?? cfg.refund_partial_hours ?? DEFAULT_SYSTEM_CONFIG.refundPartialHours) ?? 4)),
          autoCancelEnabled: autoRaw === undefined ? DEFAULT_SYSTEM_CONFIG.autoCancelEnabled : (autoRaw === true || autoRaw === 1 || autoRaw === '1' || autoRaw === 'true'),
          matchmakingEnabled: mmEnabledRaw === undefined ? true : (mmEnabledRaw === true || mmEnabledRaw === 1 || mmEnabledRaw === '1' || mmEnabledRaw === 'true'),
          matchmakingRequireApproval: mmApprovalRaw === undefined ? false : (mmApprovalRaw === true || mmApprovalRaw === 1 || mmApprovalRaw === '1' || mmApprovalRaw === 'true'),
          pricingTable: cfg.pricingTable || null
        };
      } catch (e) {
        return Object.assign({}, DEFAULT_SYSTEM_CONFIG);
      }
    },

    getGoldenHourRules() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.GOLDEN_HOURS) || '[]') || [];
      } catch (e) {
        return [];
      }
    },

    getMaintenanceSchedules() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.MAINTENANCE) || '[]') || [];
      } catch (e) {
        return [];
      }
    },

    findMaintenanceForSlot(pitchId, dateStr, slotTime = '') {
      const list = this.getMaintenanceSchedules();
      if (!Array.isArray(list) || !list.length || !pitchId || !dateStr) return null;
      const d = String(dateStr).slice(0, 10);
      const parseMin = (hhmm) => {
        const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})$/);
        return m ? (parseInt(m[1], 10) * 60 + parseInt(m[2], 10)) : null;
      };
      const slotMatch = String(slotTime || '').match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
      const sStart = slotMatch ? parseMin(slotMatch[1]) : null;
      const sEnd = slotMatch ? parseMin(slotMatch[2]) : null;
      for (const m of list) {
        if (m.pitchId !== pitchId && m.pitch_id !== pitchId) continue;
        const st = String(m.status || 'scheduled');
        if (st !== 'scheduled' && st !== 'in_progress') continue;
        const mStartDate = String(m.startDate || m.start_date || '');
        const mEndDate = String(m.endDate || m.end_date || '');
        if (!mStartDate || !mEndDate || d < mStartDate || d > mEndDate) continue;
        if (sStart === null || sEnd === null) return m;
        const mStart = parseMin(m.startTime || m.start_time || '05:30') ?? (5 * 60 + 30);
        const mEnd = parseMin(m.endTime || m.end_time || '23:00') ?? (23 * 60);
        if (mEnd <= mStart || (sStart < mEnd && mStart < sEnd)) return m;
      }
      return null;
    },

    getPitches() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.PITCHES)) || [];
      } catch (e) {
        return window.SanBongData?.DEFAULT_PITCHES || [];
      }
    },

    getPitchById(id) {
      const pitches = this.getPitches();
      return pitches.find(p => p.id === id) || null;
    },

    updatePitchStatus(pitchId, status) {
      const pitches = this.getPitches();
      const pitch = pitches.find(p => p.id === pitchId);
      if (pitch) {
        pitch.status = status;
        localStorage.setItem(STORAGE_KEYS.PITCHES, JSON.stringify(pitches));
        return true;
      }
      return false;
    },

    getTimeSlots() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.TIME_SLOTS)) || [];
      } catch (e) {
        return window.SanBongData?.DEFAULT_TIME_SLOTS || [];
      }
    },

    getServices() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.SERVICES)) || [];
      } catch (e) {
        return window.SanBongData?.DEFAULT_EXTRA_SERVICES || [];
      }
    },

    getExtraServices() {
      return this.getServices();
    },

    getVouchers() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.VOUCHERS)) || [];
      } catch (e) {
        return window.SanBongData?.DEFAULT_VOUCHERS || [];
      }
    },

    getPackagePromotions() {
      return window.SanBongData?.PACKAGE_PROMOTIONS || {};
    },

    getPackagePromotion(weeks) {
      const all = this.getPackagePromotions();
      const w = parseInt(weeks, 10) || 1;
      if (w >= 12) return all[12] || null;
      if (w >= 8) return all[8] || null;
      if (w >= 4) return all[4] || null;
      return null;
    },

    saveVoucher(v) {
      if (!v || !v.code) return null;
      const code = String(v.code).trim().toUpperCase();
      const origCode = v.originalCode ? String(v.originalCode).trim().toUpperCase() : code;
      const list = this.getVouchers();
      const origIdx = list.findIndex(x => String(x.code).toUpperCase() === origCode);
      const existingIdx = origIdx >= 0 ? origIdx : list.findIndex(x => String(x.code).toUpperCase() === code);
      const prevActive = existingIdx >= 0 && list[existingIdx].isActive !== undefined ? Boolean(list[existingIdx].isActive) : true;
      const item = {
        code,
        description: String(v.description || '').trim() || `Ưu đãi mã ${code}`,
        type: v.type === 'fixed' ? 'fixed' : 'percent',
        value: Math.max(0, Number(v.value) || 0),
        minOrder: Math.max(0, Number(v.minOrder) || 0),
        maxUsage: Math.max(0, Number(v.maxUsage ?? v.max_usage ?? 100)),
        usedCount: Math.max(0, Number(v.usedCount ?? v.used_count ?? (existingIdx >= 0 ? list[existingIdx].usedCount : 0) ?? 0)),
        validFrom: v.validFrom ?? v.valid_from ?? null,
        validTo: v.validTo ?? v.valid_to ?? null,
        pitchTypeLimit: (v.pitchTypeLimit ?? v.pitch_type_limit) ? Number(v.pitchTypeLimit ?? v.pitch_type_limit) : null,
        isActive: v.isActive !== undefined ? Boolean(v.isActive) : prevActive
      };
      if (existingIdx >= 0) {
        list[existingIdx] = item;
      } else {
        list.unshift(item);
      }
      localStorage.setItem(STORAGE_KEYS.VOUCHERS, JSON.stringify(list));
      return item;
    },

    toggleVoucherActive(code) {
      if (!code) return null;
      const target = String(code).trim().toUpperCase();
      const list = this.getVouchers();
      const idx = list.findIndex(x => String(x.code).toUpperCase() === target);
      if (idx < 0) return null;
      list[idx].isActive = list[idx].isActive === false ? true : false;
      localStorage.setItem(STORAGE_KEYS.VOUCHERS, JSON.stringify(list));
      return list[idx];
    },

    deleteVoucher(code) {
      if (!code) return false;
      const target = String(code).trim().toUpperCase();
      const list = this.getVouchers().filter(x => String(x.code).toUpperCase() !== target);
      localStorage.setItem(STORAGE_KEYS.VOUCHERS, JSON.stringify(list));
      return true;
    },

    getBankInfo() {
      try {
        const b = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANK)) || {};
        if (b.accountNo && !b.accountNumber) b.accountNumber = b.accountNo;
        if (b.accountNumber && !b.accountNo) b.accountNo = b.accountNumber;
        return b;
      } catch (e) {
        return window.SanBongData?.DEFAULT_BANK_INFO || {};
      }
    },

    getUser() {
      try {
        const sessionUser = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
        if (sessionUser && sessionUser.full_name) {
          return {
            id: sessionUser.id,
            name: sessionUser.full_name,
            phone: sessionUser.phone || '',
            email: sessionUser.email || '',
            team: sessionUser.team || '',
            role: sessionUser.role || 'user',
            tier: sessionUser.role === 'admin'
              ? 'Quản trị viên'
              : (sessionUser.role === 'manager'
                ? 'Quản lý sân'
                : (sessionUser.role === 'staff' ? 'Nhân viên trực sân' : (sessionUser.tier || 'Hội viên'))),
            points: Number(sessionUser.points) || 0,
            avatar: sessionUser.full_name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase(),
            totalBookings: 0,
            favoritePitch: ''
          };
        }
        return null;
      } catch (e) {
        return null;
      }
    },

    updateUser(updates) {
      try {
        const sessionUser = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
        if (sessionUser) {
          const updated = Object.assign({}, sessionUser, updates);
          sessionStorage.setItem('sb_current_user', JSON.stringify(updated));
          return updated;
        }
        return null;
      } catch (e) {
        return null;
      }
    },

    getAllBookings() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKINGS)) || [];
      } catch (e) {
        return window.SanBongData?.DEFAULT_BOOKINGS || [];
      }
    },

    getBookingByCode(code) {
      if (!code) return null;
      const bookings = this.getAllBookings();
      return bookings.find(b => b.code.toLowerCase() === code.trim().toLowerCase()) || null;
    },

    getSlots(pitchId, dateStr) {
      const slots = this.getTimeSlots();
      const pitch = this.getPitchById(pitchId);
      const isPitchMaintenance = pitch && pitch.status === 'Bảo trì';

      const bookings = this.getAllBookings().filter(b => b.pitchId === pitchId && b.date === dateStr && b.status !== 'Đã hủy' && b.status !== 'Khách chưa đến' && b.status !== 'Vắng mặt (No-Show)' && b.paymentStatus !== 'Tịch thu cọc 30%');

      return slots.map(slot => {
        if (isPitchMaintenance) {
          return { ...slot, status: 'Bảo trì', booking: null, maintenanceReason: pitch?.maintenanceReason || 'Sân đang bảo trì' };
        }
        const mWin = this.findMaintenanceForSlot ? this.findMaintenanceForSlot(pitchId, dateStr, slot.time) : null;
        if (mWin) {
          return { ...slot, status: 'Bảo trì', booking: null, maintenanceReason: mWin.reason || 'Bảo trì định kỳ' };
        }

        const match = bookings.find(b => b.slotId === slot.id || b.slotTime === slot.time);
        if (match) {
          return {
            ...slot,
            status: match.status === 'Đang đá' ? 'Đang đá' : 'Đã đặt',
            booking: match
          };
        }

        return { ...slot, status: 'Trống', booking: null };
      });
    },

    calculatePrice(pitchId, dateStr, slotIdOrTime, servicesList = [], voucherCode = '', weeksCount = 1) {
      const pitch = this.getPitchById(pitchId);
      if (!pitch) return null;

      const weeks = Math.max(1, parseInt(weeksCount, 10) || 1);
      const slots = this.getTimeSlots();
      const slot = slots.find(s => s.id === slotIdOrTime || s.time === slotIdOrTime);
      const isPeak = slot ? slot.isPeak : false;

      let isWeekend = false;
      let dayIso = 1;
      if (dateStr) {
        const dObj = new Date(String(dateStr).split(' ')[0] + 'T00:00:00');
        if (!isNaN(dObj.getTime())) {
          const day = dObj.getDay();
          isWeekend = (day === 0 || day === 6);
          dayIso = day === 0 ? 7 : day;
        }
      }

      let hourlyRate = isPeak ? Number(pitch.peakPrice || pitch.basePrice || 0) : Number(pitch.basePrice || 0);
      if (isWeekend && Number(pitch.weekendPrice) > 0) {
        hourlyRate = isPeak ? Math.max(Number(pitch.peakPrice || 0), Number(pitch.weekendPrice)) : Number(pitch.weekendPrice);
      }

      let singlePitchPrice = hourlyRate;
      if (slot && slot.duration && slot.duration > 1) {
        singlePitchPrice = Math.round(singlePitchPrice * slot.duration);
      }
      const rawPitchTotal = singlePitchPrice * weeks;

      let singleServiceTotal = 0;
      const allServices = this.getServices();
      const appliedServices = [];

      if (Array.isArray(servicesList)) {
        servicesList.forEach(item => {
          const srvDef = allServices.find(s => s.id === item.id);
          if (srvDef && item.quantity > 0) {
            const lineTotal = srvDef.price * item.quantity * weeks;
            singleServiceTotal += srvDef.price * item.quantity;
            appliedServices.push({
              id: srvDef.id,
              name: srvDef.name,
              price: srvDef.price,
              quantity: item.quantity,
              unit: srvDef.unit,
              lineTotal
            });
          }
        });
      }

      const serviceTotal = singleServiceTotal * weeks;
      const packagePromotion = this.getPackagePromotion(weeks);
      let monthlyDiscountRate = packagePromotion ? packagePromotion.discountRate : 0;
      if (!monthlyDiscountRate) {
        if (weeks >= 12) monthlyDiscountRate = 0.15;
        else if (weeks >= 8) monthlyDiscountRate = 0.10;
        else if (weeks >= 4) monthlyDiscountRate = 0.05;
      }

      const pitchPriceBeforeRule = Math.round(rawPitchTotal * (1 - monthlyDiscountRate));
      const monthlyDiscountAmount = Math.max(0, rawPitchTotal - pitchPriceBeforeRule);

      // Quy tắc giá giờ vàng / thấp điểm (giống resolve_golden_hour_adjustment ở server)
      let netPitchPrice = pitchPriceBeforeRule;
      let goldenHourRule = null;
      let goldenHourDelta = 0;
      const ghRules = this.getGoldenHourRules ? this.getGoldenHourRules() : [];
      if (Array.isArray(ghRules) && ghRules.length > 0 && pitchPriceBeforeRule > 0) {
        const pitchType = Number(pitch.type || 7);
        const sId = slot ? slot.id : String(slotIdOrTime || '');
        const matchingRules = ghRules.filter(r => {
          const rType = r.pitchType ?? r.pitch_type ?? null;
          const rDay = r.dayOfWeek ?? r.day_of_week ?? null;
          const rSlot = r.slotId ?? r.slot_id ?? null;
          if (rType !== null && rType !== '' && Number(rType) !== pitchType) return false;
          if (rDay !== null && rDay !== '' && Number(rDay) !== dayIso) return false;
          if (rSlot !== null && rSlot !== '' && String(rSlot) !== String(sId)) return false;
          return true;
        }).map(r => {
          const rType = r.pitchType ?? r.pitch_type ?? null;
          const rDay = r.dayOfWeek ?? r.day_of_week ?? null;
          const rSlot = r.slotId ?? r.slot_id ?? null;
          const score = (rType !== null && rType !== '' ? 1 : 0) + (rDay !== null && rDay !== '' ? 2 : 0) + (rSlot !== null && rSlot !== '' ? 4 : 0);
          return { r, score };
        }).sort((a, b) => (b.score - a.score) || (Number(b.r.id || 0) - Number(a.r.id || 0)));

        if (matchingRules.length > 0) {
          const best = matchingRules[0].r;
          const adjType = best.priceAdjustmentType || best.price_adjustment_type || 'fixed';
          const adjVal = Number(best.adjustmentValue ?? best.adjustment_value ?? 0);
          if (adjType === 'fixed') {
            netPitchPrice = Math.max(50000, pitchPriceBeforeRule + adjVal);
          } else if (adjType === 'percent_discount') {
            const pct = Math.max(0, Math.min(90, adjVal));
            netPitchPrice = Math.max(50000, Math.round(pitchPriceBeforeRule * (1 - pct / 100)));
          } else if (adjType === 'percent_surcharge') {
            const pct = Math.max(0, Math.min(200, adjVal));
            netPitchPrice = Math.round(pitchPriceBeforeRule * (1 + pct / 100));
          }
          goldenHourDelta = netPitchPrice - pitchPriceBeforeRule;
          goldenHourRule = best;
        }
      }

      const pitchPrice = rawPitchTotal;
      const subtotal = netPitchPrice + serviceTotal;

      let discountAmount = 0;
      let appliedVoucher = null;
      let voucherError = '';
      if (voucherCode) {
        const todayLocal = window.SanBongHelpers?.getLocalTodayISO
          ? window.SanBongHelpers.getLocalTodayISO()
          : new Date().toISOString().split('T')[0];
        const v = this.getVouchers().find(vc => vc.code.toUpperCase() === voucherCode.trim().toUpperCase() && vc.isActive !== false);
        if (!v) {
          voucherError = 'Mã giảm giá không tồn tại hoặc đã ngừng áp dụng.';
        } else if ((v.validFrom && todayLocal < v.validFrom) || (v.validTo && todayLocal > v.validTo)) {
          voucherError = 'Mã giảm giá chưa đến ngày áp dụng hoặc đã hết hạn.';
        } else if (v.pitchTypeLimit && Number(v.pitchTypeLimit) !== Number(pitch.type)) {
          voucherError = `Mã giảm giá này chỉ áp dụng riêng cho Sân ${v.pitchTypeLimit} người.`;
        } else if (Number(v.maxUsage || 0) > 0 && Number(v.usedCount || 0) >= Number(v.maxUsage)) {
          voucherError = 'Mã giảm giá đã hết lượt sử dụng.';
        } else if (subtotal < (v.minOrder || 0)) {
          voucherError = `Đơn hàng chưa đạt tối thiểu ${Number(v.minOrder || 0).toLocaleString('vi-VN')}đ.`;
        } else {
          appliedVoucher = v;
          if (v.type === 'percent') {
            discountAmount = Math.round((subtotal * v.value) / 100);
          } else {
            discountAmount = Math.min(v.value, subtotal);
          }
        }
      }

      const totalDiscount = monthlyDiscountAmount + discountAmount + Math.max(0, -goldenHourDelta);
      const totalPrice = Math.max(0, subtotal - discountAmount);
      const sysCfg = this.getSystemConfig ? this.getSystemConfig() : { depositRate: 30 };
      const depositRate = Math.max(10, Math.min(100, Number(sysCfg.depositRate) || 30)) / 100;
      const depositAmount = Math.round(totalPrice * depositRate);
      const remainingAmount = totalPrice - depositAmount;

      return {
        pitchPrice,
        netPitchPrice,
        singlePitchPrice,
        isPeak,
        isWeekend,
        goldenHourRule,
        goldenHourDelta,
        serviceTotal,
        singleServiceTotal,
        appliedServices,
        subtotal: rawPitchTotal + serviceTotal,
        netSubtotal: subtotal,
        weeksCount: weeks,
        packagePromotion,
        monthlyDiscountRate,
        monthlyDiscountAmount,
        voucherCode: appliedVoucher ? appliedVoucher.code : '',
        voucherError,
        discountAmount,
        totalDiscount,
        totalPrice,
        depositAmount,
        remainingAmount
      };
    },

    createBooking(bookingInput) {
      const now = new Date();
      const rand6 = Math.floor(100000 + Math.random() * 900000);
      const pitch = this.getPitchById(bookingInput.pitchId);
      const pitchIdStr = String(bookingInput.pitchId || '').toUpperCase();
      let prefix = 'ASFS';
      if (pitch?.type === 5 || pitchIdStr.startsWith('P5')) {
        prefix = 'ASFF';
      } else if (pitch?.type === 7 || pitchIdStr.startsWith('P7')) {
        prefix = 'ASFS';
      } else if (pitch?.type === 11 || pitchIdStr.startsWith('P11')) {
        prefix = 'ASFE';
      }
      const bookingCode = bookingInput.code || `${prefix}${rand6}`;
      const weeksCount = Math.max(1, parseInt(bookingInput.weeksCount, 10) || 1);

      const pricing = this.calculatePrice(
        bookingInput.pitchId,
        bookingInput.date,
        bookingInput.slotId || bookingInput.slotTime,
        bookingInput.services || [],
        bookingInput.voucherCode || '',
        weeksCount
      );

      const newBooking = {
        code: bookingCode,
        customerName: bookingInput.customerName || 'Khách vãng lai',
        phone: bookingInput.phone || '',
        email: bookingInput.email || '',
        pitchId: bookingInput.pitchId,
        pitchName: pitch ? pitch.name : 'Sân bóng',
        date: bookingInput.date,
        slotId: bookingInput.slotId || '',
        slotTime: bookingInput.slotTime || '',
        bookingMode: bookingInput.bookingMode || (weeksCount > 1 ? 'monthly' : 'single'),
        weeksCount: weeksCount,
        packagePromotion: pricing?.packagePromotion || this.getPackagePromotion(weeksCount) || null,
        monthlyDates: Array.isArray(bookingInput.monthlyDates) ? bookingInput.monthlyDates : [],
        monthlyDiscountAmount: pricing ? pricing.monthlyDiscountAmount : 0,
        pitchPrice: pricing ? pricing.pitchPrice : 0,
        services: pricing ? pricing.appliedServices : [],
        voucherCode: pricing ? pricing.voucherCode : '',
        discountAmount: pricing ? pricing.discountAmount : 0,
        totalPrice: pricing ? pricing.totalPrice : 0,
        depositAmount: pricing ? pricing.depositAmount : 0,
        remainingAmount: pricing ? pricing.remainingAmount : 0,
        status: bookingInput.status || 'Chờ duyệt cọc',
        paymentStatus: bookingInput.paymentStatus || 'Chờ cọc 30%',
        paymentMethod: bookingInput.paymentMethod || 'Chuyển khoản đặt cọc',
        createdAt: `${bookingInput.date} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        note: bookingInput.note || ''
      };

      const bookings = this.getAllBookings();
      bookings.unshift(newBooking);
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));

      return newBooking;
    },

    updateBookingStatus(bookingCode, status, paymentStatus) {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      if (booking) {
        booking.status = status;
        if (paymentStatus) {
          booking.paymentStatus = paymentStatus;
        }
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
        return booking;
      }
      return null;
    },

    checkinBooking(bookingCode) {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      if (booking) {
        const oldStatus = booking.status;
        booking.status = 'Đang đá';
        booking.checkinTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        if (!booking.paymentStatus || booking.paymentStatus === 'Chờ duyệt cọc' || booking.paymentStatus === 'Chờ cọc 30%') {
          booking.paymentStatus = 'Đã cọc 30%';
        }
        if (typeof booking.remainingAmount !== 'number' || booking.remainingAmount <= 0) {
          const total = Number(booking.totalPrice || 0);
          const dep = Number(booking.depositAmount || Math.round(total * 0.3));
          booking.remainingAmount = Math.max(0, total - dep);
        }
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
        this.addAuditLog('CHECKIN', bookingCode, `Trạng thái: ${oldStatus}`, `Trạng thái: Đang đá (${booking.checkinTime})`);
        return booking;
      }
      return null;
    },

    addOvertimeToBooking(bookingCode, minutes, fee) {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      if (!booking) return null;
      const mins = Math.max(0, parseInt(minutes, 10) || 0);
      const extraFee = Math.max(0, parseInt(fee, 10) || 0);
      booking.overtimeMinutes = (Number(booking.overtimeMinutes) || 0) + mins;
      booking.overtimeFee = (Number(booking.overtimeFee) || 0) + extraFee;
      booking.totalPrice = (Number(booking.totalPrice) || 0) + extraFee;
      booking.remainingAmount = (Number(booking.remainingAmount) || 0) + extraFee;
      booking.note = (booking.note ? booking.note + ' | ' : '') + `[Đá thêm ${mins}p: +${extraFee.toLocaleString('vi-VN')}đ]`;
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      return booking;
    },

    changePitchForBooking(bookingCode, newPitchId, adjustPrice = false, reason = '') {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      const newPitch = this.getPitchById(newPitchId);
      if (!booking || !newPitch) return null;
      const oldPitchName = booking.pitchName || booking.pitchId;
      booking.pitchId = newPitch.id;
      booking.pitchName = newPitch.name;

      let diff = 0;
      if (adjustPrice) {
        const slots = this.getTimeSlots();
        const slot = slots.find(s => s.id === booking.slotId || s.time === booking.slotTime);
        const isPeak = slot ? slot.isPeak : false;
        const duration = (slot && slot.duration) ? slot.duration : 1;
        const weeks = Math.max(1, Number(booking.weeksCount) || 1);
        const newPitchPrice = Math.round((isPeak ? newPitch.peakPrice : newPitch.basePrice) * duration) * weeks;
        const oldPitchPrice = Number(booking.pitchPrice || 0);
        diff = newPitchPrice - oldPitchPrice;
        booking.pitchPrice = newPitchPrice;
        booking.totalPrice = Math.max(0, Number(booking.totalPrice || 0) + diff);
        booking.remainingAmount = Math.max(0, Number(booking.remainingAmount || 0) + diff);
      }
      const diffNote = adjustPrice && diff !== 0 ? ` (${diff > 0 ? '+' : ''}${diff.toLocaleString('vi-VN')}đ)` : ' (Giữ nguyên giá)';
      booking.note = (booking.note ? booking.note + ' | ' : '') + `[Đổi sân: ${oldPitchName} -> ${newPitch.name}${diffNote}${reason ? ' - Lý do: ' + reason : ''}]`;
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      this.addAuditLog('TRANSFER_PITCH', bookingCode, `Sân: ${oldPitchName}`, `Sân: ${newPitch.name}${diffNote}${reason ? ' (' + reason + ')' : ''}`);
      return booking;
    },

    addInPlayService(bookingCode, serviceId, quantity = 1) {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      const srvDef = this.getServices().find(s => s.id === serviceId);
      if (!booking || !srvDef) return null;
      const qty = Math.max(1, parseInt(quantity, 10) || 1);
      const addedCost = srvDef.price * qty;

      if (!Array.isArray(booking.services)) booking.services = [];
      const existing = booking.services.find(s => s.id === srvDef.id);
      if (existing) {
        existing.quantity = (Number(existing.quantity) || 0) + qty;
        existing.lineTotal = existing.quantity * srvDef.price;
      } else {
        booking.services.push({
          id: srvDef.id,
          name: srvDef.name,
          price: srvDef.price,
          quantity: qty,
          unit: srvDef.unit,
          lineTotal: addedCost
        });
      }

      booking.totalPrice = (Number(booking.totalPrice) || 0) + addedCost;
      booking.remainingAmount = (Number(booking.remainingAmount) || 0) + addedCost;
      booking.note = (booking.note ? booking.note + ' | ' : '') + `[Gọi thêm: ${srvDef.name} x${qty} (+${addedCost.toLocaleString('vi-VN')}đ)]`;
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      this.deductServiceStock(srvDef.id, qty);
      return booking;
    },

    cancelBookingEarly(bookingCode, policy = 'refund_100', reason = '') {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      if (!booking) return null;
      const oldStatus = booking.status;
      const oldPay = booking.paymentStatus;
      const policyMap = {
        'refund_100': 'Đã hoàn cọc 100%',
        'reserve': 'Bảo lưu cọc 30%',
        'forfeit_50': 'Phạt 50% cọc'
      };
      booking.status = 'Đã hủy';
      booking.paymentStatus = policyMap[policy] || 'Đã hoàn cọc 100%';
      booking.remainingAmount = 0;
      booking.cancelPolicy = policy;
      booking.cancelReason = reason || 'Hủy lịch trước thời hạn';
      booking.note = (booking.note ? booking.note + ' | ' : '') + `[Hủy trước hạn - ${booking.paymentStatus}${reason ? ': ' + reason : ''}]`;
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      this.addAuditLog('CANCEL_BOOKING', bookingCode, `${oldStatus} (${oldPay})`, `Đã hủy (${booking.paymentStatus}) - Lý do: ${booking.cancelReason}`);
      return booking;
    },

    completeAndPayRemaining(bookingCode, payMethod = 'Tiền mặt tại quầy') {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      if (!booking) return null;
      const total = Number(booking.totalPrice || 0);
      const deposit = Number(booking.depositAmount || Math.round(total * 0.3));
      const calcRem = (typeof booking.remainingAmount === 'number' && booking.remainingAmount > 0)
        ? booking.remainingAmount
        : Math.max(0, total - deposit);
      const paidRem = Number(booking.paidRemainingAmount || calcRem);
      booking.paidRemainingAmount = paidRem;
      booking.remainingPaymentMethod = payMethod;
      booking.remainingAmount = 0;
      booking.status = 'Hoàn thành';
      booking.paymentStatus = 'Đã thanh toán 100%';
      booking.completedAt = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      if (!String(booking.note || '').includes('Đã tất toán phần còn lại')) {
        booking.note = (booking.note ? booking.note + ' | ' : '') + `[Đã tất toán phần còn lại ${paidRem.toLocaleString('vi-VN')}đ qua ${payMethod}]`;
      }
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      this.addAuditLog('COLLECT_PAYMENT', bookingCode, `Còn nợ: ${calcRem.toLocaleString('vi-VN')}đ`, `Thu đủ ${paidRem.toLocaleString('vi-VN')}đ (${payMethod})`);
      return booking;
    },

    releaseNoShowBooking(bookingCode) {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      if (booking) {
        const oldStatus = booking.status;
        booking.status = 'Khách chưa đến';
        booking.paymentStatus = 'Tịch thu cọc 30%';
        booking.note = (booking.note ? booking.note + ' | ' : '') + '[Quá 15p khách chưa đến - Đã nhả sân trống]';
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
        this.addAuditLog('NOSHOW_RELEASE', bookingCode, `Trạng thái: ${oldStatus}`, 'Khách chưa đến (Tịch thu cọc 30% & Nhả sân)');
        return booking;
      }
      return null;
    },

    restoreBooking(bookingCode) {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      if (booking) {
        const oldStatus = booking.status;
        booking.status = 'Đã xác nhận';
        booking.paymentStatus = 'Đã cọc 30%';
        booking.remainingAmount = Math.max(0, Number(booking.totalPrice || 0) - Number(booking.depositAmount || 0));
        booking.note = (booking.note ? booking.note + ' | ' : '') + '[Đã khôi phục lại ca đá]';
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
        this.addAuditLog('RESTORE_BOOKING', bookingCode, `Trạng thái: ${oldStatus}`, 'Đã xác nhận (Khôi phục ca đá)');
        return booking;
      }
      return null;
    },

    upsertPitch(pitchData) {
      if (!pitchData || !pitchData.id) return null;
      const list = this.getPitches();
      const cleanId = String(pitchData.id).trim().toUpperCase();
      const existingIdx = list.findIndex(p => String(p.id).toUpperCase() === cleanId);
      const oldPitch = existingIdx >= 0 ? Object.assign({}, list[existingIdx]) : null;
      const pType = Number(pitchData.type) || (cleanId.startsWith('P11') ? 11 : (cleanId.startsWith('P7') ? 7 : 5));
      const basePrice = Math.max(0, Number(pitchData.basePrice) || (pType === 11 ? 900000 : (pType === 7 ? 450000 : 250000)));
      const peakPrice = Math.max(0, Number(pitchData.peakPrice) || (pType === 11 ? 1200000 : (pType === 7 ? 650000 : 350000)));
      const weekendPrice = Math.max(0, Number(pitchData.weekendPrice) || (pType === 11 ? 1400000 : (pType === 7 ? 700000 : 380000)));

      const updatedPitch = Object.assign({}, oldPitch || {}, {
        id: cleanId,
        name: String(pitchData.name || cleanId).trim(),
        type: pType,
        typeLabel: `Sân ${pType} người`,
        size: String(pitchData.size || (oldPitch ? oldPitch.size : '') || (pType === 11 ? '60m x 95m' : (pType === 7 ? '40m x 60m' : '22m x 42m'))).trim(),
        grass: String(pitchData.grass || (oldPitch ? oldPitch.grass : '') || 'Cỏ nhân tạo FIFA Quality · Đèn LED 400W').trim(),
        basePrice,
        peakPrice,
        weekendPrice,
        status: pitchData.status || (oldPitch ? oldPitch.status : 'Hoạt động'),
        badge: oldPitch?.badge || `Sân ${pType} Tiêu Chuẩn`,
        rating: oldPitch?.rating || 4.9,
        reviews: oldPitch?.reviews || 20,
        amenities: oldPitch?.amenities || ['Đèn LED chống chói', 'Lưới chắn mới', 'Nước uống tại sân']
      });

      if (existingIdx >= 0) {
        list[existingIdx] = updatedPitch;
      } else {
        list.push(updatedPitch);
      }
      localStorage.setItem(STORAGE_KEYS.PITCHES, JSON.stringify(list));
      this.addAuditLog(
        'PITCH_UPSERT',
        cleanId,
        oldPitch ? `${oldPitch.name} (${oldPitch.basePrice.toLocaleString('vi-VN')}đ / ${oldPitch.peakPrice.toLocaleString('vi-VN')}đ) [${oldPitch.status}]` : 'Tạo sân mới',
        `${updatedPitch.name} (Thường: ${basePrice.toLocaleString('vi-VN')}đ | Cao điểm: ${peakPrice.toLocaleString('vi-VN')}đ | Cuối tuần: ${weekendPrice.toLocaleString('vi-VN')}đ) [${updatedPitch.status}]`
      );
      return updatedPitch;
    },

    saveServiceItem(srvData) {
      if (!srvData || !srvData.id) return null;
      const list = this.getServices();
      const cleanId = String(srvData.id).trim().toUpperCase();
      const idx = list.findIndex(s => String(s.id).toUpperCase() === cleanId);
      const item = {
        id: cleanId,
        name: String(srvData.name || cleanId).trim(),
        price: Math.max(0, Number(srvData.price) || 0),
        unit: String(srvData.unit || 'cái').trim(),
        stockQty: Math.max(0, parseInt(srvData.stockQty, 10) || 0),
        minStockWarning: Math.max(0, parseInt(srvData.minStockWarning, 10) || 5),
        icon: srvData.icon || (idx >= 0 ? list[idx].icon : '🥤')
      };
      if (idx >= 0) {
        list[idx] = item;
      } else {
        list.push(item);
      }
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(list));
      return item;
    },

    deleteServiceItem(serviceId) {
      if (!serviceId) return false;
      const target = String(serviceId).trim().toUpperCase();
      const list = this.getServices().filter(s => String(s.id).toUpperCase() !== target);
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(list));
      return true;
    },

    restockService(serviceId, addQty) {
      const list = this.getServices();
      const item = list.find(s => String(s.id).toUpperCase() === String(serviceId).toUpperCase());
      const qty = Math.max(0, parseInt(addQty, 10) || 0);
      if (!item || qty <= 0) return null;
      item.stockQty = Math.max(0, Number(item.stockQty || 0)) + qty;
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(list));
      return item;
    },

    deductServiceStock(serviceId, deductQty) {
      const list = this.getServices();
      const item = list.find(s => String(s.id).toUpperCase() === String(serviceId).toUpperCase());
      const qty = Math.max(0, parseInt(deductQty, 10) || 0);
      if (!item || qty <= 0) return null;
      item.stockQty = Math.max(0, Number(item.stockQty || 0) - qty);
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(list));
      return item;
    },

    getCounterSales() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.COUNTER_SALES) || '[]') || [];
      } catch (e) {
        return [];
      }
    },

    recordCounterSale({ serviceId, quantity, payMethod, paymentMethod, note }) {
      const resolvedPayMethod = payMethod || paymentMethod || 'Tiền mặt tại quầy';
      const list = this.getServices();
      const srv = list.find(s => String(s.id).toUpperCase() === String(serviceId).toUpperCase());
      if (!srv) return null;
      const qty = Math.max(1, parseInt(quantity, 10) || 1);
      const oldStock = Number(srv.stockQty ?? 20);
      const newStock = Math.max(0, oldStock - qty);
      srv.stockQty = newStock;
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(list));

      const totalAmount = Number(srv.price || 0) * qty;
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const user = this.getUser();
      const sale = {
        id: 'POS-' + Date.now().toString().slice(-6),
        serviceId: srv.id,
        serviceName: srv.name,
        quantity: qty,
        unitPrice: srv.price,
        totalAmount,
        payMethod: resolvedPayMethod,
        note: note || '',
        createdAt: timestamp,
        staffName: user ? user.name : 'Nhân viên trực sân'
      };
      const sales = this.getCounterSales();
      sales.unshift(sale);
      localStorage.setItem(STORAGE_KEYS.COUNTER_SALES, JSON.stringify(sales));
      this.addAuditLog(
        'COUNTER_SALE',
        sale.id,
        `Tồn kho ${srv.name}: ${oldStock} ${srv.unit}`,
        `Bán ${qty} ${srv.unit} (${totalAmount.toLocaleString('vi-VN')}đ - ${sale.payMethod}) · Tồn còn: ${newStock}`
      );
      return { sale, service: srv };
    },

    getAuditLogs() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS) || '[]') || [];
      } catch (e) {
        return [];
      }
    },

    addAuditLog(action, targetCode, oldValue, newValue) {
      try {
        const logs = this.getAuditLogs();
        const user = this.getUser();
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const createdAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        const entry = {
          id: Date.now() + Math.floor(Math.random() * 1000),
          created_at: createdAt,
          actor_name: user ? user.name : 'Quản Trị Viên',
          actor_role: user ? user.role : 'admin',
          action: String(action || 'SYSTEM'),
          target_code: String(targetCode || '---'),
          old_value: typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue || '---'),
          new_value: typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue || '---'),
          ip_address: '127.0.0.1'
        };
        logs.unshift(entry);
        localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs.slice(0, 300)));
        return entry;
      } catch (e) {
        return null;
      }
    },

    getPhoneNoShowAndDebt(phone) {
      const clean = String(phone || '').replace(/\D+/g, '');
      if (clean.length < 9) {
        return { phone: clean, noShowCount: 0, debtCount: 0, debtAmount: 0 };
      }
      const bookings = this.getAllBookings();
      let noShowCount = 0;
      let debtCount = 0;
      let debtAmount = 0;
      bookings.forEach(b => {
        const bPhone = String(b.phone || '').replace(/\D+/g, '');
        if (!bPhone || (!bPhone.endsWith(clean.slice(-9)) && bPhone !== clean)) return;
        const st = String(b.status || '');
        const paySt = String(b.paymentStatus || '');
        if (st === 'Khách chưa đến' || st.includes('No-Show') || paySt === 'Tịch thu cọc 30%') {
          noShowCount += 1;
        }
        const rem = Number(b.remainingAmount || 0);
        if (rem > 0 && st !== 'Đã hủy' && st !== 'Khách chưa đến' && !st.includes('No-Show') && st !== 'Hoàn thành') {
          debtCount += 1;
          debtAmount += rem;
        }
      });
      return { phone: clean, noShowCount, debtCount, debtAmount };
    },

    getCurrentShiftStats() {
      const startTime = localStorage.getItem('sb_active_shift_start') || 'Hôm nay, 06:00';
      const startDatePart = String(startTime).split(' ')[0];
      const bookings = this.getAllBookings();
      let cashTotal = 0;
      let transferTotal = 0;

      bookings.forEach(b => {
        if (b.status === 'Đã hủy') return;
        const bDate = String(b.createdAt || b.date || '').split(' ')[0];
        if (startDatePart && bDate && bDate < startDatePart && b.date !== startDatePart) return;

        const dep = Number(b.depositAmount || 0);
        const payMethod = String(b.paymentMethod || '');
        const payStatus = String(b.paymentStatus || '');
        if (dep > 0 && (payStatus.includes('Đã cọc') || payStatus.includes('Đã thanh toán') || payStatus.includes('Tịch thu cọc'))) {
          if (payMethod.includes('Tiền mặt')) {
            cashTotal += dep;
          } else {
            transferTotal += dep;
          }
        }
        if (b.status === 'Hoàn thành') {
          const paidRem = Number(b.paidRemainingAmount || 0);
          const remMethod = String(b.remainingPaymentMethod || 'Tiền mặt tại quầy');
          if (paidRem > 0) {
            if (remMethod.includes('VietQR') || remMethod.includes('Chuyển khoản')) {
              transferTotal += paidRem;
            } else {
              cashTotal += paidRem;
            }
          }
        }
      });

      const sales = this.getCounterSales();
      sales.forEach(s => {
        const sDate = String(s.createdAt || '').split(' ')[0];
        if (startDatePart && sDate && sDate < startDatePart) return;
        const amt = Number(s.totalAmount || 0);
        if (String(s.payMethod || '').includes('VietQR') || String(s.payMethod || '').includes('Chuyển khoản')) {
          transferTotal += amt;
        } else {
          cashTotal += amt;
        }
      });

      return { startTime, cashTotal, transferTotal };
    },

    getShifts() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.SHIFTS) || '[]') || [];
      } catch (e) {
        return [];
      }
    },

    closeShift(note = '') {
      const stats = this.getCurrentShiftStats();
      const user = this.getUser();
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const shiftId = `CA-${String(now.getFullYear()).slice(-2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;

      const newShift = {
        id: shiftId,
        staff_name: user ? user.name : 'Nhân viên trực sân',
        staff_username: user ? (user.username || user.role) : 'staff',
        opened_at: stats.startTime,
        closed_at: nowStr,
        cash_declared: stats.cashTotal,
        transfer_declared: stats.transferTotal,
        actual_cash: null,
        diff_amount: null,
        status: 'closed',
        note: String(note || '').trim()
      };

      const shifts = this.getShifts();
      shifts.unshift(newShift);
      localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));
      localStorage.setItem('sb_active_shift_start', nowStr);

      this.addAuditLog(
        'SHIFT_CLOSE',
        shiftId,
        `Mở ca: ${stats.startTime}`,
        `Chốt ca: TM ${stats.cashTotal.toLocaleString('vi-VN')}đ | CK ${stats.transferTotal.toLocaleString('vi-VN')}đ${note ? ' (' + note + ')' : ''}`
      );
      return newShift;
    },

    confirmShift(shiftId, actualCash) {
      const shifts = this.getShifts();
      const shift = shifts.find(s => String(s.id) === String(shiftId));
      if (!shift) return null;
      const actual = Math.max(0, Number(actualCash) || 0);
      const declared = Number(shift.cash_declared || 0);
      const diff = actual - declared;
      shift.actual_cash = actual;
      shift.diff_amount = diff;
      shift.status = 'confirmed';
      localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));

      this.addAuditLog(
        'SHIFT_CONFIRM',
        shift.id,
        `Tiền mặt kê khai: ${declared.toLocaleString('vi-VN')}đ`,
        `Thực nhận: ${actual.toLocaleString('vi-VN')}đ · Chênh lệch: ${diff === 0 ? 'Khớp 0đ' : (diff > 0 ? '+' + diff.toLocaleString('vi-VN') + 'đ' : diff.toLocaleString('vi-VN') + 'đ')}`
      );
      return shift;
    },

        getPendingPayments() {
      let list = [];
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.PENDING_PAYMENTS);
        list = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(list)) list = [];
      } catch (e) {
        list = [];
      }

      let processed = [];
      try {
        processed = JSON.parse(localStorage.getItem('sb_processed_receipts_v1') || '[]');
        if (!Array.isArray(processed)) processed = [];
      } catch (e) {
        processed = [];
      }

      list = list.filter(item => !processed.includes(item.code));

      const pendingBookings = this.getAllBookings().filter(b => b.paymentStatus === 'Chờ duyệt cọc' && b.status !== 'Đã hủy' && !processed.includes(b.code));
      pendingBookings.forEach(pb => {
        if (!list.some(item => item.code === pb.code)) {
          list.push({
            time: pb.createdAt ? pb.createdAt.split(' ')[1] || 'Vừa xong' : 'Vừa xong',
            code: pb.code,
            name: pb.customerName,
            amt: pb.depositAmount || Math.round(pb.totalPrice * 0.3),
            bank: pb.paymentMethod && pb.paymentMethod.includes('MB') ? 'MB Bank' : 'Vietcombank'
          });
        }
      });
      return list;
    },

    approveDeposit(bookingCode) {
      this.updateBookingStatus(bookingCode, 'Đã xác nhận', 'Đã cọc 30%');
      let list = [];
      try {
        list = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_PAYMENTS)) || [];
      } catch (e) {
        list = [];
      }
      list = list.filter(item => item.code !== bookingCode);
      localStorage.setItem(STORAGE_KEYS.PENDING_PAYMENTS, JSON.stringify(list));

      try {
        let processed = JSON.parse(localStorage.getItem('sb_processed_receipts_v1') || '[]');
        if (!Array.isArray(processed)) processed = [];
        if (!processed.includes(bookingCode)) processed.push(bookingCode);
        localStorage.setItem('sb_processed_receipts_v1', JSON.stringify(processed));
      } catch (e) {}
      return true;
    },

    rejectDeposit(bookingCode) {
      const bookings = this.getAllBookings();
      const booking = bookings.find(b => b.code === bookingCode);
      if (booking) {
        booking.status = 'Đã hủy';
        booking.paymentStatus = 'Đã hủy';
        booking.note = (booking.note ? booking.note + ' ' : '') + '[Admin từ chối duyệt cọc - Đã giải phóng sân]';
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      }
      let list = [];
      try {
        list = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_PAYMENTS)) || [];
      } catch (e) {
        list = [];
      }
      list = list.filter(item => item.code !== bookingCode);
      localStorage.setItem(STORAGE_KEYS.PENDING_PAYMENTS, JSON.stringify(list));

      try {
        let processed = JSON.parse(localStorage.getItem('sb_processed_receipts_v1') || '[]');
        if (!Array.isArray(processed)) processed = [];
        if (!processed.includes(bookingCode)) processed.push(bookingCode);
        localStorage.setItem('sb_processed_receipts_v1', JSON.stringify(processed));
      } catch (e) {}
      return true;
    },

    getBankTransactions(filter = 'all') {
      let list = [];
      try {
        list = JSON.parse(localStorage.getItem(STORAGE_KEYS.BANK_TRANSACTIONS) || '[]') || [];
        if (!Array.isArray(list)) list = [];
      } catch (e) {
        list = [];
      }
      if (filter === 'pending') {
        return list.filter(tx => {
          const st = String(tx.status || '').toLowerCase();
          const mst = String(tx.match_status || '').toLowerCase();
          return st !== 'resolved' && st !== 'ignored' && st !== 'matched' && mst !== 'matched' && mst !== 'resolved';
        });
      }
      if (filter === 'resolved') {
        return list.filter(tx => {
          const st = String(tx.status || '').toLowerCase();
          const mst = String(tx.match_status || '').toLowerCase();
          return st === 'resolved' || st === 'ignored' || st === 'matched' || mst === 'matched' || mst === 'resolved';
        });
      }
      return list;
    },

    addBankTransaction(tx) {
      if (!tx) return null;
      const list = this.getBankTransactions('all');
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const entry = Object.assign({
        id: 'TX-' + Date.now().toString().slice(-6),
        reference_code: 'FT' + Date.now().toString().slice(-8),
        transaction_date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
        bank_name: 'MBBank',
        content: '',
        detected_code: '',
        booking_code: '',
        amount_in: 0,
        expected_amount: 0,
        diff_amount: 0,
        match_status: 'unmatched',
        status: 'pending',
        note: ''
      }, tx);
      list.unshift(entry);
      localStorage.setItem(STORAGE_KEYS.BANK_TRANSACTIONS, JSON.stringify(list));
      return entry;
    },

    resolveBankTransaction(txId, payloadOrStatus = 'resolved') {
      const list = this.getBankTransactions('all');
      const idx = list.findIndex(tx => String(tx.id) === String(txId) || String(tx.reference_code) === String(txId));
      if (idx < 0) return null;
      const tx = list[idx];
      const payload = (typeof payloadOrStatus === 'string') ? { status: payloadOrStatus } : (payloadOrStatus || {});
      const user = this.getUser();
      const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

      if (payload.booking_code) {
        const cleanCode = String(payload.booking_code).trim().toUpperCase();
        tx.booking_code = cleanCode;
        tx.match_status = 'matched';
        const bookings = this.getAllBookings();
        const b = bookings.find(item => String(item.code).toUpperCase() === cleanCode);
        if (b) {
          const amtIn = Number(tx.transfer_amount ?? tx.amount_in ?? tx.amount ?? 0);
          let targetPay = payload.target_payment_status || payload.target_status || 'auto';
          if (targetPay === 'auto') {
            targetPay = amtIn >= Number(b.totalPrice || 0) ? 'Đã thanh toán 100%' : 'Đã cọc 30%';
          }
          if (targetPay === 'Đã thanh toán 100%') {
            b.status = 'Hoàn thành';
            b.paymentStatus = 'Đã thanh toán 100%';
            b.remainingAmount = 0;
          } else {
            b.status = b.status === 'Chờ duyệt cọc' ? 'Đã xác nhận' : (b.status || 'Đã xác nhận');
            b.paymentStatus = 'Đã cọc 30%';
            b.remainingAmount = Math.max(0, Number(b.totalPrice || 0) - amtIn);
          }
          b.note = (b.note ? b.note + ' | ' : '') + `[Đối soát GD ${tx.reference_code || tx.id}: +${amtIn.toLocaleString('vi-VN')}đ${payload.note ? ' - ' + payload.note : ''}]`;
          localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
          tx.expected_amount = targetPay === 'Đã thanh toán 100%' ? Number(b.totalPrice || 0) : Number(b.depositAmount || 0);
          tx.diff_amount = amtIn - tx.expected_amount;
        }
      }

      tx.status = payload.status || 'resolved';
      if (payload.note) tx.note = payload.note;
      tx.resolved_at = nowStr;
      tx.resolved_by = user ? user.name : 'Quản lý';
      list[idx] = tx;
      localStorage.setItem(STORAGE_KEYS.BANK_TRANSACTIONS, JSON.stringify(list));
      this.addAuditLog(
        payload.booking_code ? 'RECONCILE_MANUAL' : 'RECONCILE_RESOLVE',
        tx.booking_code || tx.id,
        `GD ${tx.reference_code || tx.id} (${Number(tx.transfer_amount ?? tx.amount_in ?? 0).toLocaleString('vi-VN')}đ)`,
        tx.booking_code ? `Khớp đơn ${tx.booking_code} (${tx.note || 'Đã đối soát'})` : `${tx.status === 'ignored' ? 'Bỏ qua' : 'Đã xử lý'}: ${tx.note || tx.status}`
      );
      return tx;
    },

    getSlotsWithStatus(pitchId, dateStr) {
      return this.getSlots(pitchId, dateStr);
    }
  };

  SanBongDB.init();

  window.SanBongDB = SanBongDB;

})();



(function () {
  'use strict';

  const escapeHTML = (str) => (window.SanBongHelpers ? window.SanBongHelpers.escapeHTML(str) : String(str || ''));
  const getRelativePath = (t) => (window.SanBongHelpers ? window.SanBongHelpers.getRelativePath(t) : t);
  const Icons = (window.SanBongHelpers && window.SanBongHelpers.Icons) ? window.SanBongHelpers.Icons : {};

function handleLogout() {
    const doLogout = async () => {
      try {
        const headers = window.SanBongHelpers?.getAuthFetchHeaders
          ? window.SanBongHelpers.getAuthFetchHeaders()
          : { 'Content-Type': 'application/json' };
        if (!headers['X-CSRF-Token'] && sessionStorage.getItem('sb_current_user')) {
          const meRes = await fetch(getRelativePath('api/auth.php?action=me'), { cache: 'no-store' });
          const meJson = await meRes.json().catch(() => null);
          if (meJson?.csrf_token) {
            headers['X-CSRF-Token'] = meJson.csrf_token;
          }
        }
        await fetch(getRelativePath('api/auth.php?action=logout'), {
          method: 'POST',
          headers,
          body: JSON.stringify({})
        });
      } catch (e) {}

      sessionStorage.removeItem('sb_current_user');
      if (window.SanBongHelpers?.clearCsrfToken) window.SanBongHelpers.clearCsrfToken();
      try {
        localStorage.removeItem('sb_user_v1');
      } catch (e) {}
      window.location.href = getRelativePath('');
    };

    if (showModal) {
      showModal({
        title: 'Đăng xuất tài khoản',
        message: 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?',
        type: 'info',
        confirmText: 'Đăng xuất',
        cancelText: 'Ở lại',
        onConfirm: doLogout
      });
    } else {
      doLogout();
    }
  }

  function renderNavbar(activePage = 'Trang chủ') {
    let currentUser = null;
    try {
      currentUser = JSON.parse(sessionStorage.getItem('sb_current_user') || 'null');
    } catch(e) {}

    const sysCfg = (window.SanBongDB && typeof window.SanBongDB.getSystemConfig === 'function')
      ? window.SanBongDB.getSystemConfig()
      : null;
    const showMatchmaking = !sysCfg || sysCfg.matchmakingEnabled !== false;

    const navItems = [
      { label: 'Trang chủ', href: getRelativePath('') },
      { label: 'Danh sách sân', href: getRelativePath('fields') },
      { label: 'Đặt sân nhanh', href: getRelativePath('booking') },
      ...(showMatchmaking ? [{ label: 'Tìm đối / Ghép kèo', href: getRelativePath('matchmaking') }] : []),
      { label: 'Lịch sử & Hội viên', href: getRelativePath('history') }
    ];

    if (currentUser && currentUser.role === 'admin') {
      navItems.push({ label: '🛡️ Quản trị Portal', href: getRelativePath('portal-admin/') });
    } else if (currentUser && currentUser.role === 'manager') {
      navItems.push({ label: '🛡️ Quản lý Sân', href: getRelativePath('portal-admin/') });
    } else if (currentUser && currentUser.role === 'staff') {
      navItems.push({ label: '🏟️ Cổng Trực Sân', href: getRelativePath('portal-admin/') });
    }

    let authSectionHtml = '';
    if (currentUser && currentUser.full_name) {
      const isAdmin = currentUser.role === 'admin';
      const isManager = currentUser.role === 'manager';
      const isStaff = currentUser.role === 'staff';
      const user = {
        name: currentUser.full_name,
        avatar: currentUser.full_name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase(),
        tier: isAdmin ? 'Quản trị viên' : (isManager ? 'Quản lý sân' : (isStaff ? 'Nhân viên trực sân' : (currentUser.tier || 'Hội viên'))),
        points: Number(currentUser.points) || 0
      };
      const userSubline = (isStaff || isManager) ? escapeHTML(user.tier) : `${escapeHTML(user.tier)} • ${user.points}đ`;

      authSectionHtml = `
      <div class="flex items-center gap-3 sm:gap-4">
        <a href="${getRelativePath('history')}" class="w-10 h-10 rounded-full border border-[#E2E8F0] flex items-center justify-center relative text-[#475569] hover:bg-[#F8FAFC] transition-colors" title="Lịch sử đặt sân & Hội viên">
          ${Icons.bell}
        </a>

        <div class="relative group">
          <button class="flex items-center gap-2 pl-2 py-1 pr-3 rounded-full hover:bg-[#F1F5F9] transition-colors border border-transparent hover:border-[#E2E8F0] text-left">
            <div class="w-9 h-9 rounded-full bg-[#DCFCE7] text-[#16A34A] font-heading font-bold text-sm flex items-center justify-center">
              ${escapeHTML(user.avatar || 'VIP')}
            </div>
            <div class="hidden sm:block">
              <div class="text-[14px] font-semibold text-[#0F172A] leading-tight">${escapeHTML(user.name)}</div>
              <div class="text-[11px] text-[#16A34A] font-medium">${userSubline}</div>
            </div>
            <svg class="w-4 h-4 text-[#94A3B8] ml-0.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
          </button>

          <!-- Dropdown menu -->
          <div class="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-[#E2E8F0] py-2 hidden group-hover:block z-50 transition-all">
            <div class="px-4 py-2 border-b border-[#F1F5F9]">
              <div class="text-xs font-bold text-[#0F172A] truncate">${escapeHTML(user.name)}</div>
              <div class="text-[11px] text-[#64748B] truncate">${escapeHTML(currentUser.phone || currentUser.email || '')}</div>
            </div>
            <a href="${getRelativePath('history')}" class="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] hover:text-[#16A34A]">
              <span>📋 Lịch sử đặt sân & Hội viên</span>
            </a>
            ${isAdmin ? `
            <a href="${getRelativePath('portal-admin/')}" class="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-[#16A34A] hover:bg-[#DCFCE7]/50">
              <span>🛡️ Bảng điều khiển Quản trị</span>
            </a>` : (isManager ? `
            <a href="${getRelativePath('portal-admin/')}" class="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-[#7C3AED] hover:bg-purple-50">
              <span>🛡️ Quản lý Sân</span>
            </a>` : (isStaff ? `
            <a href="${getRelativePath('portal-admin/')}" class="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-[#2563EB] hover:bg-blue-50">
              <span>🏟️ Cổng Trực Sân</span>
            </a>` : ''))}
            <button onclick="window.SanBongApp.handleLogout()" class="w-full text-left flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#DC2626] hover:bg-rose-50 border-t border-[#F1F5F9]">
              <span>🚪 Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>`;
    } else {
      authSectionHtml = `
      <div class="flex items-center gap-2 sm:gap-3">
        <a href="${getRelativePath('login')}" class="h-9 px-3.5 sm:px-4 rounded-lg flex items-center justify-center text-xs font-bold text-[#16A34A] border border-[#16A34A] hover:bg-[#DCFCE7]/60 transition-all">
          Đăng nhập
        </a>
        <a href="${getRelativePath('login')}?tab=register" class="h-9 px-3.5 sm:px-4 rounded-lg flex items-center justify-center text-xs font-bold bg-[#16A34A] text-white hover:bg-[#15803D] shadow-sm transition-all">
          Đăng ký
        </a>
      </div>`;
    }

    return `
    <header class="w-full h-[72px] bg-white border-b border-[#E2E8F0] px-4 md:px-10 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      <div class="flex items-center gap-6 lg:gap-10">
        <a href="${getRelativePath('')}" class="flex items-center gap-3 group">
          <div class="w-10 h-10 rounded-[10px] bg-[#16A34A] text-white flex items-center justify-center shadow-md group-hover:bg-[#15803D] transition-all">
            ${Icons.ball}
          </div>
          <div>
            <span class="font-heading font-extrabold text-[20px] text-[#0F172A] tracking-tight">Sân Bóng Pro</span>
            <span class="block text-[10px] font-medium text-[#16A34A] uppercase tracking-wider -mt-1">Hệ thống sân đỉnh cao</span>
          </div>
        </a>

        <nav class="hidden md:flex items-center gap-6 lg:gap-8 h-[72px]">
          ${navItems.map(item => {
            const isAct = item.label === activePage;
            return `
            <a href="${item.href}" class="h-full flex items-center relative text-[14px] font-medium transition-colors ${
              isAct ? 'text-[#16A34A] font-semibold' : 'text-[#475569] hover:text-[#0F172A]'
            }">
              <span>${escapeHTML(item.label)}</span>
              ${isAct ? `<span class="absolute bottom-0 left-0 right-0 h-[3px] bg-[#16A34A] rounded-t-full"></span>` : ''}
            </a>`;
          }).join('')}
        </nav>
      </div>

      ${authSectionHtml}
    </header>`;
  }

  function renderFooter() {
    return `
    <footer class="w-full bg-[#0F172A] text-white pt-14 pb-8 border-t border-[#1E293B]">
      <div class="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-[10px] bg-[#16A34A] text-white flex items-center justify-center">
              ${Icons.ball}
            </div>
            <span class="font-heading font-bold text-[20px] text-white">Sân Bóng Pro</span>
          </div>
          <p class="text-[13px] text-[#94A3B8] leading-relaxed">
            Hệ thống đặt sân bóng đá tự động, chuẩn hóa giao diện trực quan với mặt cỏ chuẩn FIFA và dịch vụ trận đấu trọn gói.
          </p>
          <div class="flex items-center gap-3 text-[#94A3B8] text-[13px]">
            ${Icons.phone}
            <a href="tel:0352313548" class="hover:text-emerald-400 font-bold transition-colors">Hotline: 0352 313 548 (24/7)</a>
          </div>
        </div>

        <div>
          <h4 class="font-heading font-semibold text-[15px] mb-4 text-[#F8FAFC]">Hệ Thống Sân</h4>
          <ul class="space-y-2.5 text-[13px] text-[#94A3B8]">
            <li><a href="${getRelativePath('fields')}" class="hover:text-white transition-colors">Sân 5 người tiêu chuẩn</a></li>
            <li><a href="${getRelativePath('fields')}" class="hover:text-white transition-colors">Sân 7 người trung tâm</a></li>
            <li><a href="${getRelativePath('fields')}" class="hover:text-white transition-colors">Sân 11 người ghép chuẩn VFF</a></li>
            <li><a href="${getRelativePath('booking')}" class="hover:text-white transition-colors">Bảng giá & Giờ cao điểm</a></li>
          </ul>
        </div>

        <div>
          <h4 class="font-heading font-semibold text-[15px] mb-4 text-[#F8FAFC]">Dịch Vụ Đi Kèm</h4>
          <ul class="space-y-2.5 text-[13px] text-[#94A3B8]">
            <li>Áo bib phân đội dạ quang</li>
            <li>Nước giải khát Aquafina & Revive</li>
            <li>Trọng tài chuyên nghiệp bắt giải</li>
            <li>Thuê bóng thi đấu Động Lực</li>
          </ul>
        </div>

        <div>
          <h4 class="font-heading font-semibold text-[15px] mb-4 text-[#F8FAFC]">Địa Chỉ Liên Hệ</h4>
          <p class="text-[13px] text-[#94A3B8] leading-relaxed mb-3">
            Khu liên hợp Thể thao Pro, Số 18 Đường Lê Đức Thọ, Phường Mỹ Đình, Quận Nam Từ Liêm, TP. Hà Nội.
          </p>
          <div class="p-3 rounded-lg bg-[#1E293B] border border-[#334155] text-xs text-[#CBD5E1]">
            <span class="text-[#16A34A] font-semibold">● Đang mở cửa:</span> 05:30 - 23:00 mỗi ngày
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 md:px-8 pt-6 border-t border-[#1E293B] flex flex-col sm:flex-row items-center justify-between text-[12px] text-[#64748B] gap-4">
        <div>© 2026 Sân Bóng Pro. Bản quyền hệ thống đặt sân hiện đại.</div>
        <div class="flex items-center gap-6">
          <button type="button" id="footer-btn-terms" class="hover:text-white transition-colors cursor-pointer text-left bg-transparent border-none p-0 text-[12px] text-[#94A3B8]">Điều khoản sử dụng</button>
          <button type="button" id="footer-btn-privacy" class="hover:text-white transition-colors cursor-pointer text-left bg-transparent border-none p-0 text-[12px] text-[#94A3B8]">Chính sách bảo mật (NĐ 13/2023)</button>
        </div>
      </div>

      <!-- FLOATING QUICK ACTIONS (ZALO & HOTLINE) -->
      <div class="fixed right-4 bottom-5 z-40 flex flex-col gap-2.5">
        <a href="https://zalo.me/0352313548" target="_blank" rel="noopener noreferrer" class="w-12 h-12 rounded-full bg-[#0068FF] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform font-bold text-xs" title="Chat Zalo hỗ trợ 24/7">
          <span class="text-xs font-black tracking-tighter">Zalo</span>
        </a>
        <a href="tel:0352313548" class="w-12 h-12 rounded-full bg-[#16A34A] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform text-lg" title="Gọi Hotline đặt sân 0352 313 548">
          <span>📞</span>
        </a>
      </div>
    </footer>`;
  }

  function showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('sb-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'sb-toast-container';
      container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto transform -translate-y-2 opacity-0 transition-all duration-300 ease-out shadow-xl rounded-xl p-3.5 flex items-start gap-3 border text-xs font-semibold backdrop-blur-md';

    let icon = '';
    let styleClasses = '';

    if (type === 'success') {
      icon = '<svg class="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>';
      styleClasses = 'bg-emerald-50/95 text-emerald-900 border-emerald-300';
    } else if (type === 'error') {
      icon = '<svg class="w-4 h-4 text-rose-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>';
      styleClasses = 'bg-rose-50/95 text-rose-900 border-rose-300';
    } else if (type === 'warning') {
      icon = '<svg class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>';
      styleClasses = 'bg-amber-50/95 text-amber-900 border-amber-300';
    } else {
      icon = '<svg class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>';
      styleClasses = 'bg-blue-50/95 text-blue-900 border-blue-300';
    }

    toast.className += ' ' + styleClasses;
    toast.innerHTML = `
      ${icon}
      <div class="flex-1 leading-snug">${escapeHTML(message).replace(/\n/g, '<br>')}</div>
      <button type="button" class="text-slate-400 hover:text-slate-700 ml-1 text-sm font-bold leading-none select-none">&times;</button>
    `;

    const closeBtn = toast.querySelector('button');
    const removeToast = () => {
      toast.classList.add('opacity-0', '-translate-y-2');
      setTimeout(() => {
        try { toast.remove(); } catch (e) {}
      }, 300);
    };
    closeBtn.addEventListener('click', removeToast);

    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.remove('opacity-0', '-translate-y-2');
      toast.classList.add('opacity-100', 'translate-y-0');
    });

    if (duration > 0) {
      setTimeout(removeToast, duration);
    }
  }

  function showModal(options) {
    const { title, message, type = 'info', confirmText = 'Xác nhận', cancelText = null, onConfirm = null } = options;
    const modalId = 'sb-dialog-modal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = modalId;
    overlay.className = 'fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 opacity-0 transition-opacity duration-200';

    const card = document.createElement('div');
    card.className = 'bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 transform scale-95 transition-transform duration-200';

    let headerBadge = '';
    if (type === 'error' || type === 'danger') {
      headerBadge = '<div class="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-lg shrink-0">⚠️</div>';
    } else if (type === 'warning') {
      headerBadge = '<div class="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-lg shrink-0">⚡</div>';
    } else if (type === 'success') {
      headerBadge = '<div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-lg shrink-0">✓</div>';
    } else {
      headerBadge = '<div class="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg shrink-0">ℹ️</div>';
    }

    card.innerHTML = `
      <div class="flex items-start gap-3">
        ${headerBadge}
        <div class="flex-1">
          <h3 class="font-heading font-extrabold text-base text-[#0F172A]">${escapeHTML(title || 'Thông báo')}</h3>
          <div class="text-xs text-[#475569] leading-relaxed mt-1.5 whitespace-pre-line">${escapeHTML(message || '')}</div>
        </div>
      </div>
      <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
        ${cancelText ? `<button type="button" id="modal-cancel-btn" class="btn-sm btn-secondary text-xs">${escapeHTML(cancelText)}</button>` : ''}
        <button type="button" id="modal-confirm-btn" class="btn-sm btn-primary text-xs">${escapeHTML(confirmText)}</button>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.classList.remove('opacity-0');
      overlay.classList.add('opacity-100');
      card.classList.remove('scale-95');
      card.classList.add('scale-100');
    });

    const close = () => {
      overlay.classList.remove('opacity-100');
      overlay.classList.add('opacity-0');
      card.classList.remove('scale-100');
      card.classList.add('scale-95');
      setTimeout(() => overlay.remove(), 200);
    };

    card.querySelector('#modal-confirm-btn').addEventListener('click', () => {
      close();
      if (typeof onConfirm === 'function') onConfirm();
    });

    if (cancelText) {
      card.querySelector('#modal-cancel-btn').addEventListener('click', close);
    }
  }

  function showPrivacyPolicyModal() {
    showModal({
      title: '🛡️ CHÍNH SÁCH BẢO VỆ DỮ LIỆU CÁ NHÂN (Nghị định 13/2023/NĐ-CP)',
      message: `1. Mục đích thu thập & xử lý dữ liệu:
Hệ thống thu thập Họ tên, Số điện thoại, Email và thông tin giao dịch nhằm:
• Xác thực lệnh đặt sân, phát hành vé điện tử QR check-in vào sân.
• Liên hệ xác nhận lịch thi đấu, hỗ trợ dời lịch hoặc xử lý hoàn cọc.
• Tích lũy điểm hội viên và nâng hạng thành viên thân thiết.
• Phòng chống gian lận đặt ảo và bảo vệ an ninh trật tự khu sân.

2. Bên kiểm soát & Bên xử lý dữ liệu:
• Hệ thống Sân Bóng Pro (Số 18 Đường Lê Đức Thọ, P. Mỹ Đình, Q. Nam Từ Liêm, TP. Hà Nội).
• Hotline liên hệ hỗ trợ: 0352 313 548.

3. Thời gian lưu trữ dữ liệu cá nhân:
Dữ liệu cá nhân được lưu trữ an toàn trong suốt thời gian người dùng duy trì tài khoản hoặc tối đa 24 tháng kể từ ngày giao dịch gần nhất, trừ khi pháp luật có quy định khác.

4. Quyền của chủ thể dữ liệu (Quý khách hàng):
Theo Điều 9 Nghị định 13/2023/NĐ-CP, Quý khách có đầy đủ quyền:
• Được biết, đồng ý hoặc không đồng ý xử lý dữ liệu cá nhân.
• Truy cập, chỉnh sửa hoặc yêu cầu cập nhật thông tin cá nhân.
• Yêu cầu xóa dữ liệu cá nhân hoặc rút lại sự đồng ý đã cung cấp.
• Khiếu nại, tố cáo hoặc phản ánh khi phát hiện vi phạm bảo mật dữ liệu.
Mọi yêu cầu thực hiện quyền vui lòng liên hệ Hotline: 0352 313 548 để được giải quyết trong vòng 72 giờ.

5. Cam kết an toàn & bảo mật:
Hệ thống áp dụng các biện pháp mã hóa đường truyền HTTPS/TLS, cơ chế phòng chống truy cập trái phép và cam kết TUYỆT ĐỐI không chia sẻ hoặc mua bán thông tin cho bên thứ ba vì mục đích thương mại.`,
      type: 'info',
      confirmText: 'Tôi đã hiểu & đồng ý'
    });
  }

  function showTermsModal() {
    showModal({
      title: '📋 ĐIỀU KHOẢN SỬ DỤNG DỊCH VỤ SÂN BÓNG PRO',
      message: `1. Quy định đặt sân & Giữ chỗ:
• Khách hàng thực hiện đặt chỗ trực tuyến qua website. Sau khi tạo lệnh, hệ thống áp dụng thời gian giữ chỗ (mặc định 15 phút) để khách thanh toán tiền cọc.
• Hết thời gian giữ chỗ nếu chưa nhận được tiền cọc, hệ thống sẽ tự động hủy đơn và nhả slot cho các đội bóng khác.

2. Chính sách cọc & Hoàn tiền:
• Tỷ lệ đặt cọc: Áp dụng từ 30% đến 100% tổng giá trị khung giờ tùy chính sách.
• Hủy trước 24 giờ so với giờ bắt đầu: Hoàn 100% tiền cọc.
• Hủy trước 4 giờ đến 24 giờ: Hỗ trợ dời lịch thi đấu hoặc hoàn cọc theo chính sách ưu đãi.
• Hủy dưới 4 giờ hoặc vắng mặt (No-Show): Không hỗ trợ hoàn cọc nhằm bù đắp chi phí vận hành và giữ sân.

3. Quy định trang thiết bị & An toàn:
• Cầu thủ sử dụng giày thi đấu chuyên dụng cho sân cỏ nhân tạo (giày đinh dăm TF hoặc đế bệt IC). Nghiêm cấm giày đinh sắt SG gây rách mặt cỏ.
• Giữ gìn vệ sinh chung, không mang chất dễ cháy nổ, đồ thủy tinh hoặc chất cấm vào khu vực sân cỏ.
• Tôn trọng đối thủ, trọng tài và thi đấu trên tinh thần thể thao văn minh, fair-play.`,
      type: 'info',
      confirmText: 'Đã hiểu'
    });
  }

  async function syncAuthMe() {
    try {
      const res = await fetch(getRelativePath('api/auth.php?action=me'), { credentials: 'same-origin', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.csrf_token && window.SanBongHelpers?.setCsrfToken) {
          window.SanBongHelpers.setCsrfToken(data.csrf_token);
        }
        if (data && data.turnstile_site_key) {
          window.TURNSTILE_SITE_KEY = data.turnstile_site_key;
        }
        if (data && data.authenticated && data.user) {
          const current = JSON.parse(sessionStorage.getItem('sb_current_user') || '{}');
          const updated = Object.assign({}, current, data.user);
          sessionStorage.setItem('sb_current_user', JSON.stringify(updated));
          // If navbar is already rendered, update points / tier if changed
          const navPlaceholder = document.getElementById('app-navbar');
          if (navPlaceholder && window.SanBongUI && typeof window.SanBongUI.renderNavbar === 'function') {
            const activePage = navPlaceholder.dataset ? navPlaceholder.dataset.activePage : navPlaceholder.getAttribute?.('data-active-page');
            navPlaceholder.innerHTML = activePage ? window.SanBongUI.renderNavbar(activePage) : window.SanBongUI.renderNavbar();
          }
        } else if (data && data.authenticated === false) {
          if (sessionStorage.getItem('sb_current_user')) {
            sessionStorage.removeItem('sb_current_user');
            const navPlaceholder = document.getElementById('app-navbar');
            if (navPlaceholder && window.SanBongUI && typeof window.SanBongUI.renderNavbar === 'function') {
              const activePage = navPlaceholder.dataset ? navPlaceholder.dataset.activePage : navPlaceholder.getAttribute?.('data-active-page');
              navPlaceholder.innerHTML = activePage ? window.SanBongUI.renderNavbar(activePage) : window.SanBongUI.renderNavbar();
            }
          }
        }
      }
    } catch (e) {}
  }

  // Event delegation for footer buttons & legal links
  document.addEventListener('click', function (e) {
    const target = e.target;
    if (!target) return;
    if (target.id === 'footer-btn-privacy' || target.closest('#footer-btn-privacy')) {
      e.preventDefault();
      showPrivacyPolicyModal();
      return;
    }
    if (target.id === 'footer-btn-terms' || target.closest('#footer-btn-terms')) {
      e.preventDefault();
      showTermsModal();
      return;
    }
  });

  // Sync auth on load
  if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', syncAuthMe);
    } else {
      syncAuthMe();
    }
  }

  window.alert = function (msg) {
    showToast(String(msg), 'warning');
  };

  window.SanBongUI = {
    renderNavbar,
    renderFooter,
    handleLogout,
    showToast,
    showModal,
    showPrivacyPolicyModal,
    showTermsModal,
    syncAuthMe
  };

  window.showToast = showToast;
  window.showModal = showModal;

})();


(function () {
  'use strict';

  const helpers = window.SanBongHelpers || {};
  const db = window.SanBongDB || {};
  const ui = window.SanBongUI || {};

  window.SanBongApp = {
    escapeHTML: helpers.escapeHTML || (s => s),
    formatVND: helpers.formatVND || (n => Number(n).toLocaleString('vi-VN') + 'đ'),
    formatDateVN: helpers.formatDateVN || (d => d),
    getLocalTodayISO: helpers.getLocalTodayISO || (() => {
      const d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }),
    getCsrfToken: helpers.getCsrfToken || (() => ''),
    setCsrfToken: helpers.setCsrfToken || (() => {}),
    ensureCsrfToken: helpers.ensureCsrfToken || (() => Promise.resolve('')),
    secureFetch: helpers.secureFetch || fetch,
    getAuthFetchHeaders: helpers.getAuthFetchHeaders || ((extra) => Object.assign({ 'Content-Type': 'application/json' }, extra || {})),
    getRelativePath: helpers.getRelativePath || (p => p),
    Icons: helpers.Icons || {},
    renderPitchSVG: helpers.renderPitchSVG || (() => ''),
    statusPill: helpers.statusPill || (s => '<span>' + s + '</span>'),
    getVietQRUrl: helpers.getVietQRUrl || (() => ''),
    renderQRCodeSVG: helpers.renderQRCodeSVG || (() => ''),
    downloadTicketQR: helpers.downloadTicketQR || (() => {}),
    playScanBeep: helpers.playScanBeep || (() => {}),
    SanBongDB: db,
    renderNavbar: ui.renderNavbar || (() => ''),
    renderFooter: ui.renderFooter || (() => ''),
    handleLogout: ui.handleLogout || (() => {}),
    showToast: ui.showToast || ((m) => console.log(m)),
    showModal: ui.showModal || ((cfg) => { if (confirm(cfg.message || cfg.title)) cfg.onConfirm && cfg.onConfirm(); })
  };

  function renderShellNavbar() {
    const currentUI = window.SanBongUI || ui;
    const navPlaceholder = document.getElementById('app-navbar');
    if (navPlaceholder && currentUI.renderNavbar) {
      const activePage = navPlaceholder.dataset ? navPlaceholder.dataset.activePage : navPlaceholder.getAttribute?.('data-active-page');
      navPlaceholder.innerHTML = activePage
        ? currentUI.renderNavbar(activePage)
        : currentUI.renderNavbar();
    }
  }

  function initAppShell() {
    if (window.SanBongDB && typeof window.SanBongDB.init === 'function') {
      window.SanBongDB.init();
    }

    renderShellNavbar();

    const currentUI = window.SanBongUI || ui;
    const footerPlaceholder = document.getElementById('app-footer');
    if (footerPlaceholder && currentUI.renderFooter) {
      footerPlaceholder.innerHTML = currentUI.renderFooter();
    }

    if (!window._sbNavSyncBound && typeof window.addEventListener === 'function') {
      window._sbNavSyncBound = true;
      window.addEventListener('sb-data-synced', renderShellNavbar);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAppShell);
  } else {
    initAppShell();
  }
})();
