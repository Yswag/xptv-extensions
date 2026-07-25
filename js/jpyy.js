const CryptoJS = createCryptoJS()

// 感謝 小了白了兔
//源码来自https://raw.githubusercontent.com/Yswag/xptv-extensions/refs/heads/main/js/jpyy.js
//仅修改配置网址
//配置： {"site":"https://www.jiabaide.cn"}

const UA =
    // 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1'
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

let $config = argsify($config_str)
let appConfig = {
    ver: 1,
    title: '金牌影视',
    site: $config.site || 'https://www.jiabaide.cn',
    tabs: [
        { name: '电影', ext: { id: 1 } },
        { name: '电视剧', ext: { id: 2 } },
        { name: '综艺', ext: { id: 3 } },
        { name: '动漫', ext: { id: 4 } },
    ],
}
const filterList = {
    1: [
        {
            key: 'type',
            name: '类型',
            value: [
                { n: '全部', v: '' },
                { n: '喜剧', v: '22' },
                { n: '动作', v: '23' },
                { n: '科幻', v: '30' },
                { n: '爱情', v: '26' },
                { n: '悬疑', v: '27' },
                { n: '奇幻', v: '87' },
                { n: '剧情', v: '37' },
                { n: '恐怖', v: '36' },
                { n: '犯罪', v: '35' },
                { n: '动画', v: '33' },
                { n: '惊悚', v: '34' },
                { n: '战争', v: '25' },
                { n: '冒险', v: '31' },
                { n: '灾难', v: '81' },
                { n: '伦理', v: '83' },
                { n: '其他', v: '43' },
            ],
        },
        {
            key: 'class',
            name: '剧情',
            value: [
                { n: '全部', v: '' },
                { n: '爱情', v: '爱情' },
                { n: '动作', v: '动作' },
                { n: '喜剧', v: '喜剧' },
                { n: '战争', v: '战争' },
                { n: '科幻', v: '科幻' },
                { n: '剧情', v: '剧情' },
                { n: '武侠', v: '武侠' },
                { n: '冒险', v: '冒险' },
                { n: '枪战', v: '枪战' },
                { n: '恐怖', v: '恐怖' },
                { n: '其他', v: '其他' },
            ],
        },
        {
            key: 'area',
            name: '地区',
            value: [
                { n: '全部', v: '' },
                { n: '中国大陆', v: '中国大陆' },
                { n: '香港', v: '中国香港' },
                { n: '台湾', v: '中国台湾' },
                { n: '美国', v: '美国' },
                { n: '日本', v: '日本' },
                { n: '韩国', v: '韩国' },
                { n: '印度', v: '印度' },
                { n: '泰国', v: '泰国' },
                { n: '英国', v: '英国' },
                { n: '法国', v: '法国' },
                { n: '其他', v: '其他' },
            ],
        },
        {
            key: 'year',
            name: '年份',
            value: [
                { n: '全部', v: '' },
                { n: '2026', v: '2026' },
                { n: '2025', v: '2025' },
                { n: '2024', v: '2024' },
                { n: '2023', v: '2023' },
                { n: '2022', v: '2022' },
                { n: '2021', v: '2021' },
                { n: '2020', v: '2020' },
                { n: '2019', v: '2019' },
                { n: '2018', v: '2018' },
                { n: '2017', v: '2017' },
                { n: '2016', v: '2016' },
                { n: '2015', v: '2015' },
                { n: '2014', v: '2014' },
                { n: '2013', v: '2013' },
                { n: '2012', v: '2012' },
                { n: '2011', v: '2011' },
                { n: '2010', v: '2010' },
                { n: '2009~2000', v: '2009~2000' },
            ],
        },
        {
            key: 'lang',
            name: '语言',
            value: [
                { n: '全部', v: '' },
                { n: '国语', v: '国语' },
                { n: '英语', v: '英语' },
                { n: '粤语', v: '粤语' },
                { n: '韩语', v: '韩语' },
                { n: '日语', v: '日语' },
                { n: '其他', v: '其他' },
            ],
        },
        {
            key: 'sort',
            name: '排序',
            value: [
                { n: '最近更新', v: '2' },
                { n: '人气高低', v: '3' },
                { n: '评分高低', v: '4' },
            ],
        },
    ],
    2: [
        {
            key: 'type',
            name: '类型',
            value: [
                { n: '全部', v: '' },
                { n: '国产剧', v: '14' },
                { n: '欧美剧', v: '15' },
                { n: '港台剧', v: '16' },
                { n: '日韩剧', v: '62' },
                { n: '其他剧', v: '68' },
            ],
        },
        {
            key: 'class',
            name: '剧情',
            value: [
                { n: '全部', v: '' },
                { n: '古装', v: '古装' },
                { n: '战争', v: '战争' },
                { n: '喜剧', v: '喜剧' },
                { n: '家庭', v: '家庭' },
                { n: '犯罪', v: '犯罪' },
                { n: '动作', v: '动作' },
                { n: '奇幻', v: '奇幻' },
                { n: '剧情', v: '剧情' },
                { n: '历史', v: '历史' },
                { n: '短片', v: '短片' },
                { n: '其他', v: '其他' },
            ],
        },
        {
            key: 'area',
            name: '地区',
            value: [
                { n: '全部', v: '' },
                { n: '中国大陆', v: '中国大陆' },
                { n: '香港', v: '中国香港' },
                { n: '台湾', v: '中国台湾' },
                { n: '日本', v: '日本' },
                { n: '韩国', v: '韩国' },
                { n: '美国', v: '美国' },
                { n: '泰国', v: '泰国' },
                { n: '其他', v: '其他' },
            ],
        },
        {
            key: 'year',
            name: '年份',
            value: [
                { n: '全部', v: '' },
                { n: '2026', v: '2026' },
                { n: '2025', v: '2025' },
                { n: '2024', v: '2024' },
                { n: '2023', v: '2023' },
                { n: '2022', v: '2022' },
                { n: '2021', v: '2021' },
                { n: '2020', v: '2020' },
                { n: '2019', v: '2019' },
                { n: '2018', v: '2018' },
                { n: '2017', v: '2017' },
                { n: '2016', v: '2016' },
                { n: '2015', v: '2015' },
                { n: '2014', v: '2014' },
                { n: '2013', v: '2013' },
                { n: '2012', v: '2012' },
                { n: '2011', v: '2011' },
                { n: '2010', v: '2010' },
            ],
        },
        {
            key: 'lang',
            name: '语言',
            value: [
                { n: '全部', v: '' },
                { n: '国语', v: '国语' },
                { n: '英语', v: '英语' },
                { n: '粤语', v: '粤语' },
                { n: '韩语', v: '韩语' },
                { n: '日语', v: '日语' },
                { n: '泰语', v: '泰语' },
                { n: '其他', v: '其他' },
            ],
        },
        {
            key: 'sort',
            name: '排序',
            value: [
                { n: '最近更新', v: '2' },
                { n: '人气高低', v: '3' },
                { n: '评分高低', v: '4' },
            ],
        },
    ],
    3: [
        {
            key: 'type',
            name: '类型',
            value: [
                { n: '全部', v: '' },
                { n: '国产综艺', v: '69' },
                { n: '港台综艺', v: '70' },
                { n: '日韩综艺', v: '72' },
                { n: '欧美综艺', v: '73' },
            ],
        },
        {
            key: 'class',
            name: '剧情',
            value: [
                { n: '全部', v: '' },
                { n: '真人秀', v: '真人秀' },
                { n: '音乐', v: '音乐' },
                { n: '脱口秀', v: '脱口秀' },
            ],
        },
        {
            key: 'area',
            name: '地区',
            value: [
                { n: '全部', v: '' },
                { n: '中国大陆', v: '中国大陆' },
                { n: '香港', v: '中国香港' },
                { n: '台湾', v: '中国台湾' },
                { n: '日本', v: '日本' },
                { n: '韩国', v: '韩国' },
                { n: '美国', v: '美国' },
                { n: '其他', v: '其他' },
            ],
        },
        {
            key: 'year',
            name: '年份',
            value: [
                { n: '全部', v: '' },
                { n: '2026', v: '2026' },
                { n: '2025', v: '2025' },
                { n: '2024', v: '2024' },
                { n: '2023', v: '2023' },
                { n: '2022', v: '2022' },
                { n: '2021', v: '2021' },
                { n: '2020', v: '2020' },
            ],
        },
        {
            key: 'lang',
            name: '语言',
            value: [
                { n: '全部', v: '' },
                { n: '国语', v: '国语' },
                { n: '英语', v: '英语' },
                { n: '粤语', v: '粤语' },
                { n: '韩语', v: '韩语' },
                { n: '日语', v: '日语' },
                { n: '其他', v: '其他' },
            ],
        },
        {
            key: 'sort',
            name: '排序',
            value: [
                { n: '最近更新', v: '2' },
                { n: '人气高低', v: '3' },
                { n: '评分高低', v: '4' },
            ],
        },
    ],
    4: [
        {
            key: 'type',
            name: '类型',
            value: [
                { n: '全部', v: '' },
                { n: '国产动漫', v: '75' },
                { n: '日韩动漫', v: '76' },
                { n: '欧美动漫', v: '77' },
            ],
        },
        {
            key: 'class',
            name: '剧情',
            value: [
                { n: '全部', v: '' },
                { n: '喜剧', v: '喜剧' },
                { n: '科幻', v: '科幻' },
                { n: '热血', v: '热血' },
                { n: '冒险', v: '冒险' },
                { n: '动作', v: '动作' },
                { n: '运动', v: '运动' },
                { n: '战争', v: '战争' },
                { n: '动画', v: '动画' },
            ],
        },
        {
            key: 'area',
            name: '地区',
            value: [
                { n: '全部', v: '' },
                { n: '中国大陆', v: '中国大陆' },
                { n: '日本', v: '日本' },
                { n: '美国', v: '美国' },
                { n: '其他', v: '其他' },
            ],
        },
        {
            key: 'year',
            name: '年份',
            value: [
                { n: '全部', v: '' },
                { n: '2026', v: '2026' },
                { n: '2025', v: '2025' },
                { n: '2024', v: '2024' },
                { n: '2023', v: '2023' },
                { n: '2022', v: '2022' },
                { n: '2021', v: '2021' },
                { n: '2020', v: '2020' },
                { n: '2019', v: '2019' },
                { n: '2018', v: '2018' },
                { n: '2017', v: '2017' },
                { n: '2016', v: '2016' },
                { n: '2015', v: '2015' },
                { n: '2014', v: '2014' },
                { n: '2013', v: '2013' },
                { n: '2012', v: '2012' },
                { n: '2011', v: '2011' },
                { n: '2010', v: '2010' },
            ],
        },
        {
            key: 'lang',
            name: '语言',
            value: [
                { n: '全部', v: '' },
                { n: '国语', v: '国语' },
                { n: '英语', v: '英语' },
                { n: '日语', v: '日语' },
                { n: '其他', v: '其他' },
            ],
        },
        {
            key: 'sort',
            name: '排序',
            value: [
                { n: '最近更新', v: '2' },
                { n: '人气高低', v: '3' },
                { n: '评分高低', v: '4' },
            ],
        },
    ],
}

async function getConfig() {
    return JSON.stringify(appConfig)
}

async function getCards(ext) {
    ext = JSON.parse(ext)
    let cards = []
    let { id, page = 1 } = ext

    const { type = '', class: v_class = '', area = '', year = '', lang = '', sort = '1' } = ext?.filters || {}

    const toQueryString = (obj) =>
        Object.keys(obj)
            .filter((k) => obj[k] != null && obj[k] !== '')
            .map((k) => `${k}=${obj[k]}`)
            .join('&')
    const params = {
        area: area || '',
        filterStatus: '1',
        lang: lang || '',
        pageNum: page,
        pageSize: '30',
        sort: sort || '1',
        sortBy: '1',
        type: type || '',
        type1: id,
        v_class: v_class || '',
        year: year || '',
    }
    let url = `${appConfig.site}/api/mw-movie/anonymous/video/list?${toQueryString(params)}`

    const headers = getHeader(url)

    const response = await $fetch.get(url, { headers: headers })
    const data = response.data

    JSON.parse(data).data.list.forEach((e) => {
        const name = e.vodName
        if (name.includes('预告')) return
        const id = e.vodId
        cards.push({
            vod_id: id.toString(),
            vod_name: name,
            vod_pic: e.vodPic,
            vod_remarks: e.vodDoubanScore.toFixed(1),
            vod_duration: e.vodRemarks.replace(/\|.*/, '') || e.vodVersion,
            vod_pubdate: e.vodPubdate,
            ext: { id: id },
        })
    })

    return JSON.stringify({ list: cards, filter: filterList[id] })
}

async function getTracks(ext) {
    ext = JSON.parse(ext)

    let tracks = []
    let id = ext.id
    let url = appConfig.site.replace('www', 'm') + '/detail/' + id

    const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } })

    const nidData = '{"' + data.match(/episodeList.*?\[.*?\}\]\}/)[0].replace(/\\\"/g, '"')
    JSON.parse(nidData).episodeList.forEach((e) => {
        tracks.push({
            name: e.name,
            ext: { id: id, nid: e.nid },
        })
    })

    return JSON.stringify({ list: [{ title: '默认分组', tracks }] })
}

async function getPlayinfo(ext) {
    ext = JSON.parse(ext)
    let { id, nid } = ext
    const url = `${appConfig.site}/api/mw-movie/anonymous/v2/video/episode/url?id=${id}&nid=${nid}`
    const headers = getHeader(url)

    const { data } = await $fetch.get(url, { headers: headers })

    let playUrl = JSON.parse(data).data.list[0].url

    return JSON.stringify({ urls: [playUrl] })
}

async function search(ext) {
    ext = JSON.parse(ext)
    let cards = []

    const text = ext.text
    const page = ext.page || 1
    const url = `${appConfig.site}/api/mw-movie/anonymous/video/searchByWordPageable?keyword=${encodeURIComponent(
        text,
    )}&pageNum=${page}&pageSize=12&type=false`
    const key = `searchByWordPageable?keyword=${text}&pageNum=${page}&pageSize=12&type=false`
    const headers = getHeader(key)

    const { data } = await $fetch.get(url, { headers: headers })

    JSON.parse(data).data.list.forEach((e) => {
        const id = e.vodId
        cards.push({
            vod_id: id.toString(),
            vod_name: e.vodName,
            vod_pic: e.vodPic,
            vod_remarks: e.vodDoubanScore.toFixed(1),
            vod_duration: e.vodRemarks.replace(/\|.*/, '') || e.vodVersion,
            vod_pubdate: e.vodPubdate,
            ext: { id: id },
        })
    })

    return JSON.stringify({ list: cards })
}

function getHeader(url) {
    const signKey = 'cb808529bae6b6be45ecfab29a4889bc'
    const dataStr = url.split('?')[1]
    const t = Date.now()
    const signStr = dataStr + `&key=${signKey}` + `&t=${t}`

    function getUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (e) =>
            ('x' === e ? (16 * Math.random()) | 0 : 'r&0x3' | '0x8').toString(16),
        )
    }

    const headers = {
        'User-Agent': UA,
        deviceId: getUUID(),
        t: t.toString(),
        sign: CryptoJS.SHA1(CryptoJS.MD5(signStr).toString()).toString(),
    }

    return headers
}
