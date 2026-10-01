/**
 * Surge iOS http-request 腳本 - YouTube PoToken 產生器（WebView 引擎）
 *
 * 移植自 SmartTube PoToken 的 WAA 流程：
 *   visitorData -> Waa/Create challenge -> 在 Surge WebView 內
 *   執行 BotGuard interpreter -> Waa/GenerateIT -> minter -> mint(visitor 綁定)
 * 執行完成後回傳 JSON response（http-request 攔截結果）。
 *
 * 觸發方式：由 CatPaw server 端透過 Surge HTTP proxy GET
 * http://ytpot.token/token（可帶 ?client=<name> 指定要哪個 client 的 pot），
 * Surge 的 http-request script 攔截後執行並回 JSON。
 *
 * 支援的 client（決定 visitor 取得方式 + 回 JSON 的 client 欄位）：
 *   ?client=tvhtml5   -> 從 www.youtube.com/tv 頁刮 TVHTML5 visitor 再 mint
 *   ?client=ios       -> visitor_id endpoint (IOS client)
 *   ?client=android   -> visitor_id endpoint (ANDROID client)
 *   ?client=web / 空  -> visitor_id endpoint (WEB client, 預設)
 *
 * === Surge profile 加入方式 ===
 * [Script]
 * yt-pot = type=http-request,pattern=^http://ytpot\.token/token,engine=webview,script-path=surge-yt-pot.js,timeout=300
 *
 * 重要：
 *   - engine 一定要 webview（JSC 過不了 BotGuard）
 *   - timeout 給大（BotGuard init 需時）
 *   - CatPaw server 端 pot_url 設 http://ytpot.token/token，並於需要 TV pot 時帶 ?client=tvhtml5
 * 看 log：Surge → Logbook，或該腳本 per-script log（加 debug=true 更快迭代）。
 *
 * 本腳本 HTTP 層統一走 Env.js（chavyleung），自動相容 Surge / Loon / Quantumult X /
 * Stash / Shadowrocket / Egern 等 APP
 */

'use strict';

// =============================================================================
// Env.js (chavyleung)
// =============================================================================
function Env(e,t){class s{constructor(e){this.env=e}send(e,t="GET"){e="string"==typeof e?{url:e}:e;let s=this.get;"POST"===t&&(s=this.post);const i=new Promise((t,i)=>{s.call(this,e,(e,s,o)=>{e?i(e):t(s)})});return e.timeout?((e,t=1e3)=>Promise.race([e,new Promise((e,s)=>{setTimeout(()=>{s(new Error("请求超时"))},t)})]))(i,e.timeout):i}get(e){return this.send.call(this.env,e)}post(e){return this.send.call(this.env,e,"POST")}}return new class{constructor(e,t){this.logLevels={debug:0,info:1,warn:2,error:3},this.logLevelPrefixs={debug:"[DEBUG] ",info:"[INFO] ",warn:"[WARN] ",error:"[ERROR] "},this.logLevel="info",this.name=e,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,t),this.log("",`🔔${this.name}, 开始!`)}getEnv(){return"undefined"!=typeof Egern?"Egern":"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof module&&module.exports?"Node.js":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":void 0}isNode(){return"Node.js"===this.getEnv()}isQuanX(){return"Quantumult X"===this.getEnv()}isSurge(){return"Surge"===this.getEnv()}isLoon(){return"Loon"===this.getEnv()}isShadowrocket(){return"Shadowrocket"===this.getEnv()}isStash(){return"Stash"===this.getEnv()}isEgern(){return"Egern"===this.getEnv()}toObj(e,t=null){try{return JSON.parse(e)}catch{return t}}toStr(e,t=null,...s){try{return JSON.stringify(e,...s)}catch{return t}}getjson(e,t){let s=t;if(this.getdata(e))try{s=JSON.parse(this.getdata(e))}catch{}return s}setjson(e,t){try{return this.setdata(JSON.stringify(e),t)}catch{return!1}}getScript(e){return new Promise(t=>{this.get({url:e},(e,s,i)=>t(i))})}runScript(e,t){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let o=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");o=o?1*o:20,o=t&&t.timeout?t.timeout:o;const[r,a]=i.split("@"),n={url:`http://${a}/v1/scripting/evaluate`,body:{script_text:e,mock_type:"cron",timeout:o},headers:{"X-Key":r,Accept:"*/*"},policy:"DIRECT",timeout:o};this.post(n,(e,t,i)=>s(i))}).catch(e=>this.logErr(e))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const e=this.path.resolve(this.dataFile),t=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(e),i=!s&&this.fs.existsSync(t);if(!s&&!i)return{};{const i=s?e:t;try{return JSON.parse(this.fs.readFileSync(i))}catch(e){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const e=this.path.resolve(this.dataFile),t=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(e),i=!s&&this.fs.existsSync(t),o=JSON.stringify(this.data);s?this.fs.writeFileSync(e,o):i?this.fs.writeFileSync(t,o):this.fs.writeFileSync(e,o)}}lodash_get(e,t,s=void 0){const i=t.replace(/\[(\d+)\]/g,".$1").split(".");let o=e;for(const e of i)if(o=Object(o)[e],void 0===o)return s;return o}lodash_set(e,t,s){return Object(e)!==e||(Array.isArray(t)||(t=t.toString().match(/[^.[\]]+/g)||[]),t.slice(0,-1).reduce((e,s,i)=>Object(e[s])===e[s]?e[s]:e[s]=(Math.abs(t[i+1])|0)===+t[i+1]?[]:{},e)[t[t.length-1]]=s),e}getdata(e){let t=this.getval(e);if(/^@/.test(e)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(e),o=s?this.getval(s):"";if(o)try{const e=JSON.parse(o);t=e?this.lodash_get(e,i,""):t}catch(e){t=""}}return t}setdata(e,t){let s=!1;if(/^@/.test(t)){const[,i,o]=/^@(.*?)\.(.*?)$/.exec(t),r=this.getval(i),a=i?"null"===r?null:r||"{}":"{}";try{const t=JSON.parse(a);this.lodash_set(t,o,e),s=this.setval(JSON.stringify(t),i)}catch(t){const r={};this.lodash_set(r,o,e),s=this.setval(JSON.stringify(r),i)}}else s=this.setval(e,t);return s}getval(e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Egern":return $persistentStore.read(e);case"Quantumult X":return $prefs.valueForKey(e);case"Node.js":return this.data=this.loaddata(),this.data[e];default:return this.data&&this.data[e]||null}}setval(e,t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Egern":return $persistentStore.write(e,t);case"Quantumult X":return $prefs.setValueForKey(e,t);case"Node.js":return this.data=this.loaddata(),this.data[t]=e,this.writedata(),!0;default:return this.data&&this.data[t]||null}}initGotEnv(e){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,e&&(e.headers=e.headers?e.headers:{},e&&(e.headers=e.headers?e.headers:{},void 0===e.headers.cookie&&void 0===e.headers.Cookie&&void 0===e.cookieJar&&(e.cookieJar=this.ckjar)))}get(e,t=()=>{}){switch(e.headers&&(delete e.headers["Content-Type"],delete e.headers["Content-Length"],delete e.headers["content-type"],delete e.headers["content-length"]),e.params&&(e.url+="?"+this.queryStr(e.params)),void 0===e.followRedirect||e.followRedirect||((this.isSurge()||this.isLoon())&&(e["auto-redirect"]=!1),this.isQuanX()&&(e.opts?e.opts.redirection=!1:e.opts={redirection:!1})),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Egern":default:this.isSurge()&&this.isNeedRewrite&&(e.headers=e.headers||{},Object.assign(e.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(e,(e,s,i)=>{!e&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),t(e,s,i)});break;case"Quantumult X":this.isNeedRewrite&&(e.opts=e.opts||{},Object.assign(e.opts,{hints:!1})),$task.fetch(e).then(e=>{const{statusCode:s,statusCode:i,headers:o,body:r,bodyBytes:a}=e;t(null,{status:s,statusCode:i,headers:o,body:r,bodyBytes:a},r,a)},e=>t(e&&e.error||"UndefinedError"));break;case"Node.js":let s=require("iconv-lite");this.initGotEnv(e),this.got(e).on("redirect",(e,t)=>{try{if(e.headers["set-cookie"]){const s=e.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),t.cookieJar=this.ckjar}}catch(e){this.logErr(e)}}).then(e=>{const{statusCode:i,statusCode:o,headers:r,rawBody:a}=e,n=s.decode(a,this.encoding);t(null,{status:i,statusCode:o,headers:r,rawBody:a,body:n},n)},e=>{const{message:i,response:o}=e;t(i,o,o&&s.decode(o.rawBody,this.encoding))})}}post(e,t=()=>{}){const s=e.method?e.method.toLocaleLowerCase():"post";switch(e.body&&e.headers&&!e.headers["Content-Type"]&&!e.headers["content-type"]&&(e.headers["Content-Type"]="application/x-www-form-urlencoded"),e.headers&&(delete e.headers["Content-Length"],delete e.headers["content-length"]),void 0===e.followRedirect||e.followRedirect||((this.isSurge()||this.isLoon())&&(e["auto-redirect"]=!1),this.isQuanX()&&(e.opts?e.opts.redirection=!1:e.opts={redirection:!1})),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Egern":default:this.isSurge()&&this.isNeedRewrite&&(e.headers=e.headers||{},Object.assign(e.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](e,(e,s,i)=>{!e&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),t(e,s,i)});break;case"Quantumult X":e.method=s,this.isNeedRewrite&&(e.opts=e.opts||{},Object.assign(e.opts,{hints:!1})),$task.fetch(e).then(e=>{const{statusCode:s,statusCode:i,headers:o,body:r,bodyBytes:a}=e;t(null,{status:s,statusCode:i,headers:o,body:r,bodyBytes:a},r,a)},e=>t(e&&e.error||"UndefinedError"));break;case"Node.js":let i=require("iconv-lite");this.initGotEnv(e);const{url:o,...r}=e;this.got[s](o,r).then(e=>{const{statusCode:s,statusCode:o,headers:r,rawBody:a}=e,n=i.decode(a,this.encoding);t(null,{status:s,statusCode:o,headers:r,rawBody:a,body:n},n)},e=>{const{message:s,response:o}=e;t(s,o,o&&i.decode(o.rawBody,this.encoding))})}}time(e,t=null){const s=t?new Date(t):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(e)&&(e=e.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let t in i)new RegExp("("+t+")").test(e)&&(e=e.replace(RegExp.$1,1==RegExp.$1.length?i[t]:("00"+i[t]).substr((""+i[t]).length)));return e}queryStr(e){let t="";for(const s in e){let i=e[s];null!=i&&""!==i&&("object"==typeof i&&(i=JSON.stringify(i)),t+=`${s}=${i}&`)}return t=t.substring(0,t.length-1),t}msg(t=e,s="",i="",o={}){const r=e=>{const{$open:t,$copy:s,$media:i,$mediaMime:o}=e;switch(typeof e){case void 0:return e;case"string":switch(this.getEnv()){case"Surge":case"Stash":case"Egern":default:return{url:e};case"Loon":case"Shadowrocket":return e;case"Quantumult X":return{"open-url":e};case"Node.js":return}case"object":switch(this.getEnv()){case"Surge":case"Stash":case"Shadowrocket":case"Egern":default:{const r={};let a=e.openUrl||e.url||e["open-url"]||t;a&&Object.assign(r,{action:"open-url",url:a});let n=e["update-pasteboard"]||e.updatePasteboard||s;n&&Object.assign(r,{action:"clipboard",text:n});let h=e.mediaUrl||e["media-url"]||i;if(h){let e,t;if(h.startsWith("http"));else if(h.startsWith("data:")){const[s]=h.split(";"),[,i]=h.split(",");e=i,t=s.replace("data:","")}else{e=h,t=(e=>{const t={JVBERi0:"application/pdf",R0lGODdh:"image/gif",R0lGODlh:"image/gif",iVBORw0KGgo:"image/png","/9j/":"image/jpg"};for(var s in t)if(0===e.indexOf(s))return t[s];return null})(h)}Object.assign(r,{"media-url":h,"media-base64":e,"media-base64-mime":o??t})}return Object.assign(r,{"auto-dismiss":e["auto-dismiss"],sound:e.sound}),r}case"Loon":{const s={};let o=e.openUrl||e.url||e["open-url"]||t;o&&Object.assign(s,{openUrl:o});let r=e.mediaUrl||e["media-url"]||i;return r&&Object.assign(s,{mediaUrl:r}),console.log(JSON.stringify(s)),s}case"Quantumult X":{const o={};let r=e["open-url"]||e.url||e.openUrl||t;r&&Object.assign(o,{"open-url":r});let a=e.mediaUrl||e["media-url"]||i;a&&Object.assign(o,{"media-url":a});let n=e["update-pasteboard"]||e.updatePasteboard||s;return n&&Object.assign(o,{"update-pasteboard":n}),console.log(JSON.stringify(o)),o}case"Node.js":return}default:return}};if(!this.isMute)switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Egern":default:$notification.post(t,s,i,r(o));break;case"Quantumult X":$notify(t,s,i,r(o));case"Node.js":}if(!this.isMuteLog){let e=["","==============📣系统通知📣=============="];e.push(t),s&&e.push(s),i&&e.push(i),console.log(e.join("\n")),this.logs=this.logs.concat(e)}}debug(...e){this.logLevels[this.logLevel]<=this.logLevels.debug&&(e.length>0&&(this.logs=[...this.logs,...e]),console.log(`${this.logLevelPrefixs.debug}${e.map(e=>e??String(e)).join(this.logSeparator)}`))}info(...e){this.logLevels[this.logLevel]<=this.logLevels.info&&(e.length>0&&(this.logs=[...this.logs,...e]),console.log(`${this.logLevelPrefixs.info}${e.map(e=>e??String(e)).join(this.logSeparator)}`))}warn(...e){this.logLevels[this.logLevel]<=this.logLevels.warn&&(e.length>0&&(this.logs=[...this.logs,...e]),console.log(`${this.logLevelPrefixs.warn}${e.map(e=>e??String(e)).join(this.logSeparator)}`))}error(...e){this.logLevels[this.logLevel]<=this.logLevels.error&&(e.length>0&&(this.logs=[...this.logs,...e]),console.log(`${this.logLevelPrefixs.error}${e.map(e=>e??String(e)).join(this.logSeparator)}`))}log(...e){e.length>0&&(this.logs=[...this.logs,...e]),console.log(e.map(e=>e??String(e)).join(this.logSeparator))}logErr(e,t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Egern":case"Quantumult X":default:this.log("",`❗️${this.name}, 错误!`,t,e);break;case"Node.js":this.log("",`❗️${this.name}, 错误!`,t,void 0!==e.message?e.message:e,e.stack)}}wait(e){return new Promise(t=>setTimeout(t,e))}done(e={}){const t=((new Date).getTime()-this.startTime)/1e3;switch(this.log("",`🔔${this.name}, 结束! 🕛 ${t} 秒`),this.log(),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Egern":case"Quantumult X":default:$done(e);break;case"Node.js":process.exit(1)}}}(e,t)}
const $ = new Env('yt-pot');

// =============================================================================
// Configuration
// =============================================================================

// BotGuard challenge endpoints：
//   https://www.youtube.com/api/jnn/v1/Create + /GenerateIT
// 帶 SOCS cookie + Chrome UA。舊版 jnn-pa.googleapis.com/$rpc 保留在註解。
const JNN_BASE = 'https://www.youtube.com/api/jnn/v1';
const JNN_CREATE = JNN_BASE + '/Create';
const JNN_GENERATE = JNN_BASE + '/GenerateIT';
const JNN_KEY = 'AIzaSyDyT5W0Jh49F30Pqqtyfdf7pDLFKLJoAnw';
const REQUEST_KEY = 'O43z0dpjhgX20SCx4KAo';
const CLIENT_VERSION = '2.20250501.06.00';

// SOCS cookie + Chrome/138 UA
const BG_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';
const BG_COOKIE = 'SOCS=CAISAiAD';

// BotGuard HTTP 請求共用的 header 集
const BG_HEADERS = {
  'User-Agent': BG_UA,
  Accept: 'application/json',
  'Content-Type': 'application/json+protobuf',
  Cookie: BG_COOKIE,
  'x-goog-api-key': JNN_KEY,
  'x-user-agent': 'grpc-web-javascript/0.1',
};

// 預設 WEB client 的 UA / client 標頭（用於 visitor 取得）
const WEB_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const WEB_HEADERS_BASE = {
  'Content-Type': 'application/json',
  'Accept-Language': 'en-US, en;q=0.9',
  Cookie: 'SOCS=CAE=',
  Origin: 'https://www.youtube.com',
  Referer: 'https://www.youtube.com',
  'User-Agent': WEB_UA,
};

// ANDROID / IOS 的 visitor_id endpoint 參數
const VISITOR_ID_CLIENTS = {
  android: { name: 'ANDROID', version: '21.02.35', ua: 'com.google.android.youtube/21.02.35 (Linux; U; Android 11) gzip', id: '3' },
  ios: { name: 'IOS', version: '21.02.3', ua: 'com.google.ios.youtube/21.02.3 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)', id: '5' },
};

// BotGuard 執行相關的逾時（毫秒 / 秒）
const ASYNC_SNAPSHOT_TIMEOUT_MS = 10000;
const SNAPSHOT_TIMEOUT_MS = 20000;
const REQUEST_TIMEOUT_MS = 20000; // env.js 的 timeout 以毫秒計

// =============================================================================
// Request parameters
// =============================================================================

// 從攔截 URL 讀取 query 參數。$request 存在於 http-request script（Surge / Loon / QX / ... 通用入口）。
function getQueryParam(name) {
  try {
    const url = (typeof $request !== 'undefined' && $request && $request.url) || '';
    const m = String(url).match(new RegExp('[?&]' + name + '=([^&#]+)'));
    return m ? decodeURIComponent(m[1]) : '';
  } catch (_) {
    return '';
  }
}

const CLIENT = getQueryParam('client').toLowerCase() || 'web';
// 指定要綁定的 visitor（?visitor=）。例如 CatPaw server 端要配 oauth_tv_bootstrap
// 的 visitor，就傳 ?client=tvhtml5&visitor=<urlencoded visitor>，minter 產出的 pot 即綁定該 visitor。
const OVERRIDE_VISITOR = getQueryParam('visitor');
// 指定要產「綁 videoId 的 player pot」：與綁 visitor 的 streaming pot 不同。
//   ?client=tvhtml5&videoId=<videoId>   -> player pot（綁 videoId，短 pot，供 player 請求）
//   ?client=tvhtml5&visitor=<visitor>   -> streaming pot（綁 visitor，長 pot，供 ABR streamerContext）
const PLAYER_VIDEO_ID = getQueryParam('videoId');

function log(msg) {
  try { console.log('[yt-pot] ' + msg); } catch (_) {}
}

// =============================================================================
// HTTP transport（統一走 Env.js，相容各代理 APP；原 fetch 分支已移除）
// =============================================================================

async function httpJson(url, options) {
  const opts = options || {};
  const method = String(opts.method || (opts.body != null ? 'POST' : 'GET')).toUpperCase();
  const headers = Object.assign({}, opts.headers || {});
  const bodyStr = opts.body != null
    ? (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body))
    : null;

  const requestOptions = { url, headers, timeout: REQUEST_TIMEOUT_MS };
  if (bodyStr != null) requestOptions.body = bodyStr;

  try {
    const resp = method === 'GET'
      ? await $.http.get(requestOptions)
      : await $.http.post(requestOptions);
    const text = resp.body != null ? String(resp.body) : '';
    const status = resp.status != null ? resp.status : (resp.statusCode || 0);
    return { status, ok: status >= 200 && status < 300, data: safeJson(text), text };
  } catch (e) {
    return { status: 0, ok: false, data: null, text: 'request error: ' + (e && e.message || e) };
  }
}

function safeJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch (_) { return text; }
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// =============================================================================
// base64 / bytes helpers
// =============================================================================

function b64urlToBytes(s) {
  const b64 = String(s || '').replace(/-/g, '+').replace(/_/g, '/') + '=='.slice((String(s).length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function strBytes(s) { return new TextEncoder().encode(String(s || '')); }

// =============================================================================
// BotGuard HTTP
// =============================================================================

async function botguardPost(url, body) {
  return httpJson(url, { method: 'POST', headers: BG_HEADERS, body });
}

// =============================================================================
// WAA challenge parsing
// =============================================================================

function descramble(scrambled) {
  const bytes = b64urlToBytes(scrambled);
  for (let i = 0; i < bytes.length; i++) bytes[i] = (bytes[i] + 97) & 0xff;
  return new TextDecoder().decode(bytes);
}

function parseChallenge(rawResponse) {
  try {
    const arr = Array.isArray(rawResponse) ? rawResponse : JSON.parse(rawResponse);
    const scrambled = arr[1];
    if (!scrambled) return null;
    const jsonArr = JSON.parse(descramble(scrambled));
    const wrapped = Array.isArray(jsonArr[1]) ? jsonArr[1].find((x) => typeof x === 'string' && x.length) : jsonArr[1];
    return {
      messageId: jsonArr[0],
      interpreterJavascript: wrapped,
      interpreterHash: jsonArr[3],
      program: jsonArr[4],
      globalName: jsonArr[5],
    };
  } catch (_) { return null; }
}

// =============================================================================
// BotGuard 在「目前 WebView 全域」執行
// =============================================================================

async function runBotGuard(interpreterScript, globalName, program) {
  const g = (typeof window !== 'undefined' && window) || globalThis;
  new Function(interpreterScript)();
  const botguardVm = g[globalName];
  if (!botguardVm || !botguardVm.a) throw new Error('BotGuard VM 不存在於 webview 全域');

  let vmFunctions = null;
  let resolveVmFunctions = null;
  const vmFunctionsReady = new Promise((resolve) => { resolveVmFunctions = resolve; });

  const callback = function (asyncSnapshotFunction, shutdownFunction, passEventFunction, checkCameraFunction) {
    vmFunctions = { asyncSnapshotFunction, shutdownFunction, passEventFunction, checkCameraFunction };
    resolveVmFunctions(vmFunctions);
  };

  const syncFn = botguardVm.a(program, callback, true, undefined, function () {}, [[], []])[0];

  vmFunctions = await Promise.race([
    vmFunctionsReady,
    sleep(ASYNC_SNAPSHOT_TIMEOUT_MS).then(() => { throw new Error('asyncSnapshotFunction timeout'); }),
  ]);
  if (!vmFunctions || !vmFunctions.asyncSnapshotFunction) throw new Error('asyncSnapshotFunction missing');

  const webPoSignalOutput = [];
  let botguardResponse = await Promise.race([
    new Promise((resolve) => {
      vmFunctions.asyncSnapshotFunction((response) => resolve(response), [undefined, undefined, webPoSignalOutput, undefined]);
    }),
    sleep(SNAPSHOT_TIMEOUT_MS).then(() => { throw new Error('snapshot timeout'); }),
  ]);

  if (!webPoSignalOutput.length && syncFn) {
    try {
      const syncResponse = syncFn([undefined, undefined, webPoSignalOutput, undefined]);
      if (syncResponse) botguardResponse = syncResponse;
    } catch (_) {}
  }

  if (!webPoSignalOutput.length) throw new Error('webPoSignalOutput is empty');
  return { webPoSignalOutput, botguardResponse };
}

// =============================================================================
// 取得 visitor（依 client）
// =============================================================================
// pot 綁定 client + visitor：不同 client 需用該 client 的 visitor 來 mint，
// 否則 pot 對該 client 的 SABR 無效（跨 client 不通用）。

// TVHTML5：visitor_id endpoint 對 TV 回 400，改用 www.youtube.com/tv 頁刮 VISITOR_DATA
async function scrapeTvVisitor() {
  try {
    const res = await httpJson('https://www.youtube.com/tv?hrld=1', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version',
        'Accept-Language': 'en-US,en;q=0.9',
        Cookie: 'SOCS=CAE=',
        Referer: 'https://www.youtube.com/tv',
      },
    });
    const m = String(res.text || '').match(/"visitorData":"([^"]+)"/);
    if (m && m[1]) {
      log('tv visitor scraped vd=' + m[1].slice(0, 12));
      return m[1];
    }
  } catch (e) { log('tv visitor scrape error: ' + e.message); }
  return null;
}

// ANDROID / IOS：用對應 client 的 visitor_id endpoint
async function fetchVisitorByClient(clientName, version, ua, clientId) {
  try {
    const res = await httpJson('https://www.youtube.com/youtubei/v1/visitor_id', {
      method: 'POST',
      headers: Object.assign({}, WEB_HEADERS_BASE, {
        'User-Agent': ua,
        'X-Youtube-Client-Name': clientId,
        'X-Youtube-Client-Version': version,
      }),
      body: { context: { client: { clientName: clientName, clientVersion: version, hl: 'en-US', gl: 'US' } } },
    });
    const vd = res.data && res.data.responseContext && res.data.responseContext.visitorData;
    if (vd) { log(clientName + ' visitor vd=' + vd.slice(0, 12)); return vd; }
  } catch (e) { log(clientName + ' visitor_id error: ' + e.message); }
  return null;
}

// 預設 WEB：先試 visitor_id endpoint，失敗（含拋錯）再退而刮首頁 VISITOR_DATA
async function fetchWebVisitor() {
  try {
    const res = await httpJson('https://www.youtube.com/youtubei/v1/visitor_id', {
      method: 'POST',
      headers: Object.assign({}, WEB_HEADERS_BASE, {
        'X-Youtube-Client-Name': '1',
        'X-Youtube-Client-Version': CLIENT_VERSION,
      }),
      body: { context: { client: { clientName: 'WEB', clientVersion: CLIENT_VERSION, hl: 'en-US', gl: 'US' } } },
    });
    const vd = res.data && res.data.responseContext && res.data.responseContext.visitorData;
    if (vd) return vd;
  } catch (e) { log('visitor_id error: ' + e.message); }

  try {
    const home = await httpJson('https://www.youtube.com/', {
      method: 'GET',
      headers: { 'User-Agent': WEB_UA },
    });
    const m = String(home.text || '').match(/"VISITOR_DATA":"([^"]+)"/);
    return m ? m[1] : null;
  } catch (e) {}
  return null;
}

async function obtainVisitor(client) {
  const c = String(client || '').toLowerCase();

  if (c === 'tvhtml5' || c === 'tv') {
    return scrapeTvVisitor();
  }

  const map = VISITOR_ID_CLIENTS[c];
  if (map) {
    return fetchVisitorByClient(map.name, map.version, map.ua, map.id);
  }

  // 預設 WEB（含未指定 / 其他 client fallback）
  return fetchWebVisitor();
}

// =============================================================================
// 主要流程
// =============================================================================

async function mintToken() {
  const client = CLIENT;
  // player pot（綁 videoId）優先：URL 帶 videoId 時 identifier=videoId
  const bindVideoId = PLAYER_VIDEO_ID || '';
  let visitorData = '';

  if (bindVideoId) {
    log('player-pot mode bind videoId=' + bindVideoId);
  } else {
    visitorData = OVERRIDE_VISITOR || '';
    if (visitorData) {
      log('use override visitor vd=' + visitorData.slice(0, 12));
    } else {
      visitorData = await obtainVisitor(client);
    }
    if (!visitorData) return { ok: false, error: 'visitor', client };
  }

  const createRaw = await botguardPost(JNN_CREATE, JSON.stringify([REQUEST_KEY]));
  const challenge = parseChallenge(createRaw.data);
  if (!challenge || !challenge.program || !challenge.interpreterJavascript) {
    log('challenge 解析失敗 status=' + createRaw.status);
    return { ok: false, error: 'challenge', client };
  }

  let bg;
  try {
    bg = await runBotGuard(challenge.interpreterJavascript, challenge.globalName, challenge.program);
  } catch (e) {
    log('BotGuard 執行失敗: ' + e.message);
    return { ok: false, error: 'botguard:' + e.message, client };
  }

  const itRaw = await botguardPost(JNN_GENERATE, JSON.stringify([REQUEST_KEY, bg.botguardResponse]));
  let integrityBytes = null;
  try {
    const arr = Array.isArray(itRaw.data) ? itRaw.data : JSON.parse(itRaw.text || 'null');
    if (arr && arr[0]) integrityBytes = b64urlToBytes(arr[0]);
  } catch (_) {}
  if (!integrityBytes || !integrityBytes.length) {
    log('GenerateIT 解析失敗');
    return { ok: false, error: 'generateit', client };
  }

  const getMinter = bg.webPoSignalOutput[0];
  if (typeof getMinter !== 'function') return { ok: false, error: 'minter', client };
  const mintCallback = await getMinter(integrityBytes);
  if (typeof mintCallback !== 'function') return { ok: false, error: 'mintCallback', client };
  const identifier = bindVideoId || visitorData;
  const rawResult = await mintCallback(strBytes(identifier));
  if (!rawResult || !(rawResult instanceof Uint8Array)) return { ok: false, error: 'mintResult', client };
  const poToken = bytesToB64url(rawResult);
  const kind = bindVideoId ? 'player' : 'streaming';
  log('poToken minted client=' + client + ' kind=' + kind + ' len=' + poToken.length + ' bind=' + (bindVideoId || visitorData).slice(0, 12));

  return { ok: true, poToken, visitorData, client, kind };
}

// =============================================================================
// Response
// =============================================================================

function respond(payload) {
  const body = JSON.stringify(payload);
  const resp = {
    status: payload.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
    body,
  };
  try { $.done({ response: resp }); } catch (_) {}
}

// =============================================================================
// Entry point
// =============================================================================

mintToken().then((result) => {
  log('mint done ok=' + (result && result.ok) + ' client=' + (result && result.client));
  respond(result || { ok: false, error: 'unknown' });
}).catch((e) => {
  log('fatal: ' + (e && e.message || e));
  respond({ ok: false, error: String(e && e.message || e) });
});
