// demo test

// const fetch = require('node-fetch')
const cheerio = require('cheerio')
const fs = require('fs')
const os = require('os')
const axios = require('axios')
const CryptoJS = require('crypto-js')
// const _ = require('lodash')

let cachesPath = `${os.homedir()}/Documents/caches`

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'

let appConfig = {
    ver: 1,
    title: '在线之家',
    site: 'https://www.zxzja.com',
    tabs: [
        {
            name: '首页',
            ext: {
                id: 0,
                url: 'https://www.zxzja.com/',
            },
        },
        {
            name: '电影',
            ext: {
                id: 1,
                url: 'https://www.zxzja.com/list/1.html',
            },
        },
    ],
}

function getConfig() {
    return appConfig
}

async function getCards(ext) {
    var cards = []
    let id = ext.id
    let page = ext.page || 1

    var url = 'https://www.zxzja.com/'
    if (id == 0 && page > 1) {
        return {
            list: cards,
        }
    }

    if (id > 0) {
        url = `https://www.zxzja.com/list/${id}.html`
        if (page > 1) {
            url = `https://www.zxzja.com/list/${id}-${page}.html`
        }
    }

    // 发送请求
    const { data } = await axios.get(url, {
        headers: {
            Referer: 'https://www.zxzja.com/',
            'User-Agent': UA,
        },
    })

    // 加载 HTML
    const $ = cheerio.load(data)

    // 解析数据，例如提取标题
    $('a.lazyload').each((index, element) => {
        const href = $(element).attr('href')
        const title = $(element).attr('title')
        const cover = $(element).attr('data-original')
        const subTitle = $(element).find('.text-right').text()
        if (href.startsWith('/detail/')) {
            cards.push({
                vod_id: href.replace(/.*?\/detail\/(.*).html/g, '$1'),
                vod_name: title,
                vod_pic: cover,
                vod_remarks: subTitle,
                ext: {
                    url: `${appConfig.site}${href}`,
                },
            })
        }
    })

    return {
        list: cards,
    }
}

async function getTracks(ext) {
    var tracks = []
    let url = ext.url

    // 发送请求
    const { data } = await axios.get(url, {
        headers: {
            Referer: 'https://www.zxzja.com/',
            'User-Agent': UA,
        },
    })

    // 加载 HTML
    const $ = cheerio.load(data)

    // 解析数据，例如提取标题
    $('.stui-content__playlist > li > a').each((index, element) => {
        const href = $(element).attr('href')
        const name = $(element).text()
        if (href && name && name !== '合集') {
            tracks.push({
                name,
                pan: '',
                ext: {
                    url: `${appConfig.site}${href}`,
                },
            })
        }
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
    var plays = []
    let url = ext.url

    // 发送请求
    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const html = data.match(/r player_.*?=(.*?)</)[1]
    const json = JSON.parse(html)

    const playurl = json.url
    const from = json.from
    if (json.encrypt == '1') {
        playurl = decodeURIComponent(url)
    } else if (json.encrypt == '2') {
        playurl = decodeURIComponent(Buffer.from(url, 'base64').toString('utf-8'))
    }
    console.log('playurl', playurl)
    if (playurl.indexOf('m3u8') >= 0 || playurl.indexOf('mp4') >= 0) {
        return { urls: [playurl] }
    } else if (from.indexOf('line3') >= 0 || from.indexOf('line5') >= 0) {
        const { data } = await axios.get(playurl, {
            headers: {
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'zh-CN,zh;q=0.9',
                Referer: 'https://www.zxzja.com/',
                'Sec-Ch-Ua': '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"macOS"',
                'Sec-Fetch-Dest': 'iframe',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-site',
                'Upgrade-Insecure-Requests': '1',
                'User-Agent': UA,
            },
        })
        let resultv2 = data.match(/var result_v2 = {(.*?)};/)[1]
        let code = JSON.parse('{' + resultv2 + '}')
            .data.split('')
            .reverse()
        let temp = ''
        for (let i = 0x0; i < code.length; i = i + 0x2) {
            temp += String.fromCharCode(parseInt(code[i] + code[i + 0x1], 0x10))
        }
        const purl = temp.substring(0x0, (temp.length - 0x7) / 0x2) + temp.substring((temp.length - 0x7) / 0x2 + 0x7)
        console.debug('***在线之家purl =====>' + purl) // js_debug.log
        return { urls: [purl] }
    }
    return { urls: [] }
}

async function search(ext) {
    var cards = []

    let text = ext.text // 搜索文本
    let page = ext.page || 1

    return {
        list: cards,
    }
}

module.exports = { getConfig, getCards, getTracks, getPlayinfo, search }
