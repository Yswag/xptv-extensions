const cheerio = createCheerio()

// 填入自建的地址 (http://your-ip:port)
let custom = ''
// 可選: 填入 alist 令牌 (alist-ff....)
let token = ''

let appConfig = {
    ver: 1,
    title: '小雅原版',
}

if (custom) {
    $cache.set('alist_xiaoya_host', custom)
}
if (token) {
    $cache.set('alist_xiaoya_token', token)
}

async function getConfig() {
    let config = appConfig
    let host = $cache.get('alist_xiaoya_host')
    let token = $cache.get('alist_xiaoya_token')
    if (!host) {
        host = 'undefined'
        config.site = host
        config.tabs = [
            {
                name: '未配置站點',
                ext: {
                    cat: 'undefined',
                },
            },
        ]
    } else {
        if (!token) {
            await login()
        }
        config.site = host
        config.tabs = [
            { name: '每日更新', ext: { cat: 'daily' } },
            { name: '国产剧', ext: { cat: 'tv.china' } },
            { name: '港台剧', ext: { cat: 'tv.hktw' } },
            { name: '韩剧', ext: { cat: 'tv.korea' } },
            { name: '美剧', ext: { cat: 'tv.us' } },
            { name: '英剧', ext: { cat: 'tv.uk' } },
            { name: '日剧', ext: { cat: 'tv.japan' } },
            { name: '国漫', ext: { cat: 'comics.china' } },
            { name: '日漫', ext: { cat: 'comics.japan' } },
            { name: '动漫', ext: { cat: 'comics' } },
            { name: '🎬中国', ext: { cat: 'movie.china' } },
            { name: '🎬豆瓣榜', ext: { cat: 'movie.top' } },
            { name: '🎬泰国', ext: { cat: 'movie.thai' } },
            { name: '🎬港台', ext: { cat: 'movie.hktw' } },
            { name: '🎬欧美', ext: { cat: 'movie.western' } },
            { name: '🎬日本', ext: { cat: 'movie.japan' } },
            { name: '🎬韩国', ext: { cat: 'movie.korea' } },
            { name: '🎬印度', ext: { cat: 'movie.india' } },
            { name: '🎬杜比', ext: { cat: 'movie.dolby' } },
            { name: '🎬4K REMUX', ext: { cat: 'movie.4kremux' } },
            { name: '纪录片.历史', ext: { cat: 'docu.history' } },
            { name: '纪录片.美食', ext: { cat: 'docu.food' } },
            { name: '纪录片.考古', ext: { cat: 'docu.archeology' } },
            { name: '纪录片.探索发现', ext: { cat: 'docu.explore' } },
            { name: '纪录片.国家地理', ext: { cat: 'docu.natgeo' } },
            { name: '纪录片.BBC', ext: { cat: 'docu.bbc' } },
            { name: '纪录片.NHK', ext: { cat: 'docu.nhk' } },
            { name: '百家讲坛', ext: { cat: 'docu.baijia' } },
            { name: '纪录片', ext: { cat: 'docu' } },
            { name: '儿童', ext: { cat: 'comics.child' } },
            { name: '音乐', ext: { cat: 'music' } },
            { name: '综艺', ext: { cat: 'reality' } },
        ]
    }

    return jsonify(config)
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { cat } = ext

    if (cat === 'undefined') {
        cards = [
            {
                vod_id: '-1',
                vod_name: '請在單源搜索中輸入小雅的URL',
                vod_pic: '',
                vod_remarks: '',
                ext: {
                    cat: '',
                },
            },
            {
                vod_id: '-1',
                vod_name: '例: http://192.168.5.5:5678',
                vod_pic: '',
                vod_remarks: '',
                ext: {
                    cat: '',
                },
            },
            {
                vod_id: '-1',
                vod_name: '如果開啟強制登入，在URL後面加上@@@alist令牌',
                vod_pic: '',
                vod_remarks: '',
                ext: {
                    cat: '',
                },
            },
            {
                vod_id: '-1',
                vod_name: '例: http://192.168.5.5:5678@@@alist-ff.....',
                vod_pic: '',
                vod_remarks: '',
                ext: {
                    cat: '',
                },
            },
        ]
    } else {
        let host = $cache.get('alist_xiaoya_host')
        let url = `${host}/sou?num=200&type=video&filter=last&cat=${ext.cat}`
        const { data } = await $fetch.get(url)

        const $ = cheerio.load(data)
        const allVideos = $('body > div > ul > a')
        allVideos.each((_, e) => {
            const href = $(e).text()
            const [path, name, id, score, img] = href.split('#')
            cards.push({
                vod_id: id || path,
                vod_name: name || path,
                vod_pic: img || '',
                vod_remarks: score || '',
                ext: {
                    path: path,
                },
            })
        })
    }

    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    let tracks = []
    let path = ext.path
    let host = $cache.get('alist_xiaoya_host')
    let token = $cache.get('alist_xiaoya_token')
    let url = `${host}/api/fs/list`

    const { data } = await $fetch.post(
        url,
        {
            path: path,
        },
        {
            headers: {
                Authorization: token,
            },
        }
    )

    const content = argsify(data).data.content
    const folder = []
    content.forEach((e) => {
        if (e.is_dir) folder.push(e.name)
        else if (e.type === 2) {
            tracks.push({
                name: e.name,
                pan: '',
                ext: {
                    path: `${path}/${e.name}`,
                },
            })
        }
    })
    if (folder.length) {
        for (const f of folder) {
            const { data: folderData } = await $fetch.post(
                url,
                {
                    path: `${path}/${f}`,
                },
                {
                    headers: {
                        Authorization: token,
                    },
                }
            )
            const folderContent = argsify(folderData).data.content
            folderContent.forEach((e) => {
                if (e.type === 2) {
                    tracks.push({
                        name: e.name,
                        pan: '',
                        ext: {
                            path: `${path}/${f}/${e.name}`,
                        },
                    })
                }
            })
        }
    }

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
    let path = ext.path
    let token = $cache.get('alist_xiaoya_token')
    let host = $cache.get('alist_xiaoya_host')
    let url = `${host}/api/fs/get`

    const { data } = await $fetch.post(
        url,
        {
            path: path,
        },
        {
            headers: {
                Authorization: token,
            },
        }
    )

    let playUrl = argsify(data).data.raw_url

    return jsonify({ urls: [playUrl] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    if (ext.text.startsWith('http')) {
        function isValid(input) {
            const regex = /^https?:\/\/[^\s\/:]+(:\d+)?/
            return regex.test(input)
        }
        let parts = ext.text.split('@@@')
        let host = parts[0]
        if (isValid(host)) {
            $cache.set('alist_xiaoya_host', host)
            cards = [
                {
                    vod_id: '-1',
                    vod_name: '已添加站點，重新進入',
                    vod_pic: '',
                    vod_remarks: '',
                    ext: {
                        cat: '',
                    },
                },
            ]
        } else {
            cards = [
                {
                    vod_id: '-1',
                    vod_name: '無效的配置，請重新輸入',
                    vod_pic: '',
                    vod_remarks: '',
                    ext: {
                        cat: '',
                    },
                },
            ]
        }
        if (parts[1]) {
            let token = parts[1]
            $cache.set('alist_xiaoya_token', token)
        }
    } else {
        const text = ext.text
        const host = $cache.get('alist_xiaoya_host')
        const url = `${host}/sou?box=${text}&type=video&url=`

        const { data } = await $fetch.get(url)

        const $ = cheerio.load(data)
        const allVideos = $('body > div > ul > a')
        allVideos.each((_, e) => {
            const href = $(e).text()
            const [path, name, id, score, img] = href.split('#')
            cards.push({
                vod_id: id || path,
                vod_name: name || path,
                vod_pic: img || '',
                vod_remarks: score || '',
                ext: {
                    path: path,
                },
            })
        })
    }

    return jsonify({
        list: cards,
    })
}

async function login() {
    let host = $cache.get('alist_xiaoya_host')
    let url = `${host}/api/auth/login`

    const { data } = await $fetch.post(
        url,
        {
            username: 'guest',
            password: 'guest_Api789',
        },
        {
            headers: {
                'Content-Type': 'application/json',
            },
        }
    )
    let jwt = argsify(data).data.token
    $cache.set('alist_xiaoya_token', jwt)
}
