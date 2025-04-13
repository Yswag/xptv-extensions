const cheerio = createCheerio()
const CryptoJS = createCryptoJS()

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

let appConfig = {
    ver: 20240413,
    title: 'aowu',
    site: 'https://www.aowu.tv',
    tabs: [
        {
            name: '新番',
            ext: {
                type: 32,
            },
        },
        {
            name: '番剧',
            ext: {
                type: 20,
            },
        },
        {
            name: '剧场',
            ext: {
                type: 33,
            },
        },
    ],
}

async function getConfig() {
    return jsonify(appConfig)
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { type, page = 1 } = ext

    const url = 'https://www.aowu.tv/index.php/api/vod'
    const time = Math.round(new Date() / 1000)
    const key = md5('DS' + time + 'DCC147D11943AF75')
    const body = {
        type: type,
        class: '',
        area: '',
        lang: '',
        version: '',
        state: '',
        letter: '',
        page: page,
        time: time,
        key: key,
    }

    const { data } = await $fetch.post(url, body, {
        headers: {
            'User-Agent': UA,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })

    const cardList = argsify(data).list
    cardList.forEach((e) => {
        let name = e.vod_name
        let pic = e.vod_pic
        let remarks = e.vod_remarks
        let id = e.vod_id
        cards.push({
            vod_id: id,
            vod_name: name,
            vod_pic: pic,
            vod_remarks: remarks,
            ext: {
                id,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    let list = []
    let id = ext.id
    let url = appConfig.site + `/play/${id}-1-1.html`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    let from = []
    $('.player-info .swiper-wrapper a').each((i, e) => {
        let name = $(e).text().trim()
        from.push(name)
    })

    $('.player-list-box .anthology-list-box').each((i, e) => {
        const play_from = from[i]
        let videos = $(e).find('li a')
        let tracks = []
        videos.each((i, e) => {
            const name = $(e).find('span').text()
            const href = $(e).attr('href')
            tracks.push({
                name: name,
                pan: '',
                ext: {
                    url: `${appConfig.site}${href}`,
                },
            })
        })
        list.push({
            title: play_from,
            tracks,
        })
    })

    return jsonify({
        list: list,
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    const url = ext.url

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)
    const config = JSON.parse($('script:contains(player_)').html().replace('var player_aaaa=', ''))
    let purl = config.url
    if (config.encrypt == 2) purl = unescape(base64Decode(purl))
    const artPlayer = appConfig.site + `/player/?url=${purl}`
    const { data: artRes } = await $fetch.get(artPlayer, {
        headers: {
            'User-Agent': UA,
            Referer: url,
        },
    })

    if (artRes) {
        const $2 = cheerio.load(artRes)
        const playUrl = $2('script:contains(new Artplayer)')
            .html()
            .match(/url: '(.*)'/)[1]
        return jsonify({ urls: [playUrl] })
    }

    return jsonify({ urls: [] })
}

async function search(ext) {
    try {
        ext = argsify(ext)
        let cards = []
        const ocrApi = 'https://api.nn.ci/ocr/b64/json'
        let cookie = 'PHPSESSID=' + generatePHPSESSID()

        let text = encodeURIComponent(ext.text)
        let page = ext.page || 1
        if (page > 1) {
            return jsonify({
                list: cards,
            })
        }

        let validate = appConfig.site + '/verify/index.html'
        let url = appConfig.site + `/search/-------------.html?wd=${text}`

        let img = await $fetch.download(validate, {
            headers: {
                'User-Agent': UA,
                cookie: cookie,
            },
        })

        function binaryStringToBase64(binaryString) {
            const byteArray = []
            for (let i = 0; i < binaryString.length; i += 8) {
                const byte = binaryString.slice(i, i + 8)
                byteArray.push(parseInt(byte, 2)) // convert 8 bits to a byte
            }

            const uint8Array = new Uint8Array(byteArray)
            const wordArray = CryptoJS.lib.WordArray.create(uint8Array)
            return CryptoJS.enc.Base64.stringify(wordArray)
        }

        let b64 = binaryStringToBase64(img.data)

        let ocrRes = await $fetch.post(ocrApi, b64, {
            headers: {
                'User-Agent': UA,
                cookie: cookie,
            },
        })
        let vd = argsify(ocrRes.data).result

        let validateRes = await $fetch.post(appConfig.site + `/index.php/ajax/verify_check?type=search&verify=${vd}`, '', {
            headers: {
                'user-agent': UA,
                cookie: cookie,
                referer: url,
                'x-request-with': 'XMLHttpRequest',
                'sec-fetch-site': 'same-origin',
                origin: appConfig.site,
                'sec-fetch-mode': 'cors',
                'sec-fetch-dest': 'empty',
            },
        })

        if (argsify(validateRes.data).msg === 'ok') {
            let searchRes = await $fetch.get(url, {
                headers: {
                    'user-agent': UA,
                    cookie: cookie,
                },
            })
            let html = searchRes.data

            const $ = cheerio.load(html)

            $('.search-box').each((_, element) => {
                const href = $(element).find('.left .public-list-exp').attr('href')
                const title = $(element).find('.thumb-content .thumb-txt').text()
                const cover = $(element).find('.left img').attr('data-src')
                const subTitle = $(element).find('.left .public-list-prb').text()
                cards.push({
                    vod_id: href,
                    vod_name: title,
                    vod_pic: cover,
                    vod_remarks: subTitle,
                    ext: {
                        id: href.match(/play\/(.+)-1-1\.html/)[1],
                    },
                })
            })

            return jsonify({
                list: cards,
            })
        }
    } catch (error) {
        $print(error)
    }
}

function generatePHPSESSID() {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const length = 26
    let sessionId = ''

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length)
        sessionId += characters[randomIndex]
    }

    return sessionId
}

function md5(text) {
    return CryptoJS.MD5(text).toString()
}

function base64Decode(text) {
    return CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(text))
}
