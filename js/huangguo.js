// 黄果短剧 huangguoai.com
// HTML 刮削源：首頁/分類/搜尋皆為 .hg-card-grid > .hg-drama-card 卡片；
// 排行榜為 .hg-rank-list > .hg-rank-item；詳情頁 .hg-web-detail__ep-grid 給集數；
// 播放頁 <script id="videoInitialData"> 內嵌 JSON，epPlaySrcs[集數] / videoSrc 直接給 m3u8。
// 圖片解密方法：
//   站點封面圖是 AES-128-CBC 加密位元組，key/iv 取自站點前端 crypto-worker.js：
//     key = f5d965df75336270  (hex)  iv = 97b60394abc2fbe1  (hex)  均為 UTF-8 16 bytes
//   解密流程（AES.new(key, MODE_CBC, iv).decrypt(raw)）：
//     a. raw 為空或 len%16 != 0 → 原樣回傳
//     b. 解密後若开頭不是圖片簽名 → 源圖根本沒加密，原樣回傳
//        （合法簽名：JPEG \xff\xd8 / PNG \x89PNG\r\n\x1a\n / WEBP RIFF\x00\x00\x00WEBP / GIF87a|GIF89a）
//     c. 剝離 PKCS7 padding（末字節 pad，1<=pad<=16 且末 pad 字節同值）
//     d. 收尾截斷：JPEG 留到最後一個 \xff\xd9；PNG 留到 IEND 的 +8 bytes
//   不足 16 或未加密 → 原樣輸出。故 XPTV 端無解密能力，vod_pic 直接放剝掉 auth_key 的原始 URL，
//   加密圖位元組的解密代理由 XPTV 外部（本地代理層）負責。

// 圖片解密（CryptoJS 寫法）
//   站點封面圖為 AES-128-CBC 加密位元組，key/iv 取自前端 crypto-worker.js 的 UTF-8 16 bytes：
//     key = f5d965df75336270   iv = 97b60394abc2fbe1
//   密文 raw 需先轉 CryptoJS WordArray（圖片響應位元組），非加密或長度非 16 倍數 → 原樣回傳：
//
//   const _IMG_KEY = CryptoJS.enc.Hex.parse('f5d965df75336270');
//   const _IMG_IV  = CryptoJS.enc.Hex.parse('97b60394abc2fbe1');
//   function decryptImg(raw) {
//     if (!raw || raw.sigBytes % 16 !== 0) return raw;
//     let pt;
//     try {
//       pt = CryptoJS.AES.decrypt(
//         { ciphertext: raw }, _IMG_KEY,
//         { iv: _IMG_IV, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.NoPadding });
//     } catch (e) { return raw; }
//     let hex = CryptoJS.enc.Hex.stringify(pt).toLowerCase();
//     // 開頭若不是圖片簽名 → 源圖根本沒加密，原樣回傳（JPEG/PNG/WEBP/GIF）
//     if (!(hex.indexOf('ffd8') === 0 || hex.indexOf('89504e470d0a1a0a') === 0 ||
//           (hex.indexOf('52494646') === 0 && hex.indexOf('57454250') === 8) ||
//           hex.indexOf('47494638') === 0)) return raw;
//     // 剝離 PKCS7 padding（末字節 pad，1<=pad<=16 且末 pad 字節同值）
//     const pad = parseInt(hex.slice(-2), 16);
//     if (pad > 0 && pad <= 16) {
//       const b = pad.toString(16).padStart(2, '0');
//       let ok = true;
//       for (let i = hex.length - pad * 2; i < hex.length; i += 2)
//         if (hex.slice(i, i + 2) !== b) { ok = false; break; }
//       if (ok) { hex = hex.slice(0, -pad * 2); }
//     }
//     // 收尾截斷：JPEG 留到最後 \xff\xd9；PNG 留到 IEND 的 +8 bytes（\x89PNG...IEND）
//     let i = hex.lastIndexOf('ffd9');
//     if (i !== -1) hex = hex.slice(0, i + 4);
//     else { i = hex.lastIndexOf('49454e44ae426082'); if (i !== -1) hex = hex.slice(0, i + 16); }
//     return CryptoJS.lib.WordArray.create(CryptoJS.enc.Hex.parse(hex).words, hex.length / 2);
//   }

const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const SITE = 'https://huangguoai.com'

const HEADERS = {
    'User-Agent': UA,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    Referer: SITE + '/',
}

const TABS = [
    { name: '首页', id: 'home' },
    { name: 'AI成人短剧', id: 'ai-duanju' },
    { name: 'AI成人漫剧', id: 'ai-manju' },
    { name: 'AI换脸', id: 'ai-huanlian' },
    { name: 'AI魔改', id: 'ai-mogai' },
    { name: '排行榜', id: 'ranks/hot' },
]

// ---------- 工具 ----------
function fix(u) {
    if (!u) return ''
    if (u.indexOf('//') === 0) return 'https:' + u
    if (u.indexOf('/') === 0) return SITE + u
    return u
}

function imgSrc(u) {
    // 剔除 CDN 防盗链 auth_key 等查询参数，得到不过期的稳定直链
    u = fix(u || '')
    if (u.indexOf('http') === 0 && u.indexOf('?') !== -1) {
        u = u.replace(/\?.*/, '')
    }
    return u
}

function stripTags(s) {
    return String(s || '')
        .replace(/<[^>]*>/g, '')
        .trim()
}

async function fetchHtml(url, referer) {
    const headers = referer ? Object.assign({}, HEADERS, { Referer: referer }) : HEADERS
    const resp = await $fetch.get(url, { headers })
    const data = resp && resp.data
    return typeof data === 'string' ? data : data == null ? '' : JSON.stringify(data)
}

// ---------- 卡片解析 ----------
function gridSlices(html, allGrids) {
    // .hg-card-grid 區塊；allGrids=true 取全部，否則只取第一個（主列表）
    const re = /<div\s+class="[^"]*\bhg-card-grid\b[^"]*"[^>]*>/g
    const starts = []
    let m
    while ((m = re.exec(html)) !== null) starts.push(m.index + m[0].length)
    if (!starts.length) return []
    const slices = []
    const n = allGrids ? starts.length : Math.min(1, starts.length)
    for (let i = 0; i < n; i++) {
        const to = i + 1 < starts.length ? starts[i + 1] : html.length
        slices.push(html.slice(starts[i], to))
    }
    return slices
}

function cardBlocks(slice) {
    const re = /<div\s+class="[^"]*\bhg-drama-card\b[^"]*"[^>]*>/g
    const starts = []
    let m
    while ((m = re.exec(slice)) !== null) starts.push(m.index + m[0].length)
    const blocks = []
    for (let i = 0; i < starts.length; i++) {
        const to = i + 1 < starts.length ? starts[i + 1] : slice.length
        blocks.push(slice.slice(starts[i], to))
    }
    return blocks
}

function parseCardBlock(block) {
    const a = block.match(/href="[^"]*\/detail\/(\d+)\/[^"]*"/)
    if (!a) return null
    const vid = a[1]
    const imgM = block.match(/data-src="([^"]+)"/) || block.match(/src="([^"]+)"/)
    let title = ''
    const t = block.match(/hg-drama-card__title[^>]*>([\s\S]*?)<\/a>/)
    if (t) title = stripTags(t[1])
    if (!title) {
        const tt = block.match(/<a[^>]+href="[^"]*\/detail\/\d+\/"[^>]*>([\s\S]*?)<\/a>/)
        if (tt) title = stripTags(tt[1])
    }
    if (!title) return null
    const ep = block.match(/hg-drama-card__episode[^>]*>([\s\S]*?)<\/span>/)
    const score = block.match(/hg-drama-card__score[^>]*>([\s\S]*?)<\/span>/)
    const rem = ep ? ep[1].trim() : ''
    const sc = score ? score[1].trim() : ''
    let remarks = ''
    if (rem && sc) remarks = rem + ' · ' + sc
    else remarks = rem || sc
    return {
        vod_id: vid,
        vod_name: title,
        vod_pic: imgSrc(imgM ? imgM[1] : ''),
        vod_remarks: remarks,
        ext: { id: vid },
    }
}

function parseGridCards(html, allGrids) {
    if (!html) return []
    const list = []
    const seen = {}
    const slices = gridSlices(html, allGrids)
    for (const slice of slices) {
        for (const block of cardBlocks(slice)) {
            try {
                const item = parseCardBlock(block)
                if (!item || seen[item.vod_id]) continue
                seen[item.vod_id] = true
                list.push(item)
            } catch (e) {}
        }
    }
    return list
}

// ---------- 排行榜解析 ----------
function parseRanks(html) {
    if (!html) return []
    const listM = html.match(/<div\s+class="[^"]*\bhg-rank-list\b[^"]*"[^>]*>/)
    const from = listM ? listM.index + listM[0].length : 0
    const slice = html.slice(from)
    const re = /<div\s+class="[^"]*\bhg-rank-item\b[^"]*"[^>]*>/g
    const starts = []
    let m
    while ((m = re.exec(slice)) !== null) starts.push(m.index + m[0].length)
    const list = []
    const seen = {}
    for (let i = 0; i < starts.length; i++) {
        const to = i + 1 < starts.length ? starts[i + 1] : slice.length
        const block = slice.slice(starts[i], to)
        try {
            const a = block.match(/href="[^"]*\/detail\/(\d+)\/[^"]*"/)
            if (!a || seen[a[1]]) continue
            seen[a[1]] = true
            const imgM = block.match(/data-src="([^"]+)"/) || block.match(/src="([^"]+)"/)
            let title = ''
            const t = block.match(/hg-rank-item__title[^>]*>([\s\S]*?)<\/h2>/)
            if (t) title = stripTags(t[1])
            if (!title) {
                const tt = block.match(/<a[^>]+href="[^"]*\/detail\/\d+\/"[^>]*>([\s\S]*?)<\/a>/)
                if (tt) title = stripTags(tt[1])
            }
            if (!title) continue
            const tags = block.match(/hg-rank-item__tags[^>]*>([\s\S]*?)<\/div>/)
            list.push({
                vod_id: a[1],
                vod_name: title,
                vod_pic: imgSrc(imgM ? imgM[1] : ''),
                vod_remarks: tags ? stripTags(tags[1]) : '',
                ext: { id: a[1] },
            })
        } catch (e) {}
    }
    return list
}

// ---------- 介面 ----------
async function getLocalInfo() {
    return jsonify({ ver: 1, name: '黄果短剧', api: 'csp_huangguo', type: 3 })
}

async function getConfig() {
    return jsonify({
        ver: 1,
        title: '黄果短剧',
        site: SITE,
        tabs: TABS.map((t) => ({ name: t.name, ext: { id: t.id } })),
    })
}

async function getCards(ext) {
    ext = argsify(ext)
    const id = String(ext.id || 'home').replace(/^\//, '')
    const page = Math.max(1, parseInt(ext.page) || 1)
    try {
        if (id === 'home') {
            const html = await fetchHtml(SITE + '/')
            return jsonify({ list: parseGridCards(html, true), page: page })
        }
        const url = SITE + '/' + id + '/' + (page > 1 ? page + '/' : '')
        const html = await fetchHtml(url)
        if (id.indexOf('rank') !== -1) {
            return jsonify({ list: parseRanks(html), page: page })
        }
        return jsonify({ list: parseGridCards(html, false), page: page })
    } catch (e) {
        console.error('getCards error:', e)
        return jsonify({ list: [], page: page })
    }
}

async function getTracks(ext) {
    ext = argsify(ext)
    const id = ext.id || ''
    if (!id) return jsonify({ list: [] })
    try {
        const html = await fetchHtml(SITE + '/detail/' + id + '/')
        const tracks = []
        const gridM = html.match(/<div\s+class="[^"]*\bhg-web-detail__ep-grid\b[^"]*"[^>]*>([\s\S]*?)<\/div>/)
        if (gridM) {
            const are = /<a\b[^>]*>[\s\S]*?<\/a>/g
            let m
            while ((m = are.exec(gridM[1])) !== null) {
                const tag = m[0]
                const hrefM = tag.match(/href="([^"]+)"/)
                if (!hrefM) continue
                const href = hrefM[1]
                const eidM = tag.match(/data-ep-id="([^"]*)"/)
                const eid = eidM ? eidM[1] : ''
                const name = eid ? '第' + eid + '集' : stripTags(tag)
                tracks.push({ name: name, ext: { url: fix(href), ep: eid } })
            }
        }
        if (!tracks.length) {
            const playM = html.match(/<a\b[^>]*class="[^"]*\bhg-web-detail__play\b[^"]*"[^>]*href="([^"]+)"/)
            if (playM) {
                tracks.push({ name: '第1集', ext: { url: fix(playM[1]), ep: '' } })
            }
        }
        if (!tracks.length) return jsonify({ list: [] })
        return jsonify({ list: [{ title: '黄果短剧', tracks: tracks }] })
    } catch (e) {
        console.error('getTracks error:', e)
        return jsonify({ list: [] })
    }
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    const url = ext.url || ''
    const ep = String(ext.ep || '1')
    if (!url) return jsonify({ urls: [] })
    try {
        const html = await fetchHtml(url, SITE)
        let play = ''
        const m = html.match(/id="videoInitialData"[^>]*>([\s\S]*?)<\/script>/)
        if (m) {
            try {
                const data = JSON.parse(m[1])
                const srcs = (data && data.epPlaySrcs) || {}
                play = srcs[ep] || (data && data.videoSrc) || ''
            } catch (e) {}
        }
        if (play) {
            play = play.replace(/\\u0026/g, '&')
            if (play.indexOf('http') !== 0) {
                const mm = play.match(/(https?:\/\/[^\s"']+)/)
                play = mm ? mm[1] : ''
            }
        }
        if (!play) return jsonify({ urls: [] })
        return jsonify({
            urls: [play],
            headers: [{ 'User-Agent': UA, Referer: SITE + '/' }],
        })
    } catch (e) {
        console.error('getPlayinfo error:', e)
        return jsonify({ urls: [] })
    }
}

async function search(ext) {
    ext = argsify(ext)
    const kw = String(ext.text || ext.wd || '').trim()
    if (!kw) return jsonify({ list: [], page: 1 })
    try {
        const html = await fetchHtml(SITE + '/search/video/' + encodeURIComponent(kw) + '/')
        return jsonify({ list: parseGridCards(html, false), page: 1 })
    } catch (e) {
        console.error('search error:', e)
        return jsonify({ list: [], page: 1 })
    }
}
