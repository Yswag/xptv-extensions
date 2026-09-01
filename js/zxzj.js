const cheerio = createCheerio()

const UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

// Some responses come as JSON-encoded strings
function unwrapHtml(data) {
    if (typeof data === 'string' && data.charCodeAt(0) === 34) {
        try {
            return JSON.parse(data)
        } catch (e) {
            /* not json */
        }
    }
    return data
}

const appConfig = {
    ver: 20260902,
    title: '在线之家',
    site: 'https://www.zxzj.run',
    tabs: [
        {
            name: '电影',
            ext: {
                id: 1,
            },
        },
        {
            name: '美剧',
            ext: {
                id: 2,
            },
        },
        {
            name: '韩剧',
            ext: {
                id: 3,
            },
        },
        {
            name: '日剧',
            ext: {
                id: 4,
            },
        },
        {
            name: '泰剧',
            ext: {
                id: 5,
            },
        },
        {
            name: '动漫',
            ext: {
                id: 6,
            },
        },
    ],
}

// 依網站實際 filter（按類型/按地區/按年份/按語言/按排序）重建；
// 網站 URL 格式為 {tid}-{area}-{order}-{cateId}-{lang}----{page}---{year}
const YEAR_VALUES = (() => {
    const arr = []
    for (let y = 2026; y >= 2000; y--) arr.push({ n: String(y), v: String(y) })
    return arr
})()

const AREA_1 = '大陆,香港,台湾,欧美,韩国,日本,泰国,印度,俄罗斯,其他'.split(',')
const AREA_2 = ['欧美']
const AREA_3 = ['韩国']
const AREA_4 = ['日本']
const AREA_6 = '国产,日本,欧美,其他'.split(',')
const LANG_1 = '英语,韩语,日语,法语,泰语,德语,印度语,国语,粤语,俄语,西班牙语,意大利语,其它'.split(',')
const LANG_2 = ['英语', '法语']
const LANG_3 = ['韩语']
const LANG_4 = ['日语']
const LANG_6 = '国语,日语,英语,其他'.split(',')

function areaFilter(vals) {
    return {
        key: 'area',
        name: '地区',
        value: [{ n: '全部', v: '' }].concat(vals.map((v) => ({ n: v, v }))),
    }
}
function langFilter(vals) {
    return {
        key: 'lang',
        name: '语言',
        value: [{ n: '全部', v: '' }].concat(vals.map((v) => ({ n: v, v }))),
    }
}
function yearFilter() {
    return {
        key: 'year',
        name: '年份',
        value: [{ n: '全部', v: '' }].concat(YEAR_VALUES),
    }
}
function orderFilter() {
    return {
        key: 'order',
        name: '排序',
        value: [
            { n: '時間', v: 'time' },
            { n: '人氣', v: 'hits' },
            { n: '評分', v: 'score' },
        ],
    }
}

const filterList = {
    1: [areaFilter(AREA_1), yearFilter(), langFilter(LANG_1), orderFilter()],
    2: [areaFilter(AREA_2), yearFilter(), langFilter(LANG_2), orderFilter()],
    3: [areaFilter(AREA_3), yearFilter(), langFilter(LANG_3), orderFilter()],
    4: [areaFilter(AREA_4), yearFilter(), langFilter(LANG_4), orderFilter()],
    5: [yearFilter(), orderFilter()],
    6: [areaFilter(AREA_6), yearFilter(), langFilter(LANG_6), orderFilter()],
}

async function getLocalInfo() {
    return jsonify({ ver: 1, name: '在线之家', api: 'zxzj', type: 3 })
}

async function getConfig() {
    return jsonify(appConfig)
}

async function getCards(ext) {
    ext = argsify(ext)
    var cards = []
    let id = ext.id
    let page = ext.page || 1

    try {
        var url = `${appConfig.site}/vodshow/${id}-${''}-${''}-${''}-${''}----${page}---${''}.html`

        if (id > 0) {
            const { area = '', order = '', cateId = '', lang = '', year = '' } = ext?.filters || {}

            url = `${appConfig.site}/vodshow/${id}-${area}-${order}-${cateId}-${lang}----${page}---${year}.html`
        }

        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        const $ = cheerio.load(unwrapHtml(data))
        $('.stui-vodlist__box').each((_, element) => {
            const href = $(element).find('.stui-vodlist__thumb').attr('href')
            const title = $(element).find('.stui-vodlist__thumb').attr('title')
            const cover = $(element).find('.stui-vodlist__thumb').attr('data-original')
            const subTitle = $(element).find('.pic-text').text().trim()

            if (href) {
                cards.push({
                    vod_id: href.replace(/.*?\/voddetail\/(.*).html/g, '$1'),
                    vod_name: title || '',
                    vod_pic: cover || '',
                    vod_remarks: subTitle || '',
                    ext: {
                        url: `${appConfig.site}${href}`,
                    },
                })
            }
        })
    } catch (error) {
        $print(error)
    }

    return jsonify({
        list: cards,
        filter: id > 0 ? filterList[id] : [],
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    var tracks = []
    let url = ext.url

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(unwrapHtml(data))

    $('.stui-content__playlist a').each((_, each) => {
        const href = $(each).attr('href')
        const name = $(each).text()
        if (href && name && name !== '合集') {
            tracks.push({
                name: name.trim(),
                pan: '',
                ext: {
                    url: `${appConfig.site}${href}`,
                },
            })
        }
    })

    return jsonify({
        list: [
            {
                title: '默认分组',
                tracks,
            },
        ],
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    let url = ext.url

    try {
        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        const playerMatch = unwrapHtml(data).match(/player_\w+\s*=\s*(\{[\s\S]*?\})\s*[;<\n]/)
        if (!playerMatch) {
            $print('player config not found')
            return jsonify({ urls: [] })
        }
        const json = JSON.parse(playerMatch[1])

        let playurl = json.url
        if (!playurl) {
            $print('no url in player config')
            return jsonify({ urls: [] })
        }

        if (json.encrypt == '1') {
            playurl = decodeURIComponent(playurl)
        } else if (json.encrypt == '2') {
            // JSC has no Buffer -- use atob
            playurl = decodeURIComponent(
                Array.prototype.map
                    .call(atob(playurl), function (c) {
                        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
                    })
                    .join(''),
            )
        }

        if (playurl.indexOf('m3u8') >= 0 || playurl.indexOf('mp4') >= 0) {
            return jsonify({ urls: [playurl] })
        }

        // encrypt=3: fetch parse page. 新站可能回 JSON（player-v2）或 HTML result_v2
        const { data: playData } = await $fetch.get(playurl, {
            headers: {
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9',
                Referer: `${appConfig.site}/`,
                'Sec-Fetch-Dest': 'iframe',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-site',
                'Upgrade-Insecure-Requests': '1',
                'User-Agent': UA,
            },
        })

        const body = unwrapHtml(playData)

        // 1) JSON 回應：{code,data:{url,...}} 直接取 url
        if (typeof body === 'string' && body.trim().charAt(0) === '{') {
            try {
                const jo = JSON.parse(body)
                const durl =
                    (jo.data && (jo.data.url || jo.data.m3u8 || jo.data.play || jo.data.playurl)) || jo.url || jo.m3u8
                if (durl && (String(durl).indexOf('m3u8') >= 0 || String(durl).indexOf('mp4') >= 0)) {
                    return jsonify({ urls: [String(durl)] })
                }
            } catch (e) {
                /* not json object */
            }
        }

        // 2) 舊站 HTML：result_v2
        const resultMatch = body.match(/var result_v2\s*=\s*(\{[\s\S]*?\})\s*;/)
        if (resultMatch) {
            const rJson = JSON.parse(resultMatch[1])
            if (rJson.data) {
                let code = rJson.data.split('').reverse()
                let temp = ''
                for (let i = 0; i < code.length; i = i + 2) {
                    temp += String.fromCharCode(parseInt(code[i] + code[i + 1], 16))
                }
                const purl = temp.substring(0, (temp.length - 7) / 2) + temp.substring((temp.length - 7) / 2 + 7)
                if (purl.indexOf('m3u8') >= 0 || purl.indexOf('mp4') >= 0) {
                    $print('***在线之家purl =====>' + purl)
                    return jsonify({ urls: [purl] })
                }
            }
        }

        // 3) 兜底：回傳 parse url（可能為站內解析頁）
        return jsonify({ urls: [playurl] })
    } catch (error) {
        $print(error)
        return jsonify({ urls: [] })
    }
}

async function search(ext) {
    ext = argsify(ext)
    var cards = []

    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1

    if (page > 1) {
        return jsonify({
            list: cards,
        })
    }

    const url = `${appConfig.site}/vodsearch/-------------.html?wd=${text}&submit=`
    const { data } = await $fetch.get(url, {
        headers: {
            Referer: `${appConfig.site}`,
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(unwrapHtml(data))
    $('a.lazyload').each((_, element) => {
        const href = $(element).attr('href')
        const title = $(element).attr('title')
        const cover = $(element).attr('data-original')
        const subTitle = $(element).find('.text-right').text()

        if (href && href.startsWith('/voddetail/')) {
            cards.push({
                vod_id: href.replace(/.*?\/voddetail\/(.*).html/g, '$1'),
                vod_name: title || '',
                vod_pic: cover || '',
                vod_remarks: subTitle || '',
                ext: {
                    url: `${appConfig.site}${href}`,
                },
            })
        }
    })

    return jsonify({
        list: cards,
    })
}
