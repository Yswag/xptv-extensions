const UA = 'Dart/3.3'

let appConfig = {
    ver: 20251116,
    title: 'ph_gay',
    site: 'https://vod.infiniteapi.com',
}

async function getConfig() {
    let config = appConfig
    let token = argsify($config_str).token
    if (!token) {
        $utils.toastInfo('ph_gay為biu提供的付費源，請填入token再使用')
        return
    }
    config.tabs = await getTabs(token)
    return jsonify(config)
}

async function getTabs(token) {
    try {
        let list = []
        let url = appConfig.site + `/${token}/ph_vod_gay?param=`

        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })
        // 使用字符串处理方式解析 XML
        const tyMatches = data.match(/<ty id="(.*?)">(.*?)<\/ty>/g) || []
        
        for (const tyXml of tyMatches) {
            const idMatch = tyXml.match(/id="(.*?)"/)
            const titleMatch = tyXml.match(/>([^<]+)</)
            
            if (idMatch && titleMatch) {
                list.push({
                    name: titleMatch[1],
                    ext: {
                        url: `${appConfig.site}/${token}/ph_vod_gay?t=${idMatch[1]}&ac=videolist`,
                        token: `${token}`,
                    },
                })
            }
        }

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
        url = `${url}&pg=${page}`
        let token = ext.token


        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        // 使用字符串处理方式解析 XML
        const videoMatches = data.match(/<video>([\s\S]*?)<\/video>/g) || []
        
        for (const videoXml of videoMatches) {
            const nameMatch = videoXml.match(/<name><!\[CDATA\[(.*?)\]\]><\/name>/)
            const picMatch = videoXml.match(/<pic>(.*?)<\/pic>/)
            const idMatch = videoXml.match(/<id>(.*?)<\/id>/)
            
            cards.push({
                vod_id: idMatch ? idMatch[1] : "",
                vod_name: nameMatch ? nameMatch[1] : "",
                vod_pic: picMatch ? picMatch[1] : "",
                ext: {
                    url: `${appConfig.site}/${token}/ph_vod_gay?ids=${idMatch[1]}`,
                },
            })
        }

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

        // 使用字符串处理方式解析 XML
        const ddMatches = data.match(/<dd flag="">\s*<!\[CDATA\[(.*?)\]\]>\s*<\/dd>/g) || []
        
        for (const ddXml of ddMatches) {
            const contentMatch = ddXml.match(/<!\[CDATA\[(.*?)\]\]>/)
            if (contentMatch) {
                const [title, playUrl] = contentMatch[1].split('$')
                tracks.push({
                    name: title,
                    pan: '',
                    ext: {
                        url: playUrl,
                    },
                })
            }
        }

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
        return jsonify({ urls: [url] })
    } catch (error) {
        $print(error)
    }
}

async function search(ext) {
    try {
        ext = argsify(ext)
        let cards = []

        let token = argsify($config_str).token
        let text = encodeURIComponent(ext.text)
        let page = ext.page || 1
        if (page >= 2) return

        const url = appConfig.site + `/${token}/ph_vod_gay?ac=videolist&wd=${text}`
        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        // 使用字符串处理方式解析 XML
        const videoMatches = data.match(/<video>([\s\S]*?)<\/video>/g) || []
        
        for (const videoXml of videoMatches) {
            const nameMatch = videoXml.match(/<name><!\[CDATA\[(.*?)\]\]><\/name>/)
            const picMatch = videoXml.match(/<pic>(.*?)<\/pic>/)
            const idMatch = videoXml.match(/<id>(.*?)<\/id>/)
            
            cards.push({
                vod_id: idMatch ? idMatch[1] : "",
                vod_name: nameMatch ? nameMatch[1] : "",
                vod_pic: picMatch ? picMatch[1] : "",
                ext: {
                    url: `${appConfig.site}/${token}/ph_vod_gay?ids=${idMatch[1]}`,
                },
            })
        }

        return jsonify({
            list: cards,
        })
    } catch (error) {
        $print(error)
    }
}