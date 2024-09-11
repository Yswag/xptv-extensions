const cheerio = require('cheerio')
const axios = require('axios')
const CryptoJS = require('crypto-js')

// 測試時忽略證書驗證
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'

let appConfig = {
    ver: 1,
    title: '素白白',
    site: 'https://www.subaibaiys.com',
}

async function getConfig() {
    let config = appConfig
    config.tabs = await getTabs()
    return config
}

async function getTabs() {
    let list = []
    let ignore = ['首页', '公告留言']
    function isIgnoreClassName(className) {
        return ignore.some((element) => className.includes(element))
    }

    const { data } = await axios.get(appConfig.site, {
        headers: {
            'User-Agent': UA,
        },
    })
    const $ = cheerio.load(data)

    let allClass = $('ul.navlist a')
    allClass.each((i, e) => {
        const name = $(e).text()
        const href = $(e).attr('href')
        const isIgnore = isIgnoreClassName(name)
        if (isIgnore) return

        list.push({
            name,
            ext: {
                id: i.toString(),
                url: href,
            },
        })
    })

    return list
}

async function getCards(ext) {
    let cards = []
    let { id, page = 1, url } = ext

    if (page > 1) {
        url += `/page/${page}`
    }

    // 发送请求
    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    // 加载 HTML
    const $ = cheerio.load(data)

    // 解析数据，例如提取标题
    $('.bt_img.mi_ne_kd.mrb li').each((_, element) => {
        const href = $(element).find('a').attr('href')
        const title = $(element).find('img.thumb').attr('alt')
        const cover = $(element).find('img.thumb').attr('data-original')
        const subTitle = $(element).find('.jidi span').text()
        const hdinfo = $(element).find('.hdinfo .qb').text()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle || hdinfo,
            ext: {
                url: href,
            },
        })
    })

    return {
        list: cards,
    }
}

async function getTracks(ext) {
    let tracks = []
    let url = ext.url

    // 发送请求
    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    // 加载 HTML
    const $ = cheerio.load(data)

    // 單集名稱重複會導致直接播放緩存的url，暫時加上劇名等修
    let show = $('.moviedteail_tt h1').text()
    $('.paly_list_btn a').each((_, e) => {
        const name = $(e).text()
        const href = $(e).attr('href')
        tracks.push({
            name: `${show}-${name}`,
            pan: '',
            ext: {
                url: href,
            },
        })
    })

    return {
        list: [
            {
                title: '默认分组',
                tracks,
            },
        ],
    }
}

async function getPlayinfo(ext) {
    const url = ext.url

    // 发送请求
    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)
    let iframe = $('iframe').filter((i, iframe) => $(iframe).attr('src').includes('Cloud'))
    if (0 < iframe.length) {
        console.log('method 1')

        const iframeHtml = (
            await axios.get($(iframe[0]).attr('src'), {
                headers: {
                    Referer: url,
                    'User-Agent': UA,
                },
            })
        ).data
        let code = iframeHtml
                .match(/var url = '(.*?)'/)[1]
                .split('')
                .reverse()
                .join(''),
            temp = ''
        for (let i = 0; i < code.length; i += 2) temp += String.fromCharCode(parseInt(code[i] + code[i + 1], 16))
        const playUrl = temp.substring(0, (temp.length - 7) / 2) + temp.substring((temp.length - 7) / 2 + 7)

        return { urls: [playUrl] }
    } else {
        console.log('method 2')

        let playUrl = 'error'

        const script = $('script')
        const js = script.filter((i, script) => $(script).text().includes('window.wp_nonce')).text() ?? ''
        const group = js.match(/(var.*)eval\((\w*\(\w*\))\)/)
        const md5 = CryptoJS
        const result = eval(group[1] + group[2])
        playUrl = result.match(/url:.*?['"](.*?)['"]/)[1]

        return { urls: [playUrl] }
    }
}

async function search(ext) {
    let cards = []

    let text = ext.text // 搜索文本
    let page = ext.page || 1
    let url = `${appConfig.site}/page/${page}?s=${text}`

    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('.search_list li').each((_, element) => {
        const href = $(element).find('a').attr('href')
        const title = $(element).find('img.thumb').attr('alt')
        const cover = $(element).find('img.thumb').attr('data-original')
        const subTitle = $(element).find('.jidi span').text()
        const hdinfo = $(element).find('.hdinfo .qb').text()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle || hdinfo,
            ext: {
                url: href,
            },
        })
    })

    return {
        list: cards,
    }
}

module.exports = { getConfig, getCards, getTracks, getPlayinfo, search }
