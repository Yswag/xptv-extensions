// 填入自建的地址 (http://your-ip:port)
let custom = ''
let token = ''

let appConfig = {
    ver: 20250325,
    title: '小雅tvbox',
}

if (custom) {
    $cache.set('alist_tvbox_host', custom)
}

if (token) {
    $cache.set('alist_tvbox_token', token)
}

let UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'

// 获取配置信息，包括 host 和 token
function getConfigData() {
    const host = $cache.get('alist_tvbox_host') || (typeof $config_str !== 'undefined' ? argsify($config_str)?.url : 'undefined');
    const token = $cache.get('alist_tvbox_token') || (typeof $config_str !== 'undefined' ? argsify($config_str)?.token : null);
    return { host, token };
}

// 获取配置
async function getConfig() {
    let config = appConfig;
    const { host, token } = getConfigData(); // 获取 host 和 token
    // console.log('debug:', host)
    // console.log('debug:', token)

    if (host === 'undefined') {
        config.site = host;
        config.tabs = [{ name: '未配置站點', ext: { url: host } }];
    } else {
        config.site = host;
        try {
            config.tabs = await getTabs(host, token); // 获取 tabs 数据，传递 token 参数
        } catch (error) {
            console.error('获取 tabs 失败:', error);
            config.tabs = [];
        }
    }

    return jsonify(config);
}

// 获取 tabs 数据，支持 token 参数
async function getTabs(host, token = null) {
    let list = [];
    const url = `${host}/vod1${token ? `/${token}` : ''}`;
    // console.log('debug:', url)

    try {
        const { data } = await $fetch.get(url, {
            headers: { 'User-Agent': UA },
        });

        // 确保 data 是对象
        const parsedData = (typeof data === 'object' && data !== null) ? data : argsify(data);

        const allClass = parsedData.class || [];
        // 过滤掉 type_flag 为 1 的项，简化映射
        list = allClass
            .filter(e => e.type_flag !== 1)
            .map(e => ({
                name: e.type_name,
                ext: { url: `${url}?t=${e.type_id}` },
            }));
    } catch (error) {
        console.error('获取分类失败:', error.message || error);
    }

    return list;
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { url, page = 1 } = ext
    const { host, token } = getConfigData(); // 获取 host 和 token

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
                    url: `${host}/vod1${token ? `/${token}` : ''}?ids=${e.vod_id}`,
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
    const { host, token } = getConfigData(); // 获取 host 和 token

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
                    url: `${host}/play${token ? `/${token}` : ''}?id=${url || name}&from=open`,
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
        const { host, token } = getConfigData(); // 获取 host 和 token

        const url = `${host}/vod1${token ? `/${token}` : ''}?wd=${text}`

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
                    url: `${host}/vod1${token ? `/${token}` : ''}?ids=${id}`,
                },
            })
        })
    }

    return jsonify({
        list: cards,
    })
}
