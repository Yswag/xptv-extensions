const cheerio = createCheerio()
const CryptoJS = createCryptoJS()
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const appConfig = {
    ver: 20250416,
    title: '絕對影視',
    site: 'https://www.jdys.art',
}

async function getConfig() {
    let config = appConfig
    config.tabs = await getTabs()
    return jsonify(config)
}

async function getTabs() {
    try {
        let list = []
        const ignore = ['影视类型']
        function isIgnoreClassName(className) {
            return ignore.some((element) => className.includes(element))
        }

        const { data } = await $fetch.get(appConfig.site, {
            headers: {
                'User-Agent': UA,
            },
        })
        const $ = cheerio.load(data)

        const allClass = $('.menu-item-type-post_type a')
        allClass.each((i, e) => {
            const name = $(e).text()
            const href = $(e).attr('href')
            const isIgnore = isIgnoreClassName(name)
            if (isIgnore) return

            list.push({
                name,
                ext: {
                    url: href,
                },
            })
        })

        return list
    } catch (error) {
        $print(error)
    }
}

async function getCards(ext) {
    try {
        ext = argsify(ext)
        let cards = []
        let url = ext.url
        let page = ext.page || 1

        page > 1 ? (url += `/page/${page}/`) : url

        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        const $ = cheerio.load(data)
        $('.bt_img.mi_ne_kd ul li').each((_, each) => {
            let name = $(each).find('h3.dytit > a').text()
            cards.push({
                vod_id: $(each).find('a').attr('href'),
                vod_name: name,
                vod_pic: $(each).find('img').attr('src'),
                vod_remarks: $(each).find('.dytit .dycategory > a').text(),
                vod_duration: $(each).find('.dytit .dyplayinfo').text().trim(),
                ext: {
                    url: $(each).find('a').attr('href'),
                },
            })
        })

        return jsonify({
            list: cards,
        })
    } catch (error) {
        $print(error)
    }
}

async function getTracks(ext) {
    try {
        ext = argsify(ext)
        let tracks = []
        let url = ext.url

        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        const $ = cheerio.load(data)

        $('.paly_list_btn a').each((_, e) => {
            tracks.push({
                name: $(e).text(),
                pan: '',
                ext: {
                    url: $(e).attr('href'),
                },
            })
        })

        return jsonify({
            list: [
                {
                    title: '在线',
                    tracks: tracks,
                },
            ],
        })
    } catch (error) {
        $print(error)
    }
}

async function getPlayinfo(ext) {
    try {
        ext = argsify(ext)
        const url = ext.url

        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        const $ = cheerio.load(data)
        const script = $('.videoplay script').text()
        const encstr = script.match(/var\s+[^=]*=\s*"([^"]*)";/)[1]
        const matches = [...script.matchAll(/parse\((.*?)\)/gm)]
        const key = matches[0]?.[1].replaceAll('"', '')
        const iv = matches[1]?.[1]

        function dncry(data, key, ivstr) {
            var k686a9 = CryptoJS.enc.Utf8.parse(key)
            var iv = CryptoJS.enc.Utf8.parse(ivstr)
            var decrypted = CryptoJS.AES.decrypt(data, k686a9, { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 })
            return decrypted.toString(CryptoJS.enc.Utf8)
        }

        const playerConfig = dncry(encstr, key, iv)
        const playUrl = playerConfig.match(/url: "(.*?)"/)[1]

        return jsonify({ urls: [playUrl] })
    } catch (error) {
        $print(error)
    }
}

async function search(ext) {
    try {
        ext = argsify(ext)
        let cards = []

        let text = encodeURIComponent(ext.text)
        let page = ext.page || 1

        const url = appConfig.site + `/page/${page}/?s=${text}`
        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        const $ = cheerio.load(data)
        $('.bt_img.mi_ne_kd ul li').each((_, each) => {
            cards.push({
                vod_id: $(each).find('a').attr('href'),
                vod_name: $(each).find('h3.dytit > a').text(),
                vod_pic: $(each).find('img').attr('src'),
                vod_remarks: $(each).find('.dytit .dycategory > a').text(),
                vod_duration: $(each).find('.dytit .dyplayinfo').text().trim(),
                ext: {
                    url: $(each).find('a').attr('href'),
                },
            })
        })

        return jsonify({
            list: cards,
        })
    } catch (error) {
        $print(error)
    }
}
