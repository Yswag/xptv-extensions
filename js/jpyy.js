const cheerio = require('cheerio')
const axios = require('axios')
const CryptoJS = require('crypto-js')

// 測試時忽略證書驗證
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const listUrl = 'https://www.ghw9zwp5.com/api/mw-movie/anonymous/video/list?pageNum=@page@&pageSize=30&sort=1&sortBy=1&type1=@type@'

let appConfig = {
    ver: 1,
    title: '金牌影院',
    site: 'https://www.ghw9zwp5.com',
    tabs: [
        {
            name: '电影',
            ext: {
                id: 1,
                url: listUrl,
            },
        },
        {
            name: '电视剧',
            ext: {
                id: 2,
                url: listUrl,
            },
        },
        {
            name: '综艺',
            ext: {
                id: 3,
                url: listUrl,
            },
        },
        {
            name: '动漫',
            ext: {
                id: 4,
                url: listUrl,
            },
        },
    ],
}

function getConfig() {
    return appConfig
}

async function getCards(ext) {
    let cards = []
    let { id, page = 1, url } = ext

    url = url.replace('@type@', id).replace('@page@', page)
    const headers = getHeader(url)

    // 发送请求
    const { data } = await axios.get(url, {
        headers: headers,
    })

    data.data.list.forEach((e) => {
        const id = e.vodId
        cards.push({
            vod_id: id.toString(),
            vod_name: e.vodName,
            vod_pic: e.vodPic,
            vod_remarks: e.vodRemarks || e.vodVersion,
            ext: {
                url: `${appConfig.site}/detail/${id}`,
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
            Referer: appConfig.site + '/',
        },
    })

    // 加载 HTML
    const $ = cheerio.load(data)

    // let json = {}
    // for (const script of $('script')) {
    //     if ($(script).text().indexOf('操作成功') > -1) {
    //         json = JSON.parse(eval($(script).text().replaceAll('self.__next_f.push(', '').replaceAll(')', ''))[1].replaceAll('6:', ''))
    //     }
    // }
    // let vodJson = json[3].data.data

    // 單集名稱重複會導致直接播放緩存的url，暫時加上劇名等修
    let show = $('h1').text()
    let playlist = $('div[class^="detail__PlayListBox"]').find('div.listitem a')
    playlist.each((_, e) => {
        const name = $(e).text()
        const href = $(e).attr('href')
        tracks.push({
            name: `${show}-${name}`,
            pan: '',
            ext: {
                url: `${appConfig.site}${href}`,
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
    const [, id, sid] = ext.url.match(/vod\/play\/(.*)\/sid\/(.*)/)
    const url = `${appConfig.site}/api/mw-movie/anonymous/v1/video/episode/url?id=${id}&nid=${sid}`
    const headers = getHeader(url)

    // 发送请求
    const { data } = await axios.get(url, {
        headers: headers,
    })

    let playUrl = data.data.playUrl

    return { urls: [playUrl] }
}

async function search(ext) {
    let cards = []

    const text = ext.text // 搜索文本
    const page = ext.page || 1
    const url = `${appConfig.site}/api/mw-movie/anonymous/video/searchByWordPageable?keyword=${text}&pageNum=${page}&pageSize=12&type=false`
    const headers = getHeader(url)

    const { data } = await axios.get(url, {
        headers: headers,
    })

    data.data.list.forEach((e) => {
        const id = e.vodId
        cards.push({
            vod_id: id.toString(),
            vod_name: e.vodName,
            vod_pic: e.vodPic,
            vod_remarks: e.vodRemarks || e.vodVersion,
            ext: {
                url: `${appConfig.site}/detail/${id}`,
            },
        })
    })

    return {
        list: cards,
    }
}

function getHeader(url) {
    const signKey = 'cb808529bae6b6be45ecfab29a4889bc'
    const dataStr = url.split('?')[1]
    const t = Date.now()
    const signStr = dataStr + `&key=${signKey}` + `&t=${t}`

    function getUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (e) => ('x' === e ? (16 * Math.random()) | 0 : 'r&0x3' | '0x8').toString(16))
    }

    const headers = {
        'User-Agent': UA,
        deviceId: getUUID(),
        t: t,
        sign: CryptoJS.SHA1(CryptoJS.MD5(signStr).toString()).toString(),
    }

    return headers
}

module.exports = { getConfig, getCards, getTracks, getPlayinfo, search }
