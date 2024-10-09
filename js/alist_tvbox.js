// 填入自建的地址 (http://your-ip:port)
let custom = ''

let appConfig = {
    ver: 20241009,
    title: '小雅tvbox',
}

if (custom) {
    $cache.set('alist_tvbox_host', custom)
}

let UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'

async function getConfig() {
    let config = appConfig
    let host = $cache.get('alist_tvbox_host')
    // let host = argsify($config_str)?.url || $cache.get('alist_tvbox_host')
    if (typeof $config_str !== 'undefined') {
        host = argsify($config_str)?.url || $cache.get('alist_tvbox_host')
    }
    if (!host) {
        host = 'undefined'
        config.site = host
        config.tabs = [
            {
                name: '未配置站點',
                ext: {
                    url: host,
                },
            },
        ]
    } else {
        config.site = host
        config.tabs = await getTabs(host)
    }

    return jsonify(config)
}

async function getTabs(host) {
    let list = []

    let url = host + '/vod1'

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    let allClass = argsify(data).class
    allClass.forEach((e) => {
        if (e.type_flag === 1) return
        list.push({
            name: e.type_name,
            ext: {
                url: url + `?t=${e.type_id}`,
            },
        })
    })

    return list
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { url, page = 1 } = ext

    if (url === 'undefined') {
        cards = [
            {
                vod_id: '-1',
                vod_name: '請在自定義配置中填入url',
                vod_pic: '',
                vod_remarks: '',
                ext: {
                    url: '',
                },
            },
            {
                vod_id: '-1',
                vod_name: '確保JSON格式正確',
                vod_pic: '',
                vod_remarks: '',
                ext: {
                    url: '',
                },
            },
        ]
    } else {
        let host = $cache.get('alist_tvbox_host')
        // let host = argsify($config_str)?.url || $cache.get('alist_tvbox_host')
        if (typeof $config_str !== 'undefined') {
            host = argsify($config_str)?.url || $cache.get('alist_tvbox_host')
        }

        let url = ext.url + `&pg=${page}`
        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        argsify(data).list.forEach((e) => {
            cards.push({
                vod_id: e.vod_id,
                vod_name: e.vod_name,
                vod_pic: e.vod_pic,
                vod_remarks: e.vod_remarks,
                ext: {
                    url: `${host}/vod1?ids=${e.vod_id}`,
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
    let url = ext.url
    let host = $cache.get('alist_tvbox_host')
    // let host = argsify($config_str)?.url || $cache.get('alist_tvbox_host')
    if (typeof $config_str !== 'undefined') {
        host = argsify($config_str)?.url || $cache.get('alist_tvbox_host')
    }

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const vod_play_url = argsify(data).list[0].vod_play_url
    const seasons = vod_play_url.split('$$$')
    seasons.forEach((e) => {
        const eps = e.split('#')
        eps.forEach((e) => {
            const [name, url] = e.split('$')
            tracks.push({
                name: name,
                pan: '',
                ext: {
                    url: `${host}/play?id=${url || name}&from=open`,
                },
            })
        })
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

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
            'X-client': 'com.fongmi.android.tv',
        },
    })

    let playUrl = argsify(data).url

    return jsonify({ urls: [playUrl] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    if (ext.text.startsWith('tvbox:')) {
        function isValid(input) {
            const regex = /^https?:\/\/[^\s\/:]+(:\d+)?$/
            return regex.test(input)
        }
        ext.text = ext.text.replace('tvbox:', '')
        let host = ext.text
        if (isValid(host)) {
            $cache.set('alist_tvbox_host', host)
            cards = [
                {
                    vod_id: '-1',
                    vod_name: '已添加站點，重新進入',
                    vod_pic: '',
                    vod_remarks: '',
                    ext: {
                        url: '',
                    },
                },
            ]
        } else {
            cards = [
                {
                    vod_id: '-1',
                    vod_name: '無效的URL，請重新輸入',
                    vod_pic: '',
                    vod_remarks: '',
                    ext: {
                        url: '',
                    },
                },
            ]
        }
    } else {
        const text = encodeURIComponent(ext.text)
        let host = $cache.get('alist_tvbox_host')
        // const host = argsify($config_str)?.url || $cache.get('alist_tvbox_host')
        if (typeof $config_str !== 'undefined') {
            host = argsify($config_str)?.url || $cache.get('alist_tvbox_host')
        }

        const url = `${host}/vod1?wd=${text}`

        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        argsify(data).list.forEach((e) => {
            const id = e.vod_id
            cards.push({
                vod_id: id,
                vod_name: e.vod_name,
                vod_pic: e.vod_pic,
                vod_remarks: e.vod_remarks,
                ext: {
                    url: `${host}/vod1?ids=${id}`,
                },
            })
        })
    }

    return jsonify({
        list: cards,
    })
}
